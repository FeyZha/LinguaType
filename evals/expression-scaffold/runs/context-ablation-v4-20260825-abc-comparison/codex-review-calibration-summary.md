# v4 上下文消融隔离盲审：calibration

## 审核范围

- 审核对象：`blind-review-inputs.jsonl` 中 60 个匿名 candidate。
- 审核身份：`calibration`。
- 依据：v4 `rubric.md` 与 `model-output.md`。
- 未读取盲审映射、自动汇总、比较清单、A/B/C run 目录、旧 Judge 或人工结论。
- 每个 candidate 均独立按硬门槛与四个维度评分；未根据同 case 的其他 candidate 推定条件身份。

## 结果分布

| 结论 | 数量 | 占比 |
| --- | ---: | ---: |
| `pass` | 35 | 58.3% |
| `needs_improvement` | 12 | 20.0% |
| `bad_case` | 13 | 21.7% |
| 合计 | 60 | 100% |

硬门槛触发 3 个：

- `review-015-1`：把一个规定的顶层 `sourceZh` 拆成两个 item。
- `review-016-2`：把一个规定的顶层 `sourceZh` 拆成两个 item。
- `review-020-2`：把一个规定的顶层 `sourceZh` 拆成三个 item。

三者均有 `candidate_run_error.stage=contract_validation`，按硬门槛直接判为 `bad_case`。

## 关键校准结论

### 1. 顶层覆盖

除上述 3 个硬失败外，其余 candidate 均按规定原样、逐项返回了顶层中文片段。复杂句内部如何划分 `scaffolds` 不等同于可以改写顶层 `items`；两层边界需要严格区分。

### 2. 过碎支架

`review-002-3`、`review-004-1`、`review-004-2`、`review-006-3` 把本可作为一个表达块支援的短语拆成词级成分。它们增加点击次数，却只让用户按原顺序机械拼回完整短语，因此在支架质量、帮助剂量或可组句性上出现 1 分。

### 3. 拆开交完整答案

最明确的 bad case 是：

- `review-014-1`、`review-014-2`、`review-014-3`：至少一个复杂命题被拆成可按顺序直接组成完整主语—谓语—宾语的英文块。
- `review-020-1`、`review-020-3`：三个英文分别是完整主语、完整谓语和完整宾语，揭示后无需真实组句。
- `review-013-3`：把完整疑问命题作为单个直接表达给出，用户只需原样接入句子。

这些输出的语义可以是准确的，但准确不抵消帮助剂量失败。

### 4. 仍保留真实组句的支架

以下情况没有因“覆盖多个核心卡点”被自动判坏：

- `review-005-*`：用户仍需建立 gap、城乡学生与资源获取之间的关系。
- `review-015-2`、`review-015-3`：用户仍需补情态、照应、连接和句法。
- `review-016-1`、`review-017-1`：只给主要谓语卡点，主体与关系仍由用户完成。
- `review-018-1`、`review-018-3`：用户仍需组织 whether 结构、词形、顺序或手段关系。

判断关键不是支架数量，而是全部揭示后用户是否还需要作出实质性的句法与关系选择。

### 5. 非通过但未到 bad case

主要分为三类：

- 搭配含混或不够自然：`public accessibility`、`default practice`、`long-term operating companies`。
- 帮助接近完整从句但仍需重组：`review-013-1`、`review-013-2`。
- 粒度或剂量略多但仍保留真实组句：`review-016-3`、`review-017-2`、`review-017-3`、`review-018-2`。

## Candidate 清单

### `bad_case`（13）

`review-002-3`、`review-004-1`、`review-004-2`、`review-006-3`、`review-013-3`、`review-014-1`、`review-014-2`、`review-014-3`、`review-015-1`、`review-016-2`、`review-020-1`、`review-020-2`、`review-020-3`

### `needs_improvement`（12）

`review-001-1`、`review-001-2`、`review-001-3`、`review-011-1`、`review-011-2`、`review-011-3`、`review-013-1`、`review-013-2`、`review-016-3`、`review-017-2`、`review-017-3`、`review-018-2`

### `pass`（35）

其余 35 个 candidate；逐条分数、证据与备注见 `codex-review-calibration.jsonl`。

## 证据边界

本文件只是在匿名 candidate 层面对离线模型输出做校准审核。由于未读取 blind map，不能在此把结果归因到任何具体上下文条件，也不能据此声称某种输入字段更优。该结果同样不能证明真实用户的写作体验、学习效果或任务成功率；仍需映射解盲、跨审核者分歧处理和用户人工校准。
