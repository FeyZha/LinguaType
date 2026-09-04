# DeepSeek Prompt v5：9 case 定向复测人工审核

状态：待用户逐条填写。

本材料只比较同一个 DeepSeek V4 Flash 在 Prompt v4 与 v5 下的第一次回复。v5 新增本地识别的顶层中文片段清单，并收紧最低可用支架粒度；冻结 v4 case、全文上下文、输出 schema、模型参数和零重试保持不变。

机器协议与冻结动作只作为客观提示，不自动决定人工质量结论。重点判断：上轮问题是否解决，以及是否出现新的过度直给、语义或自然度问题。

---

## 01 / LT-ESC-002

- 目标句：When both parents work full time, flexible schedules make it easier for them to 承担更多家庭责任.
- 冻结顶层片段与动作：
  - `承担更多家庭责任` → 直接表达
- 上轮人工结论：`needs_improvement`
- 上轮人工说明：单独把更多拆出来没有必要，需要直接给‘’‘承担...责任’‘’或者直接把sourcezh全部提供

### Prompt v4 回复

1. `sourceZh`：承担更多家庭责任
   - 方式：复杂支架
   - s1｜承担家庭责任 → `take on family responsibilities`
   - s2｜更多 → `a greater share of`

### Prompt v5 回复

1. `sourceZh`：承担更多家庭责任
   - 方式：直接表达
   - 推荐英文：`take on more family responsibilities`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 通过 | 通过 |
| 冻结动作一致 | 否 | 是 |
| 完整返回时间 | 1.07 秒 | 0.97 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 02 / LT-ESC-003

- 目标句：Part-time work can 缓解学生的经济压力 without forcing them to leave university.
- 冻结顶层片段与动作：
  - `缓解学生的经济压力` → 直接表达
- 上轮人工结论：`bad_case`
- 上轮人工说明：模型把英文列为sourcezh。对于一个简单的表达，拆成了复杂的支架，两个表达拆的没有意义

### Prompt v4 回复

1. `sourceZh`：缓解学生的经济压力
   - 方式：复杂支架
   - s1｜缓解经济压力 → `ease financial pressure`
   - s2｜学生的 → `on students`
2. `sourceZh`：without forcing them to leave university
   - 方式：直接表达
   - 推荐英文：`without forcing them to drop out of university`

### Prompt v5 回复

1. `sourceZh`：缓解学生的经济压力
   - 方式：直接表达
   - 推荐英文：`ease students' financial pressure`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 失败：output must return every top-level sourceZh once and in order | 通过 |
| 冻结动作一致 | 否 | 是 |
| 完整返回时间 | 1.62 秒 | 0.75 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 03 / LT-ESC-004

- 目标句：Regular PE lessons can help children 培养长期锻炼习惯 before they reach adulthood.
- 冻结顶层片段与动作：
  - `培养长期锻炼习惯` → 直接表达
- 上轮人工结论：`needs_improvement`
- 上轮人工说明：对于一个类似“培养习惯”的短语，需要让它返回“培养...的习惯”的表达，少一个介词就可能会多一个卡点

### Prompt v4 回复

1. `sourceZh`：培养长期锻炼习惯
   - 方式：复杂支架
   - s1｜培养习惯 → `develop a habit`
   - s2｜长期锻炼 → `exercising regularly over the long term`

### Prompt v5 回复

1. `sourceZh`：培养长期锻炼习惯
   - 方式：直接表达
   - 推荐英文：`develop a long-term habit of regular exercise`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 通过 | 通过 |
| 冻结动作一致 | 否 | 是 |
| 完整返回时间 | 1.40 秒 | 0.56 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 04 / LT-ESC-006

- 目标句：Basic lessons on saving and debt can help teenagers 做出更明智的财务决定.
- 冻结顶层片段与动作：
  - `做出更明智的财务决定` → 直接表达
- 上轮人工结论：`needs_improvement`
- 上轮人工说明：拆的太细碎了，可以直接给较为完整的英文表达，因为从这个颗粒度再往下拆旧只剩单词了

### Prompt v4 回复

