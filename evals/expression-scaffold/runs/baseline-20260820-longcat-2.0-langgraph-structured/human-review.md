# 首轮 baseline 人工复核清单

- 运行：`baseline-20260820-longcat-2.0-langgraph-structured`
- 状态：待用户审核
- 复核范围：1 个 `bad_case`、6 个 `needs_improvement`
- 目的：校准 LLM Judge，确认哪些问题是真实失败，再进入失败模式归纳与下一轮单变量实验。

本文件只新增人工复核记录，不修改冻结样本、模型输出或 Judge 原始评分。

## 你只需要怎么审

每条先看“目标句、表达意图、模型输出和接回原句后的效果”，再判断 Judge 是否合理。可直接在每条末尾填写，也可以在对话中按 `case_id + 结论 + 简短理由` 回复。

人工结论只选一项：

- `同意 Judge`
- `改为 pass`
- `改为 needs_improvement`
- `改为 bad_case`
- `暂不确定`

## 总览

| 顺序 | case_id | Judge 结论 | 三维评分（语义 / 支架 / 可继续） | Judge 认为的问题 |
|---:|---|---|---|---|
| 1 | LT-ESC-020 | bad_case | 3 / 1 / 3 | 一个连续中文片段被拆成三项，违反一片段一结果 |
| 2 | LT-ESC-001 | needs_improvement | 2 / 2 / 2 | `public accessibility` 没有说清公共交通可使用性 |
| 3 | LT-ESC-007 | needs_improvement | 3 / 2 / 2 | 表达放回原位置后词序不成立 |
| 4 | LT-ESC-010 | needs_improvement | 2 / 3 / 3 | `sense of stability` 没有明确财务安全感 |
| 5 | LT-ESC-021 | needs_improvement | 3 / 2 / 2 | `default practice` 搭配生硬 |
| 6 | LT-ESC-016 | needs_improvement | 2 / 2 / 2 | 把“车辆应被保留通行条件”写成“车辆维持通行” |
| 7 | LT-ESC-018 | needs_improvement | 2 / 2 / 2 | `long-term businesses` 没说清愿意长期留在当地经营 |

---

## 1. LT-ESC-020｜Judge：bad_case

### 核心判断材料

- 目标句：`When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步.`
- 唯一中文片段：`额外的辅导时间不会自动转化为相称的学习进步`
- 表达意图：增加辅导时长不保证带来与增加幅度相称的真实学习进步，但不否定辅导可能有效。

模型返回了三项：

| sourceZh | recommendedExpression |
|---|---|
| 额外的辅导时间 | extra tutoring time |
| 不会自动转化为 | does not automatically translate into |
| 相称的学习进步 | commensurate learning progress |

如果把三段英文顺序拼回去，语义基本成立：

> When competition becomes detached from learning, extra tutoring time does not automatically translate into commensurate learning progress.

### Judge 判断

- 评分：语义 3 / 支架 1 / 可继续 3
- 结论：`bad_case`
- 理由：输入只有一个连续中文片段，模型却拆成三项；三项 `sourceZh` 均未原样对应输入片段，违反“一片段一项”和原样对应要求。
- 失败类型：单一中文片段被拆成三项

### 完整上下文与边界

- 题目：Competition helps children perform better at school. To what extent do you agree or disagree?
- 全文：Moderate competition can motivate students when success depends on clear learning goals. The effect becomes harmful when parents add more tutoring only because other families are doing the same, even though students gain little from the extra hours. When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步. Schools should therefore reward progress and understanding instead of simply increasing workload.
- 不应新增：学生患心理疾病、家长恶意攀比、考试制度是唯一原因、额外投入完全没有任何作用或学校必须取消竞争。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 2. LT-ESC-001｜Judge：needs_improvement

### 核心判断材料

- 目标句：`Expanding the metro network can improve 公众可达性, especially for residents on the outskirts.`
- 中文片段：`公众可达性`
- 表达意图：让普通居民，尤其是住在城市外围的人，更容易到达或使用公共交通服务。
- 模型输出：`public accessibility`

接回原句：

> Expanding the metro network can improve public accessibility, especially for residents on the outskirts.

### Judge 判断

