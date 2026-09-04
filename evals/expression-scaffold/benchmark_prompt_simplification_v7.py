"""Compare verbose and compact v7 system prompts on the frozen v4 cases."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict, Field, model_validator

import run_eval_v4 as v4
from benchmark_model_latency_v4 import Profile, api_base
from run_context_ablation_v4 import extract_response_identity, extract_token_usage
from run_eval import error_payload, raw_text, read_env, sanitize_error


EXPERIMENT_DIR = v4.EVAL_DIR / "experiments" / "prompt-simplification-v7-20260825"
SCHEMA_PATH = EXPERIMENT_DIR / "controlled-output.schema.json"
SCHEMA_ID = "expression-scaffold-controlled-generation.v7-prompt-simplification-experiment"
PROMPTS = {
    "full": {
        "path": v4.EVAL_DIR / "prompts" / "baseline-v7-full-controlled.md",
        "version": "expression-scaffold-v7-full-controlled-rules",
    },
    "compact": {
        "path": v4.EVAL_DIR / "prompts" / "baseline-v7-compact-controlled.md",
        "version": "expression-scaffold-v7-compact-controlled-rules",
    },
}
STANDALONE_FUNCTION_FOCUSES = {
    "同时",
    "可能",
    "更多",
    "仍",
    "仍然",
    "仅",
    "只",
    "也",
    "而",
    "并且",
    "但是",
    "所以",
    "因此",
    "会",
    "的",
}


class DirectExpression(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str = Field(pattern=r"^i[1-9][0-9]*$")
    recommendedExpression: str = Field(min_length=1)


class ControlledScaffoldSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str = Field(pattern=r"^i[1-9][0-9]*$")
    scaffolds: list[v4.Scaffold] = Field(min_length=2, max_length=3)

    @model_validator(mode="after")
    def validate_scaffolds(self) -> "ControlledScaffoldSet":
        ids = [scaffold.scaffoldId for scaffold in self.scaffolds]
        focuses = [scaffold.focusZh for scaffold in self.scaffolds]
        if ids != [f"s{index}" for index in range(1, len(ids) + 1)]:
            raise ValueError("scaffold ids must be consecutive from s1")
        if len(set(focuses)) != len(focuses):
            raise ValueError("focusZh values must be unique")
        return self


class ControlledOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    directExpressions: list[DirectExpression]
    scaffoldSets: list[ControlledScaffoldSet]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def append_jsonl(handle: Any, value: Any) -> None:
    handle.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
    handle.flush()


def percentile_nearest(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(percentile * len(ordered)) - 1)]


def chinese_character_count(value: str) -> int:
    return len(re.findall(r"[\u3400-\u9fff]", value))


def route_policy(source_zh: str) -> Literal["provide_expression", "offer_scaffolds"]:
    return "provide_expression" if chinese_character_count(source_zh) <= 10 else "offer_scaffolds"


def controlled_items(case: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "itemId": f"i{index}",
            "sourceZh": segment["sourceZh"],
            "requiredAction": route_policy(segment["sourceZh"]),
        }
        for index, segment in enumerate(case["segments"], start=1)
    ]


def route_policy_audit(cases: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [
        {
            "case_id": case["case_id"],
            "segment_index": segment["segment_index"],
            "policyAction": route_policy(segment["sourceZh"]),
            "frozenAction": segment["expected_action"],
        }
        for case in cases
        for segment in case["segments"]
    ]
    mismatches = [row for row in rows if row["policyAction"] != row["frozenAction"]]
    return {"segments": len(rows), "matches": len(rows) - len(mismatches), "mismatches": mismatches}


def read_prompt(variant: str) -> tuple[str, str, dict[str, Any]]:
    specification = PROMPTS[variant]
    markdown = specification["path"].read_text("utf-8")
    match = re.search(r"`prompt_version`[^`]*`([^`]+)`", markdown)
    if not match or match.group(1) != specification["version"]:
        raise ValueError(f"Unexpected {variant} prompt version")
    system_prompt = v4.fenced(markdown, "System prompt")
    user_template = v4.fenced(markdown, "User message template")
    for placeholder in ("{{task_prompt}}", "{{full_essay}}", "{{target_sentence}}", "{{items_json}}"):
        if placeholder not in user_template:
            raise ValueError(f"{variant} user template missing {placeholder}")
    return system_prompt, user_template, {
        "systemCharacters": len(system_prompt),
        "systemUtf8Bytes": len(system_prompt.encode("utf-8")),
        "systemLines": len(system_prompt.splitlines()),
    }


def render_user_prompt(template: str, case: dict[str, Any]) -> str:
    return (
        template.replace("{{task_prompt}}", case["task_prompt"])
        .replace("{{full_essay}}", case["full_essay"])
        .replace("{{target_sentence}}", case["target_sentence"])
        .replace("{{items_json}}", json.dumps(controlled_items(case), ensure_ascii=False, separators=(",", ":")))
    )


def build_model(profile: Profile) -> Any:
    env = profile.env
    extra_body: dict[str, Any] = {"max_tokens": int(env.get("max_tokens", "4096"))}
    thinking_type = env.get("thinking_type")
    if thinking_type:
        extra_body["thinking"] = {"type": thinking_type}
    model = ChatOpenAI(
        model=env["model"],
        api_key=env["api_key"],
        base_url=api_base(env),
        temperature=float(env.get("temperature", "0")),
        timeout=float(env.get("timeout_seconds", "120")),
        max_retries=0,
        use_responses_api=False,
        extra_body=extra_body,
    )
    return model.with_structured_output(
        ControlledOutput, method="function_calling", strict=True, include_raw=True
    )


def normalize_focus(value: str) -> str:
    return re.sub(r"[\s，。！？；：、,.!?;:…—-]+", "", value)


def standalone_focus_violations(controlled: ControlledOutput) -> list[dict[str, str]]:
    violations: list[dict[str, str]] = []
    for item in controlled.scaffoldSets:
        for scaffold in item.scaffolds:
            normalized = normalize_focus(scaffold.focusZh)
            if normalized in STANDALONE_FUNCTION_FOCUSES:
                violations.append(
                    {"itemId": item.itemId, "scaffoldId": scaffold.scaffoldId, "focusZh": scaffold.focusZh}
                )
    return violations


def merge_controlled_output(controlled: ControlledOutput, case: dict[str, Any]) -> dict[str, Any]:
    specifications = controlled_items(case)
    expected_direct = [item["itemId"] for item in specifications if item["requiredAction"] == "provide_expression"]
    expected_scaffolds = [item["itemId"] for item in specifications if item["requiredAction"] == "offer_scaffolds"]
    if [item.itemId for item in controlled.directExpressions] != expected_direct:
        raise ValueError("direct expression item ids must exactly match local routing")
    if [item.itemId for item in controlled.scaffoldSets] != expected_scaffolds:
        raise ValueError("scaffold set item ids must exactly match local routing")
    direct_by_id = {item.itemId: item for item in controlled.directExpressions}
    scaffold_by_id = {item.itemId: item for item in controlled.scaffoldSets}
    items: list[dict[str, Any]] = []
    for specification in specifications:
        item_id = specification["itemId"]
        source_zh = specification["sourceZh"]
        action = specification["requiredAction"]
        if action == "provide_expression":
            items.append({
                "sourceZh": source_zh,
                "action": action,
                "recommendedExpression": direct_by_id[item_id].recommendedExpression,
                "scaffolds": [],
            })
        else:
            items.append({
                "sourceZh": source_zh,
                "action": action,
                "recommendedExpression": None,
                "scaffolds": [scaffold.model_dump() for scaffold in scaffold_by_id[item_id].scaffolds],
            })
    return {"items": items}


def invoke_once(
    structured_model: Any,
    system_prompt: str,
    user_template: str,
    case: dict[str, Any],
    profile: Profile,
) -> dict[str, Any]:
    started = time.perf_counter()
    controlled_payload: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    raw_message: Any = None
    violations: list[dict[str, str]] = []
    try:
        result = structured_model.invoke([
            SystemMessage(system_prompt),
            HumanMessage(render_user_prompt(user_template, case)),
        ])
        raw_message = result["raw"]
        parsed = result["parsed"]
        if parsed is None:
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text(raw_message))
            parsed = ControlledOutput.model_validate_json(text)
        controlled_payload = parsed.model_dump()
        violations = standalone_focus_violations(parsed)
        output = merge_controlled_output(parsed, case)
        validated = v4.validate_output(output, case)
        v4.validate_initial_projection(validated, v4.project_user_view(validated, set()))
        succeeded = True
        error = None
    except Exception as caught:
        succeeded = False
        error = error_payload(
            caught,
            "contract_validation" if controlled_payload is not None else "model_invocation",
            profile.env,
        )
    return {
        "succeeded": succeeded,
        "latencyMs": max(0, round((time.perf_counter() - started) * 1000)),
        "tokenUsage": extract_token_usage(raw_message) if raw_message is not None else None,
        "responseIdentity": extract_response_identity(raw_message) if raw_message is not None else None,
        "standaloneFunctionFocusViolations": violations,
        "controlledOutput": controlled_payload,
        "output": output,
        "error": error,
    }


def summarize_variant(records: list[dict[str, Any]]) -> dict[str, Any]:
    latencies = [int(row["latencyMs"]) for row in records]
    succeeded = [row for row in records if row["succeeded"]]
    token_rows = [row["tokenUsage"] for row in records if row.get("tokenUsage")]
    token_averages: dict[str, float] = {}
    for key in ("input_tokens", "output_tokens", "total_tokens"):
        values = [int(row[key]) for row in token_rows if key in row]
        if values:
            token_averages[key] = round(statistics.fmean(values), 1)
    scaffold_counts = [
        len(item["scaffolds"])
        for row in succeeded
        for item in (row["controlledOutput"] or {}).get("scaffoldSets", [])
    ]
    violation_rows = [
        violation
        for row in records
        for violation in row["standaloneFunctionFocusViolations"]
    ]
    return {
        "calls": len(records),
        "succeeded": len(succeeded),
        "failed": len(records) - len(succeeded),
        "successRate": round(len(succeeded) / len(records), 4) if records else None,
        "latencyMs": {
            "mean": round(statistics.fmean(latencies), 1) if latencies else None,
            "p50": percentile_nearest(latencies, 0.5),
            "p90": percentile_nearest(latencies, 0.9),
            "min": min(latencies) if latencies else None,
            "max": max(latencies) if latencies else None,
        },
        "averageTokenUsage": token_averages or None,
        "scaffoldSets": len(scaffold_counts),
        "scaffoldCountDistribution": {str(value): scaffold_counts.count(value) for value in sorted(set(scaffold_counts))},
        "standaloneFunctionFocusViolations": len(violation_rows),
        "violationDetails": violation_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Benchmark full and compact v7 prompts")
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--case-id", action="append")
    parser.add_argument("--repetitions", type=int, default=2)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.repetitions <= 3:
        parser.error("repetitions must be between 1 and 3")

    definition = v4.load_definition()
    case_by_id = {case["case_id"]: case for case in definition["cases"]}
    case_ids = tuple(args.case_id or case_by_id.keys())
    missing = [case_id for case_id in case_ids if case_id not in case_by_id]
    if missing:
        parser.error(f"unknown case ids: {', '.join(missing)}")
    cases = [case_by_id[case_id] for case_id in case_ids]
    prompts = {variant: read_prompt(variant) for variant in PROMPTS}
    schema = json.loads(SCHEMA_PATH.read_text("utf-8"))
    if schema.get("$id") != SCHEMA_ID:
        raise ValueError("Unexpected v7 controlled schema id")
    policy_audit = route_policy_audit(definition["cases"])

    if args.validate_only:
        print(json.dumps({
            "status": "valid",
            "evalSetId": v4.EVAL_SET_ID,
            "controlledSchemaId": SCHEMA_ID,
            "caseIds": list(case_ids),
            "promptVersions": {key: value["version"] for key, value in PROMPTS.items()},
            "promptSizes": {key: prompts[key][2] for key in prompts},
            "fullFrozenPolicyAudit": policy_audit,
            "streaming": False,
            "automaticRetry": False,
        }, ensure_ascii=False, indent=2))
        return

    if args.env_file is None or args.run_dir is None:
        parser.error("--env-file and --run-dir are required unless --validate-only is used")
    run_dir = v4.validate_run_dir(args.run_dir)
    env_path = args.env_file.resolve()
    env = read_env(env_path)
    profile = Profile("deepseek", env_path, env)
    structured_model = build_model(profile)
    run_dir.mkdir(parents=False, exist_ok=False)

    manifest = {
        "manifestVersion": 1,
        "runId": run_dir.name,
        "runType": "offline_prompt_simplification_v7_interleaved_benchmark",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": v4.EVAL_SET_ID,
        "evalSetStatus": "frozen",
        "caseIds": list(case_ids),
        "repetitions": args.repetitions,
        "variants": {
            key: {"promptVersion": value["version"], **prompts[key][2]}
            for key, value in PROMPTS.items()
        },
        "controlledOutputSchemaId": SCHEMA_ID,
        "finalOutputSchemaId": v4.SCHEMA_ID,
        "sharedRules": {
            "scaffoldCount": "default_2_maximum_3",
            "standaloneFunctionFocus": "forbidden_and_absorbed_into_content_focus",
            "applicationOwned": ["itemId", "sourceZh", "requiredAction", "final merge"],
        },
        "callPolicy": {"streaming": False, "automaticRetry": False, "interleaved": True},
        "routePolicy": {
            "type": "deterministic_chinese_character_threshold",
            "provideExpressionMaximum": 10,
            "offerScaffoldsMinimum": 11,
            "fullFrozenAudit": policy_audit,
            "generalization": "unproven_outside_current_frozen_set",
        },
        "model": {
            "provider": env.get("provider", "openai_compatible"),
            "name": env["model"],
            "thinkingType": env.get("thinking_type"),
            "temperature": float(env.get("temperature", "0")),
            "maxTokens": int(env.get("max_tokens", "4096")),
            "maxRetries": 0,
            "timeoutSeconds": float(env.get("timeout_seconds", "120")),
            "endpointSha256": sha256_text(api_base(env)),
        },
        "artifacts": {"records": "records.jsonl", "summary": "summary.json"},
        "sourceHashes": {
            "v4FreezeManifest": v4.sha256_file(v4.V4_MANIFEST_PATH),
            "v4Cases": v4.sha256_file(v4.V4_CASES_PATH),
            "fullPrompt": v4.sha256_file(PROMPTS["full"]["path"]),
            "compactPrompt": v4.sha256_file(PROMPTS["compact"]["path"]),
            "controlledOutputSchema": v4.sha256_file(SCHEMA_PATH),
            "runner": v4.sha256_file(Path(__file__).resolve()),
        },
    }
    manifest_path = run_dir / "run-manifest.json"
    records_path = run_dir / "records.jsonl"
    summary_path = run_dir / "summary.json"
    write_json(manifest_path, manifest)
    records: list[dict[str, Any]] = []

    try:
        with records_path.open("x", encoding="utf-8", newline="\n") as handle:
            for repetition in range(1, args.repetitions + 1):
                for case_index, case in enumerate(cases):
                    order = ("full", "compact") if (repetition + case_index) % 2 else ("compact", "full")
                    for variant in order:
                        system_prompt, user_template, _ = prompts[variant]
                        result = invoke_once(structured_model, system_prompt, user_template, case, profile)
                        record = {
                            "variant": variant,
                            "promptVersion": PROMPTS[variant]["version"],
                            "model": env["model"],
                            "case_id": case["case_id"],
                            "repetition": repetition,
                            "controlledItems": controlled_items(case),
                            **result,
                        }
                        records.append(record)
                        append_jsonl(handle, record)
                        print(
                            f"r{repetition} {case['case_id']} {variant} "
                            f"{'ok' if result['succeeded'] else 'error'} {result['latencyMs']}ms",
                            flush=True,
                        )
        by_variant = {
            variant: summarize_variant([row for row in records if row["variant"] == variant])
            for variant in PROMPTS
        }
        full = by_variant["full"]
        compact = by_variant["compact"]
        summary = {
            "model": env["model"],
            "calls": len(records),
            "repetitions": args.repetitions,
            "variants": by_variant,
            "compactMinusFull": {
                "systemCharacters": prompts["compact"][2]["systemCharacters"] - prompts["full"][2]["systemCharacters"],
                "meanLatencyMs": round(compact["latencyMs"]["mean"] - full["latencyMs"]["mean"], 1),
                "p50LatencyMs": compact["latencyMs"]["p50"] - full["latencyMs"]["p50"],
                "p90LatencyMs": compact["latencyMs"]["p90"] - full["latencyMs"]["p90"],
                "averageInputTokens": round(
                    compact["averageTokenUsage"]["input_tokens"] - full["averageTokenUsage"]["input_tokens"], 1
                ) if compact["averageTokenUsage"] and full["averageTokenUsage"] else None,
                "averageOutputTokens": round(
                    compact["averageTokenUsage"]["output_tokens"] - full["averageTokenUsage"]["output_tokens"], 1
                ) if compact["averageTokenUsage"] and full["averageTokenUsage"] else None,
                "protocolFailures": compact["failed"] - full["failed"],
                "standaloneFunctionFocusViolations": compact["standaloneFunctionFocusViolations"] - full["standaloneFunctionFocusViolations"],
            },
            "automaticQualityBoundary": "structural_and_explicit_granularity_rules_only; semantic quality requires human review",
        }
        write_json(summary_path, summary)
        manifest["status"] = "completed"
        manifest["summary"] = summary
    except Exception as error:
        manifest["status"] = "failed"
        manifest["runError"] = sanitize_error(error, env)[:2000]
        raise
    finally:
        manifest["completedAt"] = utc_now()
        write_json(manifest_path, manifest)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
