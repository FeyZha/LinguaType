# v2 样本字段与数据边界

v2 在 v1 的题目、全文、目标句、中文片段、语义意图和禁止新增内容上，增加“如何帮助”的离线金标。它通过 `case_id + segment_index` 对应 v1 冻结样本，并由 v2 manifest 同时锁定父 manifest 与路由表指纹。

## 沿用字段

以下字段含义不变：

```text
case_id
case_type
source_type
task_prompt
full_essay
target_sentence
segments.source_zh
segments.intent_zh
segments.slot_function
segments.span_scope
must_not_add
```

`intent_zh` 用于消歧和保护立场，不是要求英文支架逐字装下的完整清单。上下文已经清楚表达的背景，不要求在一个短语里重复编码。

## v2 新增字段

每个顶层 `segments` 项增加：

```yaml
input_fit: sufficient
expected_action: request_focus
reference_focus_options_zh:
  - 额外的辅导时间
  - 不会自动转化为
  - 相称的学习进步
probe_focus_zh: 不会自动转化为
route_note_zh: 完整命题；首轮整段翻译会交付主要判断。
```

| 字段 | 取值 / 含义 |
|---|---|
| `input_fit` | `sufficient`：现有中文、英文框架与上下文足以稳定评价；`frame_limited`：用户自己的表达框架限制了可表达范围；`not_scorable`：样本或金标冲突，当前不应给模型记分 |
| `expected_action` | `provide_expression` 或 `request_focus`；它是该样本的默认教学策略，不是由 `span_scope` 自动推导 |
| `reference_focus_options_zh` | `request_focus` 的参考切分；Judge 不要求逐字等于参考，但模型选项必须满足连续、不重叠、有意义等契约 |
| `probe_focus_zh` | 离线测试第二阶段时模拟用户点选的一项；必须原样属于 `source_zh`，但不代表真实用户偏好 |
| `route_note_zh` | 说明为什么直给仍保留组句工作，或为什么应先聚焦 |

`provide_expression` 项的 `reference_focus_options_zh` 为空，`probe_focus_zh` 等于 `source_zh`。

## 两个检查点

### A. 初轮帮助路由

被测模型看到：

```text
task_prompt
full_essay
target_sentence
interaction_phase=initial
```

Judge 额外看到：

```text
segments.source_zh
segments.intent_zh
must_not_add
input_fit
expected_action
reference_focus_options_zh
```

### B. 选定卡点后的表达支架

被测模型额外看到：

```text
interaction_phase=selected_focus
selected_focus.sourceZh
selected_focus.focusZh
```

其中 `selected_focus.focusZh` 来自 `probe_focus_zh`。Judge 仍可读取语义金标与禁止新增内容，但不得把 `probe_focus_zh` 当作真实用户选择证据。

## 输入问题的处理

- 英文框架限制表达能力，本身不是模型错误。
- 如果允许正常的词序移动、词形变化、冠词或介词补充后仍存在可用表达，则 `input_fit` 仍为 `sufficient`。
- 只有样本无法稳定判断，或金标要求超出现有中文和上下文时，才标 `frame_limited / not_scorable`。
- `not_scorable` 记录为 `not_scored_input_issue`，不得混入模型 bad case 率。

## 数据隔离

| 数据 | 被测模型 | Judge | 实验后切片 |
|---|---:|---:|---:|
| 题目、全文、目标句 | 是 | 是 | 是 |
| 用户已选聚焦项 | 仅第二阶段 | 是 | 是 |
| `intent_zh`、`must_not_add` | 否 | 是 | 是 |
| `expected_action`、参考聚焦项 | 否 | 是 | 是 |
| `slot_function`、`span_scope` | 否 | 否 | 是 |
| `case_type`、`source_type` | 否 | 否 | 是 |

先锁定评分，再合并分类标签。分类只用于观察切片，不用于预判某类必然失败。
