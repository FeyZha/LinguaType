# 打分与复测

本文件只规定如何记录分数、实验后失败说明、版本和复测结果。实际内容在运行 baseline 后填写。

## 分值

三个维度分别采用 1—3 分：

| 分数 | 含义 |
|---:|---|
| 3 | 满足该维度标准，可直接使用或只需很小调整 |
| 2 | 方向基本正确，但需要明显人工修改 |
| 1 | 不可用、明显错误、越界或存在误导风险 |

评分维度来自 [rubric.md](./rubric.md)：

- `semantic_accuracy`
- `scaffold_quality`
- `user_continuability`

新增的样本分类字段不成为第四、第五个评分维度。

## 单条样本结论

| 结论 | 判定方式 |
|---|---|
| `pass` | 三个维度均为 3 |
| `needs_improvement` | 没有 1 分，但至少有一个 2 分 |
| `bad_case` | 任一维度为 1，或触发硬失败 |

不使用平均分掩盖严重问题。

## 运行批次

每次运行只保存一份批次信息：

```text
eval_set_id
run_id
started_at
status
provider
prompt_version
prompt_sha256
model
model_parameters
judge_prompt_version
judge_prompt_sha256
judge_model
change_summary
```

`eval_set_id` 必须与 `freeze-manifest.json` 一致。不得记录 API Key。

## 单条评分记录

```text
case_id
run_id
system_output
scores.semantic_accuracy
scores.scaffold_quality
scores.user_continuability
case_result
judge_reason       # Judge 对实际输出的事实性理由
failure_type        # 仅实际成为 bad_case 后填写
human_note          # 先记录实际输出中观察到的事实
regression_note     # 发生退化时填写
```

## failure_type 边界

- 只在实际输出被判为 `bad_case` 后填写。
- baseline 前不得预填。
- 不得由 `slot_function` 或 `span_scope` 自动推导。
- 第一轮先记录输出中真实发生了什么，不急于建立抽象类别。
- 完成整轮实验并人工复核后，再归并实际出现的失败模式。
- 样本没有暴露问题时保持为空。

## 人机分工

1. 被测模型完成全部样本。
2. LLM Judge 按统一 rubric 评分并给出事实性理由。
3. 人工复核全部硬失败和低分样本，并抽检高分样本。
4. 人机判断经常不一致时，以人工为准，并修订 Judge Prompt。
5. 未完成校准前，LLM Judge 结果只作为离线预评。

## 分组统计

完成首轮评分后，可按 `case_id` 合并样本元数据，并统计：

```text
slot_function × span_scope
→ 各维度分数分布
→ bad case 数量
```

这些分类只用于观察不同样本切片，不预设哪一类更容易失败。

## 复测

- 固定当前 `eval_set_id` 对应的全部冻结文件及其 SHA-256 指纹。
- 每次修改提示词后创建新的 `run_id`。
- 同一 `case_id` 在不同 `run_id` 下直接比较。
- 新发现的 bad case 可以加入后续回归集，但不能删除原始失败记录。
- 不使用嵌套的 `retest_scores` 字段。
