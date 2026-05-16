# Design

## Product Intent

表达复现提示传达的是：

```text
你不是又依赖 AI 得到答案，而是已经自然写出了自己学过的表达。
```

因此它的交互必须比 AI 修改和本地校对更轻：默认只在原文位置给一次视觉感知，不弹出卡片，不阻断输入，不改变正文。

## Interaction Model

- 默认状态：写作区保持安静。
- 触发：用户停顿后，正文与表达库中高价值表达产生本地规则命中。
- 反馈：命中文本下方出现一次浅色细线扫过动效，随后留下极淡静态线或接近无感的标识。
- hover/focus：在命中文本附近展示小型说明，文案只说明“表达库命中 / 之前学过这个表达”，可展示标准表达、释义和来源。
- 关闭：不需要用户关闭；移开 hover/focus 后说明消失。

## Matching Rules

第一版只做可控规则匹配：

- 输入来源：`linguatype.learningLibrary.v1` 中的 `phrase` 和 `collocation`。
- 过滤规则：忽略空内容、单个普通词、过短表达和个人词典条目。
- 标准化：大小写不敏感，忽略常见标点和多余空格，统一英文撇号。
- 可识别变体：支持 `one's` 到 `my/your/his/her/its/our/their/...’s` 的简单占位匹配；支持少量动词屈折变体。
- 节制规则：同一句最多一个命中；同一文档同一表达只播放一次动效。

近似语义匹配、同义改写和跨句型推断留到后续版本。

## Data Boundaries

- 本功能不调用任何 API route。
- 本功能不写入 Learning Library 或 Correction Events。
- 本功能不改变 latest-sentence enhancement、Apply/Cancel、placeholder suggestion cache 或 proofreading storage。
- 第一版的“已展示动效”状态仅保存在当前前端 session 内；刷新页面可重新计算匹配。

## UI Boundaries

- AI 修改入口继续表示“这里有可打开的模型建议”。
- 本地校对 tag 继续表示“这里有本地检测到的问题”。
- 表达复现提示只表示“你写出了表达库里的表达”。
- 三者不得共用同一图标、右侧 tag 样式或当前句建议卡片。

## Test Strategy

- 为表达匹配规则增加纯函数测试，覆盖 phrase/collocation、`one's` 变体、动词屈折、短词过滤和每句最多一个命中。
- 为写作区渲染增加组件测试，确认命中提示独立于 proofreading tag 和 AI suggestion marker。
- 验证功能不触发 fetch，不写 localStorage 学习数据，不改变正文 value。
