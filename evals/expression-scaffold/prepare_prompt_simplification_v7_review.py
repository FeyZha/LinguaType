"""Prepare a concise report and side-by-side human review for the v7 benchmark."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import run_eval_v4 as v4


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text("utf-8").splitlines() if line]


def expression_lines(output: dict[str, Any] | None) -> list[str]:
    if not output:
        return ["- 无有效输出"]
    lines: list[str] = []
    for item in output["items"]:
        if item["action"] == "provide_expression":
            lines.append(f"- `{item['sourceZh']}` → `{item['recommendedExpression']}`")
            continue
        lines.append(f"- `{item['sourceZh']}`")
        for scaffold in item["scaffolds"]:
            lines.append(
                f"  - {scaffold['scaffoldId']}｜{scaffold['focusZh']} → "
                f"`{scaffold['recommendedExpression']}`"
            )
    return lines


def prepare_review(run_dir: Path, records: list[dict[str, Any]]) -> None:
    definition = v4.load_definition()
    cases = {case["case_id"]: case for case in definition["cases"]}
    selected = {
        (row["case_id"], row["variant"]): row
        for row in records
        if row["repetition"] == 1
    }
    lines = [
        "# v7 完整版 / 精简版人工对照",
        "",
        "以下固定展示第一轮，避免由作者挑选较好回复。请只比较表达质量、支架粒度和用户是否仍需自行组织句子；速度与协议数据见 `results.md`。",
        "",
        "建议结论：`full` / `compact` / `tie` / `both_need_improvement`。",
        "",
    ]
    for case_id, case in cases.items():
        full = selected[(case_id, "full")]
        compact = selected[(case_id, "compact")]
        lines.extend([
            f"## {case_id}",
            "",
            f"目标句：`{case['target_sentence']}`",
            "",
            "### 完整版",
            "",
            *expression_lines(full["output"]),
            "",
            "### 精简版",
            "",
            *expression_lines(compact["output"]),
            "",
            "人工结论：",
            "",
            "备注：",
            "",
        ])
    (run_dir / "human-review.md").write_text("\n".join(lines), encoding="utf-8")


def prepare_results(
    run_dir: Path,
    summary: dict[str, Any],
    manifest: dict[str, Any],
    records: list[dict[str, Any]],
) -> None:
    full = summary["variants"]["full"]
    compact = summary["variants"]["compact"]
    delta = summary["compactMinusFull"]
    failures = [row for row in records if not row["succeeded"]]
    failure_lines = [
        f"- `{row['case_id']}` 第 {row['repetition']} 轮（{row['variant']}）：{row['error']['message']}"
        for row in failures
    ] or ["- 无"]
    input_reduction = round(-delta["averageInputTokens"] / full["averageTokenUsage"]["input_tokens"] * 100, 1)
    mean_reduction = round(-delta["meanLatencyMs"] / full["latencyMs"]["mean"] * 100, 1)
    full_characters = manifest["variants"]["full"]["systemCharacters"]
    compact_characters = manifest["variants"]["compact"]["systemCharacters"]
    char_reduction = round(-delta["systemCharacters"] / full_characters * 100, 1)
    lines = [
        "# v7 系统提示词精简基准测试",
        "",
        "## 结论",
        "",
        "若只看工程稳定性，当前先保留完整版作为候选默认版：精简版确实更省 token、平均更快，但 40 次中出现 1 次契约边界失败，尚未满足无损替换门槛。两版语义质量仍需人工对照后才能定稿。",
        "",
        "两个版本都修复了本轮明确的新问题：复杂支架最多 3 个，且未再把“可能”“同时”等附属成分单独拆出。LT-ESC-016 与 LT-ESC-017 在两轮、两版本中均通过该规则。",
        "",
        "## 结果",
        "",
        "| 指标 | 完整版 | 精简版 | 精简版变化 |",
        "| --- | ---: | ---: | ---: |",
        f"| 系统提示字符 | {full_characters} | {compact_characters} | {delta['systemCharacters']}（-{char_reduction}%） |",
        f"| 协议成功 | {full['succeeded']}/{full['calls']} | {compact['succeeded']}/{compact['calls']} | {delta['protocolFailures']:+d} 次失败 |",
        f"| 平均输入 token | {full['averageTokenUsage']['input_tokens']:.1f} | {compact['averageTokenUsage']['input_tokens']:.1f} | {delta['averageInputTokens']:.1f}（-{input_reduction}%） |",
        f"| 平均输出 token | {full['averageTokenUsage']['output_tokens']:.1f} | {compact['averageTokenUsage']['output_tokens']:.1f} | {delta['averageOutputTokens']:.1f} |",
        f"| 平均完整返回 | {full['latencyMs']['mean']:.1f}ms | {compact['latencyMs']['mean']:.1f}ms | {delta['meanLatencyMs']:.1f}ms（-{mean_reduction}%） |",
        f"| P50 | {full['latencyMs']['p50']}ms | {compact['latencyMs']['p50']}ms | {delta['p50LatencyMs']:+d}ms |",
        f"| P90 | {full['latencyMs']['p90']}ms | {compact['latencyMs']['p90']}ms | {delta['p90LatencyMs']:+d}ms |",
        f"| 附属成分独立支架 | {full['standaloneFunctionFocusViolations']} | {compact['standaloneFunctionFocusViolations']} | {delta['standaloneFunctionFocusViolations']:+d} |",
        f"| 支架数量分布 | {full['scaffoldCountDistribution']} | {compact['scaffoldCountDistribution']} | — |",
        "",
        "## 失败定位",
        "",
        *failure_lines,
        "",
        "精简版在 `LT-ESC-013` 第二轮把完整 sourceZh 直接作为 focusZh，触发“focus 必须短于 source”校验；同 case 第一轮成功，说明它是稳定性风险而非必现错误。零自动重试，因此该失败原样保留。",
        "",
        "另有一处需要人工判断的质量信号：`LT-ESC-013` 第一轮中，完整版把“收费低廉的”返回为三个斜线分隔候选，违反单结果原则；精简版只给一个表达，但尾部 `...` 是否多余也需复核。这说明 40/40 协议成功不等于质量无问题。",
        "",
        "## 解释边界",
        "",
        "- 约 101ms 的平均优势和 17ms 的 P90 优势都不大，仍混有 API 波动，不能承诺真实用户一定感知到速度提升。",
        "- 自动结果只覆盖协议与明确粒度禁令，不能证明英文自然度或支架质量相等。20 条第一轮并排输出见 `human-review.md`。",
        "- 评测继续使用非流式、单次调用、零自动重试；冻结 v4 文件未修改。",
        "",
    ]
    (run_dir / "results.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("run_dir", type=Path)
    args = parser.parse_args()
    run_dir = args.run_dir.resolve()
    records = read_jsonl(run_dir / "records.jsonl")
    summary = json.loads((run_dir / "summary.json").read_text("utf-8"))
    manifest = json.loads((run_dir / "run-manifest.json").read_text("utf-8"))
    prepare_review(run_dir, records)
    prepare_results(run_dir, summary, manifest, records)


if __name__ == "__main__":
    main()
