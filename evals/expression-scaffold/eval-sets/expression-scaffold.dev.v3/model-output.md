# v3 模型输出契约

## 统一结构

每次只返回：

```json
{
  "items": [
    {
      "sourceZh": "...",
      "action": "provide_expression | request_focus",
      "focusZh": "字符串或 null",
      "recommendedExpression": "字符串或 null",
      "focusOptionsZh": []
    }
  ]
}
```

## initial

必须覆盖目标句全部顶层中文片段，`sourceZh` 原样返回并保持顺序。

### `provide_expression`

- `focusZh = sourceZh`
- `recommendedExpression` 是一个英文表达
- `focusOptionsZh = []`

适用于单一最小表达块；用户仍需自行安装和组句。

### `request_focus`

- `focusZh = null`
- `recommendedExpression = null`
- `focusOptionsZh` 为 2—4 个中文语义聚焦项

每个聚焦项必须：

1. 可追溯到 `sourceZh` 的真实含义；
2. 严格短于 `sourceZh`，是可单独求助的语言单位；
3. 可以是连续原文，也可以是轻量语义归纳；
4. 不新增信息，不改变主体、客体、否定、可能性、关系或范围；
5. 去重、顺序符合原表达关系；
6. 不含英文、释义、答案提示或语法术语；
7. 不把完整命题换一种中文说法后整体返回。

`缩小城乡学生在获取教学资源方面的差距 → 缩小差距` 是允许的非连续语义单元；它保留原有关系，没有新增内容。

## selected_focus

- 只返回一个 item；
- `sourceZh` 与实际选择记录完全一致；
- `action = provide_expression`；
- `focusZh` 与 actual initial 的选项完全一致；
- 只给该项一个 `recommendedExpression`；
- `focusOptionsZh = []`；
- 不回答未选择部分，不返回完整目标句。

## 结构错误与质量问题分开

JSON、字段状态、片段覆盖、顺序、实际路径对应关系可以机械校验。语义聚焦项是否可追溯、粒度是否合适、英文是否自然，由独立 Codex 审核与人工校准判断，runner 不用字符匹配冒充语义判断。
