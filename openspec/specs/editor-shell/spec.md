# 编辑器壳层规格

## Requirements

### Requirement: 主界面必须保持 editor-first 工作台结构

主界面必须让正文编辑器保持第一优先级，同时可提供固定可折叠 Writing Archives 侧栏和左侧低频功能入口。沉浸式工作台不得把 LinguaType 变成聊天消息流或 dashboard。

#### Scenario: 用户进入主界面

- **GIVEN** 用户已经有 active archive 或完成 Writing Setup
- **WHEN** 主界面展示
- **THEN** 中央区域展示正文编辑器
- **AND** Writing Archives 和工具设置不得遮挡或取代正文编辑器
- **AND** 主界面不得呈现为聊天消息流

#### Scenario: 用户折叠 Writing Archives 栏

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击 Writing Archives 栏折叠按钮
- **THEN** Writing Archives 栏收起为窄栏或图标栏
- **AND** 正文编辑器仍保持可见和可输入
- **AND** 用户仍能找到展开入口

#### Scenario: 用户进入沉浸式写作状态

- **GIVEN** 用户位于主写作界面
- **WHEN** Writing Archives 栏处于收起状态
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

#### Scenario: 用户查看低频功能页

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击左侧表达库、写作习惯或设置入口
- **THEN** 中间主舞台切换到对应页面
- **AND** 设置页合并 API Settings、触发与打扰设置、Data Control
- **AND** 右侧不得显示常驻低频工具区
- **AND** 高频写作操作仍位于编辑器附近

### Requirement: 主编辑器必须减少显式控制感

主编辑器中的标题、段落标题和正文必须优先表现为可写文档，而不是表单或管理面板。

#### Scenario: 用户编辑文章标题

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击文章标题并输入文本
- **THEN** 标题直接在文档流中被编辑
- **AND** 页面不显示独立标题输入框
- **AND** 页面不显示显式 `编辑` 按钮
- **AND** 左侧存档标题跟随新的文章标题显示

#### Scenario: 用户查看底部状态

- **GIVEN** 用户位于主写作界面
- **WHEN** 页面展示正文底部状态栏
- **THEN** 状态栏显示模式、强度、触发、领域、文本统计和本地校对问题数
- **AND** 页面不显示 `增强最新一句` 主按钮
- **AND** 页面不显示 `校对提示 Proofreading` 主按钮

### Requirement: 右上角工具必须保持低打扰

主题切换和 API 设置必须位于页面右上角，且不形成右侧常驻工具面板。

#### Scenario: 用户查看右上角工具

- **GIVEN** 用户位于任意主工作区页面
- **WHEN** 页面展示右上角工具
- **THEN** 主题切换只显示图标
- **AND** `API 设置` 与主题切换同排显示
- **AND** 页面最右侧不显示可见滚动条

### Requirement: 进入主界面后必须在编辑器内轻量修改 Writing Setup

用户进入主界面后，修改写作领域、文章主题或大纲必须通过编辑器内的轻量内联交互完成，不再使用主界面 Writing Setup 抽屉。

#### Scenario: 用户修改主题

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击文章主题旁的轻量编辑入口
- **THEN** 文章主题在编辑器区域内进入内联编辑态
- **AND** 正文编辑器仍保留在当前界面中
- **AND** 应用不展开 Writing Setup 抽屉

#### Scenario: 用户取消设置修改

- **GIVEN** 用户正在编辑器内修改主题、领域或大纲点
- **WHEN** 用户点击取消
- **THEN** 应用退出内联编辑态
- **AND** 不保存草稿修改
- **AND** 不调用 `/api/check-outline`

#### Scenario: 用户确认设置修改

- **GIVEN** 用户正在编辑器内修改主题、领域或大纲点
- **WHEN** 用户点击确定
- **THEN** 应用保存新的 Writing Setup
- **AND** active archive 同步保存新的 setup
- **AND** 应用可以按显式规则调用 `/api/check-outline`

### Requirement: 首次无本地写作时可以展示独立 Writing Setup

当用户没有 draft、setup 或 writing archive 时，应用可以继续展示独立 Writing Setup 作为首次准备入口。

#### Scenario: 用户首次打开应用

- **GIVEN** localStorage 中没有 draft、setup 或 writing archive
- **WHEN** 用户打开 LinguaType
- **THEN** 应用可以展示独立 Writing Setup
- **AND** Writing Setup 不调用 LLM
- **AND** Writing Setup 不生成正文

### Requirement: 主界面不得单独显示文章大纲管理卡片

主界面不得再用独立卡片重复展示完整文章大纲。大纲应嵌入正文段落标题或相关局部入口。

#### Scenario: 用户查看正文段落

- **GIVEN** active setup 中存在大纲点
- **WHEN** 主编辑器展示段落正文块
- **THEN** 每个段落标题显示对应大纲点
- **AND** 页面不再显示独立的文章大纲管理卡片

### Requirement: 大纲默认必须处于锁定状态

主界面中的大纲默认只读展示。用户必须明确进入修改状态后才能编辑大纲。

#### Scenario: 用户未点击修改大纲点

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户查看段落标题的大纲点
- **THEN** 大纲点以只读提示展示
- **AND** 不显示可直接编辑的大纲输入框

#### Scenario: 用户点击单个大纲点编辑入口

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击某个段落标题旁的大纲编辑入口
- **THEN** 仅该大纲点进入内联编辑态
- **AND** 其他大纲点保持只读展示
- **AND** 应用不展开 Writing Setup 抽屉
