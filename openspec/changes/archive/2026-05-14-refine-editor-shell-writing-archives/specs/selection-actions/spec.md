# Selection Actions 规格

## ADDED Requirements

### Requirement: Selection Actions 浮层必须根据选区动态定位

Selection Actions 浮层必须根据当前选中文本所在位置展示，不得固定在编辑器左上角。

#### Scenario: 用户选中第一段文本

- **GIVEN** 用户在第一段 textarea 中选中英文文本
- **WHEN** Selection Actions 浮层出现
- **THEN** 浮层显示在第一段选区附近
- **AND** 优先显示在选区上方
- **AND** 不遮挡选中文本

#### Scenario: 用户选中第二段文本

- **GIVEN** 用户在第二段 textarea 中选中英文文本
- **WHEN** Selection Actions 浮层出现
- **THEN** 浮层显示在第二段选区附近
- **AND** 不显示在第一段区域

#### Scenario: 选区靠近窗口边缘

- **GIVEN** 用户选中的文本靠近编辑器边缘
- **WHEN** Selection Actions 浮层计算位置
- **THEN** 浮层必须保持在可见区域内
- **AND** 如果上方空间不足，可以显示在选区下方

### Requirement: Selection Actions 用户文案必须中文优先且不重复

Selection Actions 的标题、按钮和状态文案必须中文优先，避免“中文 + 英文 capability name”重复并列。

#### Scenario: 浮层标题展示

- **GIVEN** 用户选中文本
- **WHEN** Selection Actions 浮层出现
- **THEN** 标题显示为“选中文本操作”或同等中文文案
- **AND** 不显示重复的 “Selection Actions” 英文标题

### Requirement: 解释选中内容必须结构化展示

解释选中内容后，前端必须以结构化中文区块展示解释结果，帮助用户理解含义、用法和语境作用。

#### Scenario: 用户解释选中内容

- **GIVEN** 用户选中英文表达
- **WHEN** 用户点击解释选中内容
- **THEN** 应用调用 `/api/explain-selection`
- **AND** 浮层展示结构化解释区块
- **AND** 至少区分含义和用法
- **AND** 不修改正文

### Requirement: Selection Actions 不得提供选中文本改写

Selection Actions 仍只允许解释选中内容和显式保存到表达库，不得新增选中文本润色、替换或自动改写。

#### Scenario: 用户查看 Selection Actions

- **GIVEN** 用户选中英文文本
- **WHEN** Selection Actions 浮层展示
- **THEN** 浮层可以提供解释选中内容
- **AND** 浮层可以提供保存到表达库
- **AND** 浮层不得提供 Polish selected、Find alternatives 或替换正文的操作

### Requirement: 解释结果不得返回替换文本

`/api/explain-selection` 相关 schema、prompt 和 provider normalization 不得引入会被用于替换正文的字段。

#### Scenario: 后端返回解释结果

- **GIVEN** 前端调用 `/api/explain-selection`
- **WHEN** route 返回解释结果
- **THEN** 结果可以包含含义、用法、表达类型和语境说明
- **AND** 不包含 `finalSentence`
- **AND** 不包含 replacement text
- **AND** 不包含 correctionEvents 或 learningItems
