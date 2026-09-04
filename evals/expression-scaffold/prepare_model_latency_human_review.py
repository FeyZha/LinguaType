"""Render one model profile from a latency run as a human-review Markdown file.

The script writes Markdown to stdout. It does not modify run artifacts.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

import run_eval_v4 as v4


def read_records(path: Path, profile: str) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for line in path.read_text("utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if record.get("phase") != "measured" or record.get("profile") != profile:
            continue
        if record.get("repetition") != 1:
            continue
        case_id = record["case_id"]
        if case_id in records:
            raise ValueError(f"duplicate measured record: {case_id}")
        records[case_id] = record
    return records


def read_case_notes() -> dict[str, dict[str, Any]]:
    markdown = (v4.EVAL_DIR / "cases.md").read_text("utf-8")
    headings = list(re.finditer(r"^### (LT-ESC-\d{3})[^\n]*$", markdown, re.MULTILINE))
    notes: dict[str, dict[str, Any]] = {}
    for index, match in enumerate(headings):
        end = headings[index + 1].start() if index + 1 < len(headings) else len(markdown)
        section = markdown[match.start() : end]
        intents = re.findall(r"`intent_zh`：([^\n]+)", section)
        must_not_match = re.search(r"^- `must_not_add`：([^\n]+)", section, re.MULTILINE)
        notes[match.group(1)] = {
            "intents": [value.strip() for value in intents],
            "must_not_add": must_not_match.group(1).strip() if must_not_match else "未记录",
        }
    return notes


def format_output(output: dict[str, Any] | None) -> list[str]:
    if not output or not isinstance(output.get("items"), list):
        return ["模型未返回可展示的结构化 items。"]
    lines: list[str] = []
    for item_index, item in enumerate(output["items"], start=1):
        lines.append(f"{item_index}. `sourceZh`：{item.get('sourceZh', '—')}")
        action = item.get("action")
        if action == "provide_expression":
            lines.append("   - 方式：直接表达")
            lines.append(
                f"   - 推荐英文：`{item.get('recommendedExpression') or '—'}`"
            )
            continue
        if action == "offer_scaffolds":
            lines.append("   - 方式：复杂支架")
            for scaffold in item.get("scaffolds") or []:
                lines.append(
                    "   - "
                    f"{scaffold.get('scaffoldId', '—')}｜"
                    f"{scaffold.get('focusZh', '—')} → "
                    f"`{scaffold.get('recommendedExpression', '—')}`"
                )
            continue
        lines.append(f"   - 方式：未知 `{action}`")
    return lines


def render(run_dir: Path, profile: str) -> str:
    definition = v4.load_definition()
    records = read_records(run_dir / "records.jsonl", profile)
    notes = read_case_notes()
    missing = [case["case_id"] for case in definition["cases"] if case["case_id"] not in records]
    if missing:
        raise ValueError(f"run is missing cases for {profile}: {', '.join(missing)}")

    lines = [
        "# DeepSeek V4 Flash：20 case 人工效果审核",
        "",
        "状态：待用户逐条填写。",
        "",
        "本材料只展示 DeepSeek V4 Flash 非思考模式在完整 20 case 确认运行中的第一次回复；不展示 LongCat 输出，也不包含 LLM Judge 质量结论。机器协议状态只表示是否通过既有结构校验，不能替代人工效果判断。",
        "",
        "## 人工判断口径",
        "",
        "- `pass`：语义、英文自然度、帮助剂量和用户可继续性均可接受。",
        "- `needs_improvement`：方向可用，但存在明确且需要修改的问题。",
        "- `bad_case`：核心语义错误、明显接管写作、无法使用，或违反关键产品边界。",
        "- 重点检查：是否忠实于中文原意；英文是否自然；该直接给一个表达时是否过度拆分；复杂支架是否仍给用户保留组织空间；是否新增原文没有的信息。",
        "",
        "填写格式：把每条末尾的 `待填写` 替换为结论，并在人工说明中写下理由。",
        "",
        "---",
        "",
    ]

    action_labels = {
        "provide_expression": "直接表达",
        "offer_scaffolds": "复杂支架",
    }
    for position, case in enumerate(definition["cases"], start=1):
        case_id = case["case_id"]
        record = records[case_id]
        case_note = notes.get(case_id, {"intents": [], "must_not_add": "未记录"})
        lines.extend(
            [
                f"## {position:02d} / {case_id}",
                "",
                f"- 雅思题目：{case['task_prompt']}",
                f"- 目标句：{case['target_sentence']}",
                "- 顶层中文片段与冻结帮助策略：",
            ]
        )
        intents = case_note["intents"]
        for segment_index, segment in enumerate(case["segments"], start=1):
            intent = intents[segment_index - 1] if segment_index <= len(intents) else "未记录"
            action = action_labels.get(segment["expected_action"], segment["expected_action"])
            lines.append(
                f"  {segment_index}. `{segment['sourceZh']}` → {action}；中文意图：{intent}"
            )
        lines.extend(
            [
                f"- 不应新增：{case_note['must_not_add']}",
                "",
                "<details>",
                "<summary>查看全文上下文</summary>",
                "",
                case["full_essay"],
                "",
                "</details>",
                "",
                "### DeepSeek 回复",
                "",
            ]
        )
        lines.extend(format_output(record.get("output")))
        error = record.get("error")
        if error:
            protocol = f"未通过：{error.get('message', '未记录原因')}"
        else:
            protocol = "通过"
        token_usage = record.get("tokenUsage") or {}
        lines.extend(
            [
                "",
                f"- 机器协议状态：`{protocol}`",
                f"- 本次完整返回时间：{record.get('latencyMs', 0) / 1000:.2f} 秒",
                f"- 本次 token：输入 {token_usage.get('input_tokens', '—')}；输出 {token_usage.get('output_tokens', '—')}",
                "",
                "人工结论：`待填写`",
                "",
                "主要问题：`待填写（无 / 语义 / 英文自然度 / 帮助剂量 / 用户可继续性 / 协议 / 其他）`",
                "",
                "人工说明：",
                "",
                "---",
                "",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description="Render model latency output for human review")
    parser.add_argument("--run-dir", type=Path, required=True)
    parser.add_argument("--profile", default="deepseek")
    args = parser.parse_args()
    print(render(args.run_dir, args.profile), end="")


if __name__ == "__main__":
    main()
