# 评测集本体 v0.3

本文件只保存样本定义和事实性分类，不保存模型输出、评分、失败类型或复测结果。

## 批次信息

- 样本数量：20 条。
- 中文片段数量：25 个。
- `case_type` 分布：高频常规 8 条、语境依赖 3 条、复杂混写 4 条、边界 case 5 条。
- `eval_set_id`：`expression-scaffold.dev.v1`。
- 当前状态：`frozen`。
- 冻结日期：2026-08-19。
- 冻结指纹见 [`freeze-manifest.json`](./freeze-manifest.json)。
- `full_essay` 表示点击“处理本句”时的全文快照，允许是尚未写完的作文草稿。
- `LT-ESC-001` 为真实中文卡点加 AI 重建上下文；其余样本源自 AI 初拟，已完成静态复审，但仍不是真实用户数据。
- `slot_function` 和 `span_scope` 只描述样本事实，用于覆盖检查和实验后切片。

### slot_function 分布

| 值 | 数量 |
|---|---:|
| `subject` | 3 |
| `predicate` | 5 |
| `object` | 3 |
| `complement` | 5 |
| `noun_modifier` | 2 |
| `adverbial_modifier` | 3 |
| `linker` | 2 |
| `main_clause` | 2 |

### span_scope 分布

| 值 | 数量 |
|---|---:|
| `word_or_phrase` | 15 |
| `clause` | 8 |
| `multi_clause` | 2 |

## 样本

### LT-ESC-001｜高频常规

- `case_type`：`routine`
- `source_type`：`real_fragment_reconstructed_context`
- `task_prompt`：Some people think governments should spend more money on public transport, while others believe building more roads is more important. Discuss both views and give your opinion.
- `full_essay`：

> Urban governments must decide how to respond to growing travel demand. New roads may reduce congestion for a short period and are useful in places that lack basic connections. However, they also encourage more people to drive. I believe public transport should receive greater investment. Expanding the metro network can improve 公众可达性, especially for residents on the outskirts. It would give these residents a realistic alternative to private cars.

- `target_sentence`：Expanding the metro network can improve 公众可达性, especially for residents on the outskirts.
- `segments`：
  - `source_zh`：`公众可达性`
    `intent_zh`：让普通居民，尤其是住在城市外围的人，更容易到达或使用公共交通服务。
    `slot_function`：`object`
    `span_scope`：`word_or_phrase`
- `must_not_add`：无障碍设施、残障人士专用可达性、票价下降、减排效果或新的政策论点。

### LT-ESC-002｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：More employees are asking for flexible working arrangements. Do the advantages of this development outweigh the disadvantages?
- `full_essay`：

> Flexible work can make coordination harder for some teams, especially when employees rarely meet in person. Nevertheless, its benefits are stronger for many households. When both parents work full time, flexible schedules make it easier for them to 承担更多家庭责任. This can reduce conflicts between paid work and duties at home without requiring either parent to leave the labour market.

- `target_sentence`：When both parents work full time, flexible schedules make it easier for them to 承担更多家庭责任.
- `segments`：
  - `source_zh`：`承担更多家庭责任`
    `intent_zh`：在工作之外接手更多家庭层面的责任或任务。
    `slot_function`：`predicate`
    `span_scope`：`word_or_phrase`
- `must_not_add`：默认责任只属于女性、只等于照顾孩子、工作表现提升或家庭关系改善。

### LT-ESC-003｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Some university students work part time while studying. Is this a positive or negative development?
- `full_essay`：

> A limited amount of paid work can teach students how to manage time and money. It is particularly useful for those whose families cannot cover all of their living expenses. Part-time work can 缓解学生的经济压力 without forcing them to leave university. The main risk appears only when working hours become so long that study is neglected.

- `target_sentence`：Part-time work can 缓解学生的经济压力 without forcing them to leave university.
- `segments`：
  - `source_zh`：`缓解学生的经济压力`
    `intent_zh`：减轻学生在求学期间因生活支出承受的财务压力。
    `slot_function`：`predicate`
    `span_scope`：`word_or_phrase`
- `must_not_add`：完全消除经济问题、获得经济独立、积累工作经验或提高就业能力。

### LT-ESC-004｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Some people believe physical education should be compulsory throughout school. To what extent do you agree or disagree?
- `full_essay`：

