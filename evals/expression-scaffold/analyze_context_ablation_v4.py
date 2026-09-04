"""Prepare automatic and blinded comparisons for the v4 context ablation."""

from __future__ import annotations

import argparse
import json
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Any

import run_eval_v4 as v4
from run_eval import (
    RUNS_DIR,
    ensure_under,
    read_json,
    sha256_file,
    write_json_exclusive,
    write_json_line,
)
from run_context_ablation_v4 import (
    BASELINE_RUN_DIR,
    EXPERIMENT_ID,
    prepare_cases,
)


BLIND_SEED = 20260825
V1_CASES_PATH = v4.EVAL_DIR / "cases.md"


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    try:
        lines = path.read_text("utf-8-sig").splitlines()
    except FileNotFoundError as error:
        raise ValueError(f"Missing required artifact: {path}") from error
    for line_number, line in enumerate(lines, start=1):
        if not line.strip():
            continue
        try:
            value = json.loads(line)
        except json.JSONDecodeError as error:
            raise ValueError(f"Invalid JSONL in {path.name}:{line_number}") from error
        if not isinstance(value, dict):
            raise ValueError(f"Expected JSON object in {path.name}:{line_number}")
        records.append(value)
    return records


def parse_gold_annotations() -> dict[str, dict[str, Any]]:
    markdown = V1_CASES_PATH.read_text("utf-8")
    blocks = re.split(r"(?=^### LT-ESC-\d{3})", markdown, flags=re.MULTILINE)[1:]
    annotations: dict[str, dict[str, Any]] = {}
    for block in blocks:
        case_match = re.search(r"^### (LT-ESC-\d{3})", block, re.MULTILINE)
        case_type_match = re.search(r"^- `case_type`：`([^`]+)`", block, re.MULTILINE)
        source_type_match = re.search(r"^- `source_type`：`([^`]+)`", block, re.MULTILINE)
        must_not_add_match = re.search(r"^- `must_not_add`：(.*)$", block, re.MULTILINE)
        if not all((case_match, case_type_match, source_type_match, must_not_add_match)):
            raise ValueError("Could not parse v1 case annotations")
        segments = []
        pattern = re.compile(
            r"^\s+- `source_zh`：`([^`]+)`\r?\n"
            r"\s+`intent_zh`：(.*?)\r?\n"
            r"\s+`slot_function`：`([^`]+)`\r?\n"
            r"\s+`span_scope`：`([^`]+)`$",
            re.MULTILINE,
        )
        for source_zh, intent_zh, slot_function, span_scope in pattern.findall(block):
            segments.append(
                {
                    "source_zh": source_zh,
                    "intent_zh": intent_zh,
                    "slot_function": slot_function,
                    "span_scope": span_scope,
                }
            )
        if not segments:
            raise ValueError(f"Could not parse segments for {case_match.group(1)}")
        annotations[case_match.group(1)] = {
            "case_type": case_type_match.group(1),
            "source_type": source_type_match.group(1),
            "must_not_add": must_not_add_match.group(1),
            "segments": segments,
        }
    return annotations


def validate_run_dir(path: Path, expected_variant_id: str) -> dict[str, Any]:
    resolved = ensure_under(path, RUNS_DIR, "ablation run")
    manifest = read_json(resolved / "run-manifest.json")
    if manifest.get("status") not in {"completed", "completed_with_errors"}:
        raise ValueError(f"Run is not completed: {resolved.name}")
    if manifest.get("experimentId") != EXPERIMENT_ID:
        raise ValueError(f"Run belongs to another experiment: {resolved.name}")
    if manifest.get("inputVariant", {}).get("id") != expected_variant_id:
        raise ValueError(f"Unexpected variant in {resolved.name}")
    if manifest.get("evalSetId") != v4.EVAL_SET_ID:
        raise ValueError(f"Unexpected eval set in {resolved.name}")
    if manifest.get("promptVersion") != v4.PROMPT_VERSION:
        raise ValueError(f"Unexpected prompt in {resolved.name}")
    if manifest.get("outputSchemaId") != v4.SCHEMA_ID:
        raise ValueError(f"Unexpected schema in {resolved.name}")
    return manifest


