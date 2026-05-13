# 大纲检查触发规格更新

## MODIFIED Requirements

### Requirement: 应用必须显式检查大纲与主题的一致性

应用必须只在用户确认保存大纲或主题修改后调用后端大模型检查大纲是否符合文章主题。编辑过程中的新增、删除、输入、菜单打开和存档操作不得自动触发大纲检查。

#### Scenario: 用户编辑内联大纲草稿

- **GIVEN** 用户在编辑器内打开某个大纲点的内联编辑态
- **WHEN** 用户继续输入、添加大纲点或尝试删除大纲点
- **THEN** 应用不得调用 `/api/check-outline`
- **AND** 用户仍可继续编辑草稿

#### Scenario: 用户确认内联大纲修改

- **GIVEN** 用户在编辑器内完成主题或大纲修改
- **WHEN** 用户点击确定
- **THEN** 应用保存新的 Writing Setup
- **AND** 应用调用 `POST /api/check-outline`
- **AND** 检查过程不得阻塞正文写作

#### Scenario: 用户取消内联大纲修改

- **GIVEN** 用户正在编辑器内修改大纲点
- **WHEN** 用户点击取消
- **THEN** 应用丢弃草稿修改
- **AND** 不调用 `/api/check-outline`

#### Scenario: 用户操作写作存档栏

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户展开侧栏、打开 archive 菜单、切换 archive、重命名 archive 或删除 archive
- **THEN** 应用不得因此调用 `/api/check-outline`
