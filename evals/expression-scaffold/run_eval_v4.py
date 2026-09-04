"""Run the frozen LinguaType v4 one-call progressive-reveal baseline.

Each case invokes the model exactly once. Complex items return an internal
scaffold bundle whose English values are hidden by the initial user-view
projection and can later be revealed locally by scaffold id.
"""

from __future__ import annotations

import argparse
import json
import os
import re
from importlib.metadata import version
from pathlib import Path
from typing import Any, Literal

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing_extensions import NotRequired, TypedDict

from run_eval import (
    EVAL_DIR,
    RUNS_DIR,
    V1_MANIFEST_PATH,
    OutputContractError,
    ensure_under,
    error_payload,
    normalized_base_url,
    raw_text,
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
)


V3_MANIFEST_PATH = (
    EVAL_DIR
    / "eval-sets"
    / "expression-scaffold.dev.v3"
    / "freeze-manifest.json"
)
V4_DIR = EVAL_DIR / "eval-sets" / "expression-scaffold.dev.v4"
V4_MANIFEST_PATH = V4_DIR / "freeze-manifest.json"
V4_CASES_PATH = V4_DIR / "cases.md"
V4_SCHEMA_PATH = V4_DIR / "model-output.schema.json"
V4_PROMPT_PATH = EVAL_DIR / "prompts" / "baseline-v4.md"

EVAL_SET_ID = "expression-scaffold.dev.v4"
SCHEMA_ID = "expression-scaffold-output.v4"
PROMPT_VERSION = "expression-scaffold-baseline-v4-one-call-progressive-reveal"
EXPECTED_CASES = 20
EXPECTED_SEGMENTS = 25
EXPECTED_DIRECT = 14
EXPECTED_SCAFFOLD_SETS = 11


class Scaffold(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scaffoldId: str = Field(pattern=r"^s[1-4]$")
    focusZh: str = Field(min_length=1)
    recommendedExpression: str = Field(min_length=1)


class Item(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sourceZh: str = Field(min_length=1)
    action: Literal["provide_expression", "offer_scaffolds"]
    recommendedExpression: str | None
    scaffolds: list[Scaffold] = Field(max_length=4)

    @model_validator(mode="after")
    def validate_state(self) -> "Item":
        if not self.sourceZh.strip():
            raise ValueError("sourceZh must not be blank")
        if self.action == "provide_expression":
            if not self.recommendedExpression or not self.recommendedExpression.strip():
                raise ValueError("provide_expression requires recommendedExpression")
            if self.scaffolds:
                raise ValueError("provide_expression requires scaffolds=[]")
            return self

        if self.recommendedExpression is not None:
            raise ValueError("offer_scaffolds requires recommendedExpression=null")
        if not 2 <= len(self.scaffolds) <= 4:
            raise ValueError("offer_scaffolds requires 2-4 scaffolds")
        ids = [scaffold.scaffoldId for scaffold in self.scaffolds]
        focuses = [scaffold.focusZh for scaffold in self.scaffolds]
        if len(set(ids)) != len(ids) or len(set(focuses)) != len(focuses):
            raise ValueError("scaffold ids and Chinese focuses must be unique")
        if ids != [f"s{index}" for index in range(1, len(ids) + 1)]:
            raise ValueError("scaffold ids must be consecutive from s1")
        return self


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[Item] = Field(min_length=1)


class State(TypedDict):
    task_prompt: str
    full_essay: str
    target_sentence: str
    output: NotRequired[dict[str, Any] | None]


def read_v4_overlay() -> list[dict[str, Any]]:
    markdown = V4_CASES_PATH.read_text("utf-8")
    rows = [
        line.split("|")[1:-1]
        for line in markdown.splitlines()
        if re.match(r"^\| LT-ESC-\d{3} / \d+ \|", line)
    ]
    overlay: list[dict[str, Any]] = []
    for cells in rows:
        values = [cell.strip() for cell in cells]
        if len(values) != 6:
            raise ValueError("Unexpected v4 overlay column count")
        case_item, source_zh, action_code, focus_cell, trace_policy, note = values
        match = re.fullmatch(r"(LT-ESC-\d{3}) / (\d+)", case_item)
        if not match or action_code not in {"D", "S"}:
            raise ValueError(f"Invalid v4 case row: {case_item}/{action_code}")
        units = (
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
                    "provide_expression" if action_code == "D" else "offer_scaffolds"
                ),
                "reference_focus_units_zh": units,
                "focus_trace_policy": None if trace_policy == "—" else trace_policy,
                "calibration_note_zh": note,
            }
        )
    return overlay


