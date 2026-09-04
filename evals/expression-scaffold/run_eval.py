"""Run the frozen LinguaType v2 expression-scaffold baseline.

The runner deliberately keeps evaluation data, model credentials, model output, and
judging separate.  It executes the two offline checkpoints defined by v2:

* one ``initial`` request for every case;
* one ``selected_focus`` request for every pre-reviewed request-focus probe.

It never runs a judge and never writes endpoint or credential values to artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
from datetime import datetime, timezone
from importlib.metadata import version
from pathlib import Path
from typing import Any, Literal
from urllib.parse import urlsplit

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, ConfigDict, Field, model_validator
from typing_extensions import NotRequired, TypedDict


EVAL_DIR = Path(__file__).resolve().parent
RUNS_DIR = EVAL_DIR / "runs"
V1_MANIFEST_PATH = EVAL_DIR / "freeze-manifest.json"
V1_CASES_PATH = EVAL_DIR / "cases.md"
V2_DIR = EVAL_DIR / "eval-sets" / "expression-scaffold.dev.v2"
V2_MANIFEST_PATH = V2_DIR / "freeze-manifest.json"
V2_OVERLAY_PATH = V2_DIR / "cases.md"
V2_SCHEMA_PATH = V2_DIR / "model-output.schema.json"
V2_PROMPT_PATH = EVAL_DIR / "prompts" / "baseline-v2.md"

EXPECTED_EVAL_SET_ID = "expression-scaffold.dev.v2"
EXPECTED_CASES = 20
EXPECTED_SEGMENTS = 25
EXPECTED_DIRECT = 15
EXPECTED_REQUEST_FOCUS = 10
DEFAULT_PROMPT_VERSION = "expression-scaffold-baseline-v2"


class OutputContractError(ValueError):
    """The model returned valid JSON that violates a phase-specific contract."""


class Item(BaseModel):
    """Unified v2 output item with cross-field validation."""

    model_config = ConfigDict(extra="forbid")

    sourceZh: str = Field(min_length=1)
    action: Literal["provide_expression", "request_focus"]
    focusZh: str | None
    recommendedExpression: str | None
    focusOptionsZh: list[str] = Field(max_length=4)

    @model_validator(mode="after")
    def validate_state(self) -> "Item":
        if not self.sourceZh.strip():
            raise ValueError("sourceZh must not be blank")

        if self.action == "provide_expression":
            if self.focusZh is None or not self.focusZh.strip():
                raise ValueError("provide_expression requires a non-empty focusZh")
            if (
                self.recommendedExpression is None
                or not self.recommendedExpression.strip()
            ):
                raise ValueError(
                    "provide_expression requires a non-empty recommendedExpression"
                )
            if self.focusOptionsZh:
                raise ValueError("provide_expression requires focusOptionsZh=[]")
            return self

        if self.focusZh is not None or self.recommendedExpression is not None:
            raise ValueError(
                "request_focus requires focusZh=null and recommendedExpression=null"
            )
        if not 2 <= len(self.focusOptionsZh) <= 4:
            raise ValueError("request_focus requires 2-4 focus options")
        if any(not value.strip() for value in self.focusOptionsZh):
            raise ValueError("focus options must not be blank")
        if len(set(self.focusOptionsZh)) != len(self.focusOptionsZh):
            raise ValueError("focus options must be unique")
        return self


class Output(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[Item] = Field(min_length=1)


class State(TypedDict):
    task_prompt: str
    full_essay: str
    target_sentence: str
    interaction_phase: Literal["initial", "selected_focus"]
    selected_focus: dict[str, str] | None
    output: NotRequired[dict[str, Any] | None]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def ensure_under(path: Path, root: Path, label: str) -> Path:
    resolved = path.resolve()
    resolved_root = root.resolve()
    if not resolved.is_relative_to(resolved_root):
        raise ValueError(f"{label} must stay under {resolved_root}")
    return resolved


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text("utf-8-sig"))
    except FileNotFoundError as error:
        raise ValueError(f"Missing required file: {path}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"Invalid JSON in {path.name}: {error.msg}") from error
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object in {path.name}")
    return value


def verify_freeze_manifest(
    path: Path, expected_eval_set_id: str
) -> dict[str, Any]:
    manifest = read_json(path)
    if manifest.get("evalSetId") != expected_eval_set_id:
        raise ValueError(
            f"Unexpected evalSetId in {path.name}: {manifest.get('evalSetId')!r}"
        )
    if manifest.get("status") != "frozen":
        raise ValueError(f"Eval set is not frozen: {expected_eval_set_id}")

    canonical_files = manifest.get("canonicalFiles")
    if not isinstance(canonical_files, list) or not canonical_files:
        raise ValueError(f"{path.name} must define non-empty canonicalFiles")

    manifest_root = path.parent.resolve()
    allowed_root = EVAL_DIR.resolve()
    seen_paths: set[Path] = set()
    for entry in canonical_files:
        if not isinstance(entry, dict):
            raise ValueError(f"Invalid canonicalFiles entry in {path.name}")
        relative_path = entry.get("path")
        expected_hash = entry.get("sha256")
        if not isinstance(relative_path, str) or not relative_path:
            raise ValueError(f"Invalid canonical path in {path.name}")
        if not isinstance(expected_hash, str) or not re.fullmatch(
            r"[0-9a-fA-F]{64}", expected_hash
        ):
            raise ValueError(f"Invalid sha256 for {relative_path}")

        canonical_path = (manifest_root / relative_path).resolve()
        if not canonical_path.is_relative_to(allowed_root):
            raise ValueError(f"Canonical file leaves eval directory: {relative_path}")
        if not canonical_path.is_file():
            raise ValueError(f"Missing canonical file: {relative_path}")
        actual_hash = sha256_file(canonical_path)
        if actual_hash.lower() != expected_hash.lower():
            raise ValueError(f"Frozen file hash mismatch: {relative_path}")
        seen_paths.add(canonical_path)

    manifest["_verified_paths"] = seen_paths
    return manifest


def read_env(path: Path) -> dict[str, str]:
    try:
        lines = path.read_text("utf-8-sig").splitlines()
    except FileNotFoundError as error:
        raise ValueError("The supplied env file does not exist") from error

    values: dict[str, str] = {}
    for line_number, raw in enumerate(lines, start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            raise ValueError(f"Invalid env syntax at line {line_number}")
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            raise ValueError(f"Empty env key at line {line_number}")
        if key in values:
            raise ValueError(f"Duplicate env key: {key}")
        values[key] = value.strip().strip("\"'")

    required = ("base_url", "api_key", "model")
    missing = [key for key in required if not values.get(key)]
    if missing:
        raise ValueError(f"Missing required env keys: {', '.join(missing)}")

    parsed_url = urlsplit(values["base_url"])
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise ValueError("base_url must be an absolute HTTP(S) URL")
    return values


def normalized_base_url(value: str) -> str:
    base_url = value.rstrip("/")
    return base_url if base_url.endswith("/v1") else f"{base_url}/v1"


def sanitize_error(error: BaseException, env: dict[str, str]) -> str:
    message = str(error)
    for secret in (
        env.get("api_key", ""),
        env.get("base_url", ""),
        normalized_base_url(env.get("base_url", ""))
        if env.get("base_url")
        else "",
    ):
        if secret and len(secret) >= 4:
            message = message.replace(secret, "[REDACTED]")
    message = re.sub(
        r"(?i)(authorization\s*[:=]\s*|bearer\s+|api[_-]?key\s*[:=]\s*)\S+",
        r"\1[REDACTED]",
        message,
    )
    return message[:1200]


def required_match(pattern: str, text: str, label: str) -> re.Match[str]:
    match = re.search(pattern, text, re.MULTILINE)
    if not match:
        raise ValueError(f"Could not parse {label}")
    return match


def read_base_cases() -> list[dict[str, Any]]:
    markdown = V1_CASES_PATH.read_text("utf-8")
    blocks = re.split(r"(?=^### LT-ESC-\d{3})", markdown, flags=re.MULTILINE)[1:]
    cases: list[dict[str, Any]] = []
    for block in blocks:
        case_id = required_match(
            r"^### (LT-ESC-\d{3})", block, "case_id"
        ).group(1)
        task_prompt = required_match(
            r"^- `task_prompt`：(.*)$", block, f"{case_id}.task_prompt"
        ).group(1)
        target_sentence = required_match(
            r"^- `target_sentence`：(.*)$", block, f"{case_id}.target_sentence"
        ).group(1)
        if "- `full_essay`：" not in block or "- `target_sentence`：" not in block:
            raise ValueError(f"Could not parse {case_id}.full_essay")
        essay_block = block.split("- `full_essay`：", 1)[1].split(
            "- `target_sentence`：", 1
        )[0]
        full_essay = "\n".join(re.findall(r"^> (.*)$", essay_block, re.MULTILINE))
        if not full_essay:
            raise ValueError(f"Empty full_essay for {case_id}")
        base_sources = re.findall(
            r"^\s+- `source_zh`：`([^`]+)`$", block, re.MULTILINE
        )
        if not base_sources:
            raise ValueError(f"No source_zh segments found for {case_id}")
        cases.append(
            {
                "case_id": case_id,
                "task_prompt": task_prompt,
                "full_essay": full_essay,
                "target_sentence": target_sentence,
                "base_sources": base_sources,
                "segments": [],
            }
        )
    return cases


def read_v2_overlay() -> list[dict[str, Any]]:
    markdown = V2_OVERLAY_PATH.read_text("utf-8")
    rows = [
        line.split("|")[1:-1]
        for line in markdown.splitlines()
        if re.match(r"^\| LT-ESC-\d{3} / \d+ \|", line)
    ]
    overlay: list[dict[str, Any]] = []
    for cells in rows:
        values = [cell.strip() for cell in cells]
        if len(values) != 6:
            raise ValueError("Unexpected v2 overlay column count")
        case_item, source_zh, action_code, options_cell, probe_focus, route_note = values
        case_match = re.fullmatch(r"(LT-ESC-\d{3}) / (\d+)", case_item)
        if not case_match:
            raise ValueError(f"Invalid overlay case/item: {case_item}")
        if action_code not in {"D", "R"}:
            raise ValueError(f"Invalid overlay action for {case_item}: {action_code}")
        options = (
            []
            if options_cell == "—"
            else [value.strip() for value in options_cell.split("；") if value.strip()]
        )
        overlay.append(
            {
                "case_id": case_match.group(1),
                "segment_index": int(case_match.group(2)),
                "sourceZh": source_zh,
                "expected_action": (
                    "provide_expression" if action_code == "D" else "request_focus"
                ),
                "reference_focus_options_zh": options,
                "probe_focus_zh": probe_focus,
                "route_note_zh": route_note,
            }
        )
    return overlay


def validate_and_merge_cases(
    cases: list[dict[str, Any]], overlay: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if len(cases) != EXPECTED_CASES:
        raise ValueError(f"Expected {EXPECTED_CASES} cases, found {len(cases)}")
    if len(overlay) != EXPECTED_SEGMENTS:
        raise ValueError(f"Expected {EXPECTED_SEGMENTS} segments, found {len(overlay)}")

    case_by_id = {case["case_id"]: case for case in cases}
    if len(case_by_id) != len(cases):
        raise ValueError("Duplicate case_id in base cases")

    direct_count = 0
    request_count = 0
    seen_items: set[tuple[str, int]] = set()
    for segment in overlay:
        case_id = segment["case_id"]
        key = (case_id, segment["segment_index"])
        if key in seen_items:
            raise ValueError(f"Duplicate overlay item: {case_id}/{key[1]}")
        seen_items.add(key)
        if case_id not in case_by_id:
            raise ValueError(f"Overlay references unknown case: {case_id}")

        source_zh = segment["sourceZh"]
        target_sentence = case_by_id[case_id]["target_sentence"]
        if source_zh not in target_sentence:
            raise ValueError(f"Overlay source is not in target sentence: {case_id}/{key[1]}")

        options = segment["reference_focus_options_zh"]
        probe = segment["probe_focus_zh"]
        if segment["expected_action"] == "provide_expression":
            direct_count += 1
            if options:
                raise ValueError(f"Direct overlay item has focus options: {case_id}/{key[1]}")
            if probe != source_zh:
                raise ValueError(f"Direct probe must equal source: {case_id}/{key[1]}")
        else:
            request_count += 1
            validate_focus_options(source_zh, options, f"{case_id}/{key[1]}")
            if probe not in options:
                raise ValueError(f"Probe is not a reference option: {case_id}/{key[1]}")
        case_by_id[case_id]["segments"].append(segment)

    if direct_count != EXPECTED_DIRECT or request_count != EXPECTED_REQUEST_FOCUS:
        raise ValueError(
            "Unexpected route counts: "
            f"provide_expression={direct_count}, request_focus={request_count}"
        )

    for case in cases:
        segments = sorted(case["segments"], key=lambda item: item["segment_index"])
        expected_indexes = list(range(1, len(segments) + 1))
        actual_indexes = [segment["segment_index"] for segment in segments]
        if actual_indexes != expected_indexes:
            raise ValueError(f"Non-contiguous segment indexes for {case['case_id']}")
        overlay_sources = [segment["sourceZh"] for segment in segments]
        if overlay_sources != case["base_sources"]:
            raise ValueError(
                f"v2 overlay sources do not exactly match v1 segments for {case['case_id']}"
            )

        previous_end = 0
        for segment in segments:
            start = case["target_sentence"].find(segment["sourceZh"], previous_end)
            if start < 0:
                raise ValueError(f"Segments are out of target order for {case['case_id']}")
            previous_end = start + len(segment["sourceZh"])
        case["segments"] = segments
        del case["base_sources"]

    selected_focus_requests = [
        {
            "case_id": case["case_id"],
            "segment_index": segment["segment_index"],
            "task_prompt": case["task_prompt"],
            "full_essay": case["full_essay"],
            "target_sentence": case["target_sentence"],
            "selected_focus": {
                "sourceZh": segment["sourceZh"],
                "focusZh": segment["probe_focus_zh"],
            },
        }
        for case in cases
        for segment in case["segments"]
        if segment["expected_action"] == "request_focus"
    ]
    return cases, selected_focus_requests


def validate_focus_options(source_zh: str, options: list[str], label: str) -> None:
    if not 2 <= len(options) <= 4:
        raise OutputContractError(f"{label}: expected 2-4 focus options")
    if len(set(options)) != len(options):
        raise OutputContractError(f"{label}: duplicate focus options")

    previous_end = -1
    for option in options:
        if len(option) >= len(source_zh):
            raise OutputContractError(f"{label}: focus option is not shorter than sourceZh")
        start = source_zh.find(option)
        if start < 0:
            raise OutputContractError(f"{label}: focus option is not an exact substring")
        if start < previous_end:
            raise OutputContractError(f"{label}: focus options overlap or are out of order")
        previous_end = start + len(option)


DEFAULT_USER_TEMPLATE = """task_prompt:
{{task_prompt}}