> Academic subjects deserve substantial classroom time, but this does not justify treating exercise as optional. Regular activity supports children's health and gives them repeated experience of different sports. Regular PE lessons can help children 培养长期锻炼习惯 before they reach adulthood. For this reason, schools should provide consistent physical education rather than occasional sports events.

- `target_sentence`：Regular PE lessons can help children 培养长期锻炼习惯 before they reach adulthood.
- `segments`：
  - `source_zh`：`培养长期锻炼习惯`
    `intent_zh`：逐渐形成并保持长期锻炼的习惯。
    `slot_function`：`predicate`
    `span_scope`：`word_or_phrase`
- `must_not_add`：保证成年后健康、减少肥胖、提升成绩或培养团队精神。

### LT-ESC-005｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Online education is becoming increasingly common. Do its advantages outweigh its disadvantages?
- `full_essay`：

> Online courses cannot fully replace classroom interaction, particularly for younger learners. Even so, they can make scarce teaching resources available beyond large cities. Recorded lessons may therefore 缩小城乡学生在获取教学资源方面的差距. This benefit depends on basic internet access, so online delivery should complement rather than replace investment in rural schools.

- `target_sentence`：Recorded lessons may therefore 缩小城乡学生在获取教学资源方面的差距.
- `segments`：
  - `source_zh`：`缩小城乡学生在获取教学资源方面的差距`
    `intent_zh`：让农村学生更容易获得原本集中在大城市的教学资源，从而缩小城乡学生在资源获取方面的差距。
    `slot_function`：`predicate`
    `span_scope`：`word_or_phrase`
- `must_not_add`：完全消除不平等、保证同等成绩、取代农村学校或解决网络基础设施问题。

### LT-ESC-006｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Schools should teach young people how to manage money. To what extent do you agree or disagree?
- `full_essay`：

> Many teenagers begin using bank accounts before they understand interest, debt, or long-term saving. Parents can provide useful examples, but not every family has the same financial experience. Basic lessons on saving and debt can help teenagers 做出更明智的财务决定. Such lessons should focus on practical choices rather than advanced economic theory.

- `target_sentence`：Basic lessons on saving and debt can help teenagers 做出更明智的财务决定.
- `segments`：
  - `source_zh`：`做出更明智的财务决定`
    `intent_zh`：在储蓄、借贷或消费方面作出信息更充分、更理性的选择。
    `slot_function`：`predicate`
    `span_scope`：`word_or_phrase`
- `must_not_add`：变得富有、避免所有债务、开始投资或获得经济独立。

### LT-ESC-007｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：International tourism brings benefits to many places, but it can also cause problems. Discuss both views and give your opinion.
- `full_essay`：

> Tourism creates jobs and gives small businesses access to customers from outside the region. However, rapid commercial change can also alter the social fabric of a neighbourhood. When family-run shops are replaced by international chains, everyday ties between residents and local businesses may weaken. Local authorities should protect 由当地居民经营的 shops that serve residents as well as visitors. Such support can preserve familiar meeting places without excluding tourists.

- `target_sentence`：Local authorities should protect 由当地居民经营的 shops that serve residents as well as visitors.
- `segments`：
  - `source_zh`：`由当地居民经营的`
    `intent_zh`：商店由当地居民实际经营；强调经营者来自当地，不等于商店只是位于该社区，也不要求由社区集体所有。
    `slot_function`：`noun_modifier`
    `span_scope`：`word_or_phrase`
- `must_not_add`：居民被迫搬走、房价上涨、当地文化完全消失、游客行为不文明，或断言这类商店一定更便宜。

### LT-ESC-008｜高频常规

- `case_type`：`routine`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：A four-day working week should become standard. To what extent do you agree or disagree?
- `full_essay`：

> A shorter week may not suit every industry, particularly services that require continuous staffing. Yet the policy can still work where employees have some control over how their four working days are scheduled. 更大的排班自主权 may improve employee motivation. Employers would still need to monitor workloads so that five days of work are not simply compressed into four.

- `target_sentence`：更大的排班自主权 may improve employee motivation.
- `segments`：
  - `source_zh`：`更大的排班自主权`
    `intent_zh`：员工对自己的上班日期、时段或轮班安排拥有更多决定空间，不包含任务内容或总工时变化。
    `slot_function`：`subject`
    `span_scope`：`word_or_phrase`
