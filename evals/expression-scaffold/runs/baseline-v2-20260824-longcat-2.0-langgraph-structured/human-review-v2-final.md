# v2 baseline Judge 人工复核清单

- 运行：`baseline-v2-20260824-longcat-2.0-langgraph-structured`
- 状态：Judge 预筛完成，待人工校准
- 限制：baseline 与 Judge 都使用 LongCat-2.0；输入上下文相互隔离，但仍存在同模型自评偏差。
- 复核范围：2 个非通过 item/阶段；另需抽检部分 pass。

Judge 记录不能覆盖人工结论。请从实际输出判断语义、自然度、帮助剂量和下一步是否清楚。

## 总览

| case / item | 阶段 | Judge 结论 | 四维（语义/支架/剂量/继续） | 协议问题 | Judge 理由 |
|---|---|---|---|---|---|
| LT-ESC-005 / 1 | initial | bad_case | 2/2/1/2 | action 类型为 request_focus，与 expected_action provide_expression 不符；focus option '缩小差距' 不是 source_zh 的连续子串；runner_contract_validation_error | 模型应提供表达支架却返回 request_focus；focus option '缩小差距' 不是源句连续子串，违反协议；帮助剂量与预期动作完全不匹配 |
| LT-ESC-018 / 1 | selected_focus | bad_case | 1/1/1/1 | 聚焦项数量不在2—4范围内 | focusZh 仅包含一个片段“长期经营的公司”，数量为1，不符合协议要求的2—4个聚焦项，构成硬失败。 |

## 1. LT-ESC-005 / item 1 / initial

- 中文目标：`缩小城乡学生在获取教学资源方面的差距`
- 已选聚焦：无（初轮）
- 预期动作：`provide_expression`
- 实际输出：`{"output":{"items":[{"sourceZh":"缩小城乡学生在获取教学资源方面的差距","action":"request_focus","focusZh":null,"recommendedExpression":null,"focusOptionsZh":["缩小差距","城乡学生","获取教学资源"]}]},"runner_error":{"stage":"contract_validation","type":"OutputContractError","message":"item 1: focus option is not an exact substring"}}`
- 协议问题：action 类型为 request_focus，与 expected_action provide_expression 不符；focus option '缩小差距' 不是 source_zh 的连续子串；runner_contract_validation_error
- Judge 理由：模型应提供表达支架却返回 request_focus；focus option '缩小差距' 不是源句连续子串，违反协议；帮助剂量与预期动作完全不匹配
- 人工结论：`待填写`
- 人工理由：

## 2. LT-ESC-018 / item 1 / selected_focus

- 中文目标：`降低企业税是否真的能吸引长期经营的公司`
- 已选聚焦：`长期经营的公司`
- 预期动作：`provide_expression`
- 实际输出：`{"output":{"items":[{"sourceZh":"降低企业税是否真的能吸引长期经营的公司","action":"provide_expression","focusZh":"长期经营的公司","recommendedExpression":"companies that operate on a long-term basis","focusOptionsZh":[]}]}}`
- 协议问题：聚焦项数量不在2—4范围内
- Judge 理由：focusZh 仅包含一个片段“长期经营的公司”，数量为1，不符合协议要求的2—4个聚焦项，构成硬失败。
- 人工结论：`待填写`
- 人工理由：

## 批次汇总（仅 Judge 预筛）

```json
{
  "status": "judge_prescreen_only_human_review_required",
  "sameModelJudge": true,
  "judgeFailedCalls": 5,
  "scoredItemPhases": 29,
  "phaseResults": {
    "initial": {
      "pass": 22,
      "bad_case": 1
    },
    "selected_focus": {
      "pass": 5,
      "bad_case": 1
    }
  },
  "caseResults": {
    "pass": 17,
    "bad_case": 2
  },
  "caseResultById": {
    "LT-ESC-001": "pass",
    "LT-ESC-002": "pass",
    "LT-ESC-003": "pass",
    "LT-ESC-004": "pass",
    "LT-ESC-005": "bad_case",
    "LT-ESC-006": "pass",
    "LT-ESC-007": "pass",
    "LT-ESC-008": "pass",
    "LT-ESC-009": "pass",
    "LT-ESC-010": "pass",
    "LT-ESC-012": "pass",
    "LT-ESC-013": "pass",
    "LT-ESC-015": "pass",
    "LT-ESC-016": "pass",
    "LT-ESC-017": "pass",
    "LT-ESC-018": "bad_case",
    "LT-ESC-019": "pass",
    "LT-ESC-020": "pass",
    "LT-ESC-021": "pass"
  },
  "dimensionDistributions": {
    "assistance_calibration": {
      "1": 2,
      "3": 27
    },
    "scaffold_quality": {
      "1": 1,
      "2": 1,
      "3": 27
    },
    "semantic_fidelity": {
      "1": 1,
      "2": 1,
      "3": 27
    },
    "user_continuability": {
      "1": 1,
      "2": 1,
      "3": 27
    }
  },
  "protocolFailureItems": 2,
  "humanReviewItems": 2,
  "judgeRecovery": {
    "originalFailedCalls": 9,
    "retrySucceeded": 4,
    "retryFailed": 5,
    "method": "plain_json_once"
  }
}
```
