# Paragraph Health Spec Delta

## ADDED Requirements

### Requirement: 段落健康触发必须默认开启

段落健康必须保持开启，只允许用户选择每次 Apply 后触发或段落完成后触发，不得提供仅手动或关闭模式。

#### Scenario: 用户查看触发设置

- **GIVEN** 用户打开触发设置
- **WHEN** 用户查看段落健康触发方式
- **THEN** 页面只显示 `after_every_apply` 和 `after_paragraph_complete` 对应选项
- **AND** 页面不显示 `manual_only` 或 `off`

### Requirement: 段落完成后必须检查该段一次

当段落健康触发方式为 `after_paragraph_complete` 时，用户完成一个段落后，应用必须默认尝试检查该段一次。

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