1. `sourceZh`：做出更明智的财务决定
   - 方式：复杂支架
   - s1｜做出决定 → `make decisions`
   - s2｜更明智的 → `more informed`
   - s3｜财务 → `financial`

### Prompt v5 回复

1. `sourceZh`：做出更明智的财务决定
   - 方式：直接表达
   - 推荐英文：`make more informed financial decisions`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 通过 | 通过 |
| 冻结动作一致 | 否 | 是 |
| 完整返回时间 | 1.17 秒 | 0.65 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 05 / LT-ESC-013

- 目标句：公共图书馆是否仍有必要 depends partly on whether they can provide 收费低廉的 study spaces.
- 冻结顶层片段与动作：
  - `公共图书馆是否仍有必要` → 复杂支架
  - `收费低廉的` → 直接表达
- 上轮人工结论：`needs_improvement`
- 上轮人工说明：是否仍有必要 → `whether libraries are still necessary`这个表达中不该出现libraries，应该表达成“whether ... is still necessary”

### Prompt v4 回复

1. `sourceZh`：公共图书馆是否仍有必要
   - 方式：复杂支架
   - s1｜是否仍有必要 → `whether libraries are still necessary`
   - s2｜公共图书馆 → `public libraries`
2. `sourceZh`：收费低廉的
   - 方式：直接表达
   - 推荐英文：`affordable`

### Prompt v5 回复

1. `sourceZh`：公共图书馆是否仍有必要
   - 方式：直接表达
   - 推荐英文：`Whether public libraries are still necessary`
2. `sourceZh`：收费低廉的
   - 方式：直接表达
   - 推荐英文：`affordable ...`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 通过 | 通过 |
| 冻结动作一致 | 是 | 否 |
| 完整返回时间 | 1.35 秒 | 0.88 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 06 / LT-ESC-014

- 目标句：One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因.
- 冻结顶层片段与动作：
  - `社区中长期偏高的失业率可能增加犯罪风险` → 复杂支架
  - `仅增加街面可见警力无法处理犯罪背后的社会原因` → 复杂支架
- 上轮人工结论：`needs_improvement`
- 上轮人工说明：可以拆成仅增加街面可见警力和处理犯罪背后的社会原因

### Prompt v4 回复

1. `sourceZh`：社区中长期偏高的失业率可能增加犯罪风险
   - 方式：复杂支架
   - s1｜长期偏高的失业率 → `persistently high unemployment`
   - s2｜增加犯罪风险 → `raise the risk of crime`
   - s3｜在社区中 → `in a community`
2. `sourceZh`：仅增加街面可见警力无法处理犯罪背后的社会原因
   - 方式：复杂支架
   - s1｜仅增加街面可见警力 → `merely increasing visible police presence on the streets`
   - s2｜无法处理 → `cannot address`
   - s3｜犯罪背后的社会原因 → `the social causes behind crime`

### Prompt v5 回复

1. `sourceZh`：社区中长期偏高的失业率可能增加犯罪风险
   - 方式：复杂支架
   - s1｜长期偏高的失业率 → `a persistently high unemployment rate`
   - s2｜可能增加犯罪风险 → `may increase the risk of crime`
2. `sourceZh`：仅增加街面可见警力无法处理犯罪背后的社会原因
   - 方式：直接表达
   - 推荐英文：`merely increasing visible police presence cannot address the social causes behind crime`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 通过 | 通过 |
| 冻结动作一致 | 是 | 否 |
| 完整返回时间 | 2.37 秒 | 1.38 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 07 / LT-ESC-016

- 目标句：综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便.
- 冻结顶层片段与动作：
  - `综合来看` → 直接表达
  - `步行空间可以支持本地商业，而必要车辆仍需保持通行` → 复杂支架
  - `重新分配道路空间可能会在短期内造成不便` → 复杂支架
- 上轮人工结论：`pass`
- 上轮人工说明：无

### Prompt v4 回复

1. `sourceZh`：综合来看
   - 方式：直接表达
   - 推荐英文：`on balance`
2. `sourceZh`：步行空间可以支持本地商业
   - 方式：复杂支架
   - s1｜步行空间 → `pedestrian-friendly spaces`
   - s2｜支持本地商业 → `support local businesses`
