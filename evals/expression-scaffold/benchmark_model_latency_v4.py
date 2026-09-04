"""Interleaved latency screen for LinguaType v4 model candidates.

The runner reuses the frozen v4 cases, prompt, Pydantic output contract, and
contract validation. Secrets and endpoint URLs are never written to artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import statistics
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

import run_eval_v4 as v4
from run_context_ablation_v4 import extract_response_identity, extract_token_usage
from run_eval import error_payload, raw_text, read_env, sanitize_error


DEFAULT_CASE_IDS = (
    "LT-ESC-001",
    "LT-ESC-010",
    "LT-ESC-019",
    "LT-ESC-005",
    "LT-ESC-015",
    "LT-ESC-020",
)


@dataclass(frozen=True)
class Profile:
    label: str
    env_path: Path
    env: dict[str, str]


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


def parse_profile(value: str) -> tuple[str, Path]:
    if "=" not in value:
        raise argparse.ArgumentTypeError("profile must use LABEL=ENV_PATH")
    label, raw_path = value.split("=", 1)
    if not re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,31}", label):
        raise argparse.ArgumentTypeError("profile label must be lowercase and filesystem-safe")
    return label, Path(raw_path)


def api_base(env: dict[str, str]) -> str:
    base = env["base_url"].rstrip("/")
    provider = env.get("provider", "openai_compatible").lower()
    if provider == "deepseek":
        # DeepSeek strict function calling is exposed through the beta base URL.
        return base if base.endswith("/beta") else f"{base}/beta"
    return base if base.endswith("/v1") else f"{base}/v1"


def build_structured_model(profile: Profile):
    env = profile.env
    extra_body: dict[str, Any] = {
        "max_tokens": int(env.get("max_tokens", "4096")),
    }
    thinking_type = env.get("thinking_type")
    if thinking_type:
        if thinking_type not in {"enabled", "disabled"}:
            raise ValueError(f"{profile.label}: thinking_type must be enabled or disabled")
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
        v4.Output, method="function_calling", strict=True, include_raw=True
    )


def percentile_nearest(values: list[int], percentile: float) -> int | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, math.ceil(percentile * len(ordered)) - 1)
    return ordered[index]


def invoke_once(
    structured_model: Any,
    definition: dict[str, Any],
    case: dict[str, Any],
    profile: Profile,
) -> dict[str, Any]:
    state = {
        "task_prompt": case["task_prompt"],
        "full_essay": case["full_essay"],
        "target_sentence": case["target_sentence"],
    }
    started = time.perf_counter()
    output: dict[str, Any] | None = None
    raw_message: Any = None
    try:
        result = structured_model.invoke(
            [
                SystemMessage(definition["system_prompt"]),
                HumanMessage(v4.render_user_prompt(definition["user_template"], state)),
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
        "latencyMs": latency_ms,
        "tokenUsage": extract_token_usage(raw_message) if raw_message is not None else None,
        "responseIdentity": (
            extract_response_identity(raw_message) if raw_message is not None else None
        ),
        "output": output,
        "error": error,
    }


def summarize(records: list[dict[str, Any]], profiles: list[Profile]) -> dict[str, Any]:
    profile_summaries: dict[str, Any] = {}
    for profile in profiles:
        rows = [
            row
            for row in records
            if row["profile"] == profile.label and row["phase"] == "measured"
        ]
        successful = [row for row in rows if row["succeeded"]]
        latencies = [int(row["latencyMs"]) for row in rows]
        token_rows = [row["tokenUsage"] for row in rows if row.get("tokenUsage")]
        token_averages: dict[str, float] = {}
        for key in ("input_tokens", "output_tokens", "total_tokens"):
            values = [int(row[key]) for row in token_rows if key in row]
            if values:
                token_averages[key] = round(statistics.fmean(values), 1)
        profile_summaries[profile.label] = {
            "model": profile.env["model"],
            "thinkingType": profile.env.get("thinking_type"),
            "calls": len(rows),
            "succeeded": len(successful),
            "failed": len(rows) - len(successful),
            "successRate": round(len(successful) / len(rows), 4) if rows else None,
            "latencyMs": {
                "mean": round(statistics.fmean(latencies), 1) if latencies else None,
                "p50": percentile_nearest(latencies, 0.5),
                "p90": percentile_nearest(latencies, 0.9),
                "min": min(latencies) if latencies else None,
                "max": max(latencies) if latencies else None,
            },
            "averageTokenUsage": token_averages or None,
        }
    return {"profiles": profile_summaries}


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an interleaved LinguaType v4 latency screen")
    parser.add_argument("--profile", action="append", type=parse_profile, required=True)
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--case-id", action="append")
    parser.add_argument("--repetitions", type=int, default=3)
    parser.add_argument("--skip-warmup", action="store_true")
    args = parser.parse_args()

    raw_profiles: list[tuple[str, Path]] = args.profile
    if len(raw_profiles) < 2:
        parser.error("at least two --profile values are required")
    if len({label for label, _ in raw_profiles}) != len(raw_profiles):
        parser.error("profile labels must be unique")
    if not 1 <= args.repetitions <= 10:
        parser.error("repetitions must be between 1 and 10")
    if args.run_dir.exists():
        parser.error("run-dir already exists; refusing to overwrite")

    profiles = [Profile(label, path.resolve(), read_env(path.resolve())) for label, path in raw_profiles]
    definition = v4.load_definition()
    case_ids = tuple(args.case_id or DEFAULT_CASE_IDS)
    case_by_id = {case["case_id"]: case for case in definition["cases"]}
    missing = [case_id for case_id in case_ids if case_id not in case_by_id]
    if missing:
        parser.error(f"unknown case ids: {', '.join(missing)}")
    cases = [case_by_id[case_id] for case_id in case_ids]
    models = {profile.label: build_structured_model(profile) for profile in profiles}

    args.run_dir.mkdir(parents=True, exist_ok=False)
    manifest = {
        "manifestVersion": 1,
        "runId": args.run_dir.name,
        "runType": "offline_v4_interleaved_model_latency_screen",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": v4.EVAL_SET_ID,
        "promptVersion": v4.PROMPT_VERSION,
        "outputSchemaId": v4.SCHEMA_ID,
        "caseIds": list(case_ids),
        "repetitions": args.repetitions,
        "concurrency": 1,
        "profiles": [
            {
                "label": profile.label,
                "provider": profile.env.get("provider", "openai_compatible"),
                "model": profile.env["model"],
                "thinkingType": profile.env.get("thinking_type"),
                "temperature": float(profile.env.get("temperature", "0")),
                "maxTokens": int(profile.env.get("max_tokens", "4096")),
                "timeoutSeconds": float(profile.env.get("timeout_seconds", "120")),
                "endpointSha256": sha256_text(api_base(profile.env)),
            }
            for profile in profiles
        ],
        "artifacts": {"records": "records.jsonl", "summary": "summary.json"},
        "sourceHashes": {
            "v4FreezeManifest": v4.sha256_file(v4.V4_MANIFEST_PATH),
            "prompt": v4.sha256_file(v4.V4_PROMPT_PATH),
            "outputSchema": v4.sha256_file(v4.V4_SCHEMA_PATH),
            "runner": v4.sha256_file(Path(__file__).resolve()),
        },
    }
    manifest_path = args.run_dir / "run-manifest.json"
    records_path = args.run_dir / "records.jsonl"
    summary_path = args.run_dir / "summary.json"
    write_json(manifest_path, manifest)
    records: list[dict[str, Any]] = []

    try:
        with records_path.open("x", encoding="utf-8", newline="\n") as handle:
            if not args.skip_warmup:
                warmup_case = cases[0]
                for profile in profiles:
                    result = invoke_once(models[profile.label], definition, warmup_case, profile)
                    record = {
                        "phase": "warmup",
                        "profile": profile.label,
                        "model": profile.env["model"],
                        "case_id": warmup_case["case_id"],
                        "repetition": 0,
                        **result,
                    }
                    records.append(record)
                    append_jsonl(handle, record)
                    print(
                        f"warmup {profile.label} {warmup_case['case_id']} "
                        f"{'ok' if result['succeeded'] else 'error'} {result['latencyMs']}ms",
                        flush=True,
                    )

            for repetition in range(1, args.repetitions + 1):
                for case_index, case in enumerate(cases):
                    shift = (repetition + case_index) % len(profiles)
                    ordered_profiles = profiles[shift:] + profiles[:shift]
                    for profile in ordered_profiles:
                        result = invoke_once(models[profile.label], definition, case, profile)
                        record = {
                            "phase": "measured",
                            "profile": profile.label,
                            "model": profile.env["model"],
                            "case_id": case["case_id"],
                            "repetition": repetition,
                            **result,
                        }
                        records.append(record)
                        append_jsonl(handle, record)
                        print(
                            f"r{repetition} {case['case_id']} {profile.label} "
                            f"{'ok' if result['succeeded'] else 'error'} {result['latencyMs']}ms",
                            flush=True,
                        )
        summary = summarize(records, profiles)
        write_json(summary_path, summary)
        manifest["status"] = "completed"
        manifest["summary"] = summary
    except Exception as error:
        manifest["status"] = "failed"
        redacted = str(error)
        for profile in profiles:
            redacted = sanitize_error(Exception(redacted), profile.env)
        manifest["runError"] = redacted[:2000]
        raise
    finally:
        manifest["completedAt"] = utc_now()
        write_json(manifest_path, manifest)

    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
