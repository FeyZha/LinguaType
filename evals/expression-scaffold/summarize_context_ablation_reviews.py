"""Lock blind-review scores, prepare adjudication, and unblind final results."""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any

from run_eval import read_json, replace_json, write_json_exclusive, write_json_line


REVIEW_FILES = {
    "full": "codex-review-full.jsonl",
    "semantic": "codex-review-semantic.jsonl",
    "calibration": "codex-review-calibration.jsonl",
}
VERDICT_SEVERITY = {
    "pass": 0,
    "needs_improvement": 1,
    "bad_case": 2,
    "not_scored_input_issue": 3,
}


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    records = []
    for line_number, line in enumerate(
        path.read_text("utf-8-sig").splitlines(), start=1
    ):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL at {path.name}:{line_number}") from error
        if not isinstance(value, dict):
            raise ValueError(f"Expected object at {path.name}:{line_number}")
        records.append(value)
    return records


def expected_verdict(record: dict[str, Any]) -> str:
    verdict = record.get("derived_verdict")
    if verdict == "not_scored_input_issue":
        return verdict
    hard_gates = record.get("hard_gate_codes")
    scores = [
        record.get("semantic_fidelity"),
        record.get("scaffold_quality"),
        record.get("assistance_calibration"),
        record.get("user_composability"),
    ]
    if not isinstance(hard_gates, list) or any(score not in {1, 2, 3} for score in scores):
        raise ValueError(f"Invalid review fields: {record.get('review_candidate_id')}")
    if hard_gates or 1 in scores:
        return "bad_case"
    if 2 in scores:
        return "needs_improvement"
    return "pass"


def load_reviews(root: Path) -> dict[str, list[dict[str, Any]]]:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for role, filename in REVIEW_FILES.items():
        rows = read_jsonl(root / filename)
        if len(rows) != 60:
            raise ValueError(f"{filename} must contain 60 reviews")
        seen: set[str] = set()
        for row in rows:
            candidate_id = row.get("review_candidate_id")
            if not isinstance(candidate_id, str) or candidate_id in seen:
                raise ValueError(f"Invalid duplicate ID in {filename}")
            seen.add(candidate_id)
            if row.get("reviewer_role") != role:
                raise ValueError(f"Reviewer role mismatch in {filename}")
            if row.get("derived_verdict") != expected_verdict(row):
                raise ValueError(f"Derived verdict mismatch for {candidate_id}")
            grouped.setdefault(candidate_id, []).append(row)
    if len(grouped) != 60 or any(len(rows) != 3 for rows in grouped.values()):
        raise ValueError("Blind reviews do not cover the same 60 candidates")
    return grouped


def indexed(path: Path, key: str) -> dict[str, dict[str, Any]]:
    values: dict[str, dict[str, Any]] = {}
    for row in read_jsonl(path):
        value = row.get(key)
        if not isinstance(value, str) or value in values:
            raise ValueError(f"Invalid or duplicate {key} in {path.name}")
        values[value] = row
    return values


def verdict_counts(values: list[str]) -> dict[str, int]:
    counts = Counter(values)
    return {key: counts.get(key, 0) for key in VERDICT_SEVERITY}


def prepare(root: Path, grouped: dict[str, list[dict[str, Any]]]) -> None:
    inputs = indexed(root / "blind-review-inputs.jsonl", "review_candidate_id")
    disagreements = {
        candidate_id: rows
        for candidate_id, rows in grouped.items()
        if len({row["derived_verdict"] for row in rows}) > 1
    }
    disagreement_path = root / "codex-review-disagreements.jsonl"
    summary_path = root / "codex-review-pre-adjudication.json"
    if disagreement_path.exists() or summary_path.exists():
        raise ValueError("Pre-adjudication artifacts already exist")
    with disagreement_path.open("x", encoding="utf-8", newline="\n") as handle:
        for candidate_id in sorted(disagreements):
            write_json_line(
                handle,
                {
                    "review_candidate_id": candidate_id,
                    "case_id": inputs[candidate_id]["case_id"],
                    "candidate_input": inputs[candidate_id],
                    "independent_reviews": disagreements[candidate_id],
                },
            )
    summary = {
        "status": "needs_adjudication" if disagreements else "unanimous",
        "candidateCount": len(grouped),
        "unanimousCount": len(grouped) - len(disagreements),
        "disagreementCount": len(disagreements),
        "disagreementCandidateIds": sorted(disagreements),
        "reviewerVerdictCounts": {
            role: verdict_counts(
                [
                    row["derived_verdict"]
                    for rows in grouped.values()
                    for row in rows
                    if row["reviewer_role"] == role
                ]
            )
            for role in REVIEW_FILES
        },
        "note": "Variant identities remain hidden in the adjudication artifact.",
    }
    write_json_exclusive(summary_path, summary)
    print(
        f"blind reviews locked: candidates={len(grouped)}, "
        f"disagreements={len(disagreements)}"
    )