- `must_not_add`：生产率必然提高、员工忠诚度提升、缺勤减少、工作时间缩短或企业利润增加。

### LT-ESC-009｜语境依赖

- `case_type`：`context_dependent`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：University education should be free for everyone, regardless of income. To what extent do you agree or disagree?
- `full_essay`：

> Universities need stable funding, so asking some graduates to contribute is not automatically unreasonable. The problem is that high fees affect applicants differently before they have any chance to benefit from a degree. For some capable applicants, this can become a serious 门槛. I therefore support targeted financial assistance rather than the same subsidy for every student.

- `target_sentence`：For some capable applicants, this can become a serious 门槛.
- `segments`：
  - `source_zh`：`门槛`
    `intent_zh`：这里的 this 指前文的高额学费；门槛是阻碍有能力但经济条件较差的申请者进入大学的经济障碍，不是数值阈值或实体门槛。
    `slot_function`：`complement`
    `span_scope`：`word_or_phrase`
- `must_not_add`：这些学生能力不足、大学应对所有人免费、贷款一定有害或教育能够消除贫困。

### LT-ESC-010｜语境依赖

- `case_type`：`context_dependent`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：The growth of short-term and freelance work has more advantages than disadvantages. Discuss both views and give your opinion.
- `full_essay`：

> Freelance work offers flexibility, but irregular income makes basic planning difficult. Workers may not know whether the next month's earnings will cover rent, food, and childcare. A limited income floor could make monthly earnings more predictable. This would give workers a stronger 稳定感. Such a floor could reduce uncertainty without removing all flexibility from freelance work.

- `target_sentence`：This would give workers a stronger 稳定感.
- `segments`：
  - `source_zh`：`稳定感`
    `intent_zh`：因最低收入使月收入更可预测而产生的财务安全感，不是情绪稳定、长期劳动合同或永久的工作稳定。
    `slot_function`：`object`
    `span_scope`：`word_or_phrase`
- `must_not_add`：获得长期劳动合同、工作永久稳定、收入提高或压力完全消失。

### LT-ESC-021｜语境依赖

- `case_type`：`context_dependent`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Artificial intelligence tools should be widely used in schools. Do the advantages outweigh the disadvantages?
- `full_essay`：

> AI tools can explain difficult concepts and provide quick feedback. However, their educational value depends on whether students still attempt the work themselves. Some students may turn to generated answers before trying a question on their own. Over time, this could become their 默认做法. Teachers should therefore require students to show how they reached a conclusion.

- `target_sentence`：Over time, this could become their 默认做法.
- `segments`：
  - `source_zh`：`默认做法`
    `intent_zh`：学生逐渐把先采用生成答案当作处理题目的惯常做法；这里不是软件的默认设置，也不等于断言学生作弊。
    `slot_function`：`complement`
    `span_scope`：`word_or_phrase`
- `must_not_add`：学生作弊、AI 答案一定错误、学生失去创造力、软件默认设置或学校应禁止 AI。

### LT-ESC-012｜边界 case

- `case_type`：`boundary`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Cities should charge drivers who enter crowded city centres. To what extent do you agree or disagree?
- `full_essay`：

> Congestion charges can reduce unnecessary car journeys, but a flat fee does not affect every commuter in the same way. A high-income driver may barely notice it, while a low-income worker with no public transport option may have to pay every day. The policy is 并不一定 inherently unfair, but its burden can still fall unevenly. Any charge should therefore include carefully defined exemptions.

- `target_sentence`：The policy is 并不一定 inherently unfair, but its burden can still fall unevenly.
- `segments`：
  - `source_zh`：`并不一定`
    `intent_zh`：否定这项政策本质上必然不公平，但不等于断言政策公平。
    `slot_function`：`adverbial_modifier`
    `span_scope`：`word_or_phrase`
- `must_not_add`：收费违法、政策无效、所有低收入者都开车、政策一定公平或应完全取消收费。

### LT-ESC-013｜复杂混写

- `case_type`：`mixed_complex`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Public libraries are no longer necessary because information is available online. To what extent do you agree or disagree?
- `full_essay`：

