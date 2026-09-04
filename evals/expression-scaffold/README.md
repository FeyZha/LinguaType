# LinguaType 表达支架离线评测

当前状态：v1—v3 历史资产均保留；v4 已冻结并完成首次 baseline。用户已确认沿用 A（完整全文），上下文字段消融关闭；A 的质量非通过项留待进入真实用户测试前校准。

本目录只评估一个问题：

> 系统能否一次生成足够的内部支架包，再由界面按需揭示，同时保留用户的组句主导权？

## 文件导航

| 文件 | 只回答的问题 |
|---|---|
| [cases.md](./cases.md) | v1 用哪些冻结样本测试？ |
| [case-schema.md](./case-schema.md) | v1 样本字段如何定义？ |
| [model-output.md](./model-output.md) | v1 被测模型需要填写什么？ |
| [rubric.md](./rubric.md) | v1 什么样的输出算好或算错？ |
| [scoring.md](./scoring.md) | v1 如何给分、记录版本和复测？ |
| [review.md](./review.md) | 20 条样本及其分类是否保留、修改或删除？ |
| [freeze-manifest.json](./freeze-manifest.json) | 当前冻结版本和文件指纹是什么？ |
| [verify-freeze.mjs](./verify-freeze.mjs) | 如何在运行前检查冻结文件未变化？ |
| [prompts/baseline-v1.md](./prompts/baseline-v1.md) | 首轮被测模型使用什么 Prompt？ |
| [run_baseline.py](./run_baseline.py) | 如何用 LangGraph 与结构化输出运行被测模型？ |
| [run_eval.py](./run_eval.py) | 如何校验并运行 v2 的两个阶段？ |
| [run_eval_v3.py](./run_eval_v3.py) | 如何从实际 initial 选项运行 v3 两阶段轨迹？ |
| [run_eval_v4.py](./run_eval_v4.py) | 如何运行 v4 单次生成并验证首屏不泄漏？ |
| [run_context_ablation_v4.py](./run_context_ablation_v4.py) | 如何在不改 v4 Prompt/schema 的情况下运行 B/C 作文上下文量消融？ |
| [analyze_context_ablation_v4.py](./analyze_context_ablation_v4.py) | 如何汇总 A/B/C 自动差异并生成盲审材料？ |
| [summarize_context_ablation_reviews.py](./summarize_context_ablation_reviews.py) | 如何锁定三路盲审、裁决分歧并在评分后解盲？ |
| [prepare_context_ablation_human_calibration.py](./prepare_context_ablation_human_calibration.py) | 如何生成全部非通过项与 pass 抽检的人工校准材料？ |
| [run_judge.py](./run_judge.py) | 已废弃的同模型 Judge 流程如何留存？ |
| [requirements-langchain.txt](./requirements-langchain.txt) | Python 运行需要哪些依赖？ |
| [runs/README.md](./runs/README.md) | 实际运行结果如何隔离保存？ |
| [eval-sets/expression-scaffold.dev.v2/README.md](./eval-sets/expression-scaffold.dev.v2/README.md) | v2 为什么改、当前改到哪里？ |
| [eval-sets/expression-scaffold.dev.v2/model-output.md](./eval-sets/expression-scaffold.dev.v2/model-output.md) | v2 的两阶段输出如何约束？ |
| [eval-sets/expression-scaffold.dev.v2/rubric.md](./eval-sets/expression-scaffold.dev.v2/rubric.md) | v2 如何逐 item 评价？ |
| [eval-sets/expression-scaffold.dev.v2/cases.md](./eval-sets/expression-scaffold.dev.v2/cases.md) | 20 条样本如何迁移为直接表达或先聚焦？ |
| [eval-sets/expression-scaffold.dev.v3/README.md](./eval-sets/expression-scaffold.dev.v3/README.md) | v3 如何修正规则并保证二轮真实可达？ |
| [eval-sets/expression-scaffold.dev.v3/rubric.md](./eval-sets/expression-scaffold.dev.v3/rubric.md) | v3 如何评价实际路径？ |
| [eval-sets/expression-scaffold.dev.v4/README.md](./eval-sets/expression-scaffold.dev.v4/README.md) | v4 如何取消二次模型等待并保持非代写边界？ |
| [eval-sets/expression-scaffold.dev.v4/rubric.md](./eval-sets/expression-scaffold.dev.v4/rubric.md) | v4 如何评价支架包、渐进揭示和可组合性？ |
| [experiments/context-ablation-v4-20260825/README.md](./experiments/context-ablation-v4-20260825/README.md) | A/B/C 作文上下文量消融控制什么变量、能得出什么结论？ |

## 两个分类字段的用途

`slot_function` 描述中文片段在目标句中的外部功能，`span_scope` 描述中文片段自身的结构大小。

它们只用于：

- 检查评测集是否覆盖不同类型的中文卡点；
- 评分完成后按样本类型切片统计。

它们不提供给被测模型，首轮 LLM Judge 也不依赖这两个标签评分。

## 版本边界

