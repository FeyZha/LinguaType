# 写作存档规格

## ADDED Requirements

### Requirement: 应用必须支持本地写作存档

应用必须允许用户在浏览器本地保存多篇写作内容，每篇存档包含正文、写作设置和标题。

#### Scenario: 用户新建写作存档

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击新建写作
- **THEN** 应用创建一个新的本地写作存档
- **AND** 新存档成为当前 active archive
- **AND** 不调用服务端持久化接口

#### Scenario: 用户切换写作存档

- **GIVEN** 用户已有多个写作存档
- **WHEN** 用户选择另一个存档
- **THEN** 应用先保存当前 active archive 的正文和 setup
- **AND** 应用加载被选择存档的正文和 setup
- **AND** 不写入 Learning Library 或 Correction Events

### Requirement: 写作存档必须保持 localStorage-only

写作存档数据必须只保存在 localStorage 中，不得引入登录、数据库或云同步。

#### Scenario: 保存写作存档

- **GIVEN** 用户正在编辑正文
- **WHEN** 应用保存当前写作存档
- **THEN** 数据写入 `linguatype.writingArchives.v1`
- **AND** 不创建账户、数据库、云同步或服务端 session

### Requirement: 应用必须兼容现有 draft 和 setup

应用必须能从现有 `linguatype.writingDraft.v1` 和 `linguatype.writingSetup.v1` 初始化写作存档，并保留 legacy key。

#### Scenario: 用户已有旧 draft

- **GIVEN** localStorage 中存在 `linguatype.writingDraft.v1`
- **AND** `linguatype.writingArchives.v1` 不存在
- **WHEN** 应用加载
- **THEN** 应用创建一个默认写作存档
- **AND** 默认存档包含旧 draft 文本
- **AND** 不删除 `linguatype.writingDraft.v1`

#### Scenario: 用户已有旧 setup

- **GIVEN** localStorage 中存在 `linguatype.writingSetup.v1`
- **AND** `linguatype.writingArchives.v1` 不存在
- **WHEN** 应用加载
- **THEN** 默认写作存档包含旧 setup
- **AND** 默认标题优先来自旧 setup 的文章主题
- **AND** 不删除 `linguatype.writingSetup.v1`

### Requirement: 用户必须能重命名写作存档

应用必须支持用户像重命名对话一样重命名写作存档标题，但该标题不得自动改写文章主题。

#### Scenario: 用户重命名存档

- **GIVEN** 用户已有一个 active archive
- **WHEN** 用户修改存档标题并确认
- **THEN** active archive 的 `title` 更新
- **AND** `setup.essayTopic` 不因重命名而自动改变

### Requirement: 写作存档不得保存学习数据

写作存档只保存正文和写作设置，不得把切换、重命名或自动保存视为学习数据保存动作。

#### Scenario: 自动保存当前写作

- **GIVEN** 用户编辑正文后触发自动保存
- **WHEN** 应用更新 active archive
- **THEN** 不写入 `linguatype.learningLibrary.v1`
- **AND** 不写入 `linguatype.correctionEvents.v1`
- **AND** 不触发 `/api/extract-learning`
