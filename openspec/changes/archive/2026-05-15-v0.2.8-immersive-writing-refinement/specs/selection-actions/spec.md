# selection-actions 规格增量

## ADDED Requirements

### Requirement: 选中文本操作必须先显示单一解释图标

选中文本后不得立即展示完整操作面板。系统必须先展示一个代表解释选中内容的轻量图标，用户点击后才调用解释接口。

#### Scenario: 用户选中文本
- **GIVEN** 用户位于主编辑器
- **WHEN** 用户选中一段文本
- **THEN** 页面只在选区附近显示解释图标
- **AND** 页面不立即显示 `选中文本操作` 面板
- **AND** 页面不调用 `/api/explain-selection`

#### Scenario: 用户点击解释图标
- **GIVEN** 用户已选中文本并看到解释图标
- **WHEN** 用户点击解释图标
- **THEN** 系统调用 `/api/explain-selection`
- **AND** 页面显示解释界面
- **AND** 不修改编辑器文本
