"""Run the isolated v2 LLM Judge over an existing frozen baseline run.

The judge sees only semantic gold fields, the v2 action gold, and the actual
system output.  Descriptive slice labels are intentionally excluded until all
scores have been written.  Judge failures are recorded separately and are never
converted into model quality failures.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict, Field

from run_eval import (
    EVAL_DIR,
    OutputContractError,
    ensure_under,
    load_eval_definition,
    normalized_base_url,
    read_env,
    sanitize_error,
    sha256_file,
)


RUNS_DIR = EVAL_DIR / "runs"
BASE_CASES_PATH = EVAL_DIR / "cases.md"
JUDGE_PROMPT_PATH = EVAL_DIR / "prompts" / "judge-v2.md"
RUBRIC_PATH = (
    EVAL_DIR
    / "eval-sets"
    / "expression-scaffold.dev.v2"
    / "rubric.md"
)
SCORING_PATH = RUBRIC_PATH.with_name("scoring.md")
JUDGE_PROMPT_VERSION = "expression-scaffold-judge-v2"
EXPECTED_CALLS = 30
EXCLUDED_KEYS = {"slot_function", "span_scope", "case_type", "source_type"}
RESULT_RANK = {
    "pass": 0,
    "needs_improvement": 1,
    "bad_case": 2,
    "not_scored_input_issue": -1,
}


class JudgeScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    semanticFidelity: int = Field(ge=1, le=3)
    scaffoldQuality: int = Field(ge=1, le=3)
    assistanceCalibration: int = Field(ge=1, le=3)
    userContinuability: int = Field(ge=1, le=3)


class JudgeItemReview(BaseModel):
    model_config = ConfigDict(extra="forbid")

    itemIndex: int = Field(ge=1)
    sourceZh: str = Field(min_length=1)
    interactionPhase: Literal["initial", "selected_focus"]
    protocolViolations: list[str]
    scores: JudgeScores
    itemResult: Literal[
        "pass", "needs_improvement", "bad_case", "not_scored_input_issue"
    ]
    reasonZh: str = Field(min_length=1)


class JudgeOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    caseId: str
    inputFit: Literal["sufficient", "frame_limited", "not_scorable"]
    inputIssueReasonZh: str | None
    itemReviews: list[JudgeItemReview] = Field(min_length=1)
    caseResult: Literal[
        "pass", "needs_improvement", "bad_case", "not_scored_input_issue"
    ]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def read_json_lines(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    try:
        lines = path.read_text("utf-8-sig").splitlines()
    except FileNotFoundError as error:
        raise ValueError(f"Missing baseline artifact: {path.name}") from error
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(
                f"Invalid JSON in {path.name} line {line_number}: {error.msg}"
            ) from error
        if not isinstance(value, dict):
            raise ValueError(f"Expected object in {path.name} line {line_number}")
        records.append(value)
    return records


def write_json_exclusive(path: Path, value: dict[str, Any]) -> None:
    with path.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def replace_json(path: Path, value: dict[str, Any]) -> None:
    temporary = path.with_name(f".{path.name}.tmp")
    with temporary.open("x", encoding="utf-8", newline="\n") as handle:
        json.dump(value, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    os.replace(temporary, path)


def write_json_line(handle: Any, value: dict[str, Any]) -> None:
    handle.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")
    handle.flush()


def parse_semantic_gold() -> dict[str, dict[str, Any]]:
    markdown = BASE_CASES_PATH.read_text("utf-8")
    blocks = re.split(r"(?=^### LT-ESC-\d{3})", markdown, flags=re.MULTILINE)[1:]
    result: dict[str, dict[str, Any]] = {}
    for block in blocks:
        case_match = re.search(r"^### (LT-ESC-\d{3})", block, re.MULTILINE)
        must_not_add_match = re.search(
            r"^- `must_not_add`：(.*)$", block, re.MULTILINE
        )
        if not case_match or not must_not_add_match:
            raise ValueError("Could not parse semantic gold case")
        case_id = case_match.group(1)
        segment_pairs = re.findall(
            r"^\s+- `source_zh`：`([^`]+)`\r?\n"
            r"\s+`intent_zh`：(.*)$",
            block,
            re.MULTILINE,
        )
        if not segment_pairs:
            raise ValueError(f"No semantic gold segments found for {case_id}")
        result[case_id] = {
            "segments": [
                {"source_zh": source, "intent_zh": intent.strip()}
                for source, intent in segment_pairs
            ],
            "must_not_add": must_not_add_match.group(1).strip(),
        }
    return result


def assert_no_hidden_keys(value: Any, path: str = "$") -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in EXCLUDED_KEYS:
                raise ValueError(f"Hidden classification key leaked at {path}.{key}")
            assert_no_hidden_keys(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            assert_no_hidden_keys(child, f"{path}[{index}]")


def record_key(record: dict[str, Any]) -> tuple[str, str, int | None]:
    return (
        record["case_id"],
        record["interaction_phase"],
        record.get("segment_index"),
    )


def load_baseline_records(run_dir: Path) -> dict[tuple[str, str, int | None], dict[str, Any]]:
    records = read_json_lines(run_dir / "initial-outputs.jsonl")
    records.extend(read_json_lines(run_dir / "selected-focus-outputs.jsonl"))
    if len(records) != EXPECTED_CALLS:
        raise ValueError(f"Expected {EXPECTED_CALLS} baseline records, found {len(records)}")
    keyed = {record_key(record): record for record in records}
    if len(keyed) != len(records):
        raise ValueError("Duplicate baseline phase record")
    return keyed


def system_output_for_judge(record: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {"output": record.get("output")}
    error = record.get("error")
    if isinstance(error, dict):
        payload["runner_error"] = {
            "stage": error.get("stage"),
            "type": error.get("type"),
            "message": error.get("message"),
        }
    return payload


def build_judge_inputs(run_dir: Path) -> list[dict[str, Any]]:
    definition = load_eval_definition()
    semantic_gold = parse_semantic_gold()
    baseline = load_baseline_records(run_dir)
    inputs: list[dict[str, Any]] = []

    for case in definition["cases"]:
        case_id = case["case_id"]
        gold = semantic_gold[case_id]
        if len(gold["segments"]) != len(case["segments"]):
            raise ValueError(f"Semantic/v2 segment mismatch for {case_id}")
        segments = []
        for index, (semantic, routing) in enumerate(
            zip(gold["segments"], case["segments"], strict=True), start=1
        ):
            if semantic["source_zh"] != routing["sourceZh"]:
                raise ValueError(f"Semantic/v2 source mismatch for {case_id}/{index}")
            segments.append(
                {
                    "item_index": index,
                    "source_zh": semantic["source_zh"],
                    "intent_zh": semantic["intent_zh"],
                    "input_fit": "sufficient",
                    "expected_action": routing["expected_action"],
                    "reference_focus_options_zh": routing[
                        "reference_focus_options_zh"
                    ],
                }
            )
        baseline_record = baseline[(case_id, "initial", None)]
        value = {
            "case_id": case_id,
            "task_prompt": case["task_prompt"],
            "full_essay": case["full_essay"],
            "target_sentence": case["target_sentence"],
            "interaction_phase": "initial",
            "selected_focus_zh": None,
            "segments": segments,
            "must_not_add": gold["must_not_add"],
            "system_output": system_output_for_judge(baseline_record),
        }
        assert_no_hidden_keys(value)
        inputs.append(value)

    case_by_id = {case["case_id"]: case for case in definition["cases"]}
    for request in definition["selected_focus_requests"]:
        case_id = request["case_id"]
        segment_index = request["segment_index"]
        case = case_by_id[case_id]
        gold = semantic_gold[case_id]
        routing = case["segments"][segment_index - 1]
        semantic = gold["segments"][segment_index - 1]
        baseline_record = baseline[(case_id, "selected_focus", segment_index)]
        value = {
            "case_id": case_id,
            "task_prompt": case["task_prompt"],
            "full_essay": case["full_essay"],
            "target_sentence": case["target_sentence"],
            "interaction_phase": "selected_focus",
            "selected_focus_zh": request["selected_focus"]["focusZh"],
            "segments": [
                {
                    "item_index": segment_index,
                    "source_zh": semantic["source_zh"],
                    "intent_zh": semantic["intent_zh"],
                    "input_fit": "sufficient",
                    "expected_action": "provide_expression",
                    "reference_focus_options_zh": routing[
                        "reference_focus_options_zh"
                    ],
                }
            ],
            "must_not_add": gold["must_not_add"],
            "system_output": system_output_for_judge(baseline_record),
        }
        assert_no_hidden_keys(value)
        inputs.append(value)

    if len(inputs) != EXPECTED_CALLS:
        raise ValueError(f"Expected {EXPECTED_CALLS} judge inputs, found {len(inputs)}")
    return inputs


def derive_item_result(
    scores: dict[str, int], protocol_violations: list[str], input_fit: str
) -> str:
    if input_fit == "not_scorable":
        return "not_scored_input_issue"
    if protocol_violations or 1 in scores.values():
        return "bad_case"
    if 2 in scores.values():
        return "needs_improvement"
    return "pass"


def worst_result(results: list[str]) -> str:
    scored = [result for result in results if result != "not_scored_input_issue"]
    if not scored:
        return "not_scored_input_issue"
    return max(scored, key=lambda result: RESULT_RANK[result])


def raw_text(raw: Any) -> str:
    content = getattr(raw, "content", raw)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        if parts:
            return "\n".join(parts).strip()
    return str(content).strip()


def build_judge_model(env: dict[str, str]) -> Any:
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
    return model.with_structured_output(
        JudgeOutput, method="function_calling", strict=True, include_raw=True
    )


def validate_judge_output(
    parsed: JudgeOutput, judge_input: dict[str, Any]
) -> list[dict[str, Any]]:
    if parsed.caseId != judge_input["case_id"]:
        raise OutputContractError("Judge caseId does not match input")
    expected = {
        segment["item_index"]: segment["source_zh"]
        for segment in judge_input["segments"]
    }
    actual = {review.itemIndex: review.sourceZh for review in parsed.itemReviews}
    if actual != expected:
        raise OutputContractError("Judge item indexes/sources do not match input")

    records: list[dict[str, Any]] = []
    runner_error = judge_input["system_output"].get("runner_error")
    for review in parsed.itemReviews:
        if review.interactionPhase != judge_input["interaction_phase"]:
            raise OutputContractError("Judge interaction phase does not match input")
        violations = list(review.protocolViolations)
        if runner_error and runner_error.get("stage") == "contract_validation":
            violation = "runner_contract_validation_error"
            if violation not in violations:
                violations.append(violation)
        scores = review.scores.model_dump()
        derived = derive_item_result(scores, violations, parsed.inputFit)
        records.append(
            {
                "eval_set_id": "expression-scaffold.dev.v2",
                "case_id": parsed.caseId,
                "item_index": review.itemIndex,
                "interaction_phase": review.interactionPhase,
                "source_zh": review.sourceZh,
                "selected_focus_zh": judge_input["selected_focus_zh"],
                "input_fit": parsed.inputFit,
                "expected_action": next(
                    segment["expected_action"]
                    for segment in judge_input["segments"]
                    if segment["item_index"] == review.itemIndex
                ),
                "system_output": judge_input["system_output"],
                "protocol_violations": violations,
                "scores": {
                    "semantic_fidelity": scores["semanticFidelity"],
                    "scaffold_quality": scores["scaffoldQuality"],
                    "assistance_calibration": scores["assistanceCalibration"],
                    "user_continuability": scores["userContinuability"],
                },
                "item_result": derived,
                "judge_reported_item_result": review.itemResult,
                "judge_reason_zh": review.reasonZh,
                "human_result": None,
                "human_note_zh": None,
            }
        )
    derived_case = worst_result([record["item_result"] for record in records])
    if parsed.caseResult != derived_case:
        for record in records:
            record["judge_case_result_mismatch"] = {
                "reported": parsed.caseResult,
                "derived_for_this_call": derived_case,
            }
    return records


def invoke_judge(model: Any, prompt: str, judge_input: dict[str, Any]) -> JudgeOutput:
    input_json = json.dumps(judge_input, ensure_ascii=False, indent=2)
    instruction = (
        "请评价下面这一条独立调用。segments.item_index 必须原样返回为 itemIndex；"
        "若 system_output.runner_error.stage 为 contract_validation，必须在对应 item 的"
        " protocolViolations 中指出协议失败。只返回约定结构。\n\n"
        + input_json
    )
    result = model.invoke([SystemMessage(prompt), HumanMessage(instruction)])
    parsed = result["parsed"]
    if parsed is None:
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text(result["raw"]))
        parsed = JudgeOutput.model_validate_json(text)
    return parsed


def make_manifest(run_dir: Path, model_name: str, inputs: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "manifestVersion": 1,
        "judgeRunId": f"{run_dir.name}-judge-v2",
        "baselineRunId": run_dir.name,
        "runType": "offline_llm_judge_prescreen",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": "expression-scaffold.dev.v2",
        "rubricVersion": "expression-scaffold-rubric.v2",
        "judgePromptVersion": JUDGE_PROMPT_VERSION,
        "judgeModel": {
            "name": model_name,
            "temperature": 0,
            "maxTokens": 4096,
            "maxRetries": 0,
            "timeoutSeconds": 120,
            "structuredOutputMethod": "function_calling",
        },
        "independence": {
            "inputIsolation": True,
            "differentModelFromBaseline": False,
            "limitation": "Only LongCat-2.0 was available; this is same-model self-evaluation and requires human calibration.",
            "blindFieldsExcluded": sorted(EXCLUDED_KEYS),
        },
        "execution": {
            "expectedCalls": len(inputs),
            "attempted": 0,
            "succeeded": 0,
            "failed": 0,
        },
        "artifacts": {
            "judgeInput": "judge-input.jsonl",
            "judgeRawOutputs": "judge-outputs.jsonl",
            "judgeScores": "judge-scores.jsonl",
            "judgeSummary": "judge-summary.json",
            "humanReview": "human-review-v2.md",
        },
        "sourceHashes": {
            "initialOutputs": sha256_file(run_dir / "initial-outputs.jsonl"),
            "selectedFocusOutputs": sha256_file(
                run_dir / "selected-focus-outputs.jsonl"
            ),
            "judgePrompt": sha256_file(JUDGE_PROMPT_PATH),
            "rubric": sha256_file(RUBRIC_PATH),
            "scoring": sha256_file(SCORING_PATH),
            "runner": sha256_file(Path(__file__).resolve()),
        },
    }


def build_summary(score_records: list[dict[str, Any]], failed_calls: int) -> dict[str, Any]:
    by_phase: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_case: dict[str, list[dict[str, Any]]] = defaultdict(list)
    dimensions: dict[str, Counter[int]] = defaultdict(Counter)
    for record in score_records:
        by_phase[record["interaction_phase"]].append(record)
        by_case[record["case_id"]].append(record)
        for dimension, score in record["scores"].items():
            dimensions[dimension][score] += 1

    case_results = {
        case_id: worst_result([record["item_result"] for record in records])
        for case_id, records in sorted(by_case.items())
    }
    return {
        "status": "judge_prescreen_only_human_review_required",
        "sameModelJudge": True,
        "judgeFailedCalls": failed_calls,
        "scoredItemPhases": len(score_records),
        "phaseResults": {
            phase: dict(Counter(record["item_result"] for record in records))
            for phase, records in sorted(by_phase.items())
        },
        "caseResults": dict(Counter(case_results.values())),
        "caseResultById": case_results,
        "dimensionDistributions": {
            dimension: {str(score): count for score, count in sorted(counts.items())}
            for dimension, counts in sorted(dimensions.items())
        },
        "protocolFailureItems": sum(
            bool(record["protocol_violations"]) for record in score_records
        ),
        "humanReviewItems": sum(
            record["item_result"] != "pass" for record in score_records
        ),
    }


def compact_output(record: dict[str, Any]) -> str:
    system_output = record["system_output"]
    return json.dumps(system_output, ensure_ascii=False, separators=(",", ":"))


def markdown_escape(value: Any) -> str:
    return str(value).replace("|", "\\|").replace("\n", " ")


def build_human_review(
    run_id: str, score_records: list[dict[str, Any]], summary: dict[str, Any]
) -> str:
    review = [record for record in score_records if record["item_result"] != "pass"]
    review.sort(
        key=lambda record: (
            -RESULT_RANK[record["item_result"]],
            record["case_id"],
            record["item_index"],
            record["interaction_phase"],
        )
    )
    lines = [
        "# v2 baseline Judge 人工复核清单",
        "",
        f"- 运行：`{run_id}`",
        "- 状态：Judge 预筛完成，待人工校准",
        "- 限制：baseline 与 Judge 都使用 LongCat-2.0；输入上下文相互隔离，但仍存在同模型自评偏差。",
        f"- 复核范围：{len(review)} 个非通过 item/阶段；另需抽检部分 pass。",
        "",
        "Judge 记录不能覆盖人工结论。请从实际输出判断语义、自然度、帮助剂量和下一步是否清楚。",
        "",
        "## 总览",
        "",
        "| case / item | 阶段 | Judge 结论 | 四维（语义/支架/剂量/继续） | 协议问题 | Judge 理由 |",
        "|---|---|---|---|---|---|",
    ]
    for record in review:
        scores = record["scores"]
        score_text = "/".join(
            str(scores[key])
            for key in (
                "semantic_fidelity",
                "scaffold_quality",
                "assistance_calibration",
                "user_continuability",
            )
        )
        violations = "；".join(record["protocol_violations"]) or "—"
        lines.append(
            "| "
            + " | ".join(
                markdown_escape(value)
                for value in (
                    f"{record['case_id']} / {record['item_index']}",
                    record["interaction_phase"],
                    record["item_result"],
                    score_text,
                    violations,
                    record["judge_reason_zh"],
                )
            )
            + " |"
        )

    for order, record in enumerate(review, start=1):
        lines.extend(
            [
                "",
                f"## {order}. {record['case_id']} / item {record['item_index']} / {record['interaction_phase']}",
                "",
                f"- 中文目标：`{record['source_zh']}`",
                f"- 已选聚焦：`{record['selected_focus_zh']}`"
                if record["selected_focus_zh"]
                else "- 已选聚焦：无（初轮）",
                f"- 预期动作：`{record['expected_action']}`",
                f"- 实际输出：`{compact_output(record)}`",
                f"- 协议问题：{'；'.join(record['protocol_violations']) or '无'}",
                f"- Judge 理由：{record['judge_reason_zh']}",
                "- 人工结论：`待填写`",
                "- 人工理由：",
            ]
        )

    lines.extend(
        [
            "",
            "## 批次汇总（仅 Judge 预筛）",
            "",
            "```json",
            json.dumps(summary, ensure_ascii=False, indent=2),
            "```",
            "",
        ]
    )
    return "\n".join(lines)


def run_judge(run_dir: Path, env: dict[str, str]) -> dict[str, Any]:
    input_path = run_dir / "judge-input.jsonl"
    raw_output_path = run_dir / "judge-outputs.jsonl"
    scores_path = run_dir / "judge-scores.jsonl"
    manifest_path = run_dir / "judge-manifest.json"
    summary_path = run_dir / "judge-summary.json"
    review_path = run_dir / "human-review-v2.md"
    for path in (
        input_path,
        raw_output_path,
        scores_path,
        manifest_path,
        summary_path,
        review_path,
    ):
        if path.exists():
            raise FileExistsError(f"Refusing to overwrite existing judge artifact: {path.name}")

    inputs = build_judge_inputs(run_dir)
    with input_path.open("x", encoding="utf-8", newline="\n") as handle:
        for value in inputs:
            write_json_line(handle, value)

    manifest = make_manifest(run_dir, env["model"], inputs)
    manifest["sourceHashes"]["judgeInput"] = sha256_file(input_path)
    write_json_exclusive(manifest_path, manifest)
    prompt = JUDGE_PROMPT_PATH.read_text("utf-8")
    model = build_judge_model(env)
    score_records: list[dict[str, Any]] = []

    try:
        with raw_output_path.open("x", encoding="utf-8", newline="\n") as raw_file, scores_path.open(
            "x", encoding="utf-8", newline="\n"
        ) as score_file:
            for judge_input in inputs:
                manifest["execution"]["attempted"] += 1
                label = (
                    f"{judge_input['case_id']} {judge_input['interaction_phase']}"
                )
                raw_record: dict[str, Any] = {
                    "case_id": judge_input["case_id"],
                    "interaction_phase": judge_input["interaction_phase"],
                    "item_indexes": [
                        segment["item_index"] for segment in judge_input["segments"]
                    ],
                }
                try:
                    parsed = invoke_judge(model, prompt, judge_input)
                    raw_record["judge_output"] = parsed.model_dump()
                    derived_records = validate_judge_output(parsed, judge_input)
                    for record in derived_records:
                        record["run_id"] = run_dir.name
                        record["judge_model"] = env["model"]
                        write_json_line(score_file, record)
                        score_records.append(record)
                    manifest["execution"]["succeeded"] += 1
                    print(f"{label} judge ok")
                except Exception as error:
                    raw_record["error"] = {
                        "stage": "judge_invocation_or_validation",
                        "type": type(error).__name__,
                        "message": sanitize_error(error, env),
                    }
                    manifest["execution"]["failed"] += 1
                    print(f"{label} judge error")
                write_json_line(raw_file, raw_record)

        summary = build_summary(score_records, manifest["execution"]["failed"])
        write_json_exclusive(summary_path, summary)
        with review_path.open("x", encoding="utf-8", newline="\n") as handle:
            handle.write(build_human_review(run_dir.name, score_records, summary))
        manifest["status"] = (
            "completed"
            if manifest["execution"]["failed"] == 0
            else "completed_with_errors"
        )
        manifest["summary"] = {
            "caseResults": summary["caseResults"],
            "humanReviewItems": summary["humanReviewItems"],
            "protocolFailureItems": summary["protocolFailureItems"],
        }
    except Exception as error:
        manifest["status"] = "failed"
        manifest["runError"] = {
            "stage": "judge_runner",
            "type": type(error).__name__,
            "message": sanitize_error(error, env),
        }
        raise
    finally:
        manifest["completedAt"] = utc_now()
        replace_json(manifest_path, manifest)
    return manifest


def validate_run_dir(path: Path) -> Path:
    resolved = ensure_under(path, RUNS_DIR, "run-dir")
    if resolved.parent != RUNS_DIR.resolve() or not resolved.is_dir():
        raise ValueError("run-dir must be an existing direct child of runs/")
    manifest_path = resolved / "run-manifest.json"
    manifest = json.loads(manifest_path.read_text("utf-8-sig"))
    if manifest.get("evalSetId") != "expression-scaffold.dev.v2":
        raise ValueError("run-dir is not a v2 baseline")
    return resolved


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the isolated v2 Judge prescreen.")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    env: dict[str, str] = {}
    try:
        run_dir = validate_run_dir(args.run_dir)
        inputs = build_judge_inputs(run_dir)
        if args.validate_only:
            print(
                f"v2 judge validation passed: {len(inputs)} isolated inputs; "
                f"hidden_fields_excluded={','.join(sorted(EXCLUDED_KEYS))}."
            )
            return
        if args.env_file is None:
            parser.error("--env-file is required unless --validate-only is used")
        env = read_env(args.env_file)
        manifest = run_judge(run_dir, env)
        execution = manifest["execution"]
        print(
            f"judge complete: status={manifest['status']}, "
            f"calls={execution['attempted']}, failures={execution['failed']}"
        )
    except SystemExit:
        raise
    except Exception as error:
        raise SystemExit(f"run_judge failed: {sanitize_error(error, env)}") from None


if __name__ == "__main__":
    main()
