# DeepSeek v6 控制权外移：9 case 人工审核

状态：待用户逐条填写。

v5 仍由模型决定直给或拆分；v6 由产品侧锁定顶层中文片段和帮助方式，模型只生成英文或支架内容。两版使用相同 DeepSeek、冻结 case、全文、temperature 0 和零自动重试。

本轮重点不是再次检查结构，而是判断：控制权外移后，英文与支架质量是否更好、持平或变差。机器协议只作为客观提示。

---

## 01 / LT-ESC-002

- 目标句：When both parents work full time, flexible schedules make it easier for them to 承担更多家庭责任.
- 冻结顶层片段与动作：
  - `承担更多家庭责任` → 直接表达
- 最初人工结论：`needs_improvement`
- 最初人工说明：单独把更多拆出来没有必要，需要直接给‘’‘承担...责任’‘’或者直接把sourcezh全部提供

### v5：模型仍决定帮助方式

1. `sourceZh`：承担更多家庭责任
   - 方式：直接表达
   - 推荐英文：`take on more family responsibilities`

### v6：产品锁定帮助方式

1. `sourceZh`：承担更多家庭责任
   - 方式：直接表达
   - 推荐英文：`take on more family responsibilities`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结一致） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 0.97 秒 | 1.29 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 02 / LT-ESC-003

- 目标句：Part-time work can 缓解学生的经济压力 without forcing them to leave university.
- 冻结顶层片段与动作：
  - `缓解学生的经济压力` → 直接表达
- 最初人工结论：`bad_case`
- 最初人工说明：模型把英文列为sourcezh。对于一个简单的表达，拆成了复杂的支架，两个表达拆的没有意义

### v5：模型仍决定帮助方式

1. `sourceZh`：缓解学生的经济压力
   - 方式：直接表达
   - 推荐英文：`ease students' financial pressure`

### v6：产品锁定帮助方式

1. `sourceZh`：缓解学生的经济压力
   - 方式：直接表达
   - 推荐英文：`ease students' financial pressure`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结一致） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 0.75 秒 | 1.49 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 03 / LT-ESC-004

- 目标句：Regular PE lessons can help children 培养长期锻炼习惯 before they reach adulthood.
- 冻结顶层片段与动作：
  - `培养长期锻炼习惯` → 直接表达
- 最初人工结论：`needs_improvement`
- 最初人工说明：对于一个类似“培养习惯”的短语，需要让它返回“培养...的习惯”的表达，少一个介词就可能会多一个卡点

### v5：模型仍决定帮助方式

1. `sourceZh`：培养长期锻炼习惯
   - 方式：直接表达
   - 推荐英文：`develop a long-term habit of regular exercise`

### v6：产品锁定帮助方式

1. `sourceZh`：培养长期锻炼习惯
   - 方式：直接表达
   - 推荐英文：`develop long-term exercise habits`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结一致） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 0.56 秒 | 0.97 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 04 / LT-ESC-006

- 目标句：Basic lessons on saving and debt can help teenagers 做出更明智的财务决定.
- 冻结顶层片段与动作：
  - `做出更明智的财务决定` → 直接表达
- 最初人工结论：`needs_improvement`
- 最初人工说明：拆的太细碎了，可以直接给较为完整的英文表达，因为从这个颗粒度再往下拆旧只剩单词了

### v5：模型仍决定帮助方式

1. `sourceZh`：做出更明智的财务决定
   - 方式：直接表达
   - 推荐英文：`make more informed financial decisions`

### v6：产品锁定帮助方式

1. `sourceZh`：做出更明智的财务决定
   - 方式：直接表达
   - 推荐英文：`make more informed financial decisions`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结一致） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 0.65 秒 | 0.91 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 05 / LT-ESC-013

- 目标句：公共图书馆是否仍有必要 depends partly on whether they can provide 收费低廉的 study spaces.
- 冻结顶层片段与动作：
  - `公共图书馆是否仍有必要` → 复杂支架
  - `收费低廉的` → 直接表达
- 最初人工结论：`needs_improvement`
- 最初人工说明：是否仍有必要 → `whether libraries are still necessary`这个表达中不该出现libraries，应该表达成“whether ... is still necessary”

### v5：模型仍决定帮助方式

1. `sourceZh`：公共图书馆是否仍有必要
   - 方式：直接表达
   - 推荐英文：`Whether public libraries are still necessary`
2. `sourceZh`：收费低廉的
   - 方式：直接表达
   - 推荐英文：`affordable ...`

### v6：产品锁定帮助方式

1. `sourceZh`：公共图书馆是否仍有必要
   - 方式：复杂支架
   - s1｜是否仍有必要 → `whether ... are still necessary`
   - s2｜取决于 → `depends partly on ...`
   - s3｜公共图书馆 → `public libraries`
2. `sourceZh`：收费低廉的
   - 方式：直接表达
   - 推荐英文：`affordable`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结不同） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 0.88 秒 | 1.39 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 06 / LT-ESC-014

- 目标句：One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因.
- 冻结顶层片段与动作：
  - `社区中长期偏高的失业率可能增加犯罪风险` → 复杂支架
  - `仅增加街面可见警力无法处理犯罪背后的社会原因` → 复杂支架