def validate_gold_segment(segment: dict[str, Any], label: str) -> None:
    source = segment["sourceZh"]
    units = segment["reference_focus_units_zh"]
    policy = segment["focus_trace_policy"]
    if segment["expected_action"] == "provide_expression":
        if units or policy is not None:
            raise ValueError(f"{label}: direct item cannot define focus units")
        return
    if policy not in {"exact_spans", "semantic_units"}:
        raise ValueError(f"{label}: invalid trace policy")
    if not 2 <= len(units) <= 4 or len(set(units)) != len(units):
        raise ValueError(f"{label}: scaffold set requires 2-4 unique units")
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
        raise ValueError("Unexpected v4 case or segment count")
    case_by_id = {case["case_id"]: case for case in cases}
    seen: set[tuple[str, int]] = set()
    direct = 0
    scaffold_sets = 0
    for segment in overlay:
        key = (segment["case_id"], segment["segment_index"])
        if key in seen or key[0] not in case_by_id:
            raise ValueError(f"Duplicate or unknown v4 segment: {key}")
        seen.add(key)
        validate_gold_segment(segment, f"{key[0]}/{key[1]}")
        case_by_id[key[0]]["segments"].append(segment)
        if segment["expected_action"] == "provide_expression":
            direct += 1
        else:
            scaffold_sets += 1
    if direct != EXPECTED_DIRECT or scaffold_sets != EXPECTED_SCAFFOLD_SETS:
        raise ValueError("Unexpected v4 route counts")

    for case in cases:
        case["segments"].sort(key=lambda item: item["segment_index"])
        sources = [segment["sourceZh"] for segment in case["segments"]]
        if sources != case["base_sources"]:
            raise ValueError(f"v4 sources do not match v1: {case['case_id']}")
        previous_end = 0
        for source in sources:
            start = case["target_sentence"].find(source, previous_end)
            if start < 0:
                raise ValueError(f"v4 sources out of order: {case['case_id']}")
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


def read_v4_prompt() -> tuple[str, str]:
    markdown = V4_PROMPT_PATH.read_text("utf-8")
    version_match = re.search(r"`prompt_version`[^`]*`([^`]+)`", markdown)
    if not version_match or version_match.group(1) != PROMPT_VERSION:
        raise ValueError("Unexpected v4 prompt version")
    system_prompt = fenced(markdown, "System prompt")
    user_template = fenced(markdown, "User message template")
    if not system_prompt or not user_template:
        raise ValueError("Could not parse v4 prompt blocks")
    for placeholder in ("{{task_prompt}}", "{{full_essay}}", "{{target_sentence}}"):
        if placeholder not in user_template:
            raise ValueError(f"v4 user template missing {placeholder}")
    return system_prompt, user_template


def load_definition() -> dict[str, Any]:
    verify_freeze_manifest(V1_MANIFEST_PATH, "expression-scaffold.dev.v1")
    v3_manifest = verify_freeze_manifest(
        V3_MANIFEST_PATH, "expression-scaffold.dev.v3"
    )
    v4_manifest = verify_freeze_manifest(V4_MANIFEST_PATH, EVAL_SET_ID)
    parent_path = v4_manifest.get("parentManifestPath")
    parent_hash = v4_manifest.get("parentManifestSha256")
    resolved_parent = (V4_MANIFEST_PATH.parent / str(parent_path)).resolve()
    if resolved_parent != V3_MANIFEST_PATH.resolve():
        raise ValueError("v4 parent manifest path mismatch")
    if parent_hash != sha256_file(V3_MANIFEST_PATH):
        raise ValueError("v4 parent manifest hash mismatch")
    if v3_manifest.get("status") != "frozen":
        raise ValueError("v3 parent must remain frozen")

    cases = merge_cases(read_base_cases(), read_v4_overlay())
    if v4_manifest.get("caseIds") != [case["case_id"] for case in cases]:
        raise ValueError("v4 manifest case order mismatch")
    schema = read_json(V4_SCHEMA_PATH)
    if schema.get("$id") != SCHEMA_ID:
        raise ValueError("Unexpected v4 schema id")
    system_prompt, user_template = read_v4_prompt()
    return {
        "cases": cases,
        "system_prompt": system_prompt,
        "user_template": user_template,
    }


