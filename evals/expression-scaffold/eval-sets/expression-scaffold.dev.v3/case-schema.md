# v3 case 与轨迹字段

## 冻结样本字段

题目、全文、目标句、`source_zh`、`intent_zh` 和 `must_not_add` 继承 v1。v3 overlay 为每个顶层片段增加：

```text
expected_action: provide_expression | request_focus
reference_focus_units_zh: string[]
focus_trace_policy: none | exact_spans | semantic_units
```

`reference_focus_units_zh` 是人工审核参考，不是唯一正确输出。

## initial 运行记录

```json
{
  "case_id": "LT-ESC-005",
  "interaction_phase": "initial",
  "output": {}
}
```

## 实际路径选择记录

每个实际 `request_focus` item 产生一条选择记录：

```json
{
  "case_id": "LT-ESC-005",
  "segment_index": 1,
  "selection_source": "actual_initial_output",
  "selection_policy": "first_focus_option",
  "selected_focus": {
    "sourceZh": "缩小城乡学生在获取教学资源方面的差距",
    "focusZh": "缩小差距"
  }
}
```

`selected_focus.focusZh` 必须与同一 run、同一 case、同一 item 的 initial `focusOptionsZh[0]` 完全一致。否则不能记为端到端轨迹。

## selected-focus 运行记录

```json
{
  "case_id": "LT-ESC-005",
  "interaction_phase": "selected_focus",
  "segment_index": 1,
  "selection_source": "actual_initial_output",
  "selection_policy": "first_focus_option",
  "selected_focus": {},
  "output": {}
}
```

节点能力探针如果未来需要，必须使用独立 `runType` 和独立报告，不能混入本主链运行。