- 评分：语义 2 / 支架 2 / 可继续 2
- 结论：`needs_improvement`
- 理由：`public accessibility` 大体指向公众可达性，但没有明确体现普通居民更容易使用公共交通服务，接入原句后的英文含义也较含混。

### 完整上下文与边界

- 题目：Some people think governments should spend more money on public transport, while others believe building more roads is more important. Discuss both views and give your opinion.
- 全文：Urban governments must decide how to respond to growing travel demand. New roads may reduce congestion for a short period and are useful in places that lack basic connections. However, they also encourage more people to drive. I believe public transport should receive greater investment. Expanding the metro network can improve 公众可达性, especially for residents on the outskirts. It would give these residents a realistic alternative to private cars.
- 不应新增：无障碍设施、残障人士专用可达性、票价下降、减排效果或新的政策论点。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 3. LT-ESC-007｜Judge：needs_improvement

### 核心判断材料

- 目标句：`Local authorities should protect 由当地居民经营的 shops that serve residents as well as visitors.`
- 中文片段：`由当地居民经营的`
- 表达意图：商店由当地居民实际经营；强调经营者来自当地，不等于商店只是位于该社区，也不要求由社区集体所有。
- 模型输出：`run by local residents`

按原位置直接接回：

> Local authorities should protect run by local residents shops that serve residents as well as visitors.

### Judge 判断

- 评分：语义 3 / 支架 2 / 可继续 2
- 结论：`needs_improvement`
- 理由：表达准确，但原中文位于 `shops` 前，直接接入会形成 `run by local residents shops`，需要用户调整词序或表达形式。

### 完整上下文与边界

- 题目：International tourism brings benefits to many places, but it can also cause problems. Discuss both views and give your opinion.
- 全文：Tourism creates jobs and gives small businesses access to customers from outside the region. However, rapid commercial change can also alter the social fabric of a neighbourhood. When family-run shops are replaced by international chains, everyday ties between residents and local businesses may weaken. Local authorities should protect 由当地居民经营的 shops that serve residents as well as visitors. Such support can preserve familiar meeting places without excluding tourists.
- 不应新增：居民被迫搬走、房价上涨、当地文化完全消失、游客行为不文明，或断言这类商店一定更便宜。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 4. LT-ESC-010｜Judge：needs_improvement

### 核心判断材料

- 目标句：`This would give workers a stronger 稳定感.`
- 中文片段：`稳定感`
- 表达意图：因最低收入使月收入更可预测而产生的财务安全感，不是情绪稳定、长期劳动合同或永久的工作稳定。
- 模型输出：`sense of stability`

接回原句：

> This would give workers a stronger sense of stability.

### Judge 判断

- 评分：语义 2 / 支架 3 / 可继续 3
- 结论：`needs_improvement`
- 理由：表达可以自然接入，但含义较宽，没有明确体现因收入可预测而产生的财务安全感。

### 完整上下文与边界

- 题目：The growth of short-term and freelance work has more advantages than disadvantages. Discuss both views and give your opinion.
- 全文：Freelance work offers flexibility, but irregular income makes basic planning difficult. Workers may not know whether the next month's earnings will cover rent, food, and childcare. A limited income floor could make monthly earnings more predictable. This would give workers a stronger 稳定感. Such a floor could reduce uncertainty without removing all flexibility from freelance work.
- 不应新增：获得长期劳动合同、工作永久稳定、收入提高或压力完全消失。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 5. LT-ESC-021｜Judge：needs_improvement

### 核心判断材料

- 目标句：`Over time, this could become their 默认做法.`
- 中文片段：`默认做法`
- 表达意图：学生逐渐把先采用生成答案当作处理题目的惯常做法；这里不是软件的默认设置，也不等于断言学生作弊。
- 模型输出：`default practice`

接回原句：

> Over time, this could become their default practice.

### Judge 判断

- 评分：语义 3 / 支架 2 / 可继续 2
- 结论：`needs_improvement`
- 理由：结合上下文可以理解为学生惯常采用生成答案，但 `default practice` 在这里搭配生硬，需要换成更自然的“惯常做法”表达。

### 完整上下文与边界

