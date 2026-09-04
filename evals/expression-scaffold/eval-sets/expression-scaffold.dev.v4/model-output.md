# v4 模型输出与揭示契约

## 单次模型输出

每个 case 只调用模型一次，覆盖目标句全部顶层中文片段，`sourceZh` 原样返回并保持顺序。

### 直接表达

```json
{
  "sourceZh": "门槛",
  "action": "provide_expression",
  "recommendedExpression": "barrier to entry",
  "scaffolds": []
}
```

适用于一个英文表达已足够、且用户仍需自行安装和组句的语言单位。

### 分层支架包

```json
{
  "sourceZh": "缩小城乡学生在获取教学资源方面的差距",
  "action": "offer_scaffolds",
  "recommendedExpression": null,
  "scaffolds": [
    {"scaffoldId": "s1", "focusZh": "缩小差距", "recommendedExpression": "narrow the gap"},
    {"scaffoldId": "s2", "focusZh": "城乡学生", "recommendedExpression": "students in urban and rural areas"},
    {"scaffoldId": "s3", "focusZh": "获取教学资源", "recommendedExpression": "access educational resources"}
  ]
}
```

每个支架必须：

1. 中文项可追溯到 `sourceZh`，但不必是连续子串；
2. 是可单独求助、严格小于整段命题的语义单位；
3. 只给一个对应英文表达，不给候选；
4. 不新增信息，不改变主体客体、否定、可能性、关系或范围；
5. 支架之间去重，并尽量覆盖用户最可能卡住的核心表达；
6. 即使全部揭示，也不直接返回完整目标句，仍需要用户决定词序、词形、连接和取舍。

## 可见性规则

模型返回的 `recommendedExpression` 可以被运行记录保存，但复杂项中的英文默认不是用户可见内容。用户点击哪个中文支架，界面才揭示对应英文。界面不得把整份内部 JSON 直接渲染给用户。

结构 schema 只证明字段与状态合法。语义是否可追溯、粒度是否足够小、英文是否自然，以及全部支架是否合起来变成代写，由独立审核与人工校准判断。