def render_user_prompt(template: str, state: State) -> str:
    return (
        template.replace("{{task_prompt}}", state["task_prompt"])
        .replace("{{full_essay}}", state["full_essay"])
        .replace("{{target_sentence}}", state["target_sentence"])
    )


def build_graph(model: ChatOpenAI, system_prompt: str, user_template: str):
    structured_model = model.with_structured_output(
        Output, method="function_calling", strict=True, include_raw=True
    )

    def call_model(state: State) -> dict[str, Any]:
        result = structured_model.invoke(
            [
                SystemMessage(system_prompt),
                HumanMessage(render_user_prompt(user_template, state)),
            ]
        )
        parsed = result["parsed"]
        if parsed is None:
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text(result["raw"]))
            parsed = Output.model_validate_json(text)
        return {"output": parsed.model_dump()}

    graph = StateGraph(State)
    graph.add_node("call_model", call_model)
    graph.add_edge(START, "call_model")
    graph.add_edge("call_model", END)
    return graph.compile()


def validate_output(output: dict[str, Any], case: dict[str, Any]) -> Output:
    parsed = Output.model_validate(output)
    expected_sources = [segment["sourceZh"] for segment in case["segments"]]
    if [item.sourceZh for item in parsed.items] != expected_sources:
        raise OutputContractError(
            "output must return every top-level sourceZh once and in order"
        )
    for item_index, item in enumerate(parsed.items, start=1):
        for scaffold in item.scaffolds:
            if len(scaffold.focusZh) >= len(item.sourceZh):
                raise OutputContractError(
                    f"item {item_index}: focusZh must be shorter than sourceZh"
                )
            if not re.search(r"[\u3400-\u9fff]", scaffold.focusZh):
                raise OutputContractError(
                    f"item {item_index}: focusZh must contain Chinese"
                )
            if re.search(r"[A-Za-z]", scaffold.focusZh):
                raise OutputContractError(
                    f"item {item_index}: focusZh must not contain English"
                )
    return parsed


def project_user_view(output: Output, revealed: set[tuple[int, str]]) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    for item_index, item in enumerate(output.items, start=1):
        if item.action == "provide_expression":
            items.append(
                {
                    "sourceZh": item.sourceZh,
                    "action": item.action,
                    "recommendedExpression": item.recommendedExpression,
                }
            )
            continue
        scaffolds: list[dict[str, Any]] = []
        for scaffold in item.scaffolds:
            visible = (item_index, scaffold.scaffoldId) in revealed
            value: dict[str, Any] = {
                "scaffoldId": scaffold.scaffoldId,
                "focusZh": scaffold.focusZh,
                "revealed": visible,
            }
            if visible:
                value["recommendedExpression"] = scaffold.recommendedExpression
            scaffolds.append(value)
        items.append(
            {"sourceZh": item.sourceZh, "action": item.action, "scaffolds": scaffolds}
        )
    return {"items": items}


def validate_initial_projection(output: Output, projection: dict[str, Any]) -> None:
    for raw_item, visible_item in zip(output.items, projection["items"], strict=True):
        if raw_item.action == "provide_expression":
            if visible_item.get("recommendedExpression") != raw_item.recommendedExpression:
                raise OutputContractError("direct expression must be initially visible")
            continue
        for visible_scaffold in visible_item["scaffolds"]:
            if visible_scaffold.get("revealed") is not False:
                raise OutputContractError("scaffold must start unrevealed")
            if "recommendedExpression" in visible_scaffold:
                raise OutputContractError("initial projection leaked hidden English")


def validate_run_dir(path: Path) -> Path:
    resolved = ensure_under(path, RUNS_DIR, "run-dir")
    if resolved.parent != RUNS_DIR.resolve():
        raise ValueError("run-dir must be a direct child of runs/")
    if resolved.exists():
        raise FileExistsError("run-dir already exists; refusing to overwrite")
    return resolved


