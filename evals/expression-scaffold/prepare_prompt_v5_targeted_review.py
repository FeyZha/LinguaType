"""Render the DeepSeek v4-to-v5 targeted regression for human review."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import run_eval_v4 as v4
from prepare_model_latency_human_review import format_output


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line)
        for line in path.read_text("utf-8").splitlines()
        if line.strip()
    ]


def old_records(path: Path) -> dict[str, dict[str, Any]]:
    rows = read_jsonl(path)
    return {
        row["case_id"]: row
        for row in rows
        if row.get("phase") == "measured"
        and row.get("profile") == "deepseek"
        and row.get("repetition") == 1
    }


def new_records(path: Path) -> dict[str, dict[str, Any]]:
    rows = read_jsonl(path)
    return {
        row["case_id"]: row for row in rows if row.get("repetition") == 1
    }


def route_matches(output: dict[str, Any] | None, case: dict[str, Any]) -> bool:
    if not output or not isinstance(output.get("items"), list):
        return False
    actual = [
        (item.get("sourceZh"), item.get("action")) for item in output["items"]
    ]
    expected = [
        (segment["sourceZh"], segment["expected_action"])
        for segment in case["segments"]
    ]
    return actual == expected


def protocol_label(record: dict[str, Any]) -> str:
    if record.get("succeeded"):
        return "通过"
    error = record.get("error") or {}
    return f"失败：{error.get('message', '未记录原因')}"


def render(old_run: Path, new_run: Path) -> str:
    cases = {case["case_id"]: case for case in v4.load_definition()["cases"]}
    old = old_records(old_run / "records.jsonl")
    new = new_records(new_run / "records.jsonl")
    calibration = {
        row["case_id"]: row
        for row in read_jsonl(old_run / "human-calibration-deepseek-v4.jsonl")
    }
    case_ids = list(new)
    missing = [
        case_id
        for case_id in case_ids
        if case_id not in old or case_id not in calibration or case_id not in cases
    ]
    if missing:
        raise ValueError(f"missing comparison sources: {', '.join(missing)}")

    lines = [
        "# DeepSeek Prompt v5：9 case 定向复测人工审核",
        "",
        "状态：待用户逐条填写。",
        "",
        "本材料只比较同一个 DeepSeek V4 Flash 在 Prompt v4 与 v5 下的第一次回复。v5 新增本地识别的顶层中文片段清单，并收紧最低可用支架粒度；冻结 v4 case、全文上下文、输出 schema、模型参数和零重试保持不变。",
        "",
        "机器协议与冻结动作只作为客观提示，不自动决定人工质量结论。重点判断：上轮问题是否解决，以及是否出现新的过度直给、语义或自然度问题。",
        "",
        "---",
        "",
    ]
    action_labels = {
        "provide_expression": "直接表达",
        "offer_scaffolds": "复杂支架",
    }
    for position, case_id in enumerate(case_ids, start=1):
        case = cases[case_id]
        old_row = old[case_id]
        new_row = new[case_id]
        prior = calibration[case_id]
        lines.extend(
            [
                f"## {position:02d} / {case_id}",
                "",
                f"- 目标句：{case['target_sentence']}",
                "- 冻结顶层片段与动作：",
            ]
        )
        for segment in case["segments"]:
            lines.append(
                f"  - `{segment['sourceZh']}` → {action_labels[segment['expected_action']]}"
            )
        lines.extend(
            [
                f"- 上轮人工结论：`{prior['human_result']}`",
                f"- 上轮人工说明：{prior.get('human_note_zh') or '无'}",
                "",
                "### Prompt v4 回复",
                "",
            ]
        )
        lines.extend(format_output(old_row.get("output")))
        lines.extend(
            [
                "",
                "### Prompt v5 回复",
                "",
            ]
        )
        lines.extend(format_output(new_row.get("output")))
        lines.extend(
            [
                "",
                "### 客观运行对照",
                "",
                "| 项目 | v4 | v5 |",
                "| --- | --- | --- |",
                f"| 机器协议 | {protocol_label(old_row)} | {protocol_label(new_row)} |",
                f"| 冻结动作一致 | {'是' if route_matches(old_row.get('output'), case) else '否'} | {'是' if route_matches(new_row.get('output'), case) else '否'} |",
                f"| 完整返回时间 | {old_row['latencyMs'] / 1000:.2f} 秒 | {new_row['latencyMs'] / 1000:.2f} 秒 |",
                "",
                "v5 人工结论：`待填写（pass / needs_improvement / bad_case）`",
                "",
                "上轮问题是否解决：`待填写（是 / 部分 / 否）`",
                "",
                "是否出现新问题：`待填写（无 / 有）`",
                "",
                "人工说明：",
                "",
                "---",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Render the v5 targeted human review")
    parser.add_argument("--old-run", type=Path, required=True)
    parser.add_argument("--new-run", type=Path, required=True)
    args = parser.parse_args()
    sys.stdout.write(render(args.old_run, args.new_run))


if __name__ == "__main__":
    main()