- 题目：Artificial intelligence tools should be widely used in schools. Do the advantages outweigh the disadvantages?
- 全文：AI tools can explain difficult concepts and provide quick feedback. However, their educational value depends on whether students still attempt the work themselves. Some students may turn to generated answers before trying a question on their own. Over time, this could become their 默认做法. Teachers should therefore require students to show how they reached a conclusion.
- 不应新增：学生作弊、AI 答案一定错误、学生失去创造力、软件默认设置或学校应禁止 AI。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 6. LT-ESC-016｜Judge：needs_improvement

### 核心判断材料

- 目标句：`综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便.`

模型输出：

| 中文片段 | 英文表达 |
|---|---|
| 综合来看 | Overall |
| 步行空间可以支持本地商业，而必要车辆仍需保持通行 | pedestrian spaces can support local businesses, while necessary vehicles still need to maintain access |
| 重新分配道路空间可能会在短期内造成不便 | redistributing road space may cause inconvenience in the short term |

接回原句：

> Overall, city planners should recognise that pedestrian spaces can support local businesses, while necessary vehicles still need to maintain access, even if redistributing road space may cause inconvenience in the short term.

### Judge 判断

- 评分：语义 2 / 支架 2 / 可继续 2
- 结论：`needs_improvement`
- 理由：第一项和第三项准确；第二项的 `vehicles still need to maintain access` 把车辆写成“维持通行”的一方，没有自然表达“必要车辆应被保留通行条件”，需要明显修改。

### 完整意图、上下文与边界

- `综合来看`：汇总前文对步行空间、商业需求和必要车辆通行的权衡，不表示由单一事实推出结论。
- 第二片段：步行空间可能有利于本地商业，同时送货等必要车辆仍需要保留通行条件。
- 第三片段：把部分道路空间改作步行空间，可能在调整初期给相关使用者带来不便。
- 题目：City centres should be designed mainly for pedestrians rather than cars. To what extent do you agree or disagree?
- 全文：Businesses need deliveries and some residents cannot avoid travelling by car, so a total ban would be impractical. Even so, city centres should give more space to people walking and spending time in public areas. Any redesign will require adjustment from drivers and businesses. 综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便. This approach gives pedestrians priority without removing all vehicle access.
- 不应新增：完全禁车、建设自行车道、保证商家销售增长、改善空气质量、提升游客体验或造成永久性损害。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 7. LT-ESC-018｜Judge：needs_improvement

### 核心判断材料

- 目标句：`降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates.`
- 中文片段：`降低企业税是否真的能吸引长期经营的公司`
- 表达意图：对降低企业税能否真正吸引愿意长期经营的公司保持疑问，不预先断言政策有效。
- 模型输出：`Whether reducing business taxes can really attract long-term businesses`

接回原句：

> Whether reducing business taxes can really attract long-term businesses remains uncertain because infrastructure and workforce skills may matter as much as tax rates.

### Judge 判断

- 评分：语义 2 / 支架 2 / 可继续 2
- 结论：`needs_improvement`
- 理由：输出保留了疑问，但 `long-term businesses` 含义不够明确，没有清楚表达“愿意在当地长期经营的公司”。

### 完整上下文与边界

- 题目：Some local governments reduce business taxes to attract companies. Is this a positive or negative development?
- 全文：Reducing business taxes may make one city more attractive than competing locations, but it also lowers public revenue. Firms consider several factors before committing to a place for many years. 降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates. Local governments should therefore assess tax cuts against their effect on public services.
- 不应新增：创造就业、提高工资、增加长期税收、保证公司迁入或保证当地居民受益。

### 你的审核

- 人工结论：`待填写`
- 人工评分（可选）：语义 `_ / 3`；支架 `_ / 3`；可继续 `_ / 3`
- 人工理由：

---

## 审核完成后的门槛

只有完成以下事项，才进入下一阶段：

1. 7 条非通过案例都有人工结论；
2. 至少抽检部分 `pass` 案例，避免 Judge 只会挑错但会漏错；
3. 人机不一致处以人工结论为准，并记录是否需要调整 Judge Prompt；
4. 只根据人工确认的真实问题归纳失败模式；
5. 下一轮只选择一个主要变量进行修改，并在同一冻结评测集上复测。

推荐回复格式：

```text
LT-ESC-020：同意 Judge。理由：……
LT-ESC-001：改为 pass。理由：……
……
```
