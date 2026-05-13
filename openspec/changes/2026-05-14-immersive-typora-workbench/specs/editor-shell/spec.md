# 编辑器壳层规格更新

## MODIFIED Requirements

### Requirement: 主界面必须保持 editor-first 工作台结构

主界面必须让正文编辑器保持第一优先级，同时可提供可折叠写作存档侧栏和低频工具区。沉浸式工作台不得把 LinguaType 变成聊天消息流或 dashboard。

#### Scenario: 用户进入主界面

- **GIVEN** 用户已经有 active archive 或完成 Writing Setup
- **WHEN** 主界面展示
- **THEN** 中央区域展示正文编辑器
- **AND** 写作存档和工具设置不得遮挡或取代正文编辑器
- **AND** 主界面不得呈现为聊天消息流

#### Scenario: 用户折叠写作存档栏

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击写作存档栏折叠按钮
- **THEN** 写作存档栏收起为窄栏或图标栏
- **AND** 正文编辑器仍保持可见和可输入
- **AND** 用户仍能找到展开入口

#### Scenario: 用户进入沉浸式写作状态

- **GIVEN** 用户位于主写作界面
- **WHEN** 写作存档栏处于收起状态
- **THEN** 中央正文编辑器获得更宽的居中写作空间
- **AND** 编辑器不被卡片边框或管理面板包围
- **AND** 低频工具区不得抢占正文的主要视觉权重

### Requirement: 主界面视觉必须服务于 Typora 式一体化写作

主界面应通过留白、字阶和弱化工具 chrome 来突出正文。文章主题、写作领域、大纲点和正文应形成同一个写作文档流。

#### Scenario: 用户查看文章主题和写作领域

- **GIVEN** active setup 中存在文章主题和写作领域
- **WHEN** 主写作界面展示
- **THEN** 文章主题以 H1 风格显示在编辑器文档流顶部
- **AND** 写作领域以低强调 metadata 形式显示在文章主题附近
- **AND** 应用不使用独立大卡片展示这些 setup 信息

#### Scenario: 用户查看低频工具

- **GIVEN** 用户位于主写作界面
- **WHEN** 右侧低频工具区展示
- **THEN** Review status、Learning Library、Writing Habits、Tools / Settings、Data Control 仍可访问
- **AND** 这些工具不得遮挡或压缩正文到不可舒适输入
- **AND** 高频写作操作仍位于编辑器附近
