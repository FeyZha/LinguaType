# v2 模型输出契约

本文件只规定被测模型在两个交互阶段看到什么、返回什么。评分标准见 [rubric.md](./rubric.md)。

## 1. 输入

两个阶段都提供：

```text
task_prompt
full_essay
target_sentence
interaction_phase
```

`interaction_phase` 只有两个值：

- `initial`：用户刚点击“处理本句”；
- `selected_focus`：用户已经从某个完整命题中选择了具体卡点，此时额外提供 `selected_focus.sourceZh` 与 `selected_focus.focusZh`。

模型不能看到 `intent_zh`、`must_not_add`、`expected_action`、参考聚焦项、分类标签或分数。

## 2. 统一结构

```json
{
  "items": [
    {
      "sourceZh": "目标句中的顶层连续中文原文",
      "action": "provide_expression",
      "focusZh": "本轮实际帮助的中文片段",
      "recommendedExpression": "一个英文表达支架",
      "focusOptionsZh": []
    }
  ]
}
```

字段固定，不因阶段增删；不用的字段以 `null` 或空数组表示。

## 3. 三种合法状态

| 场景 | `action` | `focusZh` | `recommendedExpression` | `focusOptionsZh` |
|---|---|---|---|---|
| 初轮，词或短语可直接支援 | `provide_expression` | 等于 `sourceZh` | 一个英文表达 | `[]` |
| 初轮，完整命题需先聚焦 | `request_focus` | `null` | `null` | 2—4 个中文子片段 |
| 用户已选择聚焦项 | `provide_expression` | 等于输入的 `selected_focus.focusZh` | 只对应该项的一个英文表达 | `[]` |

`sourceZh` 在三个场景中始终返回原始顶层中文片段。后续轮次不把 `sourceZh` 改成被选中的子片段，因此可以追溯它来自哪一个原始卡点。

## 4. 如何决定动作

选择 `provide_expression`：

- 中文是词、短语或不可再拆的固定功能块；
- 给出一个英文块后，用户仍需自己组句、调整位置或完成语法连接；
- 该英文块不会独自完成当前命题。

选择 `request_focus`：

- 中文包含完整主谓命题或多个命题；或
- 即使形式上较短，直接翻译也会把当前核心判断完整交付，用户只剩粘贴；或
- 无法从原中文判断用户究竟卡在其中哪个具体表达。

不要只按字数判断。形式上含主谓、但实际是不可再拆且不承载主要命题的固定功能块，可以直接支援；当前迁移表中的 10 个 `clause / multi_clause` 均不属于这一窄例外。

## 5. 聚焦项规则

`focusOptionsZh` 必须同时满足：

1. 每项都是 `sourceZh` 中原样出现的连续子片段；
2. 每项严格短于 `sourceZh`；
3. 2—4 项，去重、不重叠，并按原文顺序排列；
4. 每项是可以单独寻求表达帮助的有意义单位，不切成单个虚词；
5. 只含中文原文，不含英文、释义、语法术语或推荐答案；
6. 不要求覆盖全文，也不要为了覆盖全文把所有答案块列齐。

例如，对 `额外的辅导时间不会自动转化为相称的学习进步`，初轮可以返回：

```json
{
  "sourceZh": "额外的辅导时间不会自动转化为相称的学习进步",
  "action": "request_focus",
  "focusZh": null,
  "recommendedExpression": null,
  "focusOptionsZh": ["额外的辅导时间", "不会自动转化为", "相称的学习进步"]
}
```

这三个中文选项用于让用户聚焦，不等于一次提供三段英文。用户每次只选择一项、得到一项支架。

## 6. 英文支架规则

- 同一 `focusZh` 只返回一个英文表达，不给候选列表。
- 返回最低但足够的词或短语，不返回重写后的完整 `target_sentence`。
- 使用题目和全文消歧，但不必把上下文中的所有细节重复塞进英文块。
- 保持用户的核心含义、立场、否定、可能性、程度和指代，不新增观点。
- 表达应自然，适合 IELTS Task 2；“能理解但有明显翻译腔”仍需改进。
- “可安装”不等于“原位零改动”。用户可以移动词序、改变词形、补冠词或介词并完成连接。

例如，`由当地居民经营的` 返回 `run by local residents` 是合法支架。用户把它移到 `shops` 之后，是有意保留的组句练习，不是模型失败。

## 7. 禁止项

- 遗漏、合并或打乱目标句中的顶层中文片段；
- 在 `request_focus` 中泄漏任何英文；
- 初轮把完整命题拆成多个英文 item 一次给齐；
- 后续轮次回答未被选择的其他聚焦项；
- 为同一帮助目标提供多个英文候选；
- 输出完整目标句、解释、Markdown 或额外字段；
- 因金标中的背景说明而强行扩写用户没有写出的内容。
