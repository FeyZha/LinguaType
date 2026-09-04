# expression-scaffold.dev.v2

状态：`frozen`。LongCat-2.0 baseline、Codex 子 Agent 预审和 7 个非通过项的用户人工校准均已完成。最终离线分布为 29 pass、5 needs improvement、1 bad case；这不是实际用户效果。

人工校准推翻了 `LT-ESC-005` 的机器 bad case：小粒度中文语义支架是产品希望提供的最小可用单元，聚焦项不应被机械限制为连续原文。因此 v2 只作为已完成的历史评测版本保留；规则修正必须创建新的 `eval_set_id`，不得回写本目录的冻结 canonical files。

## 为什么需要 v2

v1 的规则存在四个相互牵扯的问题：

| v1 规则 | 实际后果 |
|---|---|
| 强调原位替换 | 把合理的词序移动误判为不可继续 |
| 允许中文分句对应英文分句 | 容易直接交付完整命题 |
| 禁止拆分连续中文 | 无法区分“让用户聚焦”与“把答案拆开给齐” |
| 可继续性强调改动越少越好 | 越接近完整答案，反而越容易得高分 |

v2 改成两步：先决定帮助粒度，再评价具体支架。

```text
初次处理目标句
├─ 词、短语或不可再拆的功能块 → 一个英文表达
└─ 完整命题或多命题 → 2—4 个中文聚焦项，不给英文
                                  ↓
                         用户选择一个聚焦项
                                  ↓
                         只给该项一个英文表达
```

## 当前文件

| 文件 | 作用 |
|---|---|
| [model-output.md](./model-output.md) | 两个阶段分别返回什么，以及字段间约束 |
| [model-output.schema.json](./model-output.schema.json) | 可机械验证的基础 JSON 结构 |
| [case-schema.md](./case-schema.md) | v2 新增的路由与后续轮次字段 |
| [cases.md](./cases.md) | v1 的 20 条样本如何迁移为 15 个直给项和 10 个先聚焦项 |
| [rubric.md](./rubric.md) | 逐 item 四维评价与硬失败 |
| [scoring.md](./scoring.md) | 两个检查点如何记分、汇总和复测 |
| [review.md](./review.md) | 首轮人工反馈如何转化为 v2 规则 |
| [validate-v2.mjs](./validate-v2.mjs) | 如何机械检查迁移数量、聚焦项和契约关键词 |
| [freeze-manifest.json](./freeze-manifest.json) | v2 版本、父评测集与 canonical 文件指纹 |

Prompt 位于：

- [`../../prompts/baseline-v2.md`](../../prompts/baseline-v2.md)
- [`../../prompts/judge-v2.md`](../../prompts/judge-v2.md)

## 证据边界

- v2 继承 v1 的 20 条题目、全文、目标句和语义金标，只新增帮助策略；父 manifest 的指纹已被 v2 manifest 锁定。这些样本仍以 AI 初拟为主。
- `expected_action` 和参考聚焦项是离线产品设计，不代表真实用户一定会选择该卡点。
- v1 的 `13 pass / 6 needs improvement / 1 bad case` 不能迁移为 v2 结论，也不能与未来 v2 baseline 直接声称为效果提升。
- 10 个 `request_focus` 项已各自配置一个离线 `probe_focus_zh`；它只用于模拟第二阶段，不代表真实用户选择。

## 当前运行门槛

1. 同时通过 v1 与 v2 冻结指纹校验；
2. 通过 v2 路由数量、聚焦项与契约校验；
3. runner 的 `--validate-only` 通过；
4. 正式 run 目录不存在，避免覆盖旧产物；
5. initial 20 条与 selected-focus 10 条分别完整保存。

当前工作版可先执行：

```text
node evals/expression-scaffold/eval-sets/expression-scaffold.dev.v2/validate-v2.mjs
```

## 已保存 baseline

`baseline-v2-20260824-longcat-2.0-langgraph-structured`：20 次 initial 与 10 次 selected-focus 均取得响应；29 次通过运行与协议校验，`LT-ESC-005` 有 1 次连续子片段协议失败。详细计数与版本指纹见该 run 的 `run-manifest.json`。