> Online information has reduced the need to visit a library for simple reference questions. Nevertheless, libraries still perform social functions that websites cannot replace. 公共图书馆是否仍有必要 depends partly on whether they can provide 收费低廉的 study spaces. Their value should therefore be judged by both access to information and their role as shared public places.

- `target_sentence`：公共图书馆是否仍有必要 depends partly on whether they can provide 收费低廉的 study spaces.
- `segments`：
  - `source_zh`：`公共图书馆是否仍有必要`
    `intent_zh`：在网络信息普及后，公共图书馆是否仍有存在的必要；保留疑问，不直接肯定或否定。
    `slot_function`：`subject`
    `span_scope`：`clause`
  - `source_zh`：`收费低廉的`
    `intent_zh`：学生使用该学习空间所需支付的费用较低，不指图书馆建设或运营成本，也不保证完全免费。
    `slot_function`：`noun_modifier`
    `span_scope`：`word_or_phrase`
- `must_not_add`：解决数字鸿沟、减少犯罪、提供就业服务、让居民更爱读书、保证学习空间完全免费，或直接断言所有图书馆必然有必要或必然没有必要。

### LT-ESC-014｜复杂混写

- `case_type`：`mixed_complex`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：The best way to reduce crime is to increase the number of police officers. To what extent do you agree or disagree?
- `full_essay`：

> Police visibility can discourage some offences and improve response times. Yet enforcement alone does not explain why crime is concentrated in particular areas. One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因. A balanced policy can combine immediate protection with longer-term prevention.

- `target_sentence`：One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因.
- `segments`：
  - `source_zh`：`社区中长期偏高的失业率可能增加犯罪风险`
    `intent_zh`：当一个社区的失业率长期处于较高水平时，犯罪风险可能上升；不把失业写成唯一原因或确定因果。
    `slot_function`：`complement`
    `span_scope`：`clause`
  - `source_zh`：`仅增加街面可见警力无法处理犯罪背后的社会原因`
    `intent_zh`：单纯增加公共区域可见警力，无法触及导致犯罪的深层社会原因；不否认警察的即时保护作用。
    `slot_function`：`complement`
    `span_scope`：`clause`
- `must_not_add`：失业是犯罪的唯一原因、具体研究或统计数字、确定因果、应削减警力、具体社会项目、扩大监控、增加刑期或犯罪率必然下降。

### LT-ESC-015｜复杂混写

- `case_type`：`mixed_complex`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Working from home is becoming more common. Is this a positive or negative development?
- `full_essay`：

> Remote work gives employees more control over where they live and how they organise the day. Its effects are not entirely positive, however. Although 远程办公可以减少通勤时间, 它也可能模糊工作与生活的边界. Employers should therefore judge performance by results and avoid expecting staff to remain online at all hours.

- `target_sentence`：Although 远程办公可以减少通勤时间, 它也可能模糊工作与生活的边界.
- `segments`：
  - `source_zh`：`远程办公可以减少通勤时间`
    `intent_zh`：远程工作能够减少员工花在上下班路上的时间。
    `slot_function`：`adverbial_modifier`
    `span_scope`：`clause`
  - `source_zh`：`它也可能模糊工作与生活的边界`
    `intent_zh`：远程工作也可能使工作与私人生活之间的时间或空间界限变得不清楚。
    `slot_function`：`main_clause`
    `span_scope`：`clause`
- `must_not_add`：远程办公一定提高效率、员工孤独、企业节省租金或所有员工都无法停止工作。

### LT-ESC-016｜复杂混写

- `case_type`：`mixed_complex`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：City centres should be designed mainly for pedestrians rather than cars. To what extent do you agree or disagree?
- `full_essay`：

> Businesses need deliveries and some residents cannot avoid travelling by car, so a total ban would be impractical. Even so, city centres should give more space to people walking and spending time in public areas. Any redesign will require adjustment from drivers and businesses. 综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便. This approach gives pedestrians priority without removing all vehicle access.

- `target_sentence`：综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便.
- `segments`：
  - `source_zh`：`综合来看`
    `intent_zh`：汇总前文对步行空间、商业需求和必要车辆通行的权衡，不表示由单一事实推出结论。
    `slot_function`：`linker`
    `span_scope`：`word_or_phrase`
  - `source_zh`：`步行空间可以支持本地商业，而必要车辆仍需保持通行`
    `intent_zh`：步行空间可能有利于本地商业，同时送货等必要车辆仍需要保留通行条件。
    `slot_function`：`object`
    `span_scope`：`multi_clause`
  - `source_zh`：`重新分配道路空间可能会在短期内造成不便`
    `intent_zh`：把部分道路空间改作步行空间，可能在调整初期给相关使用者带来不便。
    `slot_function`：`adverbial_modifier`
    `span_scope`：`clause`
