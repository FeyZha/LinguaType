"""Run the frozen v4 cases through the local LinguaType v7 prototype API."""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import run_eval_v4 as v4


PROMPT_VERSION = "expression-scaffold-v7-full-controlled-rules"
STANDALONE_FUNCTION_FOCUSES = {
    "同时", "可能", "更多", "仍", "仍然", "仅", "只", "也", "而",
    "并且", "但是", "所以", "因此", "会", "的",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def percentile_nearest(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    return ordered[max(0, math.ceil(percentile * len(ordered)) - 1)]


def chinese_character_count(value: str) -> int:
    return len(re.findall(r"[\u3400-\u9fff]", value))


def route_policy(value: str) -> Literal["provide_expression", "offer_scaffolds"]:
    return "provide_expression" if chinese_character_count(value) <= 10 else "offer_scaffolds"


def normalize_focus(value: str) -> str:
    return re.sub(r"[\s，。！？；：、,.!?;:…—-]+", "", value)


def post_case(base_url: str, case: dict[str, Any]) -> tuple[int, dict[str, Any], int]:
    body = json.dumps(
        {
            "taskPrompt": case["task_prompt"],
            "fullEssay": case["full_essay"],
            "targetSentence": case["target_sentence"],
        },
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/scaffold",
        data=body,
        headers={"content-type": "application/json"},
        method="POST",
    )
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(request, timeout=130) as response:
            status = response.status
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        status = error.code
        payload = json.loads(error.read().decode("utf-8"))
    return status, payload, round((time.perf_counter() - started) * 1000)


def validate_response(payload: dict[str, Any], case: dict[str, Any]) -> list[str]:
    violations: list[str] = []
    expected_segments = [segment["sourceZh"] for segment in case["segments"]]
    expected_actions = [route_policy(source) for source in expected_segments]
    items = payload.get("items")
    meta = payload.get("meta")
    if not isinstance(items, list):
        return ["items_missing"]
    if [item.get("sourceZh") for item in items] != expected_segments:
        violations.append("source_or_order_drift")
    if [item.get("action") for item in items] != expected_actions:
        violations.append("route_drift")
    if not isinstance(meta, dict) or meta.get("callCount") != 1:
        violations.append("call_count_not_one")
    if not isinstance(meta, dict) or meta.get("promptVersion") != PROMPT_VERSION:
        violations.append("prompt_version_mismatch")

    for item in items:
        action = item.get("action")
        scaffolds = item.get("scaffolds")
        if action == "provide_expression":
            if not isinstance(item.get("recommendedExpression"), str) or scaffolds != []:
                violations.append("invalid_direct_projection")
            continue
        if not isinstance(scaffolds, list) or not 2 <= len(scaffolds) <= 3:
            violations.append("invalid_scaffold_count")
            continue
        for scaffold in scaffolds:
            if normalize_focus(str(scaffold.get("focusZh", ""))) in STANDALONE_FUNCTION_FOCUSES:
                violations.append("standalone_function_focus")

    initial_projection = [
        {
            "sourceZh": item.get("sourceZh"),
            "action": item.get("action"),
            "recommendedExpression": (
                item.get("recommendedExpression")
                if item.get("action") == "provide_expression"
                else None
            ),
            "scaffolds": [
                {"scaffoldId": scaffold.get("scaffoldId"), "focusZh": scaffold.get("focusZh")}
                for scaffold in item.get("scaffolds", [])
            ],
        }
        for item in items
    ]
    projection_text = json.dumps(initial_projection, ensure_ascii=False)
    hidden_expressions = [
        scaffold.get("recommendedExpression")
        for item in items
        if item.get("action") == "offer_scaffolds"
        for scaffold in item.get("scaffolds", [])
    ]
    if any(expression and expression in projection_text for expression in hidden_expressions):
        violations.append("initial_projection_english_leak")
    return sorted(set(violations))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3000")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--case-id", action="append")
    args = parser.parse_args()

    definition = v4.load_definition()
    case_by_id = {case["case_id"]: case for case in definition["cases"]}
    case_ids = tuple(args.case_id or case_by_id.keys())
    missing = [case_id for case_id in case_ids if case_id not in case_by_id]
    if missing:
        parser.error(f"unknown case ids: {', '.join(missing)}")
    cases = [case_by_id[case_id] for case_id in case_ids]
    run_dir = v4.validate_run_dir(args.run_dir)
    run_dir.mkdir(parents=False, exist_ok=False)

    records: list[dict[str, Any]] = []
    records_path = run_dir / "records.jsonl"
    with records_path.open("x", encoding="utf-8", newline="\n") as handle:
        for case in cases:
            status, payload, client_latency_ms = post_case(args.base_url, case)
            violations = validate_response(payload, case) if status == 200 else []
            succeeded = status == 200 and not violations
            record = {
                "case_id": case["case_id"],
                "status": status,
                "succeeded": succeeded,
                "clientLatencyMs": client_latency_ms,
                "serverLatencyMs": payload.get("meta", {}).get("latencyMs") if status == 200 else None,
                "model": payload.get("meta", {}).get("model") if status == 200 else None,
                "promptVersion": payload.get("meta", {}).get("promptVersion") if status == 200 else None,
                "violations": violations,
                "output": {"items": payload["items"]} if status == 200 else None,
                "error": payload.get("error") if status != 200 else None,
            }
            records.append(record)
            handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            handle.flush()
            print(
                f"{case['case_id']} {'ok' if succeeded else 'error'} "
                f"http={status} {client_latency_ms}ms",
                flush=True,
            )

    succeeded = [row for row in records if row["succeeded"]]
    latencies = [int(row["clientLatencyMs"]) for row in records]
    summary = {
        "runType": "local_prototype_v7_full20_api_regression",
        "startedAndCompletedAt": utc_now(),
        "evalSetId": v4.EVAL_SET_ID,
        "promptVersion": PROMPT_VERSION,
        "streaming": False,
        "automaticRetry": False,
        "calls": len(records),
        "succeeded": len(succeeded),
        "failed": len(records) - len(succeeded),
        "latencyMs": {
            "mean": round(statistics.fmean(latencies), 1) if latencies else None,
            "p50": percentile_nearest(latencies, 0.5),
            "p90": percentile_nearest(latencies, 0.9),
            "min": min(latencies) if latencies else None,
            "max": max(latencies) if latencies else None,
        },
        "failureDetails": [
            {
                "case_id": row["case_id"],
                "status": row["status"],
                "violations": row["violations"],
                "error": row["error"],
            }
            for row in records
            if not row["succeeded"]
        ],
        "qualityBoundary": "protocol and initial projection only; semantic quality not judged",
    }
    write_json(run_dir / "summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