- 最初人工结论：`needs_improvement`
- 最初人工说明：可以拆成仅增加街面可见警力和处理犯罪背后的社会原因

### v5：模型仍决定帮助方式

1. `sourceZh`：社区中长期偏高的失业率可能增加犯罪风险
   - 方式：复杂支架
   - s1｜长期偏高的失业率 → `a persistently high unemployment rate`
   - s2｜可能增加犯罪风险 → `may increase the risk of crime`
2. `sourceZh`：仅增加街面可见警力无法处理犯罪背后的社会原因
   - 方式：直接表达
   - 推荐英文：`merely increasing visible police presence cannot address the social causes behind crime`

### v6：产品锁定帮助方式

1. `sourceZh`：社区中长期偏高的失业率可能增加犯罪风险
   - 方式：复杂支架
   - s1｜长期偏高的失业率 → `persistently high unemployment rates`
   - s2｜增加犯罪风险 → `may increase the risk of crime`
   - s3｜在社区中 → `in a community`
2. `sourceZh`：仅增加街面可见警力无法处理犯罪背后的社会原因
   - 方式：复杂支架
   - s1｜仅增加街面可见警力 → `merely increasing visible police presence on the streets`
   - s2｜无法处理 → `cannot address`
   - s3｜犯罪背后的社会原因 → `the social causes behind crime`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结不同） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 1.38 秒 | 1.60 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 07 / LT-ESC-016

- 目标句：综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便.
- 冻结顶层片段与动作：
  - `综合来看` → 直接表达
  - `步行空间可以支持本地商业，而必要车辆仍需保持通行` → 复杂支架
  - `重新分配道路空间可能会在短期内造成不便` → 复杂支架
- 最初人工结论：`pass`
- 最初人工说明：无

### v5：模型仍决定帮助方式

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

### v6：产品锁定帮助方式

1. `sourceZh`：综合来看
   - 方式：直接表达
   - 推荐英文：`On the whole, ...`
2. `sourceZh`：步行空间可以支持本地商业，而必要车辆仍需保持通行
   - 方式：复杂支架
   - s1｜步行空间 → `pedestrian-friendly spaces`
   - s2｜支持本地商业 → `can support local businesses`
   - s3｜必要车辆仍需保持通行 → `essential vehicles still need to ...`
   - s4｜而...同时 → `while ...`
3. `sourceZh`：重新分配道路空间可能会在短期内造成不便
   - 方式：复杂支架
   - s1｜重新分配道路空间 → `reallocating road space`
   - s2｜可能 → `may ...`
   - s3｜在短期内 → `in the short term`
   - s4｜造成不便 → `cause inconvenience`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结不同） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 1.75 秒 | 2.08 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 08 / LT-ESC-017

- 目标句：One practical arrangement is to 由政府承担主要责任，同时让个人发挥辅助作用.
- 冻结顶层片段与动作：
  - `由政府承担主要责任，同时让个人发挥辅助作用` → 复杂支架
- 最初人工结论：`needs_improvement`
- 最初人工说明：‘同时’单独作为一个支架有点累赘

### v5：模型仍决定帮助方式

1. `sourceZh`：由政府承担主要责任，同时让个人发挥辅助作用
   - 方式：复杂支架
   - s1｜政府承担主要责任 → `have governments take the primary responsibility`
   - s2｜个人发挥辅助作用 → `let individuals play a supporting role`

### v6：产品锁定帮助方式

1. `sourceZh`：由政府承担主要责任，同时让个人发挥辅助作用
   - 方式：复杂支架
   - s1｜政府承担主要责任 → `have the government take the primary responsibility`
   - s2｜个人发挥辅助作用 → `while individuals play a supporting role`
   - s3｜同时 → `at the same time`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结一致） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 1.33 秒 | 1.26 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---

## 09 / LT-ESC-018

- 目标句：降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates.
- 冻结顶层片段与动作：
  - `降低企业税是否真的能吸引长期经营的公司` → 复杂支架
- 最初人工结论：`pass`
- 最初人工说明：无

### v5：模型仍决定帮助方式

1. `sourceZh`：降低企业税是否真的能吸引长期经营的公司
   - 方式：复杂支架
   - s1｜降低企业税是否真的能 → `whether ... truly can ...`
   - s2｜吸引长期经营的公司 → `attract companies that ... for the long term`

### v6：产品锁定帮助方式

1. `sourceZh`：降低企业税是否真的能吸引长期经营的公司
   - 方式：复杂支架
   - s1｜是否真的能吸引 → `whether ... can genuinely attract ...`
   - s2｜降低企业税 → `reducing business taxes`
   - s3｜长期经营的公司 → `companies that intend to operate in the long term`

### 客观运行对照

| 项目 | v5 | v6 |
| --- | --- | --- |
| 最终协议 | 通过 | 通过 |
| 帮助方式来源 | 模型判断（与冻结一致） | 产品规则锁定（与冻结一致） |
| 完整返回时间 | 0.95 秒 | 1.29 秒 |

v6 人工结论：`待填写（pass / needs_improvement / bad_case）`

相对 v5：`待填写（更好 / 持平 / 更差）`

最初问题是否解决：`待填写（是 / 部分 / 否）`

人工说明：

---
