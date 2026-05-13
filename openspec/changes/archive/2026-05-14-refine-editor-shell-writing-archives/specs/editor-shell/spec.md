# 编辑器壳层与设置抽屉规格

## ADDED Requirements

### Requirement: 主界面必须保持 editor-first 工作台结构

主界面必须让正文编辑器保持第一优先级，同时可提供写作存档侧边栏和低频工具区。

#### Scenario: 用户进入主界面

- **GIVEN** 用户已经有 active archive 或完成 Writing Setup
- **WHEN** 主界面展示
- **THEN** 中央区域展示正文编辑器
- **AND** 写作存档和工具设置不得遮挡或取代正文编辑器
- **AND** 主界面不得呈现为聊天消息流

### Requirement: 进入主界面后必须通过抽屉修改 Writing Setup

用户进入主界面后，修改写作领域、文章主题或大纲必须通过可展开的设置抽屉完成，而不是离开正文回到独立准备页。

#### Scenario: 用户修改主题

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击修改主题入口
- **THEN** 应用展开 Writing Setup 抽屉
- **AND** 正文编辑器仍保留在当前界面中

#### Scenario: 用户取消设置修改

- **GIVEN** 用户在 Writing Setup 抽屉中修改了主题或大纲
- **WHEN** 用户点击取消
- **THEN** 应用关闭抽屉
- **AND** 不保存抽屉中的草稿修改
- **AND** 不调用 `/api/check-outline`

#### Scenario: 用户确认设置修改

- **GIVEN** 用户在 Writing Setup 抽屉中修改了主题或大纲
- **WHEN** 用户点击确定
- **THEN** 应用保存新的 Writing Setup
- **AND** active archive 同步保存新的 setup

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
- **WHEN** 主编辑器展示段落输入框
- **THEN** 每个段落标题显示对应大纲点
- **AND** 页面不再显示独立的文章大纲管理卡片

### Requirement: 大纲默认必须处于锁定状态

主界面中的大纲默认只读展示。用户必须明确进入修改状态后才能编辑大纲。

#### Scenario: 用户未点击修改大纲

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户查看段落标题的大纲点
- **THEN** 大纲点以只读提示展示
- **AND** 不显示可直接编辑的大纲输入框

#### Scenario: 用户点击修改大纲

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击修改大纲入口
- **THEN** 应用展开 Writing Setup 抽屉
- **AND** 用户可以在抽屉中编辑大纲点
