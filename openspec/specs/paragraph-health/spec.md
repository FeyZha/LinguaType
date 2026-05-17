# 段落健康规格

## Requirements

### Requirement: 段落健康必须默认开启

段落健康是主写作流里的轻量反馈能力，必须保持开启，只允许用户选择 `after_every_apply` 或 `after_paragraph_complete`，不得提供 `manual_only` 或 `off`。

#### Scenario: 用户查看触发设置

- **GIVEN** 用户打开触发设置
- **WHEN** 用户查看段落健康触发方式
- **THEN** 页面只显示每次应用后和段落完成后
- **AND** 页面不显示仅手动或关闭

#### Scenario: 读取旧触发设置

- **GIVEN** localStorage 中存在旧 `paragraphHealthTrigger`
- **WHEN** 值为 `after_3_applied_edits`
- **THEN** 应迁移为 `after_paragraph_complete`
- **WHEN** 值为 `manual_only` 或 `off`
- **THEN** 应迁移为 `after_every_apply`

### Requirement: 段落完成后必须检查该段一次

当触发方式为 `after_paragraph_complete` 时，用户完成一个段落后，应用必须默认尝试检查该段一次。

#### Scenario: 用户写完一段

- **GIVEN** 段落健康触发方式为 `after_paragraph_complete`
- **WHEN** 用户写出一个至少两句的段落并输入空行进入下一段
- **THEN** 应用调用 `POST /api/check-paragraph-health`
- **AND** 请求只检查刚完成的段落

### Requirement: 段落健康过滤必须按段落生效

运行中状态、段落流畅度冲突和 30 秒节流必须按段落指纹分别判断，不得让一个段落阻塞另一个段落的健康检查。

#### Scenario: 两个段落连续完成

- **GIVEN** 两个不同段落都满足段落健康检查条件
- **WHEN** 用户连续完成这两个段落
- **THEN** 应用可以分别为两个段落调用 `POST /api/check-paragraph-health`
- **AND** 不因全局 30 秒节流跳过第二个段落

### Requirement: 段落健康不得要求 40 个英文词

段落健康检查不得再使用 40 个英文词作为过滤条件。

#### Scenario: 用户写出短段落

- **GIVEN** 当前段落至少有两句但少于 40 个英文词
- **WHEN** 段落健康触发条件满足
- **THEN** 应用仍可调用 `POST /api/check-paragraph-health`

### Requirement: 段落健康不得改写正文或保存学习数据

段落健康只能显示轻量提醒，不得返回或应用段落改写，不得保存 Learning Library 或 Correction Events。

#### Scenario: 段落健康返回结果

- **GIVEN** `/api/check-paragraph-health` 返回结果
- **WHEN** 前端处理结果
- **THEN** 前端最多显示段落健康提醒
- **AND** 不替换正文
- **AND** 不调用 `/api/extract-learning`

### Requirement: 文章地图中的查看建议必须复用段落健康边界

文章地图段落节点中的“查看建议”必须只展示轻量段落健康提示。它可以读取 `linguatype.paragraphHealthCache.v1`，也可以在没有可用缓存时按现有段落健康规则调用 `POST /api/check-paragraph-health`，但不得生成、展示或应用段落改写。结果必须显示在当前段落卡片内，不得使用右下角独立浮层。

#### Scenario: 从文章地图查看段落健康建议

- **GIVEN** 用户已经生成文章地图并展开某个段落节点
- **WHEN** 用户点击“查看建议”
- **THEN** 应用在该段卡片内展示轻量健康提示
- **AND** 不展示 `revisedParagraph`
- **AND** 不调用 `POST /api/check-paragraph-flow`
- **AND** 不生成 diff
- **AND** 不替换正文
- **AND** 不保存 Learning Library 或 Correction Events
- **AND** 不显示右下角独立段落健康浮层

### Requirement: 文章地图不得绕过段落健康运行过滤

从文章地图触发段落健康时，必须继续遵守段落健康的至少两句、按段落 running 状态、按段落 Paragraph Flow 冲突、30 秒节流和缓存规则。

#### Scenario: 当前段落已有 Paragraph Flow 在运行

- **GIVEN** 某段正在进行 Paragraph Flow 检查
- **WHEN** 用户在文章地图中点击该段“查看建议”
- **THEN** 应用不得同时为该段启动新的 paragraph health 请求
- **AND** 可以提示稍后查看或等待当前段落检查结束