def records_by_case(run_dir: Path) -> dict[str, dict[str, Any]]:
    records = read_jsonl(run_dir / "model-outputs.jsonl")
    by_case: dict[str, dict[str, Any]] = {}
    for record in records:
        case_id = record.get("case_id")
        if not isinstance(case_id, str) or case_id in by_case:
            raise ValueError(f"Invalid or duplicate case_id in {run_dir.name}")
        if "output" not in record and "error" not in record:
            raise ValueError(f"Unusable record for {case_id} in {run_dir.name}")
        by_case[case_id] = record
    return by_case


def output_stats(
    records: dict[str, dict[str, Any]], cases: list[dict[str, Any]]
) -> dict[str, Any]:
    direct = 0
    scaffold_sets = 0
    scaffolds = 0
    expected_action_mismatches: list[dict[str, Any]] = []
    run_errors: list[dict[str, Any]] = []
    schema_failures: list[dict[str, Any]] = []
    contract_failures: list[dict[str, Any]] = []
    route_signatures: dict[str, list[str] | None] = {}
    contract_valid_cases = 0
    for case in cases:
        case_id = case["case_id"]
        record = records[case_id]
        if "error" in record:
            run_errors.append({"case_id": case_id, **record["error"]})
        raw_output = record.get("output")
        if not isinstance(raw_output, dict):
            route_signatures[case_id] = None
            continue
        try:
            parsed = v4.Output.model_validate(raw_output)
        except Exception as error:
            route_signatures[case_id] = None
            schema_failures.append(
                {
                    "case_id": case_id,
                    "type": type(error).__name__,
                    "message": str(error)[:1200],
                }
            )
            continue
        try:
            v4.validate_output(raw_output, case)
            contract_valid_cases += 1
        except Exception as error:
            contract_failures.append(
                {
                    "case_id": case_id,
                    "type": type(error).__name__,
                    "message": str(error)[:1200],
                }
            )
        actions = [item.action for item in parsed.items]
        route_signatures[case_id] = actions
        for item in parsed.items:
            if item.action == "provide_expression":
                direct += 1
            else:
                scaffold_sets += 1
                scaffolds += len(item.scaffolds)
        expected_sources = [segment["sourceZh"] for segment in case["segments"]]
        if [item.sourceZh for item in parsed.items] == expected_sources:
            for index, (item, segment) in enumerate(
                zip(parsed.items, case["segments"], strict=True), start=1
            ):
                if item.action != segment["expected_action"]:
                    expected_action_mismatches.append(
                        {
                            "case_id": case_id,
                            "itemIndex": index,
                            "expected": segment["expected_action"],
                            "actual": item.action,
                        }
                    )
    return {
        "cases": len(records),
        "contractValidCases": contract_valid_cases,
        "runErrors": run_errors,
        "schemaFailures": schema_failures,
        "contractFailures": contract_failures,
        "items": direct + scaffold_sets,
        "directItems": direct,
        "scaffoldSets": scaffold_sets,
        "scaffolds": scaffolds,
        "expectedActionMismatches": expected_action_mismatches,
        "routeSignatures": route_signatures,
    }


def duration_seconds(manifest: dict[str, Any]) -> float | None:
    try:
        started = datetime.fromisoformat(manifest["startedAt"].replace("Z", "+00:00"))
        completed = datetime.fromisoformat(manifest["completedAt"].replace("Z", "+00:00"))
    except (KeyError, TypeError, ValueError):
        return None
    return round((completed - started).total_seconds(), 3)


def canonical_input_stats(definition: dict[str, Any]) -> dict[str, Any]:
    cases = definition["cases"]
    rendered_chars = 0
    for case in cases:
        rendered_chars += len(
            v4.render_user_prompt(
                definition["user_template"],
                {
                    "task_prompt": case["task_prompt"],
                    "full_essay": case["full_essay"],
                    "target_sentence": case["target_sentence"],
                },
            )
        )
    return {
        "taskPromptChars": sum(len(case["task_prompt"]) for case in cases),
        "canonicalFullEssayChars": sum(len(case["full_essay"]) for case in cases),
        "sentFullEssayChars": sum(len(case["full_essay"]) for case in cases),
        "targetSentenceChars": sum(len(case["target_sentence"]) for case in cases),
        "renderedUserMessageChars": rendered_chars,
        "fullEssayCharsRemoved": 0,
        "fullEssayReductionRatio": 0,
    }