- `must_not_add`：完全禁车、建设自行车道、保证商家销售增长、改善空气质量、提升游客体验或造成永久性损害。

### LT-ESC-017｜边界 case

- `case_type`：`boundary`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Some people believe individuals are responsible for protecting the environment, while others think governments should take the main responsibility. Discuss both views and give your opinion.
- `full_essay`：

> Individuals can reduce waste and choose less damaging products, but these choices operate within systems that individuals do not control. Only governments can regulate major industries and fund national infrastructure. One practical arrangement is to 由政府承担主要责任，同时让个人发挥辅助作用. This preserves a role for personal action without expecting consumers to solve structural problems alone.

- `target_sentence`：One practical arrangement is to 由政府承担主要责任，同时让个人发挥辅助作用.
- `segments`：
  - `source_zh`：`由政府承担主要责任，同时让个人发挥辅助作用`
    `intent_zh`：把环境保护的主要责任放在政府一方，同时保留个人的辅助参与角色。
    `slot_function`：`complement`
    `span_scope`：`multi_clause`
- `must_not_add`：政府负全部责任、个人无需行动、征税、立法细节或新的环保措施。

### LT-ESC-018｜边界 case

- `case_type`：`boundary`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Some local governments reduce business taxes to attract companies. Is this a positive or negative development?
- `full_essay`：

> Reducing business taxes may make one city more attractive than competing locations, but it also lowers public revenue. Firms consider several factors before committing to a place for many years. 降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates. Local governments should therefore assess tax cuts against their effect on public services.

- `target_sentence`：降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates.
- `segments`：
  - `source_zh`：`降低企业税是否真的能吸引长期经营的公司`
    `intent_zh`：对降低企业税能否真正吸引愿意长期经营的公司保持疑问，不预先断言政策有效。
    `slot_function`：`subject`
    `span_scope`：`clause`
- `must_not_add`：创造就业、提高工资、增加长期税收、保证公司迁入或保证当地居民受益。

### LT-ESC-019｜边界 case

- `case_type`：`boundary`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Schools should allow students to specialise in a small number of subjects from an early age. To what extent do you agree or disagree?
- `full_essay`：

> Early specialisation can give talented students more time in a chosen field, but it can also narrow their options before their interests are stable. Concentrating on a few subjects may suit older students who already have clear goals. 相比之下, a broad curriculum allows younger students to discover their strengths before specialising. Schools should therefore delay compulsory specialisation.

- `target_sentence`：相比之下, a broad curriculum allows younger students to discover their strengths before specialising.
- `segments`：
  - `source_zh`：`相比之下`
    `intent_zh`：把年轻学生接受广泛课程的情况，与前文较成熟学生提前专攻少数科目的情况进行对比。
    `slot_function`：`linker`
    `span_scope`：`word_or_phrase`
- `must_not_add`：具体课程组合、某些学科更重要、学生天赋固定、成绩必然提高或应永久取消专业化。

### LT-ESC-020｜边界 case

- `case_type`：`boundary`
- `source_type`：`ai_draft_static_reviewed`
- `task_prompt`：Competition helps children perform better at school. To what extent do you agree or disagree?
- `full_essay`：

> Moderate competition can motivate students when success depends on clear learning goals. The effect becomes harmful when parents add more tutoring only because other families are doing the same, even though students gain little from the extra hours. When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步. Schools should therefore reward progress and understanding instead of simply increasing workload.

- `target_sentence`：When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步.
- `segments`：
  - `source_zh`：`额外的辅导时间不会自动转化为相称的学习进步`
    `intent_zh`：增加辅导时长不保证带来与增加幅度相称的真实学习进步，但不否定辅导可能有效。
    `slot_function`：`main_clause`
    `span_scope`：`clause`
- `must_not_add`：学生患心理疾病、家长恶意攀比、考试制度是唯一原因、额外投入完全没有任何作用或学校必须取消竞争。
