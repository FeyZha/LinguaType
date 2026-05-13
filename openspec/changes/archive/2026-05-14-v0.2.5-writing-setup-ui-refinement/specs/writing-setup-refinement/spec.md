# Writing Setup 优化规格

## ADDED Requirements

### Requirement: 写作领域必须直接展示

Writing Setup 必须直接展示写作领域选项，不得使用下拉框作为主要选择方式。

#### Scenario: 用户选择写作领域

- **GIVEN** 用户打开 Writing Setup
- **WHEN** 用户查看写作领域区域
- **THEN** 用户能直接看到所有领域选项
- **AND** 用户可以点击一个领域使其成为当前领域
- **AND** 写作领域不以 select 下拉框作为主要 UI

### Requirement: 写作领域必须包含 10 个预设领域

Writing Setup 必须提供 10 个预设写作领域。

#### Scenario: 领域选项展示

- **GIVEN** 用户打开 Writing Setup
- **WHEN** 领域选项展示
- **THEN** 至少包含科技、个人成长、历史、艺术、教育、社会、环境、商业、文化、健康

### Requirement: 每个领域必须提供 10 个预设文章主题

每个写作领域必须配置 10 个对应的预设文章主题，用于帮助用户快速开始。

#### Scenario: 用户刷新文章主题

- **GIVEN** 用户已经选择一个写作领域
- **WHEN** 用户点击文章主题输入框右侧的刷新按钮
- **THEN** 应用从当前领域的预设主题中抽取一个填入主题输入框
- **AND** 不调用 LLM
- **AND** 不生成正文
- **AND** 不自动修改大纲

### Requirement: 文章主题必须同时支持输入和刷新

文章主题区域必须保留用户自由输入能力，并在输入框最右侧提供刷新按钮。

#### Scenario: 用户手动输入主题

- **GIVEN** 用户位于文章主题输入框
- **WHEN** 用户输入自己的主题
- **THEN** 应用保留用户输入的主题

#### Scenario: 用户刷新主题

- **GIVEN** 用户位于文章主题输入框
- **WHEN** 用户点击刷新按钮
- **THEN** 输入框内容变为当前领域的一个预设主题

### Requirement: 大纲必须使用多个独立输入框

Writing Setup 的大纲必须按点拆分为多个独立输入框，不再使用一个整体 textarea。

#### Scenario: 默认大纲

- **GIVEN** 用户打开 Writing Setup
- **WHEN** 大纲区域展示
- **THEN** 默认显示 3 个大纲点输入框
- **AND** 每个输入框前标注“第 N 点”

#### Scenario: 用户增加大纲点

- **GIVEN** 用户位于大纲区域
- **WHEN** 用户点击添加按钮
- **THEN** 应用增加一个新的大纲点输入框
- **AND** 新输入框序号正确更新

#### Scenario: 用户减少大纲点

- **GIVEN** 用户位于大纲区域
- **WHEN** 用户点击减少按钮
- **THEN** 应用减少一个大纲点输入框
- **AND** 不应误删已有用户输入内容

### Requirement: 大纲存储必须支持结构化数组

Writing Setup storage 必须支持 `outlinePoints: string[]`，并兼容旧的 `outline: string`。

#### Scenario: 读取旧 outline 字符串

- **GIVEN** localStorage 中存在旧 `outline: string`
- **WHEN** 应用加载 Writing Setup
- **THEN** 应用按换行拆分为 `outlinePoints`
- **AND** 去掉空行
- **AND** 如拆分结果为空则默认 3 个空大纲点
