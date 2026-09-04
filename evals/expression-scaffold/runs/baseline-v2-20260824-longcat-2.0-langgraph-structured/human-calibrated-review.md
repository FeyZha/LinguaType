# v2 baseline 人工校准结论

## 最终离线分布

| 口径 | pass | needs improvement | bad case |
|---|---:|---:|---:|
| 35 个 item / 阶段 | 29 | 5 | 1 |
| 20 个 case 取最差项 | 15 | 4 | 1 |

本分布来自 Codex 子 Agent 预审加用户对全部 7 个非通过项的人工确认，不代表真实用户效果。

## 1 个机器判断覆盖

### LT-ESC-005：Codex `bad_case` → 人工 `pass`

- 实际输出：`缩小差距 / 城乡学生 / 获取教学资源`
- 人工判断：这种小粒度中文表达支架正是产品希望提供的最小可用单元；较长表达不应被强制整段翻成英文。
- 规则修正：聚焦项需要可追溯到原意，但不必机械要求是原中文的连续子串。
- 归因：这是 v2 金标与协议规则过严，不是模型失败。

冻结 v2 不回写。本结论进入下一评测版本的规则修改候选。

## 5 个确认的 needs improvement

1. `LT-ESC-001 / initial`：`public accessibility` 搭配偏生硬且容易泛化。
2. `LT-ESC-021 / initial`：`default practice` 用于惯常行为时有翻译腔。
3. `LT-ESC-014 / item 2 / initial`：聚焦项包含完整谓语和宾语，粒度偏大。
4. `LT-ESC-016 / item 2 / initial`：两个聚焦项都是完整命题，没有缩小到语言卡点。
5. `LT-ESC-018 / selected_focus`：`companies that operate on a long-term basis` 笨重，未自然体现长期留在当地经营。

## 1 个确认的 bad case

### LT-ESC-016 / item 2 / selected_focus

- 已选：`保持通行`
- 输出：`remain accessible`
- 问题：表达成“仍可被接近或使用”，没有表达车辆继续拥有通行条件。
- 失败维度：语义保持、支架质量、用户可继续性。

## 下一评测版本需要改的不是模型 Prompt

先修评测定义：

1. 允许长表达先返回更小的中文语义支架；
2. 聚焦项不必是连续原文，但必须可追溯、不新增、不改变关系；
3. selected-focus 探针必须由该次 initial 实际选项产生，避免节点探针冒充连续链路。

只有完成新评测版本冻结后，才能在同一新规则下运行下一轮 baseline。
