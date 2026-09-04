# v4 作文上下文量消融：人工校准

状态：Codex 隔离预审已锁定并解盲；用户已选择 A 作为产品输入。本文件继续保留为 A 的质量验收与历史实验复核材料，人工结论尚未填写。

本文件包含全部非通过候选，以及少量 pass 抽检。A 是历史全文；B 是相邻三句；C 仅保留目标句内容。当前数字不能代替人工判断。

- 非通过候选：25

- pass 抽检候选：9

- 字段决策已关闭；进入真实用户测试前，优先校准 A 的 7 个非通过 case。


## 全部非通过候选

### C / LT-ESC-002

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：When both parents work full time, flexible schedules make it easier for them to 承担更多家庭责任.
- `must_not_add`：默认责任只属于女性、只等于照顾孩子、工作表现提升或家庭关系改善。
- 预审发现：
  - 把一个可直给的短语拆成‘承担／更多／家庭责任’三个词级零件，整组实质上是拆开的完整答案。
  - 全部揭示后用户几乎只需机械拼接。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "承担更多家庭责任",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "承担",
          "recommendedExpression": "take on"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "更多",
          "recommendedExpression": "more"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "家庭责任",
          "recommendedExpression": "family responsibilities"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-004

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Regular PE lessons can help children 培养长期锻炼习惯 before they reach adulthood.
- `must_not_add`：保证成年后健康、减少肥胖、提升成绩或培养团队精神。
- 预审发现：
  - 把可作为单一表达支援的短语拆成习惯、长期和锻炼三个零件。
  - 全部揭示后基本只能机械拼成完整短语。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "培养长期锻炼习惯",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "培养习惯",
          "recommendedExpression": "develop a habit"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "长期",
          "recommendedExpression": "long-term"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "锻炼",
          "recommendedExpression": "exercise"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-004

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Regular PE lessons can help children 培养长期锻炼习惯 before they reach adulthood.
- `must_not_add`：保证成年后健康、减少肥胖、提升成绩或培养团队精神。
- 预审发现：
  - 把可作为单一表达支援的短语拆成习惯、长期和锻炼三个零件。
  - 全部揭示后基本只能机械拼成完整短语。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "培养长期锻炼习惯",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "培养习惯",
          "recommendedExpression": "develop a habit"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "长期",
          "recommendedExpression": "long-term"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "锻炼",
          "recommendedExpression": "physical exercise"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-006

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Basic lessons on saving and debt can help teenagers 做出更明智的财务决定.
- `must_not_add`：变得富有、避免所有债务、开始投资或获得经济独立。
- 预审发现：
  - 把可直给的短语拆成‘做出决定／更明智的／财务’三个词级零件。
  - 全部揭示后只需机械排序即可得到答案。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "做出更明智的财务决定",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "做出决定",
          "recommendedExpression": "make decisions"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "更明智的",
          "recommendedExpression": "more sensible"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "财务",
          "recommendedExpression": "financial"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-013

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=3, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：公共图书馆是否仍有必要 depends partly on whether they can provide 收费低廉的 study spaces.
- `must_not_add`：解决数字鸿沟、减少犯罪、提供就业服务、让居民更爱读书、保证学习空间完全免费，或直接断言所有图书馆必然有必要或必然没有必要。
- 预审发现：
  - 直接给出‘Whether public libraries are still necessary’，已交付整个中文命题的完整英文，复杂项内部无需用户组句。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "公共图书馆是否仍有必要",
      "action": "provide_expression",
      "recommendedExpression": "Whether public libraries are still necessary",
      "scaffolds": []
    },
    {
      "sourceZh": "收费低廉的",
      "action": "provide_expression",
      "recommendedExpression": "low-cost",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-015

- 是否影响字段决策：是
- Codex 预审：`needs_improvement`（semantic=3, scaffold=2, calibration=2, composability=2）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：Although 远程办公可以减少通勤时间, 它也可能模糊工作与生活的边界.
- `must_not_add`：远程办公一定提高效率、员工孤独、企业节省租金或所有员工都无法停止工作。
- 预审发现：
  - ‘工作与生活／work and life’支架过于基础，且与‘blur the boundary’组合时仍需补出 between 关系。
  - 第二组未支援‘也可能’，整体虽可推进，但支架选择略碎且帮助略少。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "远程办公可以减少通勤时间",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "远程办公",
          "recommendedExpression": "telecommuting"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "减少通勤时间",
          "recommendedExpression": "reduce commuting time"
        }
      ]
    },
    {
      "sourceZh": "它也可能模糊工作与生活的边界",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "模糊边界",
          "recommendedExpression": "blur the boundary"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "工作与生活",
          "recommendedExpression": "work and life"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-015

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=2, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：HG_TOP_LEVEL_SOURCE_COVERAGE_ORDER
- 目标句：Although 远程办公可以减少通勤时间, 它也可能模糊工作与生活的边界.
- `must_not_add`：远程办公一定提高效率、员工孤独、企业节省租金或所有员工都无法停止工作。
- 预审发现：
  - 顶层中文片段被擅自拆分，结构无法按契约稳定投影。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "远程办公",
      "action": "provide_expression",
      "recommendedExpression": "remote working",
      "scaffolds": []
    },
    {
      "sourceZh": "可以减少通勤时间",
      "action": "provide_expression",
      "recommendedExpression": "can reduce commuting time",
      "scaffolds": []
    },
    {
      "sourceZh": "它也可能模糊工作与生活的边界",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "模糊边界",
          "recommendedExpression": "blur the boundary"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "工作与生活",
          "recommendedExpression": "between work and life"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "也可能",
          "recommendedExpression": "may also"
        }
      ]
    }
  ]
}
```

运行错误：

```json
{
  "stage": "contract_validation",
  "type": "OutputContractError",
  "message": "output must return every top-level sourceZh once and in order"
}
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-016

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=1, scaffold=2, calibration=1, composability=1）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便.
- `must_not_add`：完全禁车、建设自行车道、保证商家销售增长、改善空气质量、提升游客体验或造成永久性损害。
- 预审发现：
  - ‘necessary vehicles’与‘still need to maintain access’顺接时把维持通行的施事落到车辆，未稳定表达为必要车辆保留通行条件。
  - 中间命题的主体、谓语和对象均已按顺序给出，全部揭示后主要只剩连接和轻度变形。
  - ‘might in the short term’不是稳定的独立安装块。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "综合来看",
      "action": "provide_expression",
      "recommendedExpression": "Overall,",
      "scaffolds": []
    },
    {
      "sourceZh": "步行空间可以支持本地商业，而必要车辆仍需保持通行",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "步行空间",
          "recommendedExpression": "pedestrian spaces"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "支持本地商业",
          "recommendedExpression": "support local businesses"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "必要车辆",
          "recommendedExpression": "necessary vehicles"
        },
        {
          "scaffoldId": "s4",
          "focusZh": "仍需保持通行",
          "recommendedExpression": "still need to maintain access"
        }
      ]
    },
    {
      "sourceZh": "重新分配道路空间可能会在短期内造成不便",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "重新分配道路空间",
          "recommendedExpression": "reallocating road space"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "可能会在短期内",
          "recommendedExpression": "might in the short term"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "造成不便",
          "recommendedExpression": "cause inconvenience"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-016

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=3, calibration=2, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：HG_TOP_LEVEL_SOURCE_COVERAGE_ORDER
- 目标句：综合来看, city planners should recognise that 步行空间可以支持本地商业，而必要车辆仍需保持通行, even if 重新分配道路空间可能会在短期内造成不便.
- `must_not_add`：完全禁车、建设自行车道、保证商家销售增长、改善空气质量、提升游客体验或造成永久性损害。
- 预审发现：
  - 顶层多分句片段被擅自拆分，违反覆盖与顺序契约。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "综合来看",
      "action": "provide_expression",
      "recommendedExpression": "Overall,",
      "scaffolds": []
    },
    {
      "sourceZh": "步行空间可以支持本地商业",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "步行空间",
          "recommendedExpression": "pedestrian spaces"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "支持本地商业",
          "recommendedExpression": "support local businesses"
        }
      ]
    },
    {
      "sourceZh": "而必要车辆仍需保持通行",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "必要车辆",
          "recommendedExpression": "necessary vehicles"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "保持通行",
          "recommendedExpression": "maintain access"
        }
      ]
    },
    {
      "sourceZh": "重新分配道路空间可能会在短期内造成不便",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "重新分配道路空间",
          "recommendedExpression": "reallocating road space"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "在短期内",
          "recommendedExpression": "in the short term"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "造成不便",
          "recommendedExpression": "cause inconvenience"
        }
      ]
    }
  ]
}
```

运行错误：

```json
{
  "stage": "contract_validation",
  "type": "OutputContractError",
  "message": "output must return every top-level sourceZh once and in order"
}
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-017

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=3, calibration=1, composability=1）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：One practical arrangement is to 由政府承担主要责任，同时让个人发挥辅助作用.
- `must_not_add`：政府负全部责任、个人无需行动、征税、立法细节或新的环保措施。
- 预审发现：
  - 两个英文分别给出完整主体和谓语，合起来穷尽整段命题的两边内容。
  - 全部揭示后主要只需添加同时关系并适配外层 is to，实质上是拆开的完整答案。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "由政府承担主要责任，同时让个人发挥辅助作用",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "政府承担主要责任",
          "recommendedExpression": "governments take the main responsibility"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "个人发挥辅助作用",
          "recommendedExpression": "individuals play a supporting role"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-017

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：One practical arrangement is to 由政府承担主要责任，同时让个人发挥辅助作用.
- `must_not_add`：政府负全部责任、个人无需行动、征税、立法细节或新的环保措施。
- 预审发现：
  - 政府、个人及两个谓语均被拆成支架，覆盖命题全部核心词汇。
  - 主体支架过于基础，全部揭示后只需配对、排序和加入连接关系。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "由政府承担主要责任，同时让个人发挥辅助作用",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "承担主要责任",
          "recommendedExpression": "take the main responsibility"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "发挥辅助作用",
          "recommendedExpression": "play a supporting role"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "政府",
          "recommendedExpression": "the government"
        },
        {
          "scaffoldId": "s4",
          "focusZh": "个人",
          "recommendedExpression": "individuals"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-018

- 是否影响字段决策：是
- Codex 预审：`needs_improvement`（semantic=2, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates.
- `must_not_add`：创造就业、提高工资、增加长期税收、保证公司迁入或保证当地居民受益。
- 预审发现：
  - ‘long-term operating companies’搭配生硬且容易理解为已经营很久的公司，而非愿意长期经营的公司。
  - ‘whether ... can truly’也需要明显重组才能自然安装。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "降低企业税是否真的能吸引长期经营的公司",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "降低企业税",
          "recommendedExpression": "reducing business taxes"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "是否真的能",
          "recommendedExpression": "whether ... can truly"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "吸引",
          "recommendedExpression": "attract"
        },
        {
          "scaffoldId": "s4",
          "focusZh": "长期经营的公司",
          "recommendedExpression": "long-term operating companies"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-018

- 是否影响字段决策：是
- Codex 预审：`needs_improvement`（semantic=3, scaffold=2, calibration=3, composability=2）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：降低企业税是否真的能吸引长期经营的公司 remains uncertain because infrastructure and workforce skills may matter as much as tax rates.
- `must_not_add`：创造就业、提高工资、增加长期税收、保证公司迁入或保证当地居民受益。
- 预审发现：
  - ‘whether it is truly possible to’与‘reduce business taxes’不能直接形成原本以减税为主语的疑问结构，用户需改成 by reducing 等结构或重写支架。
  - 各块含义仍保留疑问立场和长期经营方向。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "降低企业税是否真的能吸引长期经营的公司",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "降低企业税",
          "recommendedExpression": "reduce business taxes"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "吸引长期经营的公司",
          "recommendedExpression": "attract companies that operate on a long-term basis"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "是否真的能",
          "recommendedExpression": "whether it is truly possible to"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-020

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=3, calibration=1, composability=1）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步.
- `must_not_add`：学生患心理疾病、家长恶意攀比、考试制度是唯一原因、额外投入完全没有任何作用或学校必须取消竞争。
- 预审发现：
  - 三个英文依次构成完整主语、完整否定谓语和完整结果，按原顺序拼接即可得到完整主句。
  - 用户无需决定实际词序、词形或连接，只需机械复制。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "额外的辅导时间不会自动转化为相称的学习进步",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "额外的辅导时间",
          "recommendedExpression": "extra tutoring hours"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "不会自动转化为",
          "recommendedExpression": "do not automatically translate into"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "相称的学习进步",
          "recommendedExpression": "commensurate academic progress"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-020

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：HG_TOP_LEVEL_SOURCE_COVERAGE_ORDER
- 目标句：When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步.
- `must_not_add`：学生患心理疾病、家长恶意攀比、考试制度是唯一原因、额外投入完全没有任何作用或学校必须取消竞争。
- 预审发现：
  - 顶层片段被拆分，违反结构契约；内容也已成为可机械拼接的完整答案。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "额外的辅导时间",
      "action": "provide_expression",
      "recommendedExpression": "extra tutoring hours",
      "scaffolds": []
    },
    {
      "sourceZh": "不会自动转化为",
      "action": "provide_expression",
      "recommendedExpression": "do not automatically translate into",
      "scaffolds": []
    },
    {
      "sourceZh": "相称的学习进步",
      "action": "provide_expression",
      "recommendedExpression": "corresponding academic progress",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
{
  "stage": "contract_validation",
  "type": "OutputContractError",
  "message": "output must return every top-level sourceZh once and in order"
}
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-020

- 是否影响字段决策：是
- Codex 预审：`bad_case`（semantic=3, scaffold=3, calibration=1, composability=1）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：When competition becomes detached from learning, 额外的辅导时间不会自动转化为相称的学习进步.
- `must_not_add`：学生患心理疾病、家长恶意攀比、考试制度是唯一原因、额外投入完全没有任何作用或学校必须取消竞争。
- 预审发现：
  - 三个英文依次构成完整主语、完整否定谓语和完整结果，可直接拼成 extra tutoring time does not automatically translate into commensurate academic progress。
  - 全部揭示后不存在真实组句工作。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "额外的辅导时间不会自动转化为相称的学习进步",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "额外的辅导时间",
          "recommendedExpression": "extra tutoring time"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "不会自动转化为",
          "recommendedExpression": "does not automatically translate into"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "相称的学习进步",
          "recommendedExpression": "commensurate academic progress"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-001

- 是否影响字段决策：否
- Codex 预审：`needs_improvement`（semantic=2, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Expanding the metro network can improve 公众可达性, especially for residents on the outskirts.
- `must_not_add`：无障碍设施、残障人士专用可达性、票价下降、减排效果或新的政策论点。
- 预审发现：
  - ‘public accessibility’方向接近，但在该句中搭配生硬，且未清楚表达公众更容易使用公共交通服务。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "公众可达性",
      "action": "provide_expression",
      "recommendedExpression": "public accessibility",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-001

- 是否影响字段决策：否
- Codex 预审：`needs_improvement`（semantic=2, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Expanding the metro network can improve 公众可达性, especially for residents on the outskirts.
- `must_not_add`：无障碍设施、残障人士专用可达性、票价下降、减排效果或新的政策论点。
- 预审发现：
  - ‘public accessibility’方向接近，但在该句中搭配生硬，且未清楚表达公众更容易使用公共交通服务。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "公众可达性",
      "action": "provide_expression",
      "recommendedExpression": "public accessibility",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-001

- 是否影响字段决策：否
- Codex 预审：`needs_improvement`（semantic=2, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Expanding the metro network can improve 公众可达性, especially for residents on the outskirts.
- `must_not_add`：无障碍设施、残障人士专用可达性、票价下降、减排效果或新的政策论点。
- 预审发现：
  - ‘public accessibility’方向接近，但在该句中搭配生硬，且未清楚表达公众更容易使用公共交通服务。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "公众可达性",
      "action": "provide_expression",
      "recommendedExpression": "public accessibility",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-014

- 是否影响字段决策：否
- Codex 预审：`bad_case`（semantic=1, scaffold=2, calibration=2, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因.
- `must_not_add`：失业是犯罪的唯一原因、具体研究或统计数字、确定因果、应削减警力、具体社会项目、扩大监控、增加刑期或犯罪率必然下降。
- 预审发现：
  - 第一组遗漏‘社区中’和核心可能性；‘increase the risk of crime’把‘可能增加’写成无模态的确定关系。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "社区中长期偏高的失业率可能增加犯罪风险",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "长期偏高的失业率",
          "recommendedExpression": "persistently high unemployment rates"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "增加犯罪风险",
          "recommendedExpression": "increase the risk of crime"
        }
      ]
    },
    {
      "sourceZh": "仅增加街面可见警力无法处理犯罪背后的社会原因",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "仅增加街面可见警力",
          "recommendedExpression": "merely increasing visible police presence"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "无法处理",
          "recommendedExpression": "cannot address"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "犯罪背后的社会原因",
          "recommendedExpression": "the social causes behind crime"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-014

- 是否影响字段决策：否
- Codex 预审：`bad_case`（semantic=1, scaffold=2, calibration=2, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因.
- `must_not_add`：失业是犯罪的唯一原因、具体研究或统计数字、确定因果、应削减警力、具体社会项目、扩大监控、增加刑期或犯罪率必然下降。
- 预审发现：
  - 第一组遗漏‘社区中’和核心可能性；‘elevate the risk of crime’把‘可能增加’写成无模态的确定关系。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "社区中长期偏高的失业率可能增加犯罪风险",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "长期偏高的失业率",
          "recommendedExpression": "persistently high unemployment rates"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "增加犯罪风险",
          "recommendedExpression": "elevate the risk of crime"
        }
      ]
    },
    {
      "sourceZh": "仅增加街面可见警力无法处理犯罪背后的社会原因",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "仅增加街面可见警力",
          "recommendedExpression": "merely increasing visible police presence"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "无法处理",
          "recommendedExpression": "cannot address"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "犯罪背后的社会原因",
          "recommendedExpression": "the underlying social causes of crime"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-014

- 是否影响字段决策：否
- Codex 预审：`bad_case`（semantic=3, scaffold=2, calibration=1, composability=1）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：One concern is that 社区中长期偏高的失业率可能增加犯罪风险, which supports the argument that 仅增加街面可见警力无法处理犯罪背后的社会原因.
- `must_not_add`：失业是犯罪的唯一原因、具体研究或统计数字、确定因果、应削减警力、具体社会项目、扩大监控、增加刑期或犯罪率必然下降。
- 预审发现：
  - 两组都把主体、限定、模态、谓语和客体逐块给全，实质上是拆开的完整命题。
  - 全部揭示后用户只需按原顺序机械拼接。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "社区中长期偏高的失业率可能增加犯罪风险",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "社区中",
          "recommendedExpression": "in the community"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "长期偏高的失业率",
          "recommendedExpression": "persistently high unemployment rate"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "可能增加",
          "recommendedExpression": "may increase"
        },
        {
          "scaffoldId": "s4",
          "focusZh": "犯罪风险",
          "recommendedExpression": "the risk of crime"
        }
      ]
    },
    {
      "sourceZh": "仅增加街面可见警力无法处理犯罪背后的社会原因",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "仅增加",
          "recommendedExpression": "merely increasing"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "街面可见警力",
          "recommendedExpression": "visible police presence on the street"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "无法处理",
          "recommendedExpression": "cannot address"
        },
        {
          "scaffoldId": "s4",
          "focusZh": "犯罪背后的社会原因",
          "recommendedExpression": "the social causes behind crime"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-021

- 是否影响字段决策：否
- Codex 预审：`needs_improvement`（semantic=3, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Over time, this could become their 默认做法.
- `must_not_add`：学生作弊、AI 答案一定错误、学生失去创造力、软件默认设置或学校应禁止 AI。
- 预审发现：
  - ‘default practice’可懂但搭配略生硬，容易保留软件语境的翻译感；‘default approach’或惯常做法表达更自然。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "默认做法",
      "action": "provide_expression",
      "recommendedExpression": "default practice",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-021

- 是否影响字段决策：否
- Codex 预审：`needs_improvement`（semantic=3, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Over time, this could become their 默认做法.
- `must_not_add`：学生作弊、AI 答案一定错误、学生失去创造力、软件默认设置或学校应禁止 AI。
- 预审发现：
  - ‘default practice’可懂但搭配略生硬，容易保留软件语境的翻译感；‘default approach’或惯常做法表达更自然。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "默认做法",
      "action": "provide_expression",
      "recommendedExpression": "default practice",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-021

- 是否影响字段决策：否
- Codex 预审：`needs_improvement`（semantic=3, scaffold=2, calibration=3, composability=2）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Over time, this could become their 默认做法.
- `must_not_add`：学生作弊、AI 答案一定错误、学生失去创造力、软件默认设置或学校应禁止 AI。
- 预审发现：
  - ‘default practice’可懂但搭配略生硬，容易保留软件语境的翻译感；‘default approach’或惯常做法表达更自然。

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "默认做法",
      "action": "provide_expression",
      "recommendedExpression": "default practice",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---


## Pass 抽检

### A / LT-ESC-005

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Recorded lessons may therefore 缩小城乡学生在获取教学资源方面的差距.
- `must_not_add`：完全消除不平等、保证同等成绩、取代农村学校或解决网络基础设施问题。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "缩小城乡学生在获取教学资源方面的差距",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "缩小差距",
          "recommendedExpression": "narrow the gap"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "城乡学生",
          "recommendedExpression": "urban and rural students"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "获取教学资源",
          "recommendedExpression": "access to teaching resources"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-005

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Recorded lessons may therefore 缩小城乡学生在获取教学资源方面的差距.
- `must_not_add`：完全消除不平等、保证同等成绩、取代农村学校或解决网络基础设施问题。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "缩小城乡学生在获取教学资源方面的差距",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "缩小差距",
          "recommendedExpression": "narrow the gap"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "城乡学生",
          "recommendedExpression": "urban and rural students"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "获取教学资源",
          "recommendedExpression": "access to teaching resources"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-005

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：Recorded lessons may therefore 缩小城乡学生在获取教学资源方面的差距.
- `must_not_add`：完全消除不平等、保证同等成绩、取代农村学校或解决网络基础设施问题。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "缩小城乡学生在获取教学资源方面的差距",
      "action": "offer_scaffolds",
      "recommendedExpression": null,
      "scaffolds": [
        {
          "scaffoldId": "s1",
          "focusZh": "缩小差距",
          "recommendedExpression": "narrow the gap"
        },
        {
          "scaffoldId": "s2",
          "focusZh": "城乡学生",
          "recommendedExpression": "urban and rural students"
        },
        {
          "scaffoldId": "s3",
          "focusZh": "获取教学资源",
          "recommendedExpression": "access to educational resources"
        }
      ]
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-009

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：For some capable applicants, this can become a serious 门槛.
- `must_not_add`：这些学生能力不足、大学应对所有人免费、贷款一定有害或教育能够消除贫困。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "门槛",
      "action": "provide_expression",
      "recommendedExpression": "barrier",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-009

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：For some capable applicants, this can become a serious 门槛.
- `must_not_add`：这些学生能力不足、大学应对所有人免费、贷款一定有害或教育能够消除贫困。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "门槛",
      "action": "provide_expression",
      "recommendedExpression": "barrier",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-009

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`unanimous`
- 硬门槛：无
- 目标句：For some capable applicants, this can become a serious 门槛.
- `must_not_add`：这些学生能力不足、大学应对所有人免费、贷款一定有害或教育能够消除贫困。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "门槛",
      "action": "provide_expression",
      "recommendedExpression": "barrier",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### A / LT-ESC-010

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：This would give workers a stronger 稳定感.
- `must_not_add`：获得长期劳动合同、工作永久稳定、收入提高或压力完全消失。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "稳定感",
      "action": "provide_expression",
      "recommendedExpression": "sense of stability",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### B / LT-ESC-010

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：This would give workers a stronger 稳定感.
- `must_not_add`：获得长期劳动合同、工作永久稳定、收入提高或压力完全消失。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "稳定感",
      "action": "provide_expression",
      "recommendedExpression": "sense of stability",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---

### C / LT-ESC-010

- 是否影响字段决策：否
- Codex 预审：`pass`（semantic=3, scaffold=3, calibration=3, composability=3）
- 分歧处理：`adjudicated`
- 硬门槛：无
- 目标句：This would give workers a stronger 稳定感.
- `must_not_add`：获得长期劳动合同、工作永久稳定、收入提高或压力完全消失。
- 预审发现：
  - 无

候选输出：

```json
{
  "items": [
    {
      "sourceZh": "稳定感",
      "action": "provide_expression",
      "recommendedExpression": "sense of stability",
      "scaffolds": []
    }
  ]
}
```

运行错误：

```json
无
```

人工结论：`待填写`

人工说明：

---