full_essay:
{{full_essay}}

target_sentence:
{{target_sentence}}

interaction_phase:
{{interaction_phase}}

selected_focus:
{{selected_focus}}
"""


def fenced(markdown: str, heading: str) -> str | None:
    match = re.search(
        rf"^## {re.escape(heading)}.*?```(?:text)?\r?\n(.*?)\r?\n```",
        markdown,
        re.MULTILINE | re.DOTALL,
    )
    return match.group(1).strip() if match else None


def read_prompt() -> tuple[str, str, str]:
    markdown = V2_PROMPT_PATH.read_text("utf-8")
    for token in (
        "interaction_phase",
        "selected_focus",
        "provide_expression",
        "request_focus",
        "focusOptionsZh",
    ):
        if token not in markdown:
            raise ValueError(f"baseline-v2.md is missing required token: {token}")

    system_prompt = fenced(markdown, "System prompt") or markdown.strip()
    user_template = fenced(markdown, "User message template") or DEFAULT_USER_TEMPLATE
    for placeholder in (
        "{{task_prompt}}",
        "{{full_essay}}",
        "{{target_sentence}}",
        "{{interaction_phase}}",
        "{{selected_focus}}",
    ):
        if placeholder not in user_template:
            raise ValueError(f"v2 user template is missing {placeholder}")

    version_match = re.search(r"`prompt_version`[^`]*`([^`]+)`", markdown)
    prompt_version = version_match.group(1) if version_match else DEFAULT_PROMPT_VERSION
    return system_prompt, user_template, prompt_version


def load_eval_definition() -> dict[str, Any]:
    v1_manifest = verify_freeze_manifest(
        V1_MANIFEST_PATH, "expression-scaffold.dev.v1"
    )
    v2_manifest = verify_freeze_manifest(V2_MANIFEST_PATH, EXPECTED_EVAL_SET_ID)
    parent_path_value = v2_manifest.get("parentManifestPath")
    parent_hash_value = v2_manifest.get("parentManifestSha256")
    if not isinstance(parent_path_value, str) or not isinstance(parent_hash_value, str):
        raise ValueError("v2 manifest must pin its parent manifest path and sha256")
    pinned_parent_path = (V2_MANIFEST_PATH.parent / parent_path_value).resolve()
    if pinned_parent_path != V1_MANIFEST_PATH.resolve():
        raise ValueError("v2 parent manifest path does not resolve to the v1 manifest")
    if sha256_file(pinned_parent_path) != parent_hash_value.lower():
        raise ValueError("v2 parent manifest hash mismatch")
    verified_v2_paths: set[Path] = v2_manifest["_verified_paths"]
    if V2_OVERLAY_PATH.resolve() not in verified_v2_paths:
        raise ValueError("v2 overlay cases.md is not covered by the freeze manifest")

    cases, selected_focus_requests = validate_and_merge_cases(
        read_base_cases(), read_v2_overlay()
    )
    manifest_case_ids = v2_manifest.get("caseIds")
    actual_case_ids = [case["case_id"] for case in cases]
    if manifest_case_ids is not None and manifest_case_ids != actual_case_ids:
        raise ValueError("v2 manifest caseIds do not match the merged case order")

    counts = v2_manifest.get("counts", {})
    if isinstance(counts, dict):
        checks = {
            "cases": EXPECTED_CASES,
            "chineseSegments": EXPECTED_SEGMENTS,
            "provideExpression": EXPECTED_DIRECT,
            "requestFocus": EXPECTED_REQUEST_FOCUS,
            "initialCalls": EXPECTED_CASES,
            "selectedFocusCalls": EXPECTED_REQUEST_FOCUS,
        }
        for key, expected in checks.items():
            if key in counts and counts[key] != expected:
                raise ValueError(f"v2 manifest count mismatch for {key}")

    schema = read_json(V2_SCHEMA_PATH)
    if schema.get("$id") != "expression-scaffold-output.v2":
        raise ValueError("Unexpected v2 output schema id")

    system_prompt, user_template, prompt_version = read_prompt()
    return {
        "v1_manifest": v1_manifest,
        "v2_manifest": v2_manifest,
        "cases": cases,
        "selected_focus_requests": selected_focus_requests,
        "system_prompt": system_prompt,
        "user_template": user_template,
        "prompt_version": prompt_version,
        "schema_id": schema["$id"],
    }


def render_user_prompt(template: str, state: State) -> str:
    selected_focus = json.dumps(
        state["selected_focus"], ensure_ascii=False, separators=(",", ":")
    )
    return (
        template.replace("{{task_prompt}}", state["task_prompt"])
        .replace("{{full_essay}}", state["full_essay"])
        .replace("{{target_sentence}}", state["target_sentence"])
        .replace("{{interaction_phase}}", state["interaction_phase"])
        .replace("{{selected_focus}}", selected_focus)
    )


def raw_text(raw: Any) -> str:
    content = getattr(raw, "content", raw)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        if parts:
            return "\n".join(parts).strip()
    return str(content).strip()


def build_graph(model: ChatOpenAI, system_prompt: str, user_template: str):
    structured_model = model.with_structured_output(
        Output, method="function_calling", strict=True, include_raw=True
    )

    def call_model(state: State) -> dict[str, Any]:
        user_prompt = render_user_prompt(user_template, state)
        result = structured_model.invoke(
            [SystemMessage(system_prompt), HumanMessage(user_prompt)]
        )
        parsed = result["parsed"]
        if parsed is None:
            text = raw_text(result["raw"])
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
            parsed = Output.model_validate_json(text)
        return {"output": parsed.model_dump()}

    graph = StateGraph(State)
    graph.add_node("call_model", call_model)
    graph.add_edge(START, "call_model")
    graph.add_edge("call_model", END)
    return graph.compile()


def validate_initial_output(output: dict[str, Any], case: dict[str, Any]) -> None:
    items = Output.model_validate(output).items
    expected_sources = [segment["sourceZh"] for segment in case["segments"]]
    actual_sources = [item.sourceZh for item in items]
    if actual_sources != expected_sources:
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
            validate_focus_options(
                item.sourceZh, item.focusOptionsZh, f"item {index}"
            )


def validate_selected_focus_output(
    output: dict[str, Any], request: dict[str, Any]
) -> None:
    items = Output.model_validate(output).items
    if len(items) != 1:
        raise OutputContractError("selected_focus output must contain exactly one item")
    item = items[0]
    selected_focus = request["selected_focus"]
    if item.action != "provide_expression":
        raise OutputContractError("selected_focus must return provide_expression")
    if item.sourceZh != selected_focus["sourceZh"]:
        raise OutputContractError("selected_focus sourceZh must match the input sourceZh")
    if item.focusZh != selected_focus["focusZh"]:
        raise OutputContractError("selected_focus focusZh must match the selected focus")


def error_payload(
    error: BaseException, stage: str, env: dict[str, str]
) -> dict[str, str]:
    return {
        "stage": stage,
        "type": type(error).__name__,
        "message": sanitize_error(error, env),
    }


def write_json_line(handle: Any, record: dict[str, Any]) -> None:
    handle.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    handle.flush()


def invoke_record(
    graph: Any,
    request: dict[str, Any],
    phase: Literal["initial", "selected_focus"],
    env: dict[str, str],
) -> tuple[dict[str, Any], bool]:
    record: dict[str, Any] = {
        "case_id": request["case_id"],
        "interaction_phase": phase,
    }
    if phase == "selected_focus":
        record["segment_index"] = request["segment_index"]
        record["selected_focus"] = request["selected_focus"]

    state: State = {
        "task_prompt": request["task_prompt"],
        "full_essay": request["full_essay"],
        "target_sentence": request["target_sentence"],
        "interaction_phase": phase,
        "selected_focus": request.get("selected_focus"),
    }
    try:
        result = graph.invoke(state)
        output = result["output"]
    except Exception as error:
        record["error"] = error_payload(error, "model_invocation", env)
        return record, False

    record["output"] = output
    try:
        if phase == "initial":
            validate_initial_output(output, request)
        else:
            validate_selected_focus_output(output, request)
    except Exception as error:
        record["error"] = error_payload(error, "contract_validation", env)
        return record, False
    return record, True


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


def validate_run_dir(path: Path) -> Path:
    resolved = path.resolve()
    runs_root = RUNS_DIR.resolve()
    if resolved.parent != runs_root:
        raise ValueError(f"run-dir must be a new direct child of {runs_root}")
    if resolved.exists():
        raise FileExistsError("run-dir already exists; refusing to overwrite it")
    return resolved


def make_run_manifest(
    run_dir: Path,
    definition: dict[str, Any],
    model_name: str,
) -> dict[str, Any]:
    return {
        "manifestVersion": 1,
        "runId": run_dir.name,
        "runType": "offline_baseline",
        "status": "running",
        "startedAt": utc_now(),
        "completedAt": None,
        "evalSetId": EXPECTED_EVAL_SET_ID,
        "evalSetStatus": "frozen",
        "rubricVersion": definition["v2_manifest"].get("rubricVersion"),
        "promptVersion": definition["prompt_version"],
        "outputSchemaId": definition["schema_id"],
        "provider": "openai_compatible",
        "changeSummary": "First baseline for the frozen two-stage v2 scaffold contract.",
        "model": {
            "name": model_name,
            "temperature": 0,
            "maxTokens": 4096,
            "maxRetries": 0,
            "timeoutSeconds": 120,
            "useResponsesApi": False,
            "structuredOutputMethod": "function_calling",
        },
        "execution": {
            "expectedInitialCalls": EXPECTED_CASES,
            "expectedSelectedFocusCalls": EXPECTED_REQUEST_FOCUS,
            "selectedFocusSource": "offline_probe_not_user_choice",
            "actual": {
                "initial": {"attempted": 0, "succeeded": 0, "failed": 0},
                "selected_focus": {"attempted": 0, "succeeded": 0, "failed": 0},
            },
        },
        "artifacts": {
            "initialOutputs": "initial-outputs.jsonl",
            "selectedFocusOutputs": "selected-focus-outputs.jsonl",
        },
        "sourceHashes": {
            "v1FreezeManifest": sha256_file(V1_MANIFEST_PATH),
            "v2FreezeManifest": sha256_file(V2_MANIFEST_PATH),
            "v2Overlay": sha256_file(V2_OVERLAY_PATH),
            "prompt": sha256_file(V2_PROMPT_PATH),
            "outputSchema": sha256_file(V2_SCHEMA_PATH),
            "runner": sha256_file(Path(__file__).resolve()),
        },
        "runtime": {
            "python": f"{os.sys.version_info.major}.{os.sys.version_info.minor}.{os.sys.version_info.micro}",
            "langgraph": version("langgraph"),
            "langchainOpenAI": version("langchain-openai"),
            "pydantic": version("pydantic"),
        },
    }


def run_baseline(
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
    graph = build_graph(
        model, definition["system_prompt"], definition["user_template"]
    )

    run_dir.mkdir(exist_ok=False)
    manifest_path = run_dir / "run-manifest.json"
    initial_path = run_dir / "initial-outputs.jsonl"
    selected_path = run_dir / "selected-focus-outputs.jsonl"
    manifest = make_run_manifest(run_dir, definition, env["model"])
    write_json_exclusive(manifest_path, manifest)

    try:
        with initial_path.open("x", encoding="utf-8", newline="\n") as initial_file:
            for case in definition["cases"]:
                record, succeeded = invoke_record(graph, case, "initial", env)
                write_json_line(initial_file, record)
                counters = manifest["execution"]["actual"]["initial"]
                counters["attempted"] += 1
                counters["succeeded" if succeeded else "failed"] += 1
                print(f"{case['case_id']} initial {'ok' if succeeded else 'error'}")

        with selected_path.open("x", encoding="utf-8", newline="\n") as selected_file:
            for request in definition["selected_focus_requests"]:
                record, succeeded = invoke_record(
                    graph, request, "selected_focus", env
                )
                write_json_line(selected_file, record)
                counters = manifest["execution"]["actual"]["selected_focus"]
                counters["attempted"] += 1
                counters["succeeded" if succeeded else "failed"] += 1
                print(
                    f"{request['case_id']}/{request['segment_index']} "
                    f"selected_focus {'ok' if succeeded else 'error'}"
                )

        total_failures = sum(
            phase["failed"]
            for phase in manifest["execution"]["actual"].values()
        )
        manifest["status"] = (
            "completed" if total_failures == 0 else "completed_with_errors"
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
        description="Validate or run the frozen LinguaType v2 offline baseline."
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        help="External env file containing base_url, api_key, and model.",
    )
    parser.add_argument(
        "--run-dir",
        type=Path,
        help="New direct child directory under evals/expression-scaffold/runs.",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate frozen inputs without a model call or filesystem write.",
    )
    args = parser.parse_args()

    try:
        definition = load_eval_definition()
        env = read_env(args.env_file) if args.env_file else None
        run_dir = validate_run_dir(args.run_dir) if args.run_dir else None

        if args.validate_only:
            print(
                "v2 run validation passed: "
                f"{len(definition['cases'])} initial + "
                f"{len(definition['selected_focus_requests'])} selected_focus; "
                f"environment={'checked' if env else 'not_requested'}; "
                f"run_dir={'checked' if run_dir else 'not_requested'}."
            )
            return

        if env is None:
            parser.error("--env-file is required unless --validate-only is used")
        if run_dir is None:
            parser.error("--run-dir is required unless --validate-only is used")

        manifest = run_baseline(definition, env, run_dir)
        actual = manifest["execution"]["actual"]
        failures = actual["initial"]["failed"] + actual["selected_focus"]["failed"]
        print(
            f"run complete: status={manifest['status']}, "
            f"records={actual['initial']['attempted'] + actual['selected_focus']['attempted']}, "
            f"failures={failures}"
        )
    except SystemExit:
        raise
    except Exception as error:
        safe_env = env if "env" in locals() and env else {}
        raise SystemExit(f"run_eval failed: {sanitize_error(error, safe_env)}") from None


if __name__ == "__main__":
    main()
