"""Retry only failed v2 Judge calls with plain JSON output.

The first Judge pass uses function calling.  Some OpenAI-compatible providers can
return an empty tool result for complex schemas.  This recovery pass preserves
those failures, retries each missing call once through plain text JSON, and writes
new consolidated artifacts without overwriting the originals.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from run_eval import normalized_base_url, read_env, sanitize_error, sha256_file
from run_judge import (
    JUDGE_PROMPT_PATH,
    JudgeOutput,
    build_human_review,
    build_summary,
    read_json_lines,
    validate_judge_output,
    validate_run_dir,
    write_json_exclusive,
    write_json_line,
)


def signature(record: dict[str, Any]) -> tuple[str, str, tuple[int, ...]]:
    indexes = record.get("item_indexes")
    if indexes is None:
        indexes = [record["item_index"]]
    return record["case_id"], record["interaction_phase"], tuple(indexes)


def plain_model(env: dict[str, str]) -> ChatOpenAI:
    return ChatOpenAI(
        model=env["model"],
        api_key=env["api_key"],
        base_url=normalized_base_url(env["base_url"]),
        temperature=0,
        timeout=120,
        max_retries=0,
        use_responses_api=False,
        extra_body={"max_tokens": 4096},
    )


def content_text(response: Any) -> str:
    content = getattr(response, "content", response)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "\n".join(parts).strip()
    return str(content).strip()


def parse_json_text(text: str) -> JudgeOutput:
    cleaned = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    if fenced:
        cleaned = fenced.group(1)
    if not cleaned:
        raise ValueError("Judge returned empty plain-text content")
    return JudgeOutput.model_validate_json(cleaned)


def invoke_plain(
    model: ChatOpenAI, prompt: str, judge_input: dict[str, Any]
) -> tuple[JudgeOutput, str]:
    instruction = (
        "不要调用工具。请只输出一个 JSON 对象，不要 Markdown 代码围栏。"
        "segments.item_index 必须原样返回为 itemIndex；"
        "若 system_output.runner_error.stage 为 contract_validation，必须在对应 item 的"
        " protocolViolations 中指出协议失败。\n\n"
        + json.dumps(judge_input, ensure_ascii=False, indent=2)
    )
    response = model.invoke([SystemMessage(prompt), HumanMessage(instruction)])
    text = content_text(response)
    return parse_json_text(text), text


def run_retry(run_dir: Path, env: dict[str, str]) -> dict[str, Any]:
    input_path = run_dir / "judge-input.jsonl"
    original_raw_path = run_dir / "judge-outputs.jsonl"
    original_scores_path = run_dir / "judge-scores.jsonl"
    retry_raw_path = run_dir / "judge-retry-outputs.jsonl"
    retry_scores_path = run_dir / "judge-retry-scores.jsonl"
    final_scores_path = run_dir / "judge-scores-final.jsonl"
    final_summary_path = run_dir / "judge-summary-final.json"
    final_review_path = run_dir / "human-review-v2-final.md"
    retry_manifest_path = run_dir / "judge-retry-manifest.json"
    for path in (
        retry_raw_path,
        retry_scores_path,
        final_scores_path,
        final_summary_path,
        final_review_path,
        retry_manifest_path,
    ):
        if path.exists():
            raise FileExistsError(f"Refusing to overwrite retry artifact: {path.name}")

    inputs = read_json_lines(input_path)
    input_by_signature = {
        (
            value["case_id"],
            value["interaction_phase"],
            tuple(segment["item_index"] for segment in value["segments"]),
        ): value
        for value in inputs
    }
    failed = [
        record
        for record in read_json_lines(original_raw_path)
        if "error" in record
    ]
    failed_inputs = [input_by_signature[signature(record)] for record in failed]
    manifest: dict[str, Any] = {
        "manifestVersion": 1,
        "retryType": "failed_judge_calls_plain_json_once",
        "baselineRunId": run_dir.name,
        "judgeModel": env["model"],
        "preservesOriginalFailures": True,
        "expectedRetryCalls": len(failed_inputs),
        "attempted": 0,
        "succeeded": 0,
        "failed": 0,
        "sourceHashes": {
            "judgeInput": sha256_file(input_path),
            "originalJudgeOutputs": sha256_file(original_raw_path),
            "originalJudgeScores": sha256_file(original_scores_path),
            "judgePrompt": sha256_file(JUDGE_PROMPT_PATH),
            "runner": sha256_file(Path(__file__).resolve()),
        },
    }
    prompt = JUDGE_PROMPT_PATH.read_text("utf-8")
    model = plain_model(env)
    retry_scores: list[dict[str, Any]] = []
    with retry_raw_path.open("x", encoding="utf-8", newline="\n") as raw_file, retry_scores_path.open(
        "x", encoding="utf-8", newline="\n"
    ) as score_file:
        for judge_input in failed_inputs:
            indexes = [segment["item_index"] for segment in judge_input["segments"]]
            label = f"{judge_input['case_id']} {judge_input['interaction_phase']} {indexes}"
            raw_record: dict[str, Any] = {
                "case_id": judge_input["case_id"],
                "interaction_phase": judge_input["interaction_phase"],
                "item_indexes": indexes,
            }
            manifest["attempted"] += 1
            try:
                parsed, text = invoke_plain(model, prompt, judge_input)
                raw_record["judge_output"] = parsed.model_dump()
                raw_record["raw_text"] = text
                derived = validate_judge_output(parsed, judge_input)
                for record in derived:
                    record["run_id"] = run_dir.name
                    record["judge_model"] = env["model"]
                    record["judge_recovery_pass"] = "plain_json_once"
                    write_json_line(score_file, record)
                    retry_scores.append(record)
                manifest["succeeded"] += 1
                print(f"{label} retry ok")
            except Exception as error:
                raw_record["error"] = {
                    "stage": "plain_json_retry",
                    "type": type(error).__name__,
                    "message": sanitize_error(error, env),
                }
                manifest["failed"] += 1
                print(f"{label} retry error")
            write_json_line(raw_file, raw_record)

    all_scores = read_json_lines(original_scores_path) + retry_scores
    score_keys = [
        (record["case_id"], record["item_index"], record["interaction_phase"])
        for record in all_scores
    ]
    if len(set(score_keys)) != len(score_keys):
        raise ValueError("Duplicate item-phase score after Judge retry")
    all_scores.sort(
        key=lambda record: (
            record["case_id"],
            0 if record["interaction_phase"] == "initial" else 1,
            record["item_index"],
        )
    )
    with final_scores_path.open("x", encoding="utf-8", newline="\n") as handle:
        for record in all_scores:
            write_json_line(handle, record)
    summary = build_summary(all_scores, manifest["failed"])
    summary["judgeRecovery"] = {
        "originalFailedCalls": len(failed_inputs),
        "retrySucceeded": manifest["succeeded"],
        "retryFailed": manifest["failed"],
        "method": "plain_json_once",
    }
    write_json_exclusive(final_summary_path, summary)
    with final_review_path.open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(build_human_review(run_dir.name, all_scores, summary))
    manifest["finalArtifacts"] = {
        "retryOutputs": retry_raw_path.name,
        "retryScores": retry_scores_path.name,
        "scores": final_scores_path.name,
        "summary": final_summary_path.name,
        "humanReview": final_review_path.name,
    }
    manifest["finalScoredItemPhases"] = len(all_scores)
    manifest["status"] = "completed" if manifest["failed"] == 0 else "completed_with_errors"
    write_json_exclusive(retry_manifest_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Retry failed v2 Judge calls once.")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--env-file", type=Path, required=True)
    args = parser.parse_args()
    env: dict[str, str] = {}
    try:
        run_dir = validate_run_dir(args.run_dir)
        env = read_env(args.env_file)
        manifest = run_retry(run_dir, env)
        print(
            f"judge retry complete: status={manifest['status']}, "
            f"calls={manifest['attempted']}, failures={manifest['failed']}"
        )
    except Exception as error:
        raise SystemExit(f"judge retry failed: {sanitize_error(error, env)}") from None


if __name__ == "__main__":
    main()
