"""Measure where v5 and v6 spend time using the same streaming HTTP client.

This diagnostic separates request preparation, response headers, first
meaningful output, streamed generation, and local parse/merge/validation. It
does not replace the non-streaming product latency benchmark.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

import run_eval_v4 as v4
import run_deepseek_control_v6_targeted as v6
import run_deepseek_prompt_v5_targeted as v5
from benchmark_model_latency_v4 import api_base
from run_eval import read_env, sanitize_error


DEFAULT_CASE_IDS = ("LT-ESC-002", "LT-ESC-013", "LT-ESC-016")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def append_jsonl(handle: Any, value: Any) -> None:
    handle.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
    handle.flush()


def percentile_nearest(values: list[float], percentile: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, math.ceil(percentile * len(ordered)) - 1)
    return ordered[index]


def build_variant(variant: str, case: dict[str, Any]) -> dict[str, Any]:
    if variant == "v5":
        system_prompt, user_template = v5.read_prompt()
        return {
            "systemPrompt": system_prompt,
            "userPrompt": v5.render_user_prompt(user_template, case),
            "schema": v4.Output.model_json_schema(),
            "toolName": "return_expression_scaffold_v5",
        }
    if variant == "v6":
        system_prompt, user_template = v6.read_prompt()
        return {
            "systemPrompt": system_prompt,
            "userPrompt": v6.render_user_prompt(user_template, case),
            "schema": v6.ControlledOutput.model_json_schema(),
            "toolName": "return_controlled_scaffold_v6",
        }
    raise ValueError(f"unknown variant: {variant}")


def finalize_output(
    variant: str, arguments: str, case: dict[str, Any]
) -> dict[str, Any]:
    payload = json.loads(arguments)
    if variant == "v5":
        parsed = v4.Output.model_validate(payload)
        output = parsed.model_dump()
    else:
        controlled = v6.ControlledOutput.model_validate(payload)
        output = v6.merge_controlled_output(controlled, case)
    validated = v4.validate_output(output, case)
    projection = v4.project_user_view(validated, set())
    v4.validate_initial_projection(validated, projection)
    return output


def invoke_stream(
    client: httpx.Client,
    env: dict[str, str],
    variant: str,
    case: dict[str, Any],
) -> dict[str, Any]:
    prepare_started = time.perf_counter()
    definition = build_variant(variant, case)
    body: dict[str, Any] = {
        "model": env["model"],
        "temperature": float(env.get("temperature", "0")),
        "max_tokens": int(env.get("max_tokens", "4096")),
        "messages": [
            {"role": "system", "content": definition["systemPrompt"]},
            {"role": "user", "content": definition["userPrompt"]},
        ],
        "tools": [
            {
                "type": "function",
                "function": {
                    "name": definition["toolName"],
                    "description": "Return the requested LinguaType structured payload.",
                    "strict": True,
                    "parameters": definition["schema"],
                },
            }
        ],
        "tool_choice": {
            "type": "function",
            "function": {"name": definition["toolName"]},
        },
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    thinking_type = env.get("thinking_type")
    if thinking_type:
        body["thinking"] = {"type": thinking_type}
    request_prepare_ms = (time.perf_counter() - prepare_started) * 1000

    request_started = time.perf_counter()
    headers_at: float | None = None
    first_event_at: float | None = None
    first_content_at: float | None = None
    completed_at: float | None = None
    argument_parts: list[str] = []
    content_parts: list[str] = []
    usage: dict[str, Any] | None = None
    event_count = 0
    finish_reason: str | None = None

    url = f"{api_base(env).rstrip('/')}/chat/completions"
    with client.stream(
        "POST",
        url,
        headers={
            "authorization": f"Bearer {env['api_key']}",
            "content-type": "application/json",
        },
        json=body,
    ) as response:
        headers_at = time.perf_counter()
        response.raise_for_status()
        for line in response.iter_lines():
            if not line or not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                completed_at = time.perf_counter()
                break
            payload = json.loads(data)
            now = time.perf_counter()
            event_count += 1
            if first_event_at is None:
                first_event_at = now
            if isinstance(payload.get("usage"), dict):
                usage = payload["usage"]
            choices = payload.get("choices")
            if not isinstance(choices, list) or not choices:
                continue
            choice = choices[0] if isinstance(choices[0], dict) else {}
            if choice.get("finish_reason"):
                finish_reason = str(choice["finish_reason"])
            delta = choice.get("delta") if isinstance(choice.get("delta"), dict) else {}
            content = delta.get("content")
            if isinstance(content, str) and content:
                content_parts.append(content)
                if first_content_at is None:
                    first_content_at = now
            tool_calls = delta.get("tool_calls")
            if isinstance(tool_calls, list):
                for tool_call in tool_calls:
                    if not isinstance(tool_call, dict):
                        continue
                    function = tool_call.get("function")
                    if not isinstance(function, dict):
                        continue
                    arguments = function.get("arguments")
                    if isinstance(arguments, str) and arguments:
                        argument_parts.append(arguments)
                        if first_content_at is None:
                            first_content_at = now
        if completed_at is None:
            completed_at = time.perf_counter()

    if headers_at is None or first_event_at is None or first_content_at is None:
        raise ValueError("stream did not expose measurable response phases")
    arguments = "".join(argument_parts).strip()
    if not arguments:
        arguments = re.sub(
            r"^```(?:json)?\s*|\s*```$", "", "".join(content_parts).strip()
        )
    local_started = time.perf_counter()
    output: dict[str, Any] | None = None
    validation_succeeded = False
    validation_error: dict[str, str] | None = None
    try:
        output = finalize_output(variant, arguments, case)
        validation_succeeded = True
    except Exception as error:
        validation_error = {
            "type": type(error).__name__,
            "message": str(error)[:1000],
        }
    local_finalize_ms = (time.perf_counter() - local_started) * 1000

    return {
        "requestPrepareMs": round(request_prepare_ms, 3),
        "responseHeadersMs": round((headers_at - request_started) * 1000, 3),
        "firstEventMs": round((first_event_at - request_started) * 1000, 3),
        "firstContentMs": round((first_content_at - request_started) * 1000, 3),
        "streamGenerationMs": round((completed_at - first_content_at) * 1000, 3),
        "providerStreamTotalMs": round((completed_at - request_started) * 1000, 3),
        "localFinalizeMs": round(local_finalize_ms, 3),
        "endToEndMs": round(
            request_prepare_ms
            + (completed_at - request_started) * 1000
            + local_finalize_ms,
            3,
        ),
        "eventCount": event_count,
        "finishReason": finish_reason,
        "tokenUsage": usage,
        "validationSucceeded": validation_succeeded,
        "validationError": validation_error,
        "output": output,
    }


def summarize(rows: list[dict[str, Any]]) -> dict[str, Any]:
    metrics = (
        "requestPrepareMs",
        "responseHeadersMs",
        "firstEventMs",
        "firstContentMs",
        "streamGenerationMs",
        "providerStreamTotalMs",
        "localFinalizeMs",
        "endToEndMs",
    )
    result: dict[str, Any] = {}
    for variant in ("v5", "v6"):
        selected = [row for row in rows if row["phase"] == "measured" and row["variant"] == variant]
        metric_summary: dict[str, Any] = {}
        for metric in metrics:
            values = [float(row[metric]) for row in selected]
            metric_summary[metric] = {
                "mean": round(statistics.fmean(values), 3),
                "p50": round(float(percentile_nearest(values, 0.5)), 3),
                "p90": round(float(percentile_nearest(values, 0.9)), 3),
            }
        result[variant] = {
            "calls": len(selected),
            "validationSucceeded": sum(row["validationSucceeded"] for row in selected),
            "timingMs": metric_summary,
        }
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Diagnose v5/v6 latency phases")
    parser.add_argument("--env-file", type=Path, required=True)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--case-id", action="append")
    parser.add_argument("--repetitions", type=int, default=3)
    args = parser.parse_args()

    if not 1 <= args.repetitions <= 5:
        parser.error("repetitions must be between 1 and 5")
    run_dir = v4.validate_run_dir(args.run_dir)
    definition = v4.load_definition()
    case_ids = tuple(args.case_id or DEFAULT_CASE_IDS)
    case_by_id = {case["case_id"]: case for case in definition["cases"]}
    missing = [case_id for case_id in case_ids if case_id not in case_by_id]
    if missing:
        parser.error(f"unknown case ids: {', '.join(missing)}")
    cases = [case_by_id[case_id] for case_id in case_ids]
    env = read_env(args.env_file.resolve())

    run_dir.mkdir(parents=False, exist_ok=False)
    manifest = {
        "manifestVersion": 1,
        "runId": run_dir.name,
        "runType": "offline_v5_v6_streaming_latency_phase_diagnostic",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "caseIds": list(case_ids),
        "repetitions": args.repetitions,
        "variants": [v5.PROMPT_VERSION, v6.PROMPT_VERSION],
        "deliveryMode": "streaming_diagnostic_not_product_benchmark",
        "automaticRetry": False,
        "artifacts": {"records": "records.jsonl", "summary": "summary.json"},
    }
    manifest_path = run_dir / "run-manifest.json"
    records_path = run_dir / "records.jsonl"
    summary_path = run_dir / "summary.json"
    write_json(manifest_path, manifest)
    rows: list[dict[str, Any]] = []

    try:
        timeout = httpx.Timeout(float(env.get("timeout_seconds", "120")))
        with httpx.Client(timeout=timeout) as client, records_path.open(
            "x", encoding="utf-8", newline="\n"
        ) as handle:
            for variant in ("v5", "v6"):
                result = invoke_stream(client, env, variant, cases[0])
                row = {
                    "phase": "warmup",
                    "variant": variant,
                    "case_id": cases[0]["case_id"],
                    "repetition": 0,
                    **result,
                }
                rows.append(row)
                append_jsonl(handle, row)
                print(
                    f"warmup {variant} {row['case_id']} first={row['firstContentMs']}ms "
                    f"generate={row['streamGenerationMs']}ms",
                    flush=True,
                )
            for repetition in range(1, args.repetitions + 1):
                for case_index, case in enumerate(cases):
                    variants = ["v5", "v6"]
                    if (repetition + case_index) % 2:
                        variants.reverse()
                    for variant in variants:
                        result = invoke_stream(client, env, variant, case)
                        row = {
                            "phase": "measured",
                            "variant": variant,
                            "case_id": case["case_id"],
                            "repetition": repetition,
                            **result,
                        }
                        rows.append(row)
                        append_jsonl(handle, row)
                        print(
                            f"r{repetition} {case['case_id']} {variant} "
                            f"first={row['firstContentMs']}ms "
                            f"generate={row['streamGenerationMs']}ms "
                            f"local={row['localFinalizeMs']}ms",
                            flush=True,
                        )
        summary = summarize(rows)
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
