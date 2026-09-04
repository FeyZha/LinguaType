# v2 baseline Codex 子 Agent 独立审核

- 运行：`baseline-v2-20260824-longcat-2.0-langgraph-structured`
- 审核方式：3 个 Codex 子 Agent 隔离读取冻结样本、v2 rubric 与原始 baseline 输出
- 隔离要求：禁止读取 LongCat Judge 分数、汇总和旧人审结论
- 分工：全量四维审核、协议与帮助剂量专项审核、英文语义与自然度专项审核
- 分歧处理：由全量审核 Agent 根据专项异议再次裁决
- 状态：Codex 预审完成；7 个非通过项已由用户人工校准，当前结论见 `human-calibrated-review.md`

LongCat-2.0 同模型 Judge 结果已废弃，不参与本报告的评分或结论。

## 结论

| 口径 | pass | needs improvement | bad case |
|---|---:|---:|---:|
| 35 个 item / 阶段 | 28 | 5 | 2 |
| 20 个 case 取最差项 | 14 | 4 | 2 |

## 全部 35 个 item / 阶段

分数顺序：语义保持 / 支架质量 / 帮助剂量 / 用户可继续性。

| case / item / 阶段 | 四维 | 结论 |
|---|---:|---|
| LT-ESC-001 / 1 / initial | 3/2/3/3 | needs_improvement |
| LT-ESC-002 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-003 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-004 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-005 / 1 / initial | 2/2/2/2 | bad_case（协议硬失败） |
| LT-ESC-006 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-007 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-008 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-009 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-010 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-021 / 1 / initial | 3/2/3/3 | needs_improvement |
| LT-ESC-012 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-013 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-013 / 2 / initial | 3/3/3/3 | pass |
| LT-ESC-014 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-014 / 2 / initial | 3/2/2/3 | needs_improvement |
| LT-ESC-015 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-015 / 2 / initial | 3/3/3/3 | pass |
| LT-ESC-016 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-016 / 2 / initial | 3/2/2/3 | needs_improvement |
| LT-ESC-016 / 3 / initial | 3/3/3/3 | pass |
| LT-ESC-017 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-018 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-019 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-020 / 1 / initial | 3/3/3/3 | pass |
| LT-ESC-013 / 1 / selected_focus | 3/3/3/3 | pass |
| LT-ESC-014 / 1 / selected_focus | 3/3/3/3 | pass |
| LT-ESC-014 / 2 / selected_focus | 3/3/3/3 | pass（独立探针） |
| LT-ESC-015 / 1 / selected_focus | 3/3/3/3 | pass（独立探针） |
| LT-ESC-015 / 2 / selected_focus | 3/3/3/3 | pass |
| LT-ESC-016 / 2 / selected_focus | 1/1/3/1 | bad_case（独立探针） |
| LT-ESC-016 / 3 / selected_focus | 3/3/3/3 | pass |
| LT-ESC-017 / 1 / selected_focus | 3/3/3/3 | pass |
| LT-ESC-018 / 1 / selected_focus | 2/2/3/2 | needs_improvement |
| LT-ESC-020 / 1 / selected_focus | 3/3/3/3 | pass |

## 7 个非通过项

### 1. LT-ESC-001 / initial｜needs improvement

- 中文：`公众可达性`
- 输出：`public accessibility`
- 判断：上下文足以补全公共交通语义，因此语义保持为 3；但 `improve public accessibility` 搭配生硬，也容易引出泛化或无障碍含义。
- 改进方向：`access to public transport` 等更自然的表达。
- 用户结论：接受 `needs_improvement`

### 2. LT-ESC-005 / initial｜bad case

- 中文：`缩小城乡学生在获取教学资源方面的差距`
- 预期：直接提供一个英文短语。
- 输出：聚焦项 `缩小差距 / 城乡学生 / 获取教学资源`。
- 判断：动作错误；`缩小差距` 不是原中文连续片段，触发协议硬失败。
- 改进方向：直接提供围绕 `narrow the gap ... in access to educational resources` 的单一支架。
- 用户结论：覆盖为 `pass`；小粒度语义支架是产品希望的最小可用单元，连续原文规则过严

