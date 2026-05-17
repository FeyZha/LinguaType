# paragraph-flow-shortcut Delta

## ADDED Requirements

### Requirement: 检查本段必须有直接快捷入口

用户必须能够通过 `Ctrl/Cmd + K` 直接触发当前光标所在段落的段落流畅度检查。

#### Scenario: 使用快捷键检查当前段落

- **GIVEN** 用户正在编辑正文并且光标位于某个段落内
- **WHEN** 用户按下 `Ctrl/Cmd + K`
- **THEN** 系统调用 `POST /api/check-paragraph-flow`
- **AND** 被检查的对象是当前光标所在段落
- **AND** 不打开表达菜单弹窗

### Requirement: 折叠侧边栏必须提供检查本段图标

折叠侧边栏顶部快捷区必须在增强当前句入口附近提供“检查本段”图标按钮。

#### Scenario: 点击折叠侧边栏检查本段

- **GIVEN** 写作存档侧边栏处于折叠状态
- **WHEN** 用户点击“检查本段”图标按钮
- **THEN** 系统执行与 `Ctrl/Cmd + K` 相同的段落流畅度检查链路

### Requirement: 表达菜单触发配置必须下线

触发设置不得再显示表达菜单触发方式，运行时不得再依赖 `ctrl_k`、`floating_button` 或 `disabled` 来决定表达菜单入口。

#### Scenario: 查看触发设置

- **GIVEN** 用户打开触发设置页面
- **WHEN** 页面渲染触发选项
- **THEN** 页面不显示表达菜单触发方式
- **AND** `Ctrl/Cmd + K` 被固定解释为检查本段

### Requirement: 表达资产入口必须保留

删除表达菜单不得删除表达库页面，也不得删除 Selection Actions 的解释、保存到表达库或复制能力。

#### Scenario: 使用选区保存

- **GIVEN** 用户选中正文里的英文文本
- **WHEN** 用户打开 Selection Actions
- **THEN** 仍可以解释选区、保存到表达库或复制选区