def finalise(
    root: Path,
    grouped: dict[str, list[dict[str, Any]]],
    adjudication_path: Path,
) -> None:
    blind_map = indexed(root / "blind-map.jsonl", "review_candidate_id")
    disagreements = {
        candidate_id
        for candidate_id, rows in grouped.items()
        if len({row["derived_verdict"] for row in rows}) > 1
    }
    adjudications = indexed(adjudication_path, "review_candidate_id")
    if set(adjudications) != disagreements:
        raise ValueError("Adjudication IDs must exactly match disagreement IDs")
    for candidate_id, row in adjudications.items():
        if row.get("reviewer_role") != "adjudicator":
            raise ValueError(f"Invalid adjudicator role for {candidate_id}")
        if row.get("derived_verdict") != expected_verdict(row):
            raise ValueError(f"Invalid adjudicated verdict for {candidate_id}")

    final_rows = []
    for candidate_id, reviews in grouped.items():
        verdicts = {row["derived_verdict"] for row in reviews}
        if len(verdicts) == 1:
            final_review = reviews[0]
            resolution = "unanimous"
        else:
            final_review = adjudications[candidate_id]
            resolution = "adjudicated"
        mapping = blind_map[candidate_id]
        final_rows.append(
            {
                "review_candidate_id": candidate_id,
                "case_id": mapping["case_id"],
                "variant_id": mapping["variant_id"],
                "resolution": resolution,
                "final_review": final_review,
                "independent_verdicts": {
                    row["reviewer_role"]: row["derived_verdict"] for row in reviews
                },
            }
        )

    final_path = root / "codex-review-final.jsonl"
    summary_path = root / "codex-review-final-summary.json"
    if final_path.exists() or summary_path.exists():
        raise ValueError("Final review artifacts already exist")
    with final_path.open("x", encoding="utf-8", newline="\n") as handle:
        for row in sorted(final_rows, key=lambda value: value["review_candidate_id"]):
            write_json_line(handle, row)

    by_variant = {
        variant: [row for row in final_rows if row["variant_id"] == variant]
        for variant in ("A", "B", "C")
    }
    paired: dict[str, Any] = {}
    for left, right in (("A", "B"), ("B", "C"), ("A", "C")):
        left_by_case = {row["case_id"]: row for row in by_variant[left]}
        right_by_case = {row["case_id"]: row for row in by_variant[right]}
        outcomes = {"leftBetter": [], "rightBetter": [], "tie": [], "notComparable": []}
        for case_id in left_by_case:
            left_verdict = left_by_case[case_id]["final_review"]["derived_verdict"]
            right_verdict = right_by_case[case_id]["final_review"]["derived_verdict"]
            if "not_scored_input_issue" in {left_verdict, right_verdict}:
                outcomes["notComparable"].append(case_id)
                continue
            left_severity = VERDICT_SEVERITY[left_verdict]
            right_severity = VERDICT_SEVERITY[right_verdict]
            if left_severity < right_severity:
                outcomes["leftBetter"].append(case_id)
            elif right_severity < left_severity:
                outcomes["rightBetter"].append(case_id)
            else:
                outcomes["tie"].append(case_id)
        paired[f"{left}-{right}"] = outcomes

    summary = {
        "status": "codex_pre_review_complete_user_calibration_pending",
        "candidateCount": len(final_rows),
        "adjudicatedCount": len(disagreements),
        "variantVerdictCounts": {
            variant: verdict_counts(
                [row["final_review"]["derived_verdict"] for row in rows]
            )
            for variant, rows in by_variant.items()
        },
        "pairedCaseVerdictComparison": paired,
        "evidenceBoundary": [
            "This is isolated Codex pre-review, not final human calibration.",
            "A is historical and B/C were sequential rather than interleaved.",
            "Verdict comparisons are ordinal case outcomes, not improvement percentages.",
        ],
    }
    write_json_exclusive(summary_path, summary)
    manifest_path = root / "comparison-manifest.json"
    manifest = read_json(manifest_path)
    manifest["status"] = "codex_pre_review_complete_user_calibration_pending"
    manifest["artifacts"].update(
        {
            "reviewFull": REVIEW_FILES["full"],
            "reviewSemantic": REVIEW_FILES["semantic"],
            "reviewCalibration": REVIEW_FILES["calibration"],
            "reviewAdjudication": adjudication_path.name,
            "reviewFinal": final_path.name,
            "reviewFinalSummary": summary_path.name,
        }
    )
    replace_json(manifest_path, manifest)
    print(
        f"blind review finalised: candidates={len(final_rows)}, "
        f"adjudicated={len(disagreements)}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparison-dir", type=Path, required=True)
    parser.add_argument("--adjudication-file", type=Path)
    args = parser.parse_args()
    root = args.comparison_dir.resolve()
    grouped = load_reviews(root)
    if args.adjudication_file:
        finalise(root, grouped, args.adjudication_file.resolve())
    else:
        prepare(root, grouped)


if __name__ == "__main__":
    main()
