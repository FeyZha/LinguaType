# 已废弃：LongCat 同模型 Judge 人工复核清单

> 2026-08-24 用户否决了生成模型自评方案。本文件只保留历史过程，不再作为当前质量审核入口。当前入口为 `codex-subagent-review.md`。

- 运行：`baseline-v2-20260824-longcat-2.0-langgraph-structured`
- 状态：Judge 预筛已结束，待人工校准
- 覆盖：35 个应评分 item/阶段中 33 个完成，2 个 Judge 未评分
- 限制：baseline 与 Judge 都使用 LongCat-2.0；输入相互隔离，但同模型自评偏差明显

下面不把 Judge 结果当最终结论。复核对象分为：模型真实失败候选、Judge 误判候选、Judge 漏判候选和 Judge 未评分项。

## A. 模型真实失败候选

### LT-ESC-005 / initial

- 中文目标：`缩小城乡学生在获取教学资源方面的差距`
- v2 预期：直接给一个英文表达
- 实际：返回聚焦项 `缩小差距 / 城乡学生 / 获取教学资源`
- 问题：动作与金标不一致；其中 `缩小差距` 不是原中文的连续子片段
- Judge：`bad_case`，四维 `2 / 2 / 1 / 2`
- 人工结论：`待填写`
- 人工理由：

## B. Judge 误判候选

### LT-ESC-018 / selected_focus

- 用户已选：`长期经营的公司`
- 实际支架：`companies that operate on a long-term basis`
- Judge：`bad_case`，理由是“只有一个聚焦项，不满足 2—4 项”
- 校准问题：2—4 项规则只适用于初轮 `request_focus`；选中后本来就应只返回一个英文支架。Judge 把初轮规则错误套到第二阶段
- 人工建议：优先考虑改为 `pass`；只需再判断英文是否自然保留“长期经营”的含义
- 人工结论：`待填写`
- 人工理由：

## C. Judge 漏判候选

### LT-ESC-021 / initial

- 中文目标：`默认做法`
- 实际支架：`default practice`
- Judge：`pass`
- 复核原因：含义能懂，但搭配有翻译腔；若 `common routine` 等更符合日常表达习惯，应记为支架质量待改进
- 人工建议：优先考虑 `needs_improvement`
- 人工结论：`待填写`
- 人工理由：

### LT-ESC-016 / item 2 / initial

- 中文目标：`步行空间可以支持本地商业，而必要车辆仍需保持通行`
- 实际聚焦项：`步行空间可以支持本地商业 / 必要车辆仍需保持通行`
- Judge：`pass`
- 复核原因：两个选项各自接近完整小句；用户选择后仍可能直接获得整段小句答案，粒度是否足够细需要人工判断
- 人工建议：在 `pass` 与 `needs_improvement` 之间校准
- 人工结论：`待填写`
- 人工理由：

### LT-ESC-016 / item 2 / selected_focus

- 用户已选：`保持通行`
- 实际支架：`remain accessible`
- Judge：`pass`
- 复核原因：原意是让必要车辆继续拥有通行条件；`remain accessible` 更容易理解为“车辆仍可被接近/使用”，可能应改为 `retain access` 或同类表达
- 人工建议：优先考虑 `needs_improvement`
- 人工结论：`待填写`
- 人工理由：

## D. Judge 未评分，但 baseline 输出可人工直审

### LT-ESC-013 / selected_focus

- 用户已选：`是否仍有必要`
- 实际支架：`whether they remain necessary`
- Judge 状态：连续三种结构恢复均失败，因此不计入模型统计
- 人工复核点：`they` 在当前安装位置是否有清楚指代；是否比带主语空位的表达更容易继续写
- 人工结论：`待填写`
- 人工理由：

### LT-ESC-020 / selected_focus

- 用户已选：`不会自动转化为`
- 实际支架：`do not automatically translate into`
- Judge 状态：连续三种结构恢复均失败，因此不计入模型统计
- 人工复核点：核心搭配正确；主语是单数时需要用户把 `do` 调整为 `does`，这通常属于允许的词形安装动作
- 人工建议：优先考虑 `pass`
- 人工结论：`待填写`
- 人工理由：

## 当前只可陈述的批次结果

- 确定的运行事实：30 次 baseline 调用全部得到模型响应，1 次初轮协议失败。
- Judge 预筛：33 / 35 个 item/阶段得到分数；原始记录为 31 pass、2 bad case、2 未评分。
- 经人工预查，2 个 Judge bad case 中至少 1 个疑似 Judge 误判；同时发现 3 个 Judge pass 值得复核。
- 在用户完成上述 7 项人工判断前，不形成模型质量通过率，也不归纳最终失败模式。
