# 当前句建议规格

## Requirements

### Requirement: 当前句建议必须以内联 diff 形式呈现

latest-sentence enhancement 的结果必须靠近编辑器正文展示为当前句建议。建议可以使用行内建议条、当前段落附近浮层或等价的低干扰 UI，但不得变成聊天回复或整段改写面板。

#### Scenario: 用户触发最新句增强

- **GIVEN** 用户已经输入至少一个非空句子
- **WHEN** 用户触发 latest-sentence enhancement
- **THEN** 应用调用 `POST /api/enhance-fast`
- **AND** 应用在编辑器附近展示当前句建议
- **AND** 建议展示本地代码生成的 diff
- **AND** 删除内容以删除线样式显示
- **AND** 新增内容以高亮或强调样式显示

#### Scenario: 模型返回未变化结果

- **GIVEN** 用户触发 latest-sentence enhancement
- **WHEN** 模型返回的 final sentence 与 original sentence 语义和文本保持不变
- **THEN** 当前句建议仍可展示为无明显 diff 的结果
- **AND** 用户仍可 Cancel、Copy 或关闭建议
- **AND** 应用不得自动写入学习数据

### Requirement: 当前句建议必须保留 Apply/Cancel gate

当前句建议不得自动修改正文。只有用户显式 Apply 后，应用才可以替换 captured latest-sentence range 并触发背景学习提取。

#### Scenario: 用户点击 Apply

- **GIVEN** 当前句建议已经展示
- **AND** 当前 editor text 与 snapshotFullText 一致
- **WHEN** 用户点击 Apply
- **THEN** 应用只替换 captured latest-sentence range
- **AND** 保留替换处周围 spacing
- **AND** 应用可以在 Apply 后调用 `/api/extract-learning`

#### Scenario: 用户点击 Cancel

- **GIVEN** 当前句建议已经展示
- **WHEN** 用户点击 Cancel
- **THEN** 应用关闭当前句建议
- **AND** 不修改 editor text
- **AND** 不调用 `/api/extract-learning`
- **AND** 不写入 Learning Library 或 Correction Events

#### Scenario: 正文发生冲突后用户点击 Apply

- **GIVEN** 当前句建议捕获了 snapshotFullText
- **AND** 用户在建议生成后继续修改了正文
- **WHEN** 用户点击 Apply
- **THEN** 应用不得自动应用建议
- **AND** 应用提示用户重新增强
- **AND** 不调用 `/api/extract-learning`

### Requirement: 当前句建议不得扩大后端返回契约

`/api/enhance-fast` 必须继续只返回当前句增强需要的最小结果，不得返回学习数据、多个候选、HTML、Markdown 或整段改写。

#### Scenario: 前端请求当前句增强

- **GIVEN** 用户触发 latest-sentence enhancement
- **WHEN** `/api/enhance-fast` 返回成功响应
- **THEN** 响应只包含 `originalSentence`、`finalSentence`、`explanationZh`、`taskType` 和 `hasChinese`
- **AND** 响应不包含 `learningItems`
- **AND** 响应不包含 `correctionEvents`
- **AND** 响应不包含多个候选
