"""Run the frozen LinguaType v3 actual-path baseline.

v3 runs every initial case first, then deterministically follows every actual
``request_focus`` item by selecting its first returned focus option.  It never
injects a frozen focus string into the end-to-end path.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from importlib.metadata import version
from pathlib import Path
from typing import Any, Literal

from langchain_openai import ChatOpenAI

from run_eval import (
    EVAL_DIR,
    RUNS_DIR,
    V1_MANIFEST_PATH,
    Output,
    OutputContractError,
    build_graph,
    ensure_under,
    error_payload,
    read_base_cases,
    read_env,
    read_json,
    replace_json,
    sanitize_error,
    sha256_file,
    utc_now,
    verify_freeze_manifest,
    write_json_exclusive,
    write_json_line,
    normalized_base_url,
)


V3_DIR = EVAL_DIR / "eval-sets" / "expression-scaffold.dev.v3"
V3_MANIFEST_PATH = V3_DIR / "freeze-manifest.json"
V3_CASES_PATH = V3_DIR / "cases.md"
V3_SCHEMA_PATH = V3_DIR / "model-output.schema.json"
V3_PROMPT_PATH = EVAL_DIR / "prompts" / "baseline-v3.md"

EVAL_SET_ID = "expression-scaffold.dev.v3"
SCHEMA_ID = "expression-scaffold-output.v3"
PROMPT_VERSION = "expression-scaffold-baseline-v3"
EXPECTED_CASES = 20
EXPECTED_SEGMENTS = 25
EXPECTED_DIRECT = 14
EXPECTED_REQUEST_FOCUS = 11
SELECTION_SOURCE = "actual_initial_output"
SELECTION_POLICY = "first_focus_option"


def read_v3_overlay() -> list[dict[str, Any]]:
    markdown = V3_CASES_PATH.read_text("utf-8")
    rows = [
        line.split("|")[1:-1]
        for line in markdown.splitlines()
        if re.match(r"^\| LT-ESC-\d{3} / \d+ \|", line)
    ]
    overlay: list[dict[str, Any]] = []
    for cells in rows:
        values = [cell.strip() for cell in cells]
        if len(values) != 6:
            raise ValueError("Unexpected v3 overlay column count")
        case_item, source_zh, action_code, focus_cell, trace_policy, note = values
        match = re.fullmatch(r"(LT-ESC-\d{3}) / (\d+)", case_item)
        if not match:
            raise ValueError(f"Invalid v3 case/item: {case_item}")
        if action_code not in {"D", "R"}:
            raise ValueError(f"Invalid v3 action: {case_item}/{action_code}")
        focus_units = (
            []
            if focus_cell == "—"
            else [value.strip() for value in focus_cell.split("；") if value.strip()]
        )
        overlay.append(
            {
                "case_id": match.group(1),
                "segment_index": int(match.group(2)),
                "sourceZh": source_zh,
                "expected_action": (
                    "provide_expression" if action_code == "D" else "request_focus"
                ),
                "reference_focus_units_zh": focus_units,
                "focus_trace_policy": None if trace_policy == "—" else trace_policy,
                "calibration_note_zh": note,
            }
        )
    return overlay


def validate_gold_focus_units(segment: dict[str, Any], label: str) -> None:
    units = segment["reference_focus_units_zh"]
    source = segment["sourceZh"]
    policy = segment["focus_trace_policy"]
    if segment["expected_action"] == "provide_expression":
        if units or policy is not None:
            raise ValueError(f"{label}: direct item cannot define focus units")
        return
    if policy not in {"exact_spans", "semantic_units"}:
        raise ValueError(f"{label}: invalid focus trace policy")
    if not 2 <= len(units) <= 4 or len(set(units)) != len(units):
        raise ValueError(f"{label}: request_focus requires 2-4 unique units")
    for unit in units:
        if not unit or len(unit) >= len(source):
            raise ValueError(f"{label}: invalid focus unit length")
        if policy == "exact_spans" and unit not in source:
            raise ValueError(f"{label}: exact focus unit is not in source")
    if policy == "semantic_units" and all(unit in source for unit in units):
        raise ValueError(f"{label}: semantic policy must exercise non-contiguous focus")


def merge_cases(
    cases: list[dict[str, Any]], overlay: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    if len(cases) != EXPECTED_CASES or len(overlay) != EXPECTED_SEGMENTS:
        raise ValueError("Unexpected v3 case or segment count")
    case_by_id = {case["case_id"]: case for case in cases}
    direct_count = 0
    request_count = 0
    seen: set[tuple[str, int]] = set()
    for segment in overlay:
        key = (segment["case_id"], segment["segment_index"])
        if key in seen or segment["case_id"] not in case_by_id:
            raise ValueError(f"Duplicate or unknown v3 segment: {key}")
        seen.add(key)
        case = case_by_id[segment["case_id"]]
        if segment["sourceZh"] not in case["target_sentence"]:
            raise ValueError(f"v3 source is not in target sentence: {key}")
        validate_gold_focus_units(segment, f"{key[0]}/{key[1]}")
        if segment["expected_action"] == "provide_expression":
            direct_count += 1
        else:
            request_count += 1
        case["segments"].append(segment)

    if direct_count != EXPECTED_DIRECT or request_count != EXPECTED_REQUEST_FOCUS:
        raise ValueError("Unexpected v3 D/R counts")
    for case in cases:
        case["segments"].sort(key=lambda segment: segment["segment_index"])
        indexes = [segment["segment_index"] for segment in case["segments"]]
        if indexes != list(range(1, len(indexes) + 1)):
            raise ValueError(f"Non-contiguous segment indexes: {case['case_id']}")
        sources = [segment["sourceZh"] for segment in case["segments"]]
        if sources != case["base_sources"]:
            raise ValueError(f"v3 sources do not match v1: {case['case_id']}")
        previous_end = 0
        for source in sources:
            start = case["target_sentence"].find(source, previous_end)
            if start < 0:
                raise ValueError(f"v3 sources out of order: {case['case_id']}")
            previous_end = start + len(source)
        del case["base_sources"]
    return cases


def fenced(markdown: str, heading: str) -> str | None:
    match = re.search(
        rf"^## {re.escape(heading)}.*?```(?:text)?\r?\n(.*?)\r?\n```",
        markdown,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else None


def read_v3_prompt() -> tuple[str, str]:
    markdown = V3_PROMPT_PATH.read_text("utf-8")
    version_match = re.search(r"`prompt_version`[^`]*`([^`]+)`", markdown)
    prompt_version = version_match.group(1) if version_match else None
    if prompt_version != PROMPT_VERSION:
        raise ValueError("Unexpected v3 prompt version")
    system_prompt = fenced(markdown, "System prompt")
    user_template = fenced(markdown, "User message template")
    if not system_prompt or not user_template:
        raise ValueError("Could not parse v3 prompt blocks")
    for placeholder in (
        "{{task_prompt}}",
        "{{full_essay}}",
        "{{target_sentence}}",
        "{{interaction_phase}}",
        "{{selected_focus}}",
    ):
        if placeholder not in user_template:
            raise ValueError(f"v3 user template missing {placeholder}")
    return system_prompt, user_template


def load_definition() -> dict[str, Any]:
    v1_manifest = verify_freeze_manifest(
        V1_MANIFEST_PATH, "expression-scaffold.dev.v1"
    )
    v3_manifest = verify_freeze_manifest(V3_MANIFEST_PATH, EVAL_SET_ID)
    parent_path = v3_manifest.get("parentManifestPath")
    parent_hash = v3_manifest.get("parentManifestSha256")
    if not isinstance(parent_path, str) or not isinstance(parent_hash, str):
        raise ValueError("v3 manifest must pin its parent manifest")
    resolved_parent = (V3_MANIFEST_PATH.parent / parent_path).resolve()
    if resolved_parent != V1_MANIFEST_PATH.resolve():
        raise ValueError("v3 parent manifest path mismatch")
    if sha256_file(resolved_parent) != parent_hash.lower():
        raise ValueError("v3 parent manifest hash mismatch")
    if V3_CASES_PATH.resolve() not in v3_manifest["_verified_paths"]:
        raise ValueError("v3 cases overlay is not frozen")

    cases = merge_cases(read_base_cases(), read_v3_overlay())
    if v3_manifest.get("caseIds") != [case["case_id"] for case in cases]:
        raise ValueError("v3 manifest case order mismatch")
    counts = v3_manifest.get("counts", {})
    expected_counts = {
        "cases": EXPECTED_CASES,
        "chineseSegments": EXPECTED_SEGMENTS,
        "provideExpression": EXPECTED_DIRECT,
        "requestFocus": EXPECTED_REQUEST_FOCUS,
        "initialCalls": EXPECTED_CASES,
        "selectedFocusCallsUnderGold": EXPECTED_REQUEST_FOCUS,
    }
    for key, expected in expected_counts.items():
        if counts.get(key) != expected:
            raise ValueError(f"v3 manifest count mismatch for {key}")
    schema = read_json(V3_SCHEMA_PATH)
    if schema.get("$id") != SCHEMA_ID:
        raise ValueError("Unexpected v3 schema id")
    system_prompt, user_template = read_v3_prompt()
    return {
        "v1_manifest": v1_manifest,
        "v3_manifest": v3_manifest,
        "cases": cases,
        "system_prompt": system_prompt,
        "user_template": user_template,
    }


def validate_runtime_focus_options(source: str, options: list[str], label: str) -> None:
    if not 2 <= len(options) <= 4 or len(set(options)) != len(options):
        raise OutputContractError(f"{label}: expected 2-4 unique focus options")
    for option in options:
        if not option.strip() or len(option) >= len(source):
            raise OutputContractError(f"{label}: focus option must be shorter than source")
        if not re.search(r"[\u3400-\u9fff]", option):
            raise OutputContractError(f"{label}: focus option must contain Chinese")
        if re.search(r"[A-Za-z]", option):
            raise OutputContractError(f"{label}: focus option must not contain English")


def validate_initial_output(output: dict[str, Any], case: dict[str, Any]) -> None:
    items = Output.model_validate(output).items
    expected_sources = [segment["sourceZh"] for segment in case["segments"]]
    if [item.sourceZh for item in items] != expected_sources:
        raise OutputContractError(
            "initial output must return every top-level sourceZh once and in order"
        )
    for index, item in enumerate(items, start=1):
        if item.action == "provide_expression":
            if item.focusZh != item.sourceZh:
                raise OutputContractError(
                    f"item {index}: initial provide_expression focusZh must equal sourceZh"
                )
        else:
            validate_runtime_focus_options(
                item.sourceZh, item.focusOptionsZh, f"item {index}"
            )


def validate_selected_output(output: dict[str, Any], request: dict[str, Any]) -> None:
    items = Output.model_validate(output).items
    if len(items) != 1:
        raise OutputContractError("selected_focus must return exactly one item")
    item = items[0]
    selected = request["selected_focus"]
    if item.action != "provide_expression":
        raise OutputContractError("selected_focus must return provide_expression")
    if item.sourceZh != selected["sourceZh"] or item.focusZh != selected["focusZh"]:
        raise OutputContractError("selected_focus must echo the actual selected focus")


def invoke_initial(
    graph: Any, case: dict[str, Any], env: dict[str, str]
) -> tuple[dict[str, Any], bool]:
    record: dict[str, Any] = {
        "case_id": case["case_id"],
        "interaction_phase": "initial",
    }
    state = {
        "task_prompt": case["task_prompt"],
        "full_essay": case["full_essay"],
        "target_sentence": case["target_sentence"],
        "interaction_phase": "initial",
        "selected_focus": None,
    }
    try:
        output = graph.invoke(state)["output"]
        record["output"] = output
        validate_initial_output(output, case)
        return record, True
    except Exception as error:
        if "output" not in record and "output" in locals():
            record["output"] = output
        stage = "contract_validation" if "output" in record else "model_invocation"
        record["error"] = error_payload(error, stage, env)
        return record, False


def actual_followups(
    case: dict[str, Any], initial_record: dict[str, Any]
) -> list[dict[str, Any]]:
    if "error" in initial_record:
        return []
    output = Output.model_validate(initial_record["output"])
    requests: list[dict[str, Any]] = []
    for index, item in enumerate(output.items, start=1):
        if item.action != "request_focus":
            continue
        focus_zh = item.focusOptionsZh[0]
        requests.append(
            {
                "case_id": case["case_id"],
                "segment_index": index,
                "task_prompt": case["task_prompt"],
                "full_essay": case["full_essay"],
                "target_sentence": case["target_sentence"],
                "selection_source": SELECTION_SOURCE,
                "selection_policy": SELECTION_POLICY,
                "selected_focus": {
                    "sourceZh": item.sourceZh,
                    "focusZh": focus_zh,
                },
            }
        )
    return requests


def invoke_selected(
    graph: Any, request: dict[str, Any], env: dict[str, str]
) -> tuple[dict[str, Any], bool]:
    record: dict[str, Any] = {
        "case_id": request["case_id"],
        "interaction_phase": "selected_focus",
        "segment_index": request["segment_index"],
        "selection_source": request["selection_source"],
        "selection_policy": request["selection_policy"],
        "selected_focus": request["selected_focus"],
    }
    state = {
        "task_prompt": request["task_prompt"],
        "full_essay": request["full_essay"],
        "target_sentence": request["target_sentence"],
        "interaction_phase": "selected_focus",
        "selected_focus": request["selected_focus"],
    }
    try:
        output = graph.invoke(state)["output"]
        record["output"] = output
        validate_selected_output(output, request)
        return record, True
    except Exception as error:
        if "output" not in record and "output" in locals():
            record["output"] = output
        stage = "contract_validation" if "output" in record else "model_invocation"
        record["error"] = error_payload(error, stage, env)
        return record, False


def validate_run_dir(path: Path) -> Path:
    resolved = ensure_under(path, RUNS_DIR, "run-dir")
    if resolved.parent != RUNS_DIR.resolve():
        raise ValueError("run-dir must be a direct child of runs/")
    if resolved.exists():
        raise FileExistsError("run-dir already exists; refusing to overwrite")
    return resolved


def make_manifest(
    run_dir: Path, definition: dict[str, Any], model_name: str
) -> dict[str, Any]:
    return {
        "manifestVersion": 1,
        "runId": run_dir.name,
        "runType": "offline_actual_path_baseline",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": EVAL_SET_ID,
        "evalSetStatus": "frozen",
        "rubricVersion": "expression-scaffold-rubric.v3",
        "promptVersion": PROMPT_VERSION,
        "outputSchemaId": SCHEMA_ID,
        "provider": "openai_compatible",
        "model": {
            "name": model_name,
            "temperature": 0,
            "maxTokens": 4096,
            "maxRetries": 0,
            "timeoutSeconds": 120,
            "structuredOutputMethod": "function_calling",
        },
        "trajectory": {
            "selectionSource": SELECTION_SOURCE,
            "selectionPolicy": SELECTION_POLICY,
            "representsUserPreference": False,
            "fixedNodeProbesIncluded": False,
        },
        "execution": {
            "expectedInitialCalls": EXPECTED_CASES,
            "expectedSelectedFocusCallsUnderGold": EXPECTED_REQUEST_FOCUS,
            "actual": {
                "initial": {"attempted": 0, "succeeded": 0, "failed": 0},
                "selected_focus": {
                    "generatedFromInitial": 0,
                    "attempted": 0,
                    "succeeded": 0,
                    "failed": 0,
                },
            },
        },
        "artifacts": {
            "initialOutputs": "initial-outputs.jsonl",
            "actualSelections": "actual-focus-selections.jsonl",
            "selectedFocusOutputs": "selected-focus-outputs.jsonl",
        },
        "sourceHashes": {
            "v1FreezeManifest": sha256_file(V1_MANIFEST_PATH),
            "v3FreezeManifest": sha256_file(V3_MANIFEST_PATH),
            "v3Cases": sha256_file(V3_CASES_PATH),
            "prompt": sha256_file(V3_PROMPT_PATH),
            "outputSchema": sha256_file(V3_SCHEMA_PATH),
            "runner": sha256_file(Path(__file__).resolve()),
        },
        "runtime": {
            "python": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "langgraph": version("langgraph"),
            "langchainOpenAI": version("langchain-openai"),
            "pydantic": version("pydantic"),
        },
    }


def run(definition: dict[str, Any], env: dict[str, str], run_dir: Path) -> dict[str, Any]:
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
    graph = build_graph(
        model, definition["system_prompt"], definition["user_template"]
    )
    run_dir.mkdir(exist_ok=False)
    manifest_path = run_dir / "run-manifest.json"
    initial_path = run_dir / "initial-outputs.jsonl"
    selections_path = run_dir / "actual-focus-selections.jsonl"
    selected_path = run_dir / "selected-focus-outputs.jsonl"
    manifest = make_manifest(run_dir, definition, env["model"])
    write_json_exclusive(manifest_path, manifest)
    followups: list[dict[str, Any]] = []

    try:
        with initial_path.open("x", encoding="utf-8", newline="\n") as handle:
            for case in definition["cases"]:
                record, succeeded = invoke_initial(graph, case, env)
                write_json_line(handle, record)
                counters = manifest["execution"]["actual"]["initial"]
                counters["attempted"] += 1
                counters["succeeded" if succeeded else "failed"] += 1
                if succeeded:
                    followups.extend(actual_followups(case, record))
                print(f"{case['case_id']} initial {'ok' if succeeded else 'error'}")

        manifest["execution"]["actual"]["selected_focus"][
            "generatedFromInitial"
        ] = len(followups)
        with selections_path.open("x", encoding="utf-8", newline="\n") as handle:
            for request in followups:
                write_json_line(
                    handle,
                    {
                        key: request[key]
                        for key in (
                            "case_id",
                            "segment_index",
                            "selection_source",
                            "selection_policy",
                            "selected_focus",
                        )
                    },
                )

        with selected_path.open("x", encoding="utf-8", newline="\n") as handle:
            for request in followups:
                record, succeeded = invoke_selected(graph, request, env)
                write_json_line(handle, record)
                counters = manifest["execution"]["actual"]["selected_focus"]
                counters["attempted"] += 1
                counters["succeeded" if succeeded else "failed"] += 1
                print(
                    f"{request['case_id']}/{request['segment_index']} "
                    f"selected_focus {'ok' if succeeded else 'error'}"
                )

        failures = sum(
            manifest["execution"]["actual"][phase]["failed"]
            for phase in ("initial", "selected_focus")
        )
        manifest["status"] = "completed" if failures == 0 else "completed_with_errors"
    except Exception as error:
        manifest["status"] = "failed"
        manifest["runError"] = error_payload(error, "runner", env)
        raise
    finally:
        manifest["completedAt"] = utc_now()
        replace_json(manifest_path, manifest)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate or run the frozen LinguaType v3 actual-path baseline."
    )
    parser.add_argument("--env-file", type=Path)
    parser.add_argument("--run-dir", type=Path)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()
    env: dict[str, str] = {}
    try:
        definition = load_definition()
        env = read_env(args.env_file) if args.env_file else {}
        run_dir = validate_run_dir(args.run_dir) if args.run_dir else None
        if args.validate_only:
            print(
                "v3 validation passed: "
                f"{len(definition['cases'])} initial cases; "
                f"gold routes={EXPECTED_DIRECT} direct/{EXPECTED_REQUEST_FOCUS} focus; "
                f"selection={SELECTION_SOURCE}/{SELECTION_POLICY}; "
                f"environment={'checked' if env else 'not_requested'}; "
                f"run_dir={'checked' if run_dir else 'not_requested'}."
            )
            return
        if not env:
            parser.error("--env-file is required unless --validate-only is used")
        if run_dir is None:
            parser.error("--run-dir is required unless --validate-only is used")
        manifest = run(definition, env, run_dir)
        actual = manifest["execution"]["actual"]
        print(
            f"v3 run complete: status={manifest['status']}, "
            f"initial={actual['initial']['attempted']}, "
            f"selected={actual['selected_focus']['attempted']}, "
            f"failures={actual['initial']['failed'] + actual['selected_focus']['failed']}"
        )
    except SystemExit:
        raise
    except Exception as error:
        raise SystemExit(f"run_eval_v3 failed: {sanitize_error(error, env)}") from None


if __name__ == "__main__":
    main()
