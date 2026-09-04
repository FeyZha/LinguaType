"""Run the LinguaType v4 essay-context ablation without changing v4 canonicals.

The frozen v4 prompt, output schema, cases, model settings, and validation stay
constant. Only the value placed in the existing ``full_essay`` slot changes:

* local-window: previous sentence + target sentence + next sentence
* target-only: target sentence only (so the field/template shape stays fixed)

The existing full-essay v4 baseline is referenced as the historical A condition.
These B/C runs are exploratory because A was not executed in the same run block.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import time
from pathlib import Path
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from typing_extensions import NotRequired, TypedDict

import run_eval_v4 as v4
from run_eval import (
    RUNS_DIR,
    error_payload,
    normalized_base_url,
    raw_text,
    read_env,
    read_json,
    replace_json,
    sanitize_error,
    sha256_file,
    utc_now,
    write_json_exclusive,
    write_json_line,
)


EXPERIMENT_ID = "context-ablation-v4-20260825"
TRANSFORM_VERSION = "essay-context-scope.v1"
BASELINE_RUN_ID = "baseline-v4-20260824-longcat-2.0-one-call-progressive-reveal"
BASELINE_RUN_DIR = RUNS_DIR / BASELINE_RUN_ID
EXPERIMENT_DEFINITION_PATH = (
    v4.EVAL_DIR
    / "experiments"
    / "context-ablation-v4-20260825"
    / "experiment-definition.json"
)

VariantName = Literal["local-window", "target-only"]

VARIANTS: dict[VariantName, dict[str, Any]] = {
    "local-window": {
        "id": "B",
        "policy": "previous_target_next",
        "description": "Previous sentence, target sentence, and next sentence.",
    },
    "target-only": {
        "id": "C",
        "policy": "target_sentence_only",
        "description": "Target sentence only in the unchanged full_essay slot.",
    },
}


class AblationState(TypedDict):
    task_prompt: str
    full_essay: str
    target_sentence: str
    output: NotRequired[dict[str, Any] | None]
    token_usage: NotRequired[dict[str, int] | None]
    response_identity: NotRequired[dict[str, str] | None]


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def sentence_spans(text: str) -> list[tuple[int, int]]:
    """Return trimmed sentence spans while preserving original offsets."""
    if not text.strip():
        raise ValueError("full_essay must not be blank")
    spans: list[tuple[int, int]] = []
    cursor = 0
    for boundary in re.finditer(r"[.!?。！？]+(?=\s+|$)", text):
        start = cursor
        while start < boundary.end() and text[start].isspace():
            start += 1
        end = boundary.end()
        if start < end:
            spans.append((start, end))
        cursor = end
    while cursor < len(text) and text[cursor].isspace():
        cursor += 1
    if cursor < len(text):
        spans.append((cursor, len(text)))
    if not spans:
        raise ValueError("full_essay could not be split into sentences")
    return spans


def transform_full_essay(
    case: dict[str, Any], variant: VariantName
) -> tuple[str, dict[str, Any]]:
    full_essay = case["full_essay"]
    target = case["target_sentence"]
    occurrences = full_essay.count(target)
    if occurrences != 1:
        raise ValueError(
            f"{case['case_id']}: target_sentence must occur exactly once in full_essay"
        )
    spans = sentence_spans(full_essay)
    matching_indices = [
        index for index, (start, end) in enumerate(spans) if full_essay[start:end] == target
    ]
    if len(matching_indices) != 1:
        raise ValueError(
            f"{case['case_id']}: target_sentence must equal one complete sentence"
        )
    target_index = matching_indices[0]

    if variant == "target-only":
        selected_indices = [target_index]
        transformed = target
    elif variant == "local-window":
        if target_index == 0 or target_index == len(spans) - 1:
            raise ValueError(
                f"{case['case_id']}: local-window requires both neighboring sentences"
            )
        selected_indices = [target_index - 1, target_index, target_index + 1]
        start = spans[selected_indices[0]][0]
        end = spans[selected_indices[-1]][1]
        transformed = full_essay[start:end]
    else:
        raise ValueError(f"Unknown context-ablation variant: {variant}")

    if transformed.count(target) != 1:
        raise ValueError(
            f"{case['case_id']}: transformed full_essay must contain target once"
        )
    if variant == "local-window" and len(transformed) >= len(full_essay):
        raise ValueError(
            f"{case['case_id']}: local-window must be shorter than full_essay"
        )
    return transformed, {
        "canonicalSentenceCount": len(spans),
        "targetSentenceIndex": target_index,
        "selectedSentenceIndices": selected_indices,
        "targetOccurrencesInCanonicalEssay": occurrences,
        "targetOccurrencesInSentEssayValue": transformed.count(target),
    }


def extract_token_usage(raw_message: Any) -> dict[str, int] | None:
    usage = getattr(raw_message, "usage_metadata", None)
    if isinstance(usage, dict):
        normalized = {
            key: int(usage[key])
            for key in ("input_tokens", "output_tokens", "total_tokens")
            if isinstance(usage.get(key), (int, float))
        }
        if normalized:
            return normalized

    metadata = getattr(raw_message, "response_metadata", None)
    if not isinstance(metadata, dict):
        return None
    provider_usage = metadata.get("token_usage") or metadata.get("usage")
    if not isinstance(provider_usage, dict):
        return None
    key_map = {
        "prompt_tokens": "input_tokens",
        "completion_tokens": "output_tokens",
        "total_tokens": "total_tokens",
        "input_tokens": "input_tokens",
        "output_tokens": "output_tokens",
    }
    normalized: dict[str, int] = {}
    for source_key, target_key in key_map.items():
        value = provider_usage.get(source_key)
        if isinstance(value, (int, float)):
            normalized[target_key] = int(value)
    return normalized or None


def extract_response_identity(raw_message: Any) -> dict[str, str] | None:
    metadata = getattr(raw_message, "response_metadata", None)
    if not isinstance(metadata, dict):
        return None
    key_map = {
        "model_name": "modelName",
        "model": "modelName",
        "system_fingerprint": "systemFingerprint",
        "request_id": "requestId",
        "id": "responseId",
    }
    identity: dict[str, str] = {}
    for source_key, target_key in key_map.items():
        value = metadata.get(source_key)
        if isinstance(value, str) and value and target_key not in identity:
            identity[target_key] = value[:300]
    return identity or None


def build_graph(model: ChatOpenAI, system_prompt: str, user_template: str):
    structured_model = model.with_structured_output(
        v4.Output, method="function_calling", strict=True, include_raw=True
    )

    def call_model(state: AblationState) -> dict[str, Any]:
        result = structured_model.invoke(
            [
                SystemMessage(system_prompt),
                HumanMessage(v4.render_user_prompt(user_template, state)),
            ]
        )
        parsed = result["parsed"]
        if parsed is None:
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text(result["raw"]))
            parsed = v4.Output.model_validate_json(text)
        return {
            "output": parsed.model_dump(),
            "token_usage": extract_token_usage(result["raw"]),
            "response_identity": extract_response_identity(result["raw"]),
        }

    graph = StateGraph(AblationState)
    graph.add_node("call_model", call_model)
    graph.add_edge(START, "call_model")
    graph.add_edge("call_model", END)
    return graph.compile()


def validate_experiment_definition() -> dict[str, Any]:
    definition = read_json(EXPERIMENT_DEFINITION_PATH)
    expected_top_level = {
        "experimentId": EXPERIMENT_ID,
        "status": "defined",
        "decisionAuthority": "hypothesis_generation_only",
        "evalSetId": v4.EVAL_SET_ID,
        "rubricVersion": "expression-scaffold-rubric.v4",
        "promptVersion": v4.PROMPT_VERSION,
        "outputSchemaId": v4.SCHEMA_ID,
        "independentVariable": "full_essay_context_scope",
        "transformVersion": TRANSFORM_VERSION,
    }
    for key, expected in expected_top_level.items():
        if definition.get(key) != expected:
            raise ValueError(f"Experiment definition mismatch: {key}")
    expected_conditions = {
        "A": ("full-essay", "canonical_full_essay"),
        "B": ("local-window", "previous_target_next"),
        "C": ("target-only", "target_sentence_only"),
    }
    actual_conditions = {
        entry.get("id"): (entry.get("name"), entry.get("fullEssayPolicy"))
        for entry in definition.get("conditions", [])
        if isinstance(entry, dict)
    }
    if actual_conditions != expected_conditions:
        raise ValueError("Experiment condition definitions differ from runner")
    source_pins = definition.get("sourcePins")
    if not isinstance(source_pins, dict):
        raise ValueError("Experiment definition is missing sourcePins")
    current_pins = {
        "promptSha256": sha256_file(v4.V4_PROMPT_PATH),
        "outputSchemaSha256": sha256_file(v4.V4_SCHEMA_PATH),
        "v4FreezeManifestSha256": sha256_file(v4.V4_MANIFEST_PATH),
        "v4RunnerSha256": sha256_file(Path(v4.__file__).resolve()),
    }
    for key, actual in current_pins.items():
        if source_pins.get(key) != actual:
            raise ValueError(f"Experiment source pin mismatch: {key}")
    return definition


def baseline_reference() -> dict[str, Any]:
    experiment = validate_experiment_definition()
    manifest_path = BASELINE_RUN_DIR / "run-manifest.json"
    outputs_path = BASELINE_RUN_DIR / "model-outputs.jsonl"
    views_path = BASELINE_RUN_DIR / "initial-user-views.jsonl"
    manifest = read_json(manifest_path)
    if manifest.get("status") != "completed":
        raise ValueError("Referenced full-essay v4 baseline is not completed")
    if manifest.get("evalSetId") != v4.EVAL_SET_ID:
        raise ValueError("Referenced baseline uses a different eval set")
    if manifest.get("promptVersion") != v4.PROMPT_VERSION:
        raise ValueError("Referenced baseline uses a different prompt")
    if manifest.get("outputSchemaId") != v4.SCHEMA_ID:
        raise ValueError("Referenced baseline uses a different output schema")
    expected_model_config = {
        "temperature": 0,
        "maxTokens": 4096,
        "maxRetries": 0,
        "timeoutSeconds": 120,
        "structuredOutputMethod": "function_calling",
    }
    for key, expected in expected_model_config.items():
        if manifest.get("model", {}).get(key) != expected:
            raise ValueError(f"Referenced baseline model setting differs: {key}")
    if manifest.get("provider") != "openai_compatible":
        raise ValueError("Referenced baseline provider configuration differs")
    reference = {
        "conditionId": "A",
        "runId": BASELINE_RUN_ID,
        "runManifestSha256": sha256_file(manifest_path),
        "modelOutputsSha256": sha256_file(outputs_path),
        "initialUserViewsSha256": sha256_file(views_path),
        "historicalComparison": True,
    }
    expected_reference = experiment.get("baselineReference")
    if not isinstance(expected_reference, dict):
        raise ValueError("Experiment definition is missing baselineReference")
    for key in (
        "runId",
        "runManifestSha256",
        "modelOutputsSha256",
        "initialUserViewsSha256",
    ):
        if expected_reference.get(key) != reference.get(key):
            raise ValueError(f"Experiment baseline reference mismatch: {key}")
    for key in (
        "prompt",
        "outputSchema",
        "v4FreezeManifest",
        "runner",
    ):
        current = manifest.get("sourceHashes", {}).get(key)
        if not isinstance(current, str):
            raise ValueError(f"Baseline manifest is missing source hash: {key}")
    if manifest["sourceHashes"]["prompt"] != sha256_file(v4.V4_PROMPT_PATH):
        raise ValueError("Current v4 prompt differs from referenced baseline")
    if manifest["sourceHashes"]["outputSchema"] != sha256_file(v4.V4_SCHEMA_PATH):
        raise ValueError("Current v4 output schema differs from referenced baseline")
    if manifest["sourceHashes"]["v4FreezeManifest"] != sha256_file(
        v4.V4_MANIFEST_PATH
    ):
        raise ValueError("Current v4 freeze manifest differs from referenced baseline")
    if manifest["sourceHashes"]["runner"] != sha256_file(Path(v4.__file__).resolve()):
        raise ValueError("Current v4 runner differs from referenced baseline")
    return reference


def prepare_cases(
    definition: dict[str, Any], variant: VariantName
) -> list[dict[str, Any]]:
    prepared: list[dict[str, Any]] = []
    for case in definition["cases"]:
        sent_full_essay, transform = transform_full_essay(case, variant)
        state: AblationState = {
            "task_prompt": case["task_prompt"],
            "full_essay": sent_full_essay,
            "target_sentence": case["target_sentence"],
        }
        rendered = v4.render_user_prompt(definition["user_template"], state)
        prepared.append(
            {
                "case": case,
                "state": state,
                "snapshot": {
                    "experimentId": EXPERIMENT_ID,
                    "variantId": VARIANTS[variant]["id"],
                    "case_id": case["case_id"],
                    "task_prompt": case["task_prompt"],
                    "full_essay_value_sent": sent_full_essay,
                    "target_sentence": case["target_sentence"],
                    "transform": transform,
                    "fieldCharCounts": {
                        "task_prompt": len(case["task_prompt"]),
                        "canonical_full_essay": len(case["full_essay"]),
                        "sent_full_essay": len(sent_full_essay),
                        "target_sentence": len(case["target_sentence"]),
                    },
                    "canonicalFullEssaySha256": sha256_text(case["full_essay"]),
                    "sentFullEssaySha256": sha256_text(sent_full_essay),
                    "renderedUserMessageSha256": sha256_text(rendered),
                    "renderedUserMessageChars": len(rendered),
                },
            }
        )
    return prepared


def aggregate_input_stats(prepared: list[dict[str, Any]]) -> dict[str, Any]:
    totals = {
        "taskPromptChars": 0,
        "canonicalFullEssayChars": 0,
        "sentFullEssayChars": 0,
        "targetSentenceChars": 0,
        "renderedUserMessageChars": 0,
    }
    for entry in prepared:
        counts = entry["snapshot"]["fieldCharCounts"]
        totals["taskPromptChars"] += counts["task_prompt"]
        totals["canonicalFullEssayChars"] += counts["canonical_full_essay"]
        totals["sentFullEssayChars"] += counts["sent_full_essay"]
        totals["targetSentenceChars"] += counts["target_sentence"]
        totals["renderedUserMessageChars"] += entry["snapshot"][
            "renderedUserMessageChars"
        ]
    canonical = totals["canonicalFullEssayChars"]
    sent = totals["sentFullEssayChars"]
    totals["fullEssayCharsRemoved"] = canonical - sent
    totals["fullEssayReductionRatio"] = round((canonical - sent) / canonical, 6)
    return totals


def make_manifest(
    run_dir: Path,
    model_name: str,
    variant: VariantName,
    prepared: list[dict[str, Any]],
) -> dict[str, Any]:
    manifest = v4.make_manifest(run_dir, model_name)
    manifest["runType"] = "offline_v4_context_ablation"
    manifest["experimentId"] = EXPERIMENT_ID
    manifest["independentVariable"] = "full_essay_context_scope"
    manifest["inputVariant"] = {
        **VARIANTS[variant],
        "name": variant,
        "transformVersion": TRANSFORM_VERSION,
        "templateAndFieldNamesUnchanged": True,
        "targetAppearsInBothEssayAndTargetFields": True,
    }
    manifest["baselineReference"] = baseline_reference()
    manifest["comparisonLimitations"] = [
        "Condition A is a historical run, not a contemporaneous interleaved control.",
        "Conditions B and C are separate sequential runs, not an interleaved run block.",
        "Condition A did not record an endpoint hash, so backend identity cannot be fully verified across A/B/C.",
        "A single temperature-zero run does not establish deterministic causality.",
        "The frozen set contains one reconstructed real fragment and nineteen AI-drafted cases.",
    ]
    manifest["inputStats"] = aggregate_input_stats(prepared)
    manifest["artifacts"] = {
        "inputSnapshots": "input-snapshots.jsonl",
        "modelOutputs": "model-outputs.jsonl",
        "initialUserViews": "initial-user-views.jsonl",
        "callMetrics": "call-metrics.jsonl",
    }
    manifest["sourceHashes"]["v4Runner"] = manifest["sourceHashes"].pop("runner")
    manifest["sourceHashes"]["runner"] = sha256_file(Path(__file__).resolve())
    manifest["sourceHashes"]["experimentDefinition"] = sha256_file(
        EXPERIMENT_DEFINITION_PATH
    )
    manifest["metrics"] = {
        "latencyMsTotal": 0,
        "latencyMsMean": None,
        "recordsWithTokenUsage": 0,
        "tokenUsageTotals": {},
    }
    return manifest


def run(
    definition: dict[str, Any],
    prepared: list[dict[str, Any]],
    variant: VariantName,
    env: dict[str, str],
    run_dir: Path,
) -> dict[str, Any]:
    reference_manifest = read_json(BASELINE_RUN_DIR / "run-manifest.json")
    if reference_manifest["model"]["name"] != env["model"]:
        raise ValueError("Ablation model must match the referenced v4 baseline")

    model = ChatOpenAI(
        model=env["model"],
        api_key=env["api_key"],
        base_url=normalized_base_url(env["base_url"]),
        temperature=0,
        timeout=120,
        max_retries=0,
        use_responses_api=False,
        extra_body={"max_tokens": 4096},
    )
    graph = build_graph(model, definition["system_prompt"], definition["user_template"])
    run_dir.mkdir(exist_ok=False)
    manifest_path = run_dir / "run-manifest.json"
    inputs_path = run_dir / "input-snapshots.jsonl"
    outputs_path = run_dir / "model-outputs.jsonl"
    views_path = run_dir / "initial-user-views.jsonl"
    metrics_path = run_dir / "call-metrics.jsonl"
    manifest = make_manifest(run_dir, env["model"], variant, prepared)
    manifest["providerEndpointSha256"] = sha256_text(
        normalized_base_url(env["base_url"])
    )
    write_json_exclusive(manifest_path, manifest)

    latency_total = 0
    token_totals: dict[str, int] = {}
    token_records = 0
    try:
        with (
            inputs_path.open("x", encoding="utf-8", newline="\n") as inputs,
            outputs_path.open("x", encoding="utf-8", newline="\n") as outputs,
            views_path.open("x", encoding="utf-8", newline="\n") as views,
            metrics_path.open("x", encoding="utf-8", newline="\n") as metrics,
        ):
            for entry in prepared:
                case = entry["case"]
                write_json_line(inputs, entry["snapshot"])
                record: dict[str, Any] = {"case_id": case["case_id"]}
                succeeded = False
                usage: dict[str, int] | None = None
                processing_started = time.perf_counter()
                model_call_latency_ms = 0
                try:
                    model_started = time.perf_counter()
                    result = graph.invoke(entry["state"])
                    model_call_latency_ms = max(
                        0, round((time.perf_counter() - model_started) * 1000)
                    )
                    output = result["output"]
                    usage = result.get("token_usage")
                    response_identity = result.get("response_identity")
                    record["output"] = output
                    parsed = v4.validate_output(output, case)
                    projection = v4.project_user_view(parsed, set())
                    v4.validate_initial_projection(parsed, projection)
                    write_json_line(
                        views,
                        {"case_id": case["case_id"], "user_view": projection},
                    )
                    succeeded = True
                except Exception as error:
                    if model_call_latency_ms == 0 and "model_started" in locals():
                        model_call_latency_ms = max(
                            0, round((time.perf_counter() - model_started) * 1000)
                        )
                    stage = "contract_validation" if "output" in record else "model_invocation"
                    record["error"] = error_payload(error, stage, env)
                    response_identity = None
                processing_latency_ms = max(
                    0, round((time.perf_counter() - processing_started) * 1000)
                )
                latency_total += model_call_latency_ms
                metric_record: dict[str, Any] = {
                    "case_id": case["case_id"],
                    "succeeded": succeeded,
                    "modelCallLatencyMs": model_call_latency_ms,
                    "caseProcessingLatencyMs": processing_latency_ms,
                    "tokenUsage": usage,
                    "responseIdentity": response_identity,
                }
                if usage:
                    token_records += 1
                    for key, value in usage.items():
                        token_totals[key] = token_totals.get(key, 0) + value
                write_json_line(metrics, metric_record)
                write_json_line(outputs, record)
                counters = manifest["execution"]["actual"]
                counters["attempted"] += 1
                counters["succeeded" if succeeded else "failed"] += 1
                print(f"{case['case_id']} {'ok' if succeeded else 'error'}")
        manifest["artifactHashes"] = {
            "inputSnapshots": sha256_file(inputs_path),
            "modelOutputs": sha256_file(outputs_path),
            "initialUserViews": sha256_file(views_path),
            "callMetrics": sha256_file(metrics_path),
        }
        manifest["status"] = (
            "completed"
            if manifest["execution"]["actual"]["failed"] == 0
            else "completed_with_errors"
        )
    except KeyboardInterrupt:
        manifest["status"] = "interrupted"
        manifest["runError"] = {
            "stage": "runner",
            "type": "KeyboardInterrupt",
            "message": "Run interrupted by operator",
        }
        raise
    except Exception as error:
        manifest["status"] = "failed"
        manifest["runError"] = error_payload(error, "runner", env)
        raise
    finally:
        attempted = manifest["execution"]["actual"]["attempted"]
        manifest["metrics"] = {
            "modelCallLatencyMsTotal": latency_total,
            "modelCallLatencyMsMean": round(latency_total / attempted, 2)
            if attempted
            else None,
            "recordsWithTokenUsage": token_records,
            "tokenUsageTotals": token_totals,
        }
        manifest["completedAt"] = utc_now()
        replace_json(manifest_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the frozen-v4 full_essay context-scope ablation."
    )
    parser.add_argument("--variant", choices=sorted(VARIANTS), required=True)
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    env: dict[str, str] = {}
    try:
        definition = v4.load_definition()
        variant: VariantName = args.variant
        prepared = prepare_cases(definition, variant)
        baseline_reference()
        env = read_env(args.env_file) if args.env_file else {}
        run_dir = v4.validate_run_dir(args.run_dir) if args.run_dir else None
        if args.validate_only:
            stats = aggregate_input_stats(prepared)
            print(
                f"context ablation validation passed: variant={variant}; "
                f"cases={len(prepared)}; "
                f"full_essay_chars={stats['sentFullEssayChars']}/"
                f"{stats['canonicalFullEssayChars']}; "
                f"environment={'checked' if env else 'not_requested'}; "
                f"run_dir={'checked' if run_dir else 'not_requested'}."
            )
            return
        if not env:
            parser.error("--env-file is required unless --validate-only is used")
        if run_dir is None:
            parser.error("--run-dir is required unless --validate-only is used")
        manifest = run(definition, prepared, variant, env, run_dir)
        actual = manifest["execution"]["actual"]
        print(
            f"context ablation run complete: variant={variant}, "
            f"status={manifest['status']}, calls={actual['attempted']}, "
            f"failures={actual['failed']}"
        )
    except SystemExit:
        raise
    except Exception as error:
        raise SystemExit(
            f"run_context_ablation_v4 failed: {sanitize_error(error, env)}"
        ) from None


if __name__ == "__main__":
    main()
