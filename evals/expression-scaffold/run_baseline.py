"""Minimal LangGraph runner for the frozen expression-scaffold eval set."""

import argparse
import json
import re
from pathlib import Path
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel
from typing_extensions import NotRequired, TypedDict


EVAL_DIR = Path(__file__).parent


class Item(BaseModel):
    sourceZh: str
    recommendedExpression: str


class Output(BaseModel):
    items: list[Item]


class State(TypedDict):
    task_prompt: str
    full_essay: str
    target_sentence: str
    output: NotRequired[dict[str, Any] | None]


def read_env(path: Path) -> dict[str, str]:
    values = {}
    for raw in path.read_text("utf-8-sig").splitlines():
        line = raw.strip()
        if line and not line.startswith("#"):
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    return values


def fenced(markdown: str, heading: str) -> str:
    match = re.search(
        rf"^## {re.escape(heading)}.*?```(?:text)?\r?\n(.*?)\r?\n```",
        markdown,
        re.MULTILINE | re.DOTALL,
    )
    if not match:
        raise ValueError(f"Missing prompt section: {heading}")
    return match.group(1).strip()


def read_prompt() -> tuple[str, str]:
    markdown = (EVAL_DIR / "prompts" / "baseline-v1.md").read_text("utf-8")
    return fenced(markdown, "System prompt"), fenced(markdown, "User message template")


def read_cases() -> list[dict[str, str]]:
    markdown = (EVAL_DIR / "cases.md").read_text("utf-8")
    blocks = re.split(r"(?=^### LT-ESC-\d{3})", markdown, flags=re.MULTILINE)[1:]
    cases = []
    for block in blocks:
        case_id = re.search(r"^### (LT-ESC-\d{3})", block, re.MULTILINE).group(1)
        task = re.search(r"^- `task_prompt`：(.*)$", block, re.MULTILINE).group(1)
        target = re.search(r"^- `target_sentence`：(.*)$", block, re.MULTILINE).group(1)
        essay_block = block.split("- `full_essay`：", 1)[1].split(
            "- `target_sentence`：", 1
        )[0]
        essay = "\n".join(re.findall(r"^> (.*)$", essay_block, re.MULTILINE))
        cases.append(
            {
                "case_id": case_id,
                "task_prompt": task,
                "full_essay": essay,
                "target_sentence": target,
            }
        )
    return cases


def build_graph(model: ChatOpenAI, system_prompt: str, user_template: str):
    structured_model = model.with_structured_output(
        Output, method="function_calling", strict=True, include_raw=True
    )

    def call_model(state: State):
        user_prompt = (
            user_template.replace("{{task_prompt}}", state["task_prompt"])
            .replace("{{full_essay}}", state["full_essay"])
            .replace("{{target_sentence}}", state["target_sentence"])
        )
        result = structured_model.invoke(
            [SystemMessage(system_prompt), HumanMessage(user_prompt)]
        )
        parsed = result["parsed"]
        if parsed is None:
            text = str(result["raw"].content).strip()
            text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
            parsed = Output.model_validate_json(text)
        return {"output": parsed.model_dump()}

    graph = StateGraph(State)
    graph.add_node("call_model", call_model)
    graph.add_edge(START, "call_model")
    graph.add_edge("call_model", END)
    return graph.compile()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env-file", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    env = read_env(args.env_file)
    base_url = env["base_url"].rstrip("/")
    if not base_url.endswith("/v1"):
        base_url += "/v1"

    model = ChatOpenAI(
        model=env["model"],
        api_key=env["api_key"],
        base_url=base_url,
        temperature=0,
        use_responses_api=False,
        extra_body={"max_tokens": 4096},
    )
    system_prompt, user_template = read_prompt()
    graph = build_graph(model, system_prompt, user_template)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("x", encoding="utf-8") as output_file:
        for case in read_cases():
            try:
                result = graph.invoke(
                    {
                        "task_prompt": case["task_prompt"],
                        "full_essay": case["full_essay"],
                        "target_sentence": case["target_sentence"],
                    }
                )
                record = {"case_id": case["case_id"], "output": result["output"]}
            except Exception as error:
                message = str(error).replace(env["api_key"], "[REDACTED]")
                record = {"case_id": case["case_id"], "error": message}

            output_file.write(json.dumps(record, ensure_ascii=False) + "\n")
            output_file.flush()
            print(case["case_id"])


if __name__ == "__main__":
    main()