3. `sourceZh`：必要车辆仍需保持通行
   - 方式：复杂支架
   - s1｜必要车辆 → `essential vehicles`
   - s2｜保持通行 → `retain access`
4. `sourceZh`：重新分配道路空间可能会在短期内造成不便
   - 方式：复杂支架
   - s1｜重新分配道路空间 → `reallocating road space`
   - s2｜在短期内造成不便 → `cause short-term disruption`

### Prompt v5 回复

1. `sourceZh`：综合来看
   - 方式：直接表达
   - 推荐英文：`On balance,`
2. `sourceZh`：步行空间可以支持本地商业，而必要车辆仍需保持通行
   - 方式：复杂支架
   - s1｜步行空间可以支持本地商业 → `pedestrian-friendly spaces can support local businesses`
   - s2｜必要车辆仍需保持通行 → `essential vehicles still need to keep moving`
3. `sourceZh`：重新分配道路空间可能会在短期内造成不便
   - 方式：直接表达
   - 推荐英文：`reallocating road space may cause short-term inconvenience`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 失败：output must return every top-level sourceZh once and in order | 通过 |
| 冻结动作一致 | 否 | 否 |
| 完整返回时间 | 2.19 秒 | 1.75 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 08 / LT-ESC-017

- 目标句：One practical arrangement is to 由政府承担主要责任，同时让个人发挥辅助作用.
- 冻结顶层片段与动作：
  - `由政府承担主要责任，同时让个人发挥辅助作用` → 复杂支架
- 上轮人工结论：`needs_improvement`
- 上轮人工说明：‘同时’单独作为一个支架有点累赘

### Prompt v4 回复

1. `sourceZh`：由政府承担主要责任，同时让个人发挥辅助作用
   - 方式：复杂支架
   - s1｜承担主要责任 → `take the primary responsibility`
   - s2｜发挥辅助作用 → `play a supplementary role`
   - s3｜同时 → `while`

### Prompt v5 回复

1. `sourceZh`：由政府承担主要责任，同时让个人发挥辅助作用
   - 方式：复杂支架
   - s1｜政府承担主要责任 → `have governments take the primary responsibility`
   - s2｜个人发挥辅助作用 → `let individuals play a supporting role`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 通过 | 通过 |
| 冻结动作一致 | 是 | 是 |
| 完整返回时间 | 1.46 秒 | 1.33 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---

## 09 / LT-ESC-018

- 目标句：降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates.
- 冻结顶层片段与动作：
  - `降低企业税是否真的能吸引长期经营的公司` → 复杂支架
- 上轮人工结论：`pass`
- 上轮人工说明：无

### Prompt v4 回复

1. `sourceZh`：降低企业税是否真的能吸引长期经营的公司
   - 方式：复杂支架
   - s1｜降低企业税 → `cutting business taxes`
   - s2｜是否真的能吸引 → `whether ... genuinely attracts`
   - s3｜长期经营的公司 → `companies that operate long-term`
2. `sourceZh`：基础设施和劳动力技能可能和税率一样重要
   - 方式：复杂支架
   - s1｜基础设施和劳动力技能 → `infrastructure and workforce skills`
   - s2｜可能和税率一样重要 → `may matter as much as tax rates`

### Prompt v5 回复

1. `sourceZh`：降低企业税是否真的能吸引长期经营的公司
   - 方式：复杂支架
   - s1｜降低企业税是否真的能 → `whether ... truly can ...`
   - s2｜吸引长期经营的公司 → `attract companies that ... for the long term`

### 客观运行对照

| 项目 | v4 | v5 |
| --- | --- | --- |
| 机器协议 | 失败：output must return every top-level sourceZh once and in order | 通过 |
| 冻结动作一致 | 否 | 是 |
| 完整返回时间 | 1.78 秒 | 0.95 秒 |

v5 人工结论：`待填写（pass / needs_improvement / bad_case）`

上轮问题是否解决：`待填写（是 / 部分 / 否）`

是否出现新问题：`待填写（无 / 有）`

人工说明：

---
