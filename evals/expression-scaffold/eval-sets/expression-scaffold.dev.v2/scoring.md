# v2 打分、汇总与复测

## 1. 两个检查点分开报告

v2 不再用一个总分掩盖链路问题：

| 检查点 | 输入 | 主要判断 |
|---|---|---|
| A `initial_targeting` | 原始中英混合句 | 是否直给或先聚焦；聚焦项是否可用且不泄漏答案 |
| B `selected_focus_support` | 用户已选的一个 `focusZh` | 是否只给该项一个自然、适量、可安装的英文支架 |

`provide_expression` 项在检查点 A 已经包含英文支架，可同时完成四维评分。`request_focus` 项必须再用 `probe_focus_zh` 运行检查点 B；只会让用户选择，不代表整条链路已经验证。

## 2. 单条 item 记录

```json
{
  "eval_set_id": "expression-scaffold.dev.v2",
  "run_id": "...",
  "case_id": "LT-ESC-020",
  "item_index": 1,
  "interaction_phase": "initial",
  "source_zh": "额外的辅导时间不会自动转化为相称的学习进步",
  "selected_focus_zh": null,
  "input_fit": "sufficient",
  "expected_action": "request_focus",
  "system_output": {},
  "protocol_violations": [],
  "scores": {
    "semantic_fidelity": 3,
    "scaffold_quality": 3,
    "assistance_calibration": 3,
    "user_continuability": 3
  },
  "item_result": "pass",
  "judge_reason_zh": "",
  "human_result": null,
  "human_note_zh": null
}
```

每个理由必须指出实际输出中的可观察事实，不写“模型大概没有理解”等不可验证归因。

## 3. 结论推导

单 item：

- 任一协议硬失败或任一维度为 1 → `bad_case`；
- 无 1、至少一维为 2 → `needs_improvement`；
- 四维均为 3 → `pass`；
- 输入不可稳定评价 → `not_scored_input_issue`。

单 case：取所有 item、所有已执行阶段中的最差结论，不求平均。

```text
bad_case > needs_improvement > pass
```

若存在 `not_scored_input_issue`，该 item 从模型统计中排除并单列；不要把它当 pass，也不要计入 bad case 分母。若该 case 还有其他可评分 item，可以保留这些 item 的结果，但 case 总结必须标明输入问题。

## 4. 批次元数据

每次运行至少保存：

```text
eval_set_id
output_schema_version
rubric_version
run_id
started_at
status
provider
model
model_parameters
prompt_version
prompt_sha256
judge_model
judge_prompt_version
judge_prompt_sha256
interaction_phases_run
expected_case_count
completed_case_count
failed_call_count
change_summary
```

失败调用单独计数，不得悄悄省略。不得保存 API Key、完整请求头或外部 `.env` 内容。

## 5. 报告顺序

先报告链路检查点，再报告 case 结论：

1. A 阶段：动作命中分布、聚焦协议硬失败、逐 item 结论；
2. B 阶段：10 个探针是否全部运行、逐 item 支架结论；
3. 20 case 的最差项结论分布；
4. 人工复核后的 Judge 一致与不一致；
5. 评分锁定后，再按 `slot_function × span_scope` 切片。

不把四维分数相加成总分；如需看趋势，分别报告每一维的 1 / 2 / 3 分布。

## 6. 人机校准

- 人工复核全部协议硬失败、所有 1 分和 2 分，并抽检部分全 3 item。
- 人工优先检查 Judge 是否把 `intent_zh` 当成逐字清单、是否误罚合理的词序移动、是否漏判过量帮助。
- 人机不一致时保留 Judge 原始记录，另写 `human_result` 与事实理由，不覆盖原评分。
- 只有完成校准，才能归纳失败模式；失败模式来自真实输出，不从样本标签预填。

## 7. 版本比较

- v1 与 v2 的任务定义、输出 schema 和 rubric 都不同，只能做历史对照，不能声称数值提升。
- v2 首次运行建立新的 baseline。
- 此后只有在相同 `expression-scaffold.dev.v2`、相同 rubric、相同模型参数下只改变一个主要变量，才可做直接复测比较。
- 真实用户效果必须来自后续写作测试，不得由离线分数替代。
