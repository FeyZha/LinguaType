"""Fill still-missing v2 Judge items with a minimal plain-JSON contract."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict, Field

from retry_judge_failures import content_text
from run_eval import normalized_base_url, read_env, sanitize_error, sha256_file
from run_judge import (
    JUDGE_PROMPT_PATH,
    build_human_review,
    build_summary,
    derive_item_result,
    read_json_lines,
    validate_run_dir,
    write_json_exclusive,
    write_json_line,
)


class RepairItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemIndex: int = Field(ge=1)
    sourceZh: str = Field(min_length=1)
    semanticFidelity: int = Field(ge=1, le=3)
    scaffoldQuality: int = Field(ge=1, le=3)
    assistanceCalibration: int = Field(ge=1, le=3)
    userContinuability: int = Field(ge=1, le=3)
    protocolViolations: list[str]
    reasonZh: str = Field(min_length=1)


class RepairOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    caseId: str
    inputFit: Literal["sufficient", "frame_limited", "not_scorable"]
    items: list[RepairItem] = Field(min_length=1)


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


def parse_output(text: str) -> RepairOutput:
    cleaned = text.strip()
    fenced = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", cleaned, re.DOTALL)
    if fenced:
        cleaned = fenced.group(1)
    if not cleaned:
        raise ValueError("Judge returned empty repair content")
    return RepairOutput.model_validate_json(cleaned)


def invoke_repair(
    model: ChatOpenAI, canonical_prompt: str, judge_input: dict[str, Any]
) -> tuple[RepairOutput, str]:
    schema_example = {
        "caseId": judge_input["case_id"],
        "inputFit": "sufficient",
        "items": [
            {
                "itemIndex": segment["item_index"],
                "sourceZh": segment["source_zh"],
                "semanticFidelity": 3,
                "scaffoldQuality": 3,
                "assistanceCalibration": 3,
                "userContinuability": 3,
                "protocolViolations": [],
                "reasonZh": "短而具体的事实理由，不使用双引号",
            }
            for segment in judge_input["segments"]
        ],
    }
    instruction = (
        "这是失败调用的结构恢复，不改变评价标准。只输出单行合法 JSON；不要代码围栏；"
        "reasonZh 内不要使用任何双引号。必须逐个返回输入中的 itemIndex 和 sourceZh。"
        "四个分数仍按 canonical rubric 的 1—3 分。输出结构示例：\n"
        + json.dumps(schema_example, ensure_ascii=False, separators=(",", ":"))
        + "\n待评分输入：\n"
        + json.dumps(judge_input, ensure_ascii=False, indent=2)
    )
    response = model.invoke(
        [SystemMessage(canonical_prompt), HumanMessage(instruction)]
    )
    text = content_text(response)
    return parse_output(text), text


def to_score_records(
    parsed: RepairOutput, judge_input: dict[str, Any], run_id: str, model_name: str
) -> list[dict[str, Any]]:
    if parsed.caseId != judge_input["case_id"]:
        raise ValueError("Repair caseId mismatch")
    expected = {
        segment["item_index"]: segment for segment in judge_input["segments"]
    }
    actual = {item.itemIndex: item.sourceZh for item in parsed.items}
    if actual != {
        index: segment["source_zh"] for index, segment in expected.items()
    }:
        raise ValueError("Repair items do not match missing Judge input")
    records = []
    runner_error = judge_input["system_output"].get("runner_error")
    for item in parsed.items:
        segment = expected[item.itemIndex]
        violations = list(item.protocolViolations)
        if runner_error and runner_error.get("stage") == "contract_validation":
            if "runner_contract_validation_error" not in violations:
                violations.append("runner_contract_validation_error")
        scores = {
            "semantic_fidelity": item.semanticFidelity,
            "scaffold_quality": item.scaffoldQuality,
            "assistance_calibration": item.assistanceCalibration,
            "user_continuability": item.userContinuability,
        }
        result = derive_item_result(scores, violations, parsed.inputFit)
        records.append(
            {
                "eval_set_id": "expression-scaffold.dev.v2",
                "case_id": parsed.caseId,
                "item_index": item.itemIndex,
                "interaction_phase": judge_input["interaction_phase"],
                "source_zh": item.sourceZh,
                "selected_focus_zh": judge_input["selected_focus_zh"],
                "input_fit": parsed.inputFit,
                "expected_action": segment["expected_action"],
                "system_output": judge_input["system_output"],
                "protocol_violations": violations,
                "scores": scores,
                "item_result": result,
                "judge_reported_item_result": result,
                "judge_reason_zh": item.reasonZh,
                "human_result": None,
                "human_note_zh": None,
                "run_id": run_id,
                "judge_model": model_name,
                "judge_recovery_pass": "minimal_plain_json_once",
            }
        )
    return records


def run_repair(run_dir: Path, env: dict[str, str]) -> dict[str, Any]:
    input_path = run_dir / "judge-input.jsonl"
    partial_scores_path = run_dir / "judge-scores-final.jsonl"
    repair_raw_path = run_dir / "judge-repair-outputs.jsonl"
    repair_scores_path = run_dir / "judge-repair-scores.jsonl"
    complete_scores_path = run_dir / "judge-scores-complete.jsonl"
    complete_summary_path = run_dir / "judge-summary-complete.json"
    complete_review_path = run_dir / "human-review-v2-complete.md"
    repair_manifest_path = run_dir / "judge-repair-manifest.json"
    for path in (
        repair_raw_path,
        repair_scores_path,
        complete_scores_path,
        complete_summary_path,
        complete_review_path,
        repair_manifest_path,
    ):
        if path.exists():
            raise FileExistsError(f"Refusing to overwrite repair artifact: {path.name}")

    inputs = read_json_lines(input_path)
    partial_scores = read_json_lines(partial_scores_path)
    completed_keys = {
        (record["case_id"], record["item_index"], record["interaction_phase"])
        for record in partial_scores
    }
    missing_inputs = [
        judge_input
        for judge_input in inputs
        if any(
            (
                judge_input["case_id"],
                segment["item_index"],
                judge_input["interaction_phase"],
            )
            not in completed_keys
            for segment in judge_input["segments"]
        )
    ]
    prompt = JUDGE_PROMPT_PATH.read_text("utf-8")
    model = plain_model(env)
    manifest: dict[str, Any] = {
        "manifestVersion": 1,
        "repairType": "missing_judge_items_minimal_plain_json_once",
        "baselineRunId": run_dir.name,
        "judgeModel": env["model"],
        "expectedCalls": len(missing_inputs),
        "attempted": 0,
        "succeeded": 0,
        "failed": 0,
        "sourceHashes": {
            "judgeInput": sha256_file(input_path),
            "partialScores": sha256_file(partial_scores_path),
            "judgePrompt": sha256_file(JUDGE_PROMPT_PATH),
            "runner": sha256_file(Path(__file__).resolve()),
        },
    }
    repaired_scores: list[dict[str, Any]] = []
    with repair_raw_path.open("x", encoding="utf-8", newline="\n") as raw_file, repair_scores_path.open(
        "x", encoding="utf-8", newline="\n"
    ) as score_file:
        for judge_input in missing_inputs:
            indexes = [segment["item_index"] for segment in judge_input["segments"]]
            label = f"{judge_input['case_id']} {judge_input['interaction_phase']} {indexes}"
            raw_record: dict[str, Any] = {
                "case_id": judge_input["case_id"],
                "interaction_phase": judge_input["interaction_phase"],
                "item_indexes": indexes,
            }
            manifest["attempted"] += 1
            try:
                parsed, text = invoke_repair(model, prompt, judge_input)
                raw_record["judge_output"] = parsed.model_dump()
                raw_record["raw_text"] = text
                records = to_score_records(parsed, judge_input, run_dir.name, env["model"])
                for record in records:
                    if (
                        record["case_id"],
                        record["item_index"],
                        record["interaction_phase"],
                    ) in completed_keys:
                        continue
                    write_json_line(score_file, record)
                    repaired_scores.append(record)
                manifest["succeeded"] += 1
                print(f"{label} repair ok")
            except Exception as error:
                raw_record["error"] = {
                    "stage": "minimal_plain_json_repair",
                    "type": type(error).__name__,
                    "message": sanitize_error(error, env),
                }
                manifest["failed"] += 1
                print(f"{label} repair error")
            write_json_line(raw_file, raw_record)

    all_scores = partial_scores + repaired_scores
    keys = [
        (record["case_id"], record["item_index"], record["interaction_phase"])
        for record in all_scores
    ]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate score after minimal repair")
    all_scores.sort(
        key=lambda record: (
            record["case_id"],
            0 if record["interaction_phase"] == "initial" else 1,
            record["item_index"],
        )
    )
    with complete_scores_path.open("x", encoding="utf-8", newline="\n") as handle:
        for record in all_scores:
            write_json_line(handle, record)
    summary = build_summary(all_scores, manifest["failed"])
    scored_keys = {
        (record["case_id"], record["item_index"], record["interaction_phase"])
        for record in all_scores
    }
    incomplete_calls = [
        {
            "case_id": judge_input["case_id"],
            "item_index": segment["item_index"],
            "interaction_phase": judge_input["interaction_phase"],
            "selected_focus_zh": judge_input["selected_focus_zh"],
        }
        for judge_input in inputs
        for segment in judge_input["segments"]
        if (
            judge_input["case_id"],
            segment["item_index"],
            judge_input["interaction_phase"],
        )
        not in scored_keys
    ]
    incomplete_cases = {call["case_id"] for call in incomplete_calls}
    if incomplete_cases:
        for case_id in incomplete_cases:
            summary["caseResultById"][case_id] = "judge_incomplete"
        summary["caseResults"] = dict(summary["caseResults"])
        summary["caseResults"]["pass"] = (
            summary["caseResults"].get("pass", 0) - len(incomplete_cases)
        )
        summary["caseResults"]["judge_incomplete"] = len(incomplete_cases)
    summary["judgeIncompleteCalls"] = incomplete_calls
    summary["judgeRecovery"] = {
        "functionCallingFailedCalls": 9,
        "plainJsonRecoveredCalls": 4,
        "minimalJsonExpectedCalls": len(missing_inputs),
        "minimalJsonRecoveredCalls": manifest["succeeded"],
        "minimalJsonFailedCalls": manifest["failed"],
    }
    write_json_exclusive(complete_summary_path, summary)
    with complete_review_path.open("x", encoding="utf-8", newline="\n") as handle:
        handle.write(build_human_review(run_dir.name, all_scores, summary))
    manifest["finalScoredItemPhases"] = len(all_scores)
    manifest["expectedItemPhases"] = 35
    manifest["status"] = (
        "completed"
        if manifest["failed"] == 0 and len(all_scores) == 35
        else "completed_with_errors"
    )
    manifest["finalArtifacts"] = {
        "repairOutputs": repair_raw_path.name,
        "repairScores": repair_scores_path.name,
        "scores": complete_scores_path.name,
        "summary": complete_summary_path.name,
        "humanReview": complete_review_path.name,
    }
    write_json_exclusive(repair_manifest_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description="Repair still-missing v2 Judge items.")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--env-file", type=Path, required=True)
    args = parser.parse_args()
    env: dict[str, str] = {}
    try:
        run_dir = validate_run_dir(args.run_dir)
        env = read_env(args.env_file)
        manifest = run_repair(run_dir, env)
        print(
            f"judge repair complete: status={manifest['status']}, "
            f"calls={manifest['attempted']}, failures={manifest['failed']}, "
            f"item_phases={manifest['finalScoredItemPhases']}"
        )
    except Exception as error:
        raise SystemExit(f"judge repair failed: {sanitize_error(error, env)}") from None


if __name__ == "__main__":
    main()
