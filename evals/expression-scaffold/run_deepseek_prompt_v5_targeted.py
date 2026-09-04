"""Run a targeted DeepSeek regression for the LinguaType v5 prompt.

The frozen v4 cases, output schema, and validators remain unchanged. The only
experimental changes are the v5 prompt and an explicit list of locally derived
top-level Chinese source segments in the model input.
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
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage

import run_eval_v4 as v4
from benchmark_model_latency_v4 import Profile, build_structured_model
from run_context_ablation_v4 import extract_response_identity, extract_token_usage
from run_eval import error_payload, raw_text, read_env, sanitize_error


PROMPT_PATH = v4.EVAL_DIR / "prompts" / "baseline-v5.md"
PROMPT_VERSION = "expression-scaffold-baseline-v5-explicit-source-minimum-usable-unit"
TARGET_CASE_IDS = (
    "LT-ESC-002",
    "LT-ESC-003",
    "LT-ESC-004",
    "LT-ESC-006",
    "LT-ESC-013",
    "LT-ESC-014",
    "LT-ESC-016",
    "LT-ESC-017",
    "LT-ESC-018",
)


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


def read_prompt() -> tuple[str, str]:
    markdown = PROMPT_PATH.read_text("utf-8")
    match = re.search(r"`prompt_version`[^`]*`([^`]+)`", markdown)
    if not match or match.group(1) != PROMPT_VERSION:
        raise ValueError("Unexpected v5 prompt version")
    system_prompt = v4.fenced(markdown, "System prompt")
    user_template = v4.fenced(markdown, "User message template")
    if not system_prompt or not user_template:
        raise ValueError("Could not parse v5 prompt blocks")
    placeholders = (
        "{{task_prompt}}",
        "{{full_essay}}",
        "{{target_sentence}}",
        "{{top_level_source_zh_json}}",
    )
    for placeholder in placeholders:
        if placeholder not in user_template:
            raise ValueError(f"v5 user template missing {placeholder}")
    return system_prompt, user_template


def render_user_prompt(template: str, case: dict[str, Any]) -> str:
    sources = [segment["sourceZh"] for segment in case["segments"]]
    return (
        template.replace("{{task_prompt}}", case["task_prompt"])
        .replace("{{full_essay}}", case["full_essay"])
        .replace("{{target_sentence}}", case["target_sentence"])
        .replace(
            "{{top_level_source_zh_json}}",
            json.dumps(sources, ensure_ascii=False, separators=(",", ":")),
        )
    )


def route_matches_gold(output: dict[str, Any] | None, case: dict[str, Any]) -> bool:
    if not output or not isinstance(output.get("items"), list):
        return False
    expected = [
        (segment["sourceZh"], segment["expected_action"])
        for segment in case["segments"]
    ]
    actual = [
        (item.get("sourceZh"), item.get("action")) for item in output["items"]
    ]
    return actual == expected


def invoke_once(
    structured_model: Any,
    system_prompt: str,
    user_template: str,
    case: dict[str, Any],
    profile: Profile,
) -> dict[str, Any]:
    started = time.perf_counter()
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
            parsed = v4.Output.model_validate_json(text)
        output = parsed.model_dump()
        validated = v4.validate_output(output, case)
        projection = v4.project_user_view(validated, set())
        v4.validate_initial_projection(validated, projection)
        succeeded = True
        error = None
    except Exception as caught:
        succeeded = False
        error = error_payload(
            caught,
            "contract_validation" if output is not None else "model_invocation",
            profile.env,
        )
    latency_ms = max(0, round((time.perf_counter() - started) * 1000))
    return {
        "succeeded": succeeded,
        "routeMatchesGold": route_matches_gold(output, case),
        "latencyMs": latency_ms,
        "tokenUsage": extract_token_usage(raw_message) if raw_message is not None else None,
        "responseIdentity": (
            extract_response_identity(raw_message) if raw_message is not None else None
        ),
        "output": output,
        "error": error,
    }


def summarize(records: list[dict[str, Any]], profile: Profile) -> dict[str, Any]:
    succeeded = [row for row in records if row["succeeded"]]
    route_matches = [row for row in records if row["routeMatchesGold"]]
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
        "routeMatchesGold": len(route_matches),
        "routeMatchRate": round(len(route_matches) / len(records), 4) if records else None,
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
        description="Run the LinguaType DeepSeek v5 targeted prompt regression"
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
                    "outputSchemaId": v4.SCHEMA_ID,
                    "caseIds": list(case_ids),
                    "experimentalInputField": "top_level_source_zh_json",
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
    structured_model = build_structured_model(profile)

    run_dir.mkdir(parents=False, exist_ok=False)
    manifest = {
        "manifestVersion": 1,
        "runId": run_dir.name,
        "runType": "offline_deepseek_v5_targeted_prompt_regression",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": v4.EVAL_SET_ID,
        "evalSetStatus": "frozen",
        "promptVersion": PROMPT_VERSION,
        "outputSchemaId": v4.SCHEMA_ID,
        "caseIds": list(case_ids),
        "repetitions": args.repetitions,
        "model": {
            "provider": env.get("provider", "openai_compatible"),
            "name": env["model"],
            "thinkingType": env.get("thinking_type"),
            "temperature": float(env.get("temperature", "0")),
            "maxTokens": int(env.get("max_tokens", "4096")),
            "maxRetries": 0,
            "timeoutSeconds": float(env.get("timeout_seconds", "120")),
            "endpointSha256": sha256_text(profile.env["base_url"].rstrip("/")),
        },
        "experimentalChange": {
            "prompt": "v5 minimum usable expression and scaffold granularity rules",
            "input": "explicit locally derived top-level Chinese source list",
            "automaticRetry": False,
        },
        "artifacts": {"records": "records.jsonl", "summary": "summary.json"},
        "sourceHashes": {
            "v4FreezeManifest": v4.sha256_file(v4.V4_MANIFEST_PATH),
            "v4Cases": v4.sha256_file(v4.V4_CASES_PATH),
            "prompt": v4.sha256_file(PROMPT_PATH),
            "outputSchema": v4.sha256_file(v4.V4_SCHEMA_PATH),
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
                        **result,
                    }
                    records.append(record)
                    append_jsonl(handle, record)
                    print(
                        f"r{repetition} {case['case_id']} "
                        f"{'ok' if result['succeeded'] else 'error'} "
                        f"route={'match' if result['routeMatchesGold'] else 'mismatch'} "
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