### 3. LT-ESC-021 / initial｜needs improvement

- 中文：`默认做法`
- 输出：`default practice`
- 判断：能理解，但 `become their default practice` 用于学生形成的日常处理习惯时有明显翻译腔。
- 改进方向：`usual practice`、`default approach` 或语境中更自然的惯常表达。
- 用户结论：接受 `needs_improvement`

### 4. LT-ESC-014 / item 2 / initial｜needs improvement

- 中文：`仅增加街面可见警力无法处理犯罪背后的社会原因`
- 输出聚焦项：`仅增加街面可见警力 / 无法处理犯罪背后的社会原因`。
- 判断：第二项连续且可理解，但覆盖了完整谓语和宾语，聚焦范围偏宽；不构成硬失败。
- 改进方向：继续缩到 `无法处理`、`犯罪背后的社会原因` 等具体语言卡点。
- 用户结论：接受 `needs_improvement`

### 5. LT-ESC-016 / item 2 / initial｜needs improvement

- 中文：`步行空间可以支持本地商业，而必要车辆仍需保持通行`
- 输出聚焦项：`步行空间可以支持本地商业 / 必要车辆仍需保持通行`。
- 判断：两个选项各自已经是完整命题，没有把卡点缩到具体表达；下一轮容易直接交付整条小句。
- 改进方向：拆为更细的真实语言单位，如 `步行空间`、`支持本地商业`、`必要车辆`、`保持通行`。
- 用户结论：接受 `needs_improvement`

### 6. LT-ESC-016 / item 2 / selected_focus｜bad case

- 已选：`保持通行`
- 输出：`remain accessible`
- 判断：该表达表示“仍可被接近或使用”，没有表达车辆仍被允许通行或保有通行条件；用户必须重新寻找核心表达。
- 改进方向：`retain access`、`continue to have access`、`be allowed through` 等。
- 用户结论：接受 `bad_case`

### 7. LT-ESC-018 / selected_focus｜needs improvement

- 已选：`长期经营的公司`
- 输出：`companies that operate on a long-term basis`
- 判断：大致保留“长期”方向，但搭配笨重，没有自然体现公司愿意长期留在当地经营。
- 改进方向：`companies committed to staying for the long term` 等。
- 用户结论：接受 `needs_improvement`

## 3 个评测设计问题

以下冻结探针没有作为本次 initial 输出的可点击选项出现：

| case / item | 首轮实际选项 | 冻结 selected-focus 探针 |
|---|---|---|
| LT-ESC-014 / 2 | `无法处理犯罪背后的社会原因` | `无法处理` |
| LT-ESC-015 / 1 | `可以减少 / 通勤时间` | `可以减少通勤时间` |
| LT-ESC-016 / 2 | `必要车辆仍需保持通行` | `保持通行` |

这些 selected-focus 输出只能证明“给定该人为探针时模型如何回答”，不能证明用户经过本次首轮输出能够真实走到该步骤。`LT-ESC-016` 的 `remain accessible` 即使作为独立探针仍然是模型 bad case。

## 边界 pass 校准

- `LT-ESC-007` 的 `run by local residents` 需要移动到 `shops` 后，属于允许的正常安装动作。
- `LT-ESC-010` 的 `sense of stability` 本身较宽，但前文财务语境足以补全含义。
- `LT-ESC-013` 的 `whether they remain necessary` 依赖 `they` 指代图书馆，但前文已有清楚先行词。
- `LT-ESC-015` 的 `可以减少 / 通勤时间` 是两个可独立求助的表达单位；参考切分不是逐字金标。
- `LT-ESC-017` 的首轮切分与冻结 v2 参考一致，不应在本轮反向处罚模型；若认为仍过大，应修改下一版评测金标。
- `LT-ESC-020` 的 `do not automatically translate into` 只需按单数主语改为 `does not`，属于允许的词形安装动作。

## 证据边界

这是一轮 Codex 子 Agent 离线预审，不等于真实用户效果。7 个非通过项已完成用户人工校准；下一评测版本仍需修复 3 个探针可达性问题。
