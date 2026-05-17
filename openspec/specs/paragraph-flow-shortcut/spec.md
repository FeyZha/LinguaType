# paragraph-flow-shortcut Specification

## Requirements

### Requirement: 检查本段必须有直接快捷入口

用户必须能够通过 `Ctrl/Cmd + K` 直接触发当前光标所在段落的段落流畅度检查。

#### Scenario: 使用快捷键检查当前段落

- **GIVEN** 用户正在编辑正文并且光标位于某个段落内
- **WHEN** 用户按下 `Ctrl/Cmd + K`
- **THEN** 系统调用 `POST /api/check-paragraph-flow`
- **AND** 被检查的对象是当前光标所在段落
- **AND** 检查结果进入文章地图内的“本段检查”二级界面
- **AND** 不打开表达菜单弹窗

### Requirement: 折叠侧边栏必须提供检查本段图标

折叠侧边栏顶部快捷区必须在增强当前句入口附近提供“检查本段”图标按钮。

#### Scenario: 点击折叠侧边栏检查本段

- **GIVEN** 写作存档侧边栏处于折叠状态
- **WHEN** 用户点击“检查本段”图标按钮
- **THEN** 系统执行与 `Ctrl/Cmd + K` 相同的段落流畅度检查链路
- **AND** 检查结果进入文章地图内的“本段检查”二级界面

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

### Requirement: 文章地图中的检查本段必须复用 Paragraph Flow

文章地图段落节点中的“检查本段”必须进入现有 Paragraph Flow 当前段检查链路。它可以把目标段落定位为待检查段，但不得把全文作为可改写对象。

#### Scenario: 从文章地图检查某段

- **GIVEN** 文章地图中存在一个可定位的段落节点
- **WHEN** 用户点击该节点的“检查本段”
- **THEN** 应用调用 `POST /api/check-paragraph-flow`
- **AND** 文章地图面板进入“本段检查”二级界面
- **AND** 模型响应前显示运行中动效
- **AND** 请求中的 `paragraph` 只包含该段正文
- **AND** `fullText` 仅作为上下文传递
- **AND** 返回的 `revisedParagraph` 只可用于该段的手动 Apply Paragraph

### Requirement: Paragraph Flow 必须显示段落级问题和细节问题

`POST /api/check-paragraph-flow` 必须在当前段范围内同时返回段落级 `issues` 和本地细节 `detailIssues`。细节问题可以覆盖 grammar、spelling、punctuation、article、tense、word_form、preposition、collocation 和 spacing，但不得扩展为全文批改或作文评分。

#### Scenario: 段落检查返回细节问题

- **GIVEN** 用户手动触发“检查本段”
- **WHEN** 模型返回 Paragraph Flow 结果
- **THEN** 结果可以包含 `detailIssues`
- **AND** UI 在“细节问题”区域展示语法、拼写、标点等细节问题
- **AND** Apply Paragraph 仍只能手动替换被检查段落

### Requirement: 从文章地图 Apply Paragraph 必须保持冲突检测

当用户从文章地图进入 Paragraph Flow 后，Apply Paragraph 必须继续使用检查时捕获的正文快照和段落 range 进行冲突检测。正文变化时不得自动替换。

#### Scenario: 检查后正文已变化

- **GIVEN** 用户从文章地图对第 2 段运行 Paragraph Flow
- **AND** 检查完成后用户修改了正文
- **WHEN** 用户点击 Apply Paragraph
- **THEN** 应用检测到当前正文与检查快照不一致
- **AND** 不自动替换段落
- **AND** 提示用户重新检查该段
