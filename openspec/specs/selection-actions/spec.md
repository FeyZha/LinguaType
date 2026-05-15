# Selection Actions 规格

## Requirements

### Requirement: Selection Actions 浮层必须根据选区动态定位

Selection Actions 浮层必须根据当前选中文本所在位置展示，不得固定在编辑器左上角。

#### Scenario: 用户选中正文前半部分文本

- **GIVEN** 用户在正文长文本写作面中选中英文文本
- **WHEN** Selection Actions 浮层出现
- **THEN** 浮层显示在当前选区附近
- **AND** 优先显示在选区上方
- **AND** 不遮挡选中文本

#### Scenario: 用户选中正文后半部分文本

- **GIVEN** 用户在正文长文本写作面较靠后位置选中英文文本
- **WHEN** Selection Actions 浮层出现
- **THEN** 浮层显示在该选区附近
- **AND** 不固定在正文开头区域

#### Scenario: 选区靠近窗口边缘

- **GIVEN** 用户选中的文本靠近编辑器边缘
- **WHEN** Selection Actions 浮层计算位置
- **THEN** 浮层必须保持在可见区域内
- **AND** 如果上方空间不足，可以显示在选区下方

### Requirement: 选中文本操作必须显示轻量功能条

选中文本后不得再显示单独解释小图标。系统必须展示一个贴近选区的轻量功能条，用户点击“解释”后才调用解释接口。

#### Scenario: 用户选中文本

- **GIVEN** 用户位于主编辑器
- **WHEN** 用户选中一段文本
- **THEN** 页面在选区附近显示轻量功能条
- **AND** 功能条提供解释、保存、复制和关闭入口
- **AND** 页面不调用 `/api/explain-selection`

#### Scenario: 用户点击解释

- **GIVEN** 用户已选中文本并看到功能条
- **WHEN** 用户点击解释
- **THEN** 系统调用 `/api/explain-selection`
- **AND** 页面显示解释界面
- **AND** 不修改编辑器文本

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

Selection Actions 仍只允许解释选中内容、显式保存到表达库和复制选中文本，不得新增选中文本润色、替换或自动改写。

#### Scenario: 用户查看 Selection Actions

- **GIVEN** 用户选中英文文本
- **WHEN** Selection Actions 浮层展示
- **THEN** 浮层可以提供解释选中内容
- **AND** 浮层可以提供保存到表达库
- **AND** 浮层可以提供复制选中文本
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