- 根目录五个 canonical 文件与 `freeze-manifest.json` 永远代表 v1，不再修改。
- v1 的 `13 / 6 / 1` 只说明旧任务定义下的 Judge 结果；v2 改了帮助动作和 rubric，不能把两版数字直接写成效果提升。
- v2 已冻结，Prompt 仍作为独立实验变量记录在 run manifest。新 baseline 的协议结果不等于模型质量评分。
- v3 改变了 v2 的路由与聚焦合法性，并以实际首轮选项生成二轮输入，因此 v2 与 v3 不能直接写成效果提升。
- v4 把两次生成改为一次生成加本地揭示，因此 v3 与 v4 也不能直接写成模型能力提升。

## v2 使用顺序

```text
审核帮助路由、聚焦项和评分边界
→ 为聚焦后的第二轮补齐测试输入
→ 冻结 v2 评测集
→ 运行被测模型
→ LLM Judge 评分
→ 人工复核
→ 根据真实 bad case 总结失败模式
→ 同集复测
```

任何冻结文件变化都必须创建新的 `eval_set_id`；实际输出、评分和人工复核只能写入 `runs/<run_id>/`。

## 已保存运行

v1：`baseline-20260820-longcat-2.0-langgraph-structured` 的 20 条均得到结构化 output；旧 Judge 预评为 13 pass、6 needs improvement、1 bad case。旧契约会奖励过量帮助，因此该结果不再作为 v2 调参依据。

v2：`baseline-v2-20260824-longcat-2.0-langgraph-structured` 执行 20 次 initial 与 10 次 selected-focus 离线探针，30 次均取得模型响应。LongCat 同模型 Judge 已被用户否决。Codex 子 Agent 隔离预审覆盖 35 / 35 个 item/阶段，用户人工校准全部 7 个非通过项后，最终离线分布为 29 pass、5 needs improvement、1 bad case；20 case 为 15/4/1。`LT-ESC-005` 的人工覆盖说明 v2 连续子片段与直给动作规则过严；3 个冻结探针与实际首轮输出不连通。该结果不能写成真实用户效果。

v3：`baseline-v3-20260824-longcat-2.0-actual-path-structured` 执行 20 次 initial，其中 18 次结构可用、2 次协议失败；从结构可用输出真实产生 9 次 selected-focus，9 次均完成。三个隔离 Codex 子 Agent 审核 34 个实际 item/阶段并裁决唯一分歧，预审为 29 pass、3 needs improvement、2 bad case；20 case 为 15/3/2。该结论等待用户人工校准。冻结 `cases.md` 残留 `draft` 状态字样，不影响已记录运行，但属于 v3 元数据瑕疵。

v4：`baseline-v4-20260824-longcat-2.0-one-call-progressive-reveal` 执行 20 次模型调用，20 次均通过结构与协议校验；实际返回 14 个直接项、11 个渐进揭示支架包、27 个支架，首屏英文泄漏为 0，运行产物凭证扫描通过。

v4 上下文消融：A 引用上述全文 baseline，B 仅保留目标句及前后句，C 仅保留目标句；其他 Prompt、schema、case、模型参数与字段形式不变。B/C 分别有 19/20、18/20 个 case 通过协议。三路隔离 Codex 盲审并裁决后，A/B/C 的 case 分布为 13/4/3、14/2/4、8/3/9。B 相比 C 有 6 个 case 更好、0 个更差；A 与 B 为 2 个 A 更好、3 个 B 更好、15 个持平。用户最终选择 A 作为当前产品输入，不再安排 B/C 复测；该选择是产品方案收敛，不代表 A 的模型质量或真实用户效果已获证明。

Judge 输入不含 `slot_function`、`span_scope`、`case_type` 或 `source_type`。评分锁定后才通过 `case_id` 合并分类字段；分组统计中，同一 case 在每个不同分类组合中最多计一次。

以下命令仅用于重建 v1 历史运行。首次运行先建立项目本地 Python 环境并安装依赖：

```text
py -3.10 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r evals\expression-scaffold\requirements-langchain.txt
```

当前 v1 runner 是最小顺序脚本：

```text
.\.venv\Scripts\python.exe evals\expression-scaffold\run_baseline.py `
  --env-file <外部.env路径> `
  --output evals\expression-scaffold\runs\<run_id>\model-outputs.jsonl
```

它读取 `cases.md` 和冻结 Prompt，用单节点 LangGraph 循环调用结构化模型，每条只保存 `case_id` 与 `output`；失败时保存 `error`。详细命令见 `runs/README.md`。

## 证据边界

- `LT-ESC-001` 只继承用户真实出现过的“公众可达性”中文卡点，题目和全文为 AI 重建上下文。
- 其余 19 条源自 AI 初拟，虽已完成逐条静态复审，仍不是真实用户数据。
- 当前已有多版 baseline、隔离 Codex 离线预审和 v2 人工校准；v4 已选定 A 输入，但 A 的 7 个非通过 case 尚未人工校准，且仍无真实用户效果证据。
