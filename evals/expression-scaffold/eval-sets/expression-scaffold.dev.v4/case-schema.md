# v4 样本与交互字段

## 冻结样本字段

题目、全文、目标句、`source_zh`、`intent_zh` 和 `must_not_add` 继承 v1。v4 overlay 为每个顶层片段增加：

```text
expected_action: provide_expression | offer_scaffolds
reference_focus_units_zh: string[]
focus_trace_policy: none | exact_spans | semantic_units
```

`reference_focus_units_zh` 是审核参考，不是唯一正确输出。

## 单次运行记录

```json
{
  "case_id": "LT-ESC-005",
  "output": {}
}
```

每个 case 只有一条模型调用记录。不存在 `interaction_phase`、`selected_focus` 或文字探针。

## 用户可见状态

模型原始输出是内部支架包。界面状态另行维护：

```json
{
  "revealedScaffoldIds": ["s1", "s3"]
}
```

- 首次渲染：复杂项只投影 `scaffoldId` 与 `focusZh`。
- 点击后：仅为已点击 id 投影其 `recommendedExpression`。
- 多个 id 可以同时处于已揭示状态。
- 状态变化不修改模型原始输出，也不产生模型调用。

