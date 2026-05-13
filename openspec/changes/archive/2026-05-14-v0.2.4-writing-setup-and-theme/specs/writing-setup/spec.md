# Writing Setup 规格

## ADDED Requirements

### Requirement: 应用必须提供写作准备入口

LinguaType 必须在用户进入主写作流程之前提供轻量 Writing Setup，用于收集写作领域、文章主题和大纲。

#### Scenario: 用户首次进入写作流程

- **GIVEN** 用户没有选择继续上次写作
- **WHEN** 用户打开 LinguaType
- **THEN** 应用展示 Writing Setup
- **AND** 主编辑器不应在用户完成或跳过 setup 前成为默认第一屏

#### Scenario: 用户完成写作准备

- **GIVEN** 用户位于 Writing Setup
- **WHEN** 用户选择写作领域，并填写文章主题和大纲
- **THEN** 用户可以进入主编辑器
- **AND** 应用保存 writing setup 到 localStorage

### Requirement: 写作领域必须提供固定选项和自定义选项

Writing Setup 必须提供一组固定写作领域选项，并允许用户选择自定义领域。

#### Scenario: 用户选择固定领域

- **GIVEN** 用户打开 topic area 选择框
- **WHEN** 选项列表展示
- **THEN** 至少包含科技、个人成长、历史、艺术、教育、社会、环境、商业
- **AND** 用户可以选择其中一个作为当前写作领域

#### Scenario: 用户选择自定义领域

- **GIVEN** 用户选择自定义 topic area
- **WHEN** 自定义输入框出现
- **THEN** 用户可以输入自己的领域名称
- **AND** 保存时保留该自定义领域文本

### Requirement: Writing Setup 必须保持 localStorage-only

Writing Setup 数据必须只保存在浏览器 localStorage 中，不得写入服务端或新增数据库。

#### Scenario: 保存 Writing Setup

- **GIVEN** 用户完成 Writing Setup
- **WHEN** 应用保存 setup 数据
- **THEN** 数据写入 `linguatype.writingSetup.v1`
- **AND** 不调用任何服务端持久化接口
- **AND** 不创建登录、账户、同步或数据库依赖

### Requirement: Writing Setup 不得触发自动写作

Writing Setup 收集的领域、主题和大纲只能作为用户写作上下文，不得触发自动正文生成、自动续写或自动段落改写。

#### Scenario: 用户填写大纲

- **GIVEN** 用户在 Writing Setup 中填写大纲
- **WHEN** 用户进入编辑器
- **THEN** 应用不得自动生成文章正文
- **AND** 应用不得根据大纲自动续写下一句
- **AND** latest-sentence enhancement 仍只处理用户已经写出的最新非空句

#### Scenario: enhancement 使用 setup context

- **GIVEN** 应用在 enhancement request 中使用 Writing Setup 信息作为 context
- **WHEN** `/api/enhance-fast` 处理最新句
- **THEN** setup 信息只能用于 tone、meaning、coherence reference
- **AND** 模型不得生成新论点或决定用户写作方向

### Requirement: 用户必须能继续上次写作

如果本地存在 draft 或已保存 setup，应用必须提供继续上次写作路径，避免 Writing Setup 阻断高频写作。

#### Scenario: 本地存在 draft

- **GIVEN** `linguatype.writingDraft.v1` 中存在非空 draft
- **WHEN** 用户打开 LinguaType
- **THEN** Writing Setup 应提供继续上次写作入口
- **AND** 用户可以回到编辑器继续使用现有 latest-sentence flow

### Requirement: Writing Setup 不得保存学习数据

Writing Setup 阶段不得写入 Learning Library、Correction Events 或 Writing Habits。

#### Scenario: 用户进入编辑器前保存 setup

- **GIVEN** 用户完成 Writing Setup
- **WHEN** 应用保存 setup 并进入编辑器
- **THEN** 不写入 `linguatype.learningLibrary.v1`
- **AND** 不写入 `linguatype.correctionEvents.v1`
- **AND** 不触发 background learning extraction
