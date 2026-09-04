# v4 上下文消融隔离语义盲审摘要

## 审核边界

- 审核对象：`blind-review-inputs.jsonl` 中 60 个匿名 candidate。
- 审核角色：`semantic`。
- 依据：v4 `rubric.md` 与 `model-output.md`。
- 未读取或使用 blind map、自动汇总、比较 manifest、A/B/C run 目录及旧 Judge / 人工结论。
- 该结果是离线独立模型预审，不能替代用户人工校准，也不能证明真实用户效果。

## 结论分布

| 结论 | 数量 |
|---|---:|
| `pass` | 25 |
| `needs_improvement` | 15 |
| `bad_case` | 20 |
| `not_scored_input_issue` | 0 |
| 合计 | 60 |

其中 3 个 candidate 触发明确的顶层 `sourceZh` 契约硬门槛：

- `review-015-1`
- `review-016-2`
- `review-020-2`

三者均按 `TOP_LEVEL_SOURCE_CONTRACT_ERROR` 判为 `bad_case`，未因其英文片段局部可用而放宽。

## 主要发现

1. **语义力度遗漏是最危险的问题。** 若支架漏掉“可以”“可能”“也可能”等信息，原本有条件或不确定的关系会被强化成直接陈述；这类问题按 `semantic_fidelity = 1` 处理。
2. **主体客体不能靠用户自行猜回。** 遗漏“政府/个人”“步行空间/必要车辆”等主体，或让车辆看起来成为“维持通行”的施事，会破坏责任或动作关系。
3. **机械拆词不等于分层支架。** 多个输出虽然逐块都翻译正确，但若全部揭示后只需按原顺序拼接，仍按帮助过量处理，通常落到 `assistance_calibration = 1` 与 `user_composability = 1`。
4. **局部上下文歧义仍会影响英文自然度。** `public accessibility`、`sense of stability`、`default practice`、`long-term operating companies` 等表达大体可懂，但范围不够明确或搭配不够自然，因此进入 `needs_improvement`。
5. **保留疑问、否定和范围的候选更稳定。** `not necessarily`、`do not automatically translate into` 等能准确维持原文立场；但如果整组已经穷尽拆出完整命题，语义正确也不能抵消代写风险。

## 人工校准建议

优先复核全部 20 个 `bad_case`，尤其检查：

- “可能 / 可以 / 不一定 / 不会自动”等力度词是否被完整保留；
- 支架中的施事、受事和责任归属是否明确；
- 全部支架揭示后，用户是否仍需做真实的取舍与组句，而不是机械拼接。

随后抽检 `needs_improvement` 中涉及英语搭配的 candidate，以统一“略显生硬”与“不可用”的人工尺度。
