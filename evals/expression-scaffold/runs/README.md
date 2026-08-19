# 模型能力测试运行记录

本目录只保存实际运行产生的批次记录和结果，不修改冻结评测集。

## 执行顺序

```text
确认 eval_set_id 与冻结指纹
→ 用指定 prompt_version 调用被测模型
→ 保存原始响应并校验 JSON、片段覆盖和顺序
→ LLM Judge 按 rubric 初评
→ 人工复核硬失败与低分，并抽检高分
→ 汇总实际 bad case
```

## 目录结构

```text
runs/<run_id>/
├── manifest.json
├── model-outputs.jsonl
├── judge-scores.jsonl
└── human-review.md
```

## manifest.json

每个 run 至少记录：

```text
eval_set_id
run_id
started_at
status
provider
model
model_parameters
prompt_version
prompt_sha256
judge_prompt_version
judge_prompt_sha256
judge_model
change_summary
```

不得记录 API Key。尚未运行 Judge 时，Judge 字段使用 `null`。

## 首轮 baseline

先做离线校验；这一步不会调用模型，也不会创建运行结果：

```text
node evals/expression-scaffold/run-baseline.mjs --validate-only
```

确认被测模型后，在本机临时设置以下环境变量，不要把 API Key 写入仓库或聊天记录：

```text
LINGUATYPE_EVAL_BASE_URL
LINGUATYPE_EVAL_API_KEY
LINGUATYPE_EVAL_MODEL
```

然后使用唯一的 `run_id` 启动一次顺序运行：

```text
node evals/expression-scaffold/run-baseline.mjs --run-id baseline-20260819-<model>-p1
```

可选变量为 `LINGUATYPE_EVAL_ENDPOINT_PATH`、`LINGUATYPE_EVAL_TEMPERATURE`、`LINGUATYPE_EVAL_MAX_TOKENS` 和 `LINGUATYPE_EVAL_JSON_MODE`。默认采用 OpenAI-compatible Chat Completions 端点、温度 0、最大 800 tokens，并关闭 JSON mode。若 Base URL 已包含 `/v1`，应把 endpoint path 显式设为 `/chat/completions`。

## model-outputs.jsonl

每条 case 保存一行：

```json
{
  "case_id": "LT-ESC-001",
  "request_status": "success",
  "output_status": "valid",
  "system_output": {
    "items": [
      {
        "sourceZh": "公众可达性",
        "recommendedExpression": "..."
      }
    ]
  },
  "raw_response": "...",
  "validation_errors": [],
  "error": null
}
```

提供方请求失败时保留原始脱敏错误，`request_status` 记为 `error`。请求成功但模型内容不是严格 JSON，或字段、片段覆盖与顺序不合规则时，`request_status` 仍为 `success`，`output_status` 记为 `invalid`，并保留原始响应供后续评分和人工复核。不得把 API Key、完整请求头或其他凭证写入结果。

## 冻结边界

- 每个 run 必须引用 `expression-scaffold.dev.v1`，并在开始前验证 `freeze-manifest.json`。
- Prompt 是实验变量；修改 Prompt 时创建新的 `prompt_version`，不得覆盖旧文件。
- 模型输出和评分不得回写 `cases.md`、`rubric.md` 或其他冻结文件。
- 19 条 AI 初拟样本即使通过测试，也不变成真实用户数据。
