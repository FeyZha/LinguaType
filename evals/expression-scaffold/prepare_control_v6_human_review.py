"""Render a v5-to-v6 controlled-generation comparison for human review."""

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


def indexed_records(run_dir: Path) -> dict[str, dict[str, Any]]:
    return {
        row["case_id"]: row
        for row in read_jsonl(run_dir / "records.jsonl")
        if row.get("repetition") == 1
    }


def render(
    original_run: Path, v5_run: Path, v6_run: Path
) -> str:
    cases = {case["case_id"]: case for case in v4.load_definition()["cases"]}
    calibration = {
        row["case_id"]: row
        for row in read_jsonl(original_run / "human-calibration-deepseek-v4.jsonl")
    }
    v5 = indexed_records(v5_run)
    v6 = indexed_records(v6_run)
    case_ids = list(v6)
    missing = [
        case_id
        for case_id in case_ids
        if case_id not in v5 or case_id not in calibration or case_id not in cases
    ]
    if missing:
        raise ValueError(f"missing comparison sources: {', '.join(missing)}")

    lines = [
        "# DeepSeek v6 控制权外移：9 case 人工审核",
        "",
        "状态：待用户逐条填写。",
        "",
        "v5 仍由模型决定直给或拆分；v6 由产品侧锁定顶层中文片段和帮助方式，模型只生成英文或支架内容。两版使用相同 DeepSeek、冻结 case、全文、temperature 0 和零自动重试。",
        "",
        "本轮重点不是再次检查结构，而是判断：控制权外移后，英文与支架质量是否更好、持平或变差。机器协议只作为客观提示。",
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
        v5_row = v5[case_id]
        v6_row = v6[case_id]
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
                f"- 最初人工结论：`{prior['human_result']}`",
                f"- 最初人工说明：{prior.get('human_note_zh') or '无'}",
                "",
                "### v5：模型仍决定帮助方式",
                "",
            ]
        )
        lines.extend(format_output(v5_row.get("output")))
        lines.extend(
            [
                "",
                "### v6：产品锁定帮助方式",
                "",
            ]
        )
        lines.extend(format_output(v6_row.get("output")))
        lines.extend(
            [
                "",
                "### 客观运行对照",
                "",
                "| 项目 | v5 | v6 |",
                "| --- | --- | --- |",
                f"| 最终协议 | {'通过' if v5_row['succeeded'] else '失败'} | {'通过' if v6_row['succeeded'] else '失败'} |",
                f"| 帮助方式来源 | 模型判断（{'与冻结一致' if v5_row['routeMatchesGold'] else '与冻结不同'}） | 产品规则锁定（{'与冻结一致' if v6_row['routePolicyMatchesFrozen'] else '与冻结不同'}） |",
                f"| 完整返回时间 | {v5_row['latencyMs'] / 1000:.2f} 秒 | {v6_row['latencyMs'] / 1000:.2f} 秒 |",
                "",
                "v6 人工结论：`待填写（pass / needs_improvement / bad_case）`",
                "",
                "相对 v5：`待填写（更好 / 持平 / 更差）`",
                "",
                "最初问题是否解决：`待填写（是 / 部分 / 否）`",
                "",
                "人工说明：",
                "",
                "---",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Render the v6 control human review")
    parser.add_argument("--original-run", type=Path, required=True)
    parser.add_argument("--v5-run", type=Path, required=True)
    parser.add_argument("--v6-run", type=Path, required=True)
    args = parser.parse_args()
    sys.stdout.write(render(args.original_run, args.v5_run, args.v6_run))


if __name__ == "__main__":
    main()
