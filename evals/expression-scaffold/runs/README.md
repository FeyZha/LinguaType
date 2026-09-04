# 测试结果

当前 `run_baseline.py` 是 v1 历史 runner，只做四件事：读取 v1 评测集、循环调用模型、记录 case ID、保存 v1 结构化输出。

它不支持后续版本；v2 使用 `run_eval.py`，v3 使用 `run_eval_v3.py`，v4 使用 `run_eval_v4.py`。

## v1 运行记录

外部 `.env` 只需要：

```text
base_url=...
api_key=...
model=...
```

执行：

```text
.\.venv\Scripts\python.exe evals\expression-scaffold\run_baseline.py `
  --env-file <外部.env路径> `
  --output evals\expression-scaffold\runs\baseline-20260820-longcat-2.0-langgraph-structured\model-outputs.jsonl
```

输出每行只有：

```json
{"case_id":"LT-ESC-001","output":{"items":[{"sourceZh":"公众可达性","recommendedExpression":"..."}]}}
```

调用失败时记录：

```json
{"case_id":"LT-ESC-001","error":"..."}
```

runner 不读取评分金标，不运行 Judge，也不保存 API Key。模型忽略 Tool Call、返回普通或 Markdown JSON 时，runner 会用同一个 Pydantic schema 解析已有响应，不发起第二次模型调用。

## Judge 结果

最终运行目录同时保存：

- `judge-input.jsonl`：不含分类字段的隔离 Judge 输入；
- `judge-scores.jsonl`：独立 subagent 的逐条评分；
- `judge-scores-with-slices.jsonl`：评分完成后按 `case_id` 合并分类字段；
- `grouped-stats.json`：按 `slot_function`、`span_scope` 及两者交叉分组的统计。

LLM Judge 只作为旧规则下的离线预评。v2 改变了任务定义和 rubric，不得把未来 v2 数字与本运行直接写成效果提升。

## v2 运行记录

`baseline-v2-20260824-longcat-2.0-langgraph-structured/` 保存：

- `run-manifest.json`：冻结版本、Prompt/schema/runner 指纹、模型参数与调用计数；
- `initial-outputs.jsonl`：20 条初轮输出；
- `selected-focus-outputs.jsonl`：10 条离线聚焦探针输出。

该运行 30 次均取得响应，1 次协议失败、0 次传输失败。selected-focus 来自预设探针，不代表真实用户点击。

LongCat-2.0 同模型 Judge 因自评偏差被用户否决；相关 `judge-*` 和 `human-review-v2-complete.md` 只保留历史过程，不再作为质量入口。

当前入口是 `human-calibration-summary.json` 与 `human-calibrated-review.md`；Codex 原始预审保留在 `codex-subagent-scores.jsonl` 与 `codex-subagent-review.md`。用户人工校准全部 7 个非通过项后，35 个 item/阶段最终离线分布为 29 pass、5 needs improvement、1 bad case，20 case 为 15/4/1。`LT-ESC-005` 被覆盖为 pass 并归因为评测规则过严；另有 3 个 selected-focus 探针与本次 initial 输出不连通。真实用户效果仍未验证。

## v3 运行记录

`baseline-v3-20260824-longcat-2.0-actual-path-structured/` 保存 20 次 initial 输出、由本次 initial 第一聚焦项产生的 9 次真实 selection，以及对应 9 次 selected-focus 输出。20 次 initial 中 18 次结构可用；`LT-ESC-009` 虚构来源片段，`LT-ESC-016` 遗漏首个片段，均被协议拒绝。

生成模型没有参与自评。三个隔离 Codex 子 Agent 预审 34 个 item/阶段，复议唯一分歧后为 29 pass、3 needs improvement、2 bad case。原始预审入口为 `codex-subagent-scores.jsonl`、`codex-subagent-review.md` 和 `codex-subagent-review-manifest.json`；当前状态是 `pending_human_calibration`。

## v4 运行约定

v4 每个 case 只允许一次模型调用。运行目录保存 `model-outputs.jsonl`（内部支架包）与 `initial-user-views.jsonl`（隐藏复杂项英文后的首屏投影）。点击揭示由本地状态完成，不创建 `selected-focus-outputs.jsonl`，也不增加模型调用。

首次运行 `baseline-v4-20260824-longcat-2.0-one-call-progressive-reveal/` 已完成：20/20 次调用通过结构与协议校验，25 个 item 实际为 14 个直接项与 11 个支架包，共 27 个支架；首屏泄漏检查为 0，运行目录凭证扫描无命中。其独立 Codex 预审已作为下述 A/B/C 盲审的一部分完成，最终结论仍等待用户人工校准。

## v4 上下文消融运行记录

- A：`baseline-v4-20260824-longcat-2.0-one-call-progressive-reveal/`，历史全文 baseline，20/20 个 case 通过协议。
- B：`ablation-v4-20260825-b-local-window/`，仅使用目标句及前后句，19/20 个 case 通过协议；`LT-ESC-020` 把一个顶层片段拆成三项。
- C：`ablation-v4-20260825-c-target-only/`，只保留目标句，18/20 个 case 通过协议；`LT-ESC-015`、`LT-ESC-016` 发生顶层片段拆分。
- 对比入口：`context-ablation-v4-20260825-abc-comparison/`，包含自动对比、60 份匿名候选的三路 Codex 盲审、分歧裁决和人工校准材料。

最终 Codex 预审分布为 A 13/4/3、B 14/2/4、C 8/3/9。B 相比 C 在 6 个 case 更好、没有更差；A 与 B 为 2 个 A 更好、3 个 B 更好、15 个持平。A 是历史结果，B/C 也是顺序而非交错运行；token 与耗时不能据此声明产品成本或等待改善。用户已选择 A 作为产品输入，消融实验关闭；原人工校准材料继续保留为质量复核记录。