def exact_pair_summary(
    left: dict[str, dict[str, Any]], right: dict[str, dict[str, Any]]
) -> dict[str, Any]:
    equal = []
    different = []
    for case_id in left:
        (equal if left[case_id] == right[case_id] else different).append(case_id)
    return {
        "exactlyEqualCount": len(equal),
        "differentCount": len(different),
        "exactlyEqualCaseIds": equal,
        "differentCaseIds": different,
        "note": "String/structure equality is descriptive only and is not a quality judgment.",
    }


def make_review_bundle(
    handle: Any,
    map_handle: Any,
    definition: dict[str, Any],
    annotations: dict[str, dict[str, Any]],
    outputs_by_variant: dict[str, dict[str, dict[str, Any]]],
) -> None:
    rng = random.Random(BLIND_SEED)
    for case_number, case in enumerate(definition["cases"], start=1):
        case_id = case["case_id"]
        overlay_by_source = {segment["sourceZh"]: segment for segment in case["segments"]}
        gold = annotations[case_id]
        gold_segments = []
        for segment in gold["segments"]:
            overlay = overlay_by_source[segment["source_zh"]]
            gold_segments.append(
                {
                    **segment,
                    "expected_action": overlay["expected_action"],
                    "reference_focus_units_zh": overlay["reference_focus_units_zh"],
                    "focus_trace_policy": overlay["focus_trace_policy"],
                }
            )
        variants = list(outputs_by_variant)
        rng.shuffle(variants)
        for candidate_number, variant in enumerate(variants, start=1):
            candidate_id = f"review-{case_number:03d}-{candidate_number}"
            write_json_line(
                handle,
                {
                    "review_candidate_id": candidate_id,
                    "case_id": case_id,
                    "task_prompt": case["task_prompt"],
                    "canonical_full_essay": case["full_essay"],
                    "target_sentence": case["target_sentence"],
                    "must_not_add": gold["must_not_add"],
                    "gold_segments": gold_segments,
                    "candidate_output": outputs_by_variant[variant][case_id].get(
                        "output"
                    ),
                    "candidate_run_error": outputs_by_variant[variant][case_id].get(
                        "error"
                    ),
                    "rubric_version": "expression-scaffold-rubric.v4",
                },
            )
            write_json_line(
                map_handle,
                {
                    "review_candidate_id": candidate_id,
                    "case_id": case_id,
                    "variant_id": variant,
                },
            )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create automatic and blind-review artifacts for v4 context ablation."
    )
    parser.add_argument("--b-run-dir", type=Path, required=True)
    parser.add_argument("--c-run-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    b_dir = ensure_under(args.b_run_dir, RUNS_DIR, "B run")
    c_dir = ensure_under(args.c_run_dir, RUNS_DIR, "C run")
    output_dir = ensure_under(args.output_dir, RUNS_DIR, "comparison output")
    if output_dir.parent != RUNS_DIR.resolve():
        raise SystemExit("comparison output must be a direct child of runs/")
    if output_dir.exists():
        raise SystemExit("comparison output already exists; refusing to overwrite")

    definition = v4.load_definition()
    b_manifest = validate_run_dir(b_dir, "B")
    c_manifest = validate_run_dir(c_dir, "C")
    a_manifest = read_json(BASELINE_RUN_DIR / "run-manifest.json")
    if a_manifest.get("status") != "completed":
        raise SystemExit("Historical A baseline is not completed")
    manifests = {"A": a_manifest, "B": b_manifest, "C": c_manifest}
    model_names = {manifest["model"]["name"] for manifest in manifests.values()}
    if len(model_names) != 1:
        raise SystemExit("A/B/C model names differ")
    if b_manifest.get("providerEndpointSha256") != c_manifest.get(
        "providerEndpointSha256"
    ):
        raise SystemExit("B/C provider endpoint hashes differ")
    for source_key in ("runner", "experimentDefinition", "prompt", "outputSchema"):
        if b_manifest.get("sourceHashes", {}).get(source_key) != c_manifest.get(
            "sourceHashes", {}
        ).get(source_key):
            raise SystemExit(f"B/C source hash differs: {source_key}")

    outputs_by_variant = {
        "A": records_by_case(BASELINE_RUN_DIR),
        "B": records_by_case(b_dir),
        "C": records_by_case(c_dir),
    }
    expected_ids = [case["case_id"] for case in definition["cases"]]
    for variant, outputs in outputs_by_variant.items():
        if list(outputs) != expected_ids:
            raise SystemExit(f"{variant} case IDs/order differ from frozen v4")

    stats_by_variant = {
        variant: output_stats(outputs, definition["cases"])
        for variant, outputs in outputs_by_variant.items()
    }
    route_differences = {}
    for pair in (("A", "B"), ("B", "C"), ("A", "C")):
        left, right = pair
        route_differences[f"{left}-{right}"] = [
            case_id
            for case_id in expected_ids
            if stats_by_variant[left]["routeSignatures"][case_id]
            != stats_by_variant[right]["routeSignatures"][case_id]
        ]

    input_stats = {
        "A": canonical_input_stats(definition),
        "B": b_manifest["inputStats"],
        "C": c_manifest["inputStats"],
    }
    automatic_summary = {
        "experimentId": EXPERIMENT_ID,
        "comparisonType": "exploratory_historical_A_vs_new_B_C",
        "evidenceBoundary": [
            "A is historical rather than contemporaneous and interleaved.",
            "Automatic equality and route checks do not judge semantic quality.",
            "Quality conclusions require blinded independent review and user calibration.",
        ],
        "runs": {
            variant: {
                "runId": manifest["runId"],
                "runManifestSha256": sha256_file(
                    (BASELINE_RUN_DIR if variant == "A" else b_dir if variant == "B" else c_dir)
                    / "run-manifest.json"
                ),
                "wallDurationSeconds": duration_seconds(manifest),
                "callMetrics": manifest.get("metrics"),
            }
            for variant, manifest in manifests.items()
        },
        "inputStats": input_stats,
        "outputStats": stats_by_variant,
        "routeDifferenceCaseIds": route_differences,
        "exactOutputComparisons": {
            "A-B": exact_pair_summary(outputs_by_variant["A"], outputs_by_variant["B"]),
            "B-C": exact_pair_summary(outputs_by_variant["B"], outputs_by_variant["C"]),
            "A-C": exact_pair_summary(outputs_by_variant["A"], outputs_by_variant["C"]),
        },
    }

    output_dir.mkdir(exist_ok=False)
    write_json_exclusive(output_dir / "automatic-summary.json", automatic_summary)
    comparison_manifest = {
        "manifestVersion": 1,
        "experimentId": EXPERIMENT_ID,
        "status": "prepared_for_blind_review",
        "blindSeed": BLIND_SEED,
        "candidateCount": len(expected_ids) * 3,
        "artifacts": {
            "automaticSummary": "automatic-summary.json",
            "blindReviewInputs": "blind-review-inputs.jsonl",
            "blindMap": "blind-map.jsonl",
        },
        "sourceRuns": {variant: manifest["runId"] for variant, manifest in manifests.items()},
    }
    write_json_exclusive(output_dir / "comparison-manifest.json", comparison_manifest)
    annotations = parse_gold_annotations()
    with (
        (output_dir / "blind-review-inputs.jsonl").open(
            "x", encoding="utf-8", newline="\n"
        ) as review_handle,
        (output_dir / "blind-map.jsonl").open("x", encoding="utf-8", newline="\n")
        as map_handle,
    ):
        make_review_bundle(
            review_handle,
            map_handle,
            definition,
            annotations,
            outputs_by_variant,
        )
    print(
        f"context ablation comparison prepared: cases={len(expected_ids)}, "
        f"candidates={len(expected_ids) * 3}, output={output_dir.name}"
    )


if __name__ == "__main__":
    main()
