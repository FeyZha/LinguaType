# Paragraph Health Spec Delta

## ADDED Requirements

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
