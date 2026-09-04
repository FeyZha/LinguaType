"""Run the LinguaType v6 controlled-generation experiment on DeepSeek.

The application owns source segmentation and action routing. The model only
fills direct English expressions or scaffold bundles, which are merged back
into the frozen v4 user-facing contract and validated locally.
"""

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
from run_deepseek_prompt_v5_targeted import TARGET_CASE_IDS


PROMPT_PATH = v4.EVAL_DIR / "prompts" / "baseline-v6-controlled-generation.md"
EXPERIMENT_DIR = (
    v4.EVAL_DIR / "experiments" / "control-boundary-v6-20260825"
)
CONTROLLED_SCHEMA_PATH = EXPERIMENT_DIR / "controlled-output.schema.json"
PROMPT_VERSION = "expression-scaffold-v6-controlled-source-and-route"
CONTROLLED_SCHEMA_ID = "expression-scaffold-controlled-generation.v6-experiment"


class DirectExpression(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str = Field(pattern=r"^i[1-9][0-9]*$")
    recommendedExpression: str = Field(min_length=1)


class ControlledScaffoldSet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemId: str = Field(pattern=r"^i[1-9][0-9]*$")
    scaffolds: list[v4.Scaffold] = Field(min_length=2, max_length=4)

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
    index = max(0, math.ceil(percentile * len(ordered)) - 1)
    return ordered[index]


def chinese_character_count(value: str) -> int:
    return len(re.findall(r"[\u3400-\u9fff]", value))


def route_policy(source_zh: str) -> Literal["provide_expression", "offer_scaffolds"]:
    return (
        "provide_expression"
        if chinese_character_count(source_zh) <= 10
        else "offer_scaffolds"
    )


def route_policy_audit(cases: list[dict[str, Any]]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    for case in cases:
        for segment in case["segments"]:
            actual = route_policy(segment["sourceZh"])
            expected = segment["expected_action"]
            rows.append(
                {
                    "case_id": case["case_id"],
                    "segment_index": segment["segment_index"],
                    "chineseCharacters": chinese_character_count(segment["sourceZh"]),
                    "policyAction": actual,
                    "frozenAction": expected,
                    "matches": actual == expected,
                }
            )
    return {
        "segments": len(rows),
        "matches": sum(row["matches"] for row in rows),
        "mismatches": [row for row in rows if not row["matches"]],
    }


def read_prompt() -> tuple[str, str]:
    markdown = PROMPT_PATH.read_text("utf-8")
    match = re.search(r"`prompt_version`[^`]*`([^`]+)`", markdown)
    if not match or match.group(1) != PROMPT_VERSION:
        raise ValueError("Unexpected v6 prompt version")
    system_prompt = v4.fenced(markdown, "System prompt")
    user_template = v4.fenced(markdown, "User message template")
    if not system_prompt or not user_template:
        raise ValueError("Could not parse v6 prompt blocks")
    placeholders = (
        "{{task_prompt}}",
        "{{full_essay}}",
        "{{target_sentence}}",
        "{{items_json}}",
    )
    for placeholder in placeholders:
        if placeholder not in user_template:
            raise ValueError(f"v6 user template missing {placeholder}")
    schema = json.loads(CONTROLLED_SCHEMA_PATH.read_text("utf-8"))
    if schema.get("$id") != CONTROLLED_SCHEMA_ID:
        raise ValueError("Unexpected v6 controlled schema id")
    return system_prompt, user_template


def controlled_items(case: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {
            "itemId": f"i{index}",
            "sourceZh": segment["sourceZh"],
            "requiredAction": route_policy(segment["sourceZh"]),
        }
        for index, segment in enumerate(case["segments"], start=1)
    ]


def render_user_prompt(template: str, case: dict[str, Any]) -> str:
    return (
        template.replace("{{task_prompt}}", case["task_prompt"])
        .replace("{{full_essay}}", case["full_essay"])
        .replace("{{target_sentence}}", case["target_sentence"])
        .replace(
            "{{items_json}}",
            json.dumps(controlled_items(case), ensure_ascii=False, separators=(",", ":")),
        )
    )


def build_model(profile: Profile):
    env = profile.env
    extra_body: dict[str, Any] = {"max_tokens": int(env.get("max_tokens", "4096"))}
    thinking_type = env.get("thinking_type")
    if thinking_type:
        if thinking_type not in {"enabled", "disabled"}:
            raise ValueError("thinking_type must be enabled or disabled")
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


def merge_controlled_output(
    controlled: ControlledOutput, case: dict[str, Any]
) -> dict[str, Any]:
    specifications = controlled_items(case)
    expected_direct = [
        item["itemId"]
        for item in specifications
        if item["requiredAction"] == "provide_expression"
    ]
    expected_scaffolds = [
        item["itemId"]
        for item in specifications
        if item["requiredAction"] == "offer_scaffolds"
    ]
    direct_ids = [item.itemId for item in controlled.directExpressions]
    scaffold_ids = [item.itemId for item in controlled.scaffoldSets]
    if direct_ids != expected_direct:
        raise ValueError("direct expression item ids must exactly match local routing")
    if scaffold_ids != expected_scaffolds:
        raise ValueError("scaffold set item ids must exactly match local routing")

    direct_by_id = {item.itemId: item for item in controlled.directExpressions}
    scaffold_by_id = {item.itemId: item for item in controlled.scaffoldSets}
    merged_items: list[dict[str, Any]] = []
    for specification in specifications:
        item_id = specification["itemId"]
        source_zh = specification["sourceZh"]
        action = specification["requiredAction"]
        if action == "provide_expression":
            value = direct_by_id[item_id]
            merged_items.append(
                {
                    "sourceZh": source_zh,
                    "action": action,
                    "recommendedExpression": value.recommendedExpression,
                    "scaffolds": [],
                }
            )
            continue
        value = scaffold_by_id[item_id]
        merged_items.append(
            {
                "sourceZh": source_zh,
                "action": action,
                "recommendedExpression": None,
                "scaffolds": [
                    scaffold.model_dump() for scaffold in value.scaffolds
                ],
            }
        )
    return {"items": merged_items}


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
    try:
        result = structured_model.invoke(
            [
                SystemMessage(system_prompt),
                HumanMessage(render_user_prompt(user_template, case)),
            ]
        )
        raw_message = result["raw"]
        parsed = result["parsed"]
        if parsed is None:
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text(raw_message))
            parsed = ControlledOutput.model_validate_json(text)
        controlled_payload = parsed.model_dump()
        output = merge_controlled_output(parsed, case)
        validated = v4.validate_output(output, case)
        projection = v4.project_user_view(validated, set())
        v4.validate_initial_projection(validated, projection)
        succeeded = True
        error = None
    except Exception as caught:
        succeeded = False
        error = error_payload(
            caught,
            "contract_validation" if controlled_payload is not None else "model_invocation",
            profile.env,
        )
    latency_ms = max(0, round((time.perf_counter() - started) * 1000))
    return {
        "succeeded": succeeded,
        "routePolicyMatchesFrozen": all(
            route_policy(segment["sourceZh"]) == segment["expected_action"]
            for segment in case["segments"]
        ),
        "latencyMs": latency_ms,
        "tokenUsage": extract_token_usage(raw_message) if raw_message is not None else None,
        "responseIdentity": (
            extract_response_identity(raw_message) if raw_message is not None else None
        ),
        "controlledOutput": controlled_payload,
        "output": output,
        "error": error,
    }


def summarize(records: list[dict[str, Any]], profile: Profile) -> dict[str, Any]:
    succeeded = [row for row in records if row["succeeded"]]
    policy_matches = [row for row in records if row["routePolicyMatchesFrozen"]]
    latencies = [int(row["latencyMs"]) for row in records]
    token_rows = [row["tokenUsage"] for row in records if row.get("tokenUsage")]
    token_averages: dict[str, float] = {}
    for key in ("input_tokens", "output_tokens", "total_tokens"):
        values = [int(row[key]) for row in token_rows if key in row]
        if values:
            token_averages[key] = round(statistics.fmean(values), 1)
    return {
        "profile": "deepseek",
        "model": profile.env["model"],
        "thinkingType": profile.env.get("thinking_type"),
        "calls": len(records),
        "succeeded": len(succeeded),
        "failed": len(records) - len(succeeded),
        "successRate": round(len(succeeded) / len(records), 4) if records else None,
        "routePolicyMatchesFrozenCases": len(policy_matches),
        "routePolicyMatchRate": (
            round(len(policy_matches) / len(records), 4) if records else None
        ),
        "latencyMs": {
            "mean": round(statistics.fmean(latencies), 1) if latencies else None,
            "p50": percentile_nearest(latencies, 0.5),
            "p90": percentile_nearest(latencies, 0.9),
            "min": min(latencies) if latencies else None,
            "max": max(latencies) if latencies else None,
        },
        "averageTokenUsage": token_averages or None,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the LinguaType v6 controlled DeepSeek experiment"
    )
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--case-id", action="append")
    parser.add_argument("--repetitions", type=int, default=1)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    if not 1 <= args.repetitions <= 3:
        parser.error("repetitions must be between 1 and 3")
    definition = v4.load_definition()
    system_prompt, user_template = read_prompt()
    full_policy_audit = route_policy_audit(definition["cases"])
    case_ids = tuple(args.case_id or TARGET_CASE_IDS)
    if len(set(case_ids)) != len(case_ids):
        parser.error("case ids must be unique")
    case_by_id = {case["case_id"]: case for case in definition["cases"]}
    missing = [case_id for case_id in case_ids if case_id not in case_by_id]
    if missing:
        parser.error(f"unknown case ids: {', '.join(missing)}")
    cases = [case_by_id[case_id] for case_id in case_ids]

    if args.validate_only:
        print(
            json.dumps(
                {
                    "status": "valid",
                    "evalSetId": v4.EVAL_SET_ID,
                    "promptVersion": PROMPT_VERSION,
                    "controlledSchemaId": CONTROLLED_SCHEMA_ID,
                    "finalOutputSchemaId": v4.SCHEMA_ID,
                    "caseIds": list(case_ids),
                    "routePolicy": "Chinese characters <=10 direct; >=11 scaffolds",
                    "fullFrozenPolicyAudit": full_policy_audit,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
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
        "runType": "offline_deepseek_v6_control_boundary_experiment",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": v4.EVAL_SET_ID,
        "evalSetStatus": "frozen",
        "promptVersion": PROMPT_VERSION,
        "controlledOutputSchemaId": CONTROLLED_SCHEMA_ID,
        "finalOutputSchemaId": v4.SCHEMA_ID,
        "caseIds": list(case_ids),
        "repetitions": args.repetitions,
        "routePolicy": {
            "type": "deterministic_chinese_character_threshold",
            "provideExpressionMaximum": 10,
            "offerScaffoldsMinimum": 11,
            "fullFrozenAudit": full_policy_audit,
            "generalization": "unproven_outside_current_frozen_set",
        },
        "controlBoundary": {
            "applicationOwned": ["itemId", "sourceZh", "requiredAction", "final merge"],
            "modelOwned": ["recommendedExpression", "scaffolds"],
            "automaticRetry": False,
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
            "prompt": v4.sha256_file(PROMPT_PATH),
            "controlledOutputSchema": v4.sha256_file(CONTROLLED_SCHEMA_PATH),
            "finalOutputSchema": v4.sha256_file(v4.V4_SCHEMA_PATH),
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
                for case in cases:
                    result = invoke_once(
                        structured_model,
                        system_prompt,
                        user_template,
                        case,
                        profile,
                    )
                    record = {
                        "profile": "deepseek",
                        "model": env["model"],
                        "case_id": case["case_id"],
                        "repetition": repetition,
                        "controlledItems": controlled_items(case),
                        **result,
                    }
                    records.append(record)
                    append_jsonl(handle, record)
                    print(
                        f"r{repetition} {case['case_id']} "
                        f"{'ok' if result['succeeded'] else 'error'} "
                        f"policy={'match' if result['routePolicyMatchesFrozen'] else 'mismatch'} "
                        f"{result['latencyMs']}ms",
                        flush=True,
                    )
        summary = summarize(records, profile)
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
