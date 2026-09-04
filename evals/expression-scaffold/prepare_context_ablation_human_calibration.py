"""Generate human-calibration material after the blind review is locked and unblinded."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


PRIORITY_CASES = {
    "LT-ESC-002",
    "LT-ESC-004",
    "LT-ESC-006",
    "LT-ESC-013",
    "LT-ESC-015",
    "LT-ESC-016",
    "LT-ESC-017",
    "LT-ESC-018",
    "LT-ESC-020",
}
PASS_SPOT_CHECK_CASES = {"LT-ESC-005", "LT-ESC-009", "LT-ESC-010"}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text("utf-8-sig").splitlines() if line]


def indexed(path: Path, key: str) -> dict[str, dict[str, Any]]:
    return {row[key]: row for row in read_jsonl(path)}


def render_candidate(
    final_row: dict[str, Any], candidate: dict[str, Any], priority: bool
) -> str:
    review = final_row["final_review"]
    scores = (
        f"semantic={review['semantic_fidelity']}, "
        f"scaffold={review['scaffold_quality']}, "
        f"calibration={review['assistance_calibration']}, "
        f"composability={review['user_composability']}"
    )
    findings = review.get("findings") or []
    findings_text = "\n".join(f"  - {finding}" for finding in findings) or "  - 无"
    hard_gates = review.get("hard_gate_codes") or []
    hard_gate_text = "、".join(hard_gates) if hard_gates else "无"
    output = json.dumps(
        candidate.get("candidate_output"), ensure_ascii=False, indent=2
    )
    error = candidate.get("candidate_run_error")
    error_text = (
        json.dumps(error, ensure_ascii=False, indent=2) if error is not None else "无"
    )
    priority_text = "是" if priority else "否"
    return f"""### {final_row['variant_id']} / {final_row['case_id']}

- 是否影响字段决策：{priority_text}
- Codex 预审：`{review['derived_verdict']}`（{scores}）
- 分歧处理：`{final_row['resolution']}`
- 硬门槛：{hard_gate_text}
- 目标句：{candidate['target_sentence']}
- `must_not_add`：{candidate['must_not_add']}
- 预审发现：
{findings_text}

候选输出：

```json
{output}
```

运行错误：

```json
{error_text}
```

人工结论：`待填写`

人工说明：

---
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparison-dir", type=Path, required=True)
    args = parser.parse_args()
    root = args.comparison_dir.resolve()
    final_rows = read_jsonl(root / "codex-review-final.jsonl")
    candidates = indexed(root / "blind-review-inputs.jsonl", "review_candidate_id")
    non_pass = [
        row
        for row in final_rows
        if row["final_review"]["derived_verdict"] != "pass"
    ]
    pass_spot_checks = [
        row
        for row in final_rows
        if row["final_review"]["derived_verdict"] == "pass"
        and row["case_id"] in PASS_SPOT_CHECK_CASES
    ]
    non_pass.sort(
        key=lambda row: (
            0 if row["case_id"] in PRIORITY_CASES else 1,
            row["case_id"],
            row["variant_id"],
        )
    )
    pass_spot_checks.sort(key=lambda row: (row["case_id"], row["variant_id"]))

    output_path = root / "human-calibration.md"
    if output_path.exists():
        raise SystemExit("human-calibration.md already exists; refusing to overwrite")
    parts = [
        "# v4 作文上下文量消融：人工校准\n",
        "状态：Codex 隔离预审已锁定并解盲；人工结论尚未填写。\n",
        "本文件包含全部非通过候选，以及少量 pass 抽检。A 是历史全文；B 是相邻三句；C 仅保留目标句内容。当前数字不能代替人工判断。\n",
        f"- 非通过候选：{len(non_pass)}\n",
        f"- pass 抽检候选：{len(pass_spot_checks)}\n",
        "- 优先先看“是否影响字段决策：是”的条目。\n",
        "\n## 全部非通过候选\n",
    ]
    for row in non_pass:
        parts.append(
            render_candidate(
                row,
                candidates[row["review_candidate_id"]],
                row["case_id"] in PRIORITY_CASES,
            )
        )
    parts.append("\n## Pass 抽检\n")
    for row in pass_spot_checks:
        parts.append(
            render_candidate(row, candidates[row["review_candidate_id"]], False)
        )
    output_path.write_text("\n".join(parts), "utf-8")
    print(
        f"human calibration prepared: non_pass={len(non_pass)}, "
        f"pass_spot_checks={len(pass_spot_checks)}"
    )


if __name__ == "__main__":
    main()