def make_manifest(run_dir: Path, model_name: str) -> dict[str, Any]:
    return {
        "manifestVersion": 1,
        "runId": run_dir.name,
        "runType": "offline_one_call_progressive_reveal_baseline",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": EVAL_SET_ID,
        "evalSetStatus": "frozen",
        "rubricVersion": "expression-scaffold-rubric.v4",
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
        "interaction": {
            "modelCallsPerCase": 1,
            "modelCallsOnReveal": 0,
            "multipleRevealsAllowed": True,
            "unrevealedEnglishInitiallyHidden": True,
        },
        "execution": {
            "expectedCalls": EXPECTED_CASES,
            "actual": {"attempted": 0, "succeeded": 0, "failed": 0},
        },
        "artifacts": {
            "modelOutputs": "model-outputs.jsonl",
            "initialUserViews": "initial-user-views.jsonl",
        },
        "sourceHashes": {
            "v1FreezeManifest": sha256_file(V1_MANIFEST_PATH),
            "v3FreezeManifest": sha256_file(V3_MANIFEST_PATH),
            "v4FreezeManifest": sha256_file(V4_MANIFEST_PATH),
            "v4Cases": sha256_file(V4_CASES_PATH),
            "prompt": sha256_file(V4_PROMPT_PATH),
            "outputSchema": sha256_file(V4_SCHEMA_PATH),
            "runner": sha256_file(Path(__file__).resolve()),
        },
        "runtime": {
            "python": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "langgraph": version("langgraph"),
            "langchainOpenAI": version("langchain-openai"),
            "pydantic": version("pydantic"),
        },
    }


def run(
    definition: dict[str, Any], env: dict[str, str], run_dir: Path
) -> dict[str, Any]:
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
    graph = build_graph(model, definition["system_prompt"], definition["user_template"])
    run_dir.mkdir(exist_ok=False)
    manifest_path = run_dir / "run-manifest.json"
    outputs_path = run_dir / "model-outputs.jsonl"
    views_path = run_dir / "initial-user-views.jsonl"
    manifest = make_manifest(run_dir, env["model"])
    write_json_exclusive(manifest_path, manifest)

    try:
        with (
            outputs_path.open("x", encoding="utf-8", newline="\n") as outputs,
            views_path.open("x", encoding="utf-8", newline="\n") as views,
        ):
            for case in definition["cases"]:
                record: dict[str, Any] = {"case_id": case["case_id"]}
                succeeded = False
                try:
                    state: State = {
                        "task_prompt": case["task_prompt"],
                        "full_essay": case["full_essay"],
                        "target_sentence": case["target_sentence"],
                    }
                    output = graph.invoke(state)["output"]
                    record["output"] = output
                    parsed = validate_output(output, case)
                    projection = project_user_view(parsed, set())
                    validate_initial_projection(parsed, projection)
                    write_json_line(
                        views,
                        {"case_id": case["case_id"], "user_view": projection},
                    )
                    succeeded = True
                except Exception as error:
                    stage = "contract_validation" if "output" in record else "model_invocation"
                    record["error"] = error_payload(error, stage, env)
                write_json_line(outputs, record)
                counters = manifest["execution"]["actual"]
                counters["attempted"] += 1
                counters["succeeded" if succeeded else "failed"] += 1
                print(f"{case['case_id']} {'ok' if succeeded else 'error'}")
        manifest["status"] = (
            "completed"
            if manifest["execution"]["actual"]["failed"] == 0
            else "completed_with_errors"
        )
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
        description="Validate or run the frozen LinguaType v4 one-call baseline."
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
                "v4 validation passed: "
                f"{len(definition['cases'])} cases/one call each; "
                f"gold routes={EXPECTED_DIRECT} direct/{EXPECTED_SCAFFOLD_SETS} scaffold sets; "
                "reveal calls=0; "
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
            f"v4 run complete: status={manifest['status']}, "
            f"calls={actual['attempted']}, failures={actual['failed']}"
        )
    except SystemExit:
        raise
    except Exception as error:
        raise SystemExit(f"run_eval_v4 failed: {sanitize_error(error, env)}") from None


if __name__ == "__main__":
    main()

