# 架构文档规格

## ADDED Requirements

### Requirement: 产品文档必须描述当前范围

项目必须包含产品文档，用于说明 LinguaType 当前产品身份、目标用户、editor-first 核心流程和 hard non-goals，并且不得新增能力。

#### Scenario: 未来维护者阅读产品范围

- **GIVEN** 维护者打开 `PRODUCT.md`
- **WHEN** 他们查找 LinguaType 是什么、不是什么
- **THEN** 他们能看到 LinguaType 是面向中文母语学习者的 input-method-like latest-sentence 英文表达助手
- **AND** 他们能看到 LinguaType 不是 chatbot、translator、essay generator、essay scorer、cloud-sync product、Chrome extension 或 system input method

#### Scenario: 产品文档保持当前行为

- **GIVEN** `PRODUCT.md` 描述 v0.2.2 行为
- **WHEN** 它描述 enhancement、Apply、learning data、paragraph checks、selection actions 和 local proofreading
- **THEN** 它只描述当前已有行为
- **AND** 它不引入新的 UX、storage、API 或 AI behavior

### Requirement: 架构文档必须记录当前数据流

项目必须包含架构文档，用于追踪完整 latest-sentence flow：从编辑器输入，到增强结果、Apply、替换和本地保存。

#### Scenario: 最新句增强流程被记录

- **GIVEN** 维护者打开 `ARCHITECTURE.md`
- **WHEN** 他们阅读 latest-sentence flow
- **THEN** 他们能跟踪 editor input、`extractLatestSentence`、enhancement request snapshot、`POST /api/enhance-fast`、LLM service/provider handling、返回结果 shape、code-generated diff 和 `EnhancementPopover` 展示

#### Scenario: Apply 流程被记录

- **GIVEN** 维护者打开 `ARCHITECTURE.md`
- **WHEN** 他们阅读 Apply flow
- **THEN** 他们能跟踪 conflict detection、range-based replacement、draft persistence、后台 `POST /api/extract-learning`、Learning Library upsert、Correction Events upsert 和可选 Paragraph Health gating

#### Scenario: 非 Apply 操作不保存学习数据

- **GIVEN** 文档描述 Cancel、Regenerate、Copy revised sentence、Selection Explain 和 Paragraph Flow
- **WHEN** 维护者检查这些操作的 persistence behavior
- **THEN** 文档明确说明这些操作不会保存 latest-sentence learning data 或 correction events

### Requirement: 模块文档必须标注归属和边界

项目必须包含模块文档，列出主要模块、负责文件、职责、允许的依赖方向和边界规则。

#### Scenario: 维护者定位模块负责人

- **GIVEN** 维护者打开 `MODULES.md`
- **WHEN** 他们查找 editor orchestration、sentence extraction、local storage、LLM prompts、provider adapters、API routes、paragraph flow、selection actions、proofreading 或 data control
- **THEN** 他们能找到该模块的主要文件和职责说明

#### Scenario: 边界规则防止架构漂移

- **GIVEN** 未来 change 涉及 AI behavior、storage、replacement 或 diffs
- **WHEN** 维护者检查 `MODULES.md`
- **THEN** 他们能看到 product logic 必须使用 LLM service abstraction、本地数据必须保留在 localStorage、latest-sentence replacement 必须基于 range、diff highlighting 必须由代码生成

### Requirement: Agent 交接必须引用架构文档但不重复长篇内容

`AGENTS.md` 必须继续作为产品约束的 source of truth，并引用新的架构文档作为结构上下文，而不是重复长篇架构叙述。

#### Scenario: 未来 agent 开始工作

- **GIVEN** 未来 agent 打开 `AGENTS.md`
- **WHEN** 它查找产品约束和架构上下文
- **THEN** 它能在 `AGENTS.md` 中看到产品约束
- **AND** 它会被指向 `PRODUCT.md`、`ARCHITECTURE.md` 和 `MODULES.md` 来理解当前结构和模块边界

### Requirement: Changelog 必须总结产品里程碑

项目必须包含简洁 changelog，记录高层产品里程碑，但不能变成实现手册。

#### Scenario: 维护者查看版本历史

- **GIVEN** 维护者打开 `CHANGELOG.md`
- **WHEN** 他们查看 v0.1 到 v0.2.3 的条目
- **THEN** 他们能看到主要产品和文档里程碑
- **AND** 详细实现规则仍保留在 `AGENTS.md`、`ARCHITECTURE.md` 和 `MODULES.md`

### Requirement: 架构清理不得改变运行时行为

v0.2.3 架构清理必须是 documentation-only，除非未来 proposal 明确扩大范围。

#### Scenario: 实现完成

- **GIVEN** v0.2.3 architecture cleanup 已实现
- **WHEN** 审查 changed files
- **THEN** 改动仅限文档和 OpenSpec artifacts
- **AND** `src/` 下的业务代码没有被修改
- **AND** 现有用户体验、API contracts、localStorage keys 和产品行为保持不变

### Requirement: 后续项目文档默认使用中文

后续新增或更新的项目文档必须默认使用中文表达，除非文件格式、代码标识符、API contract 或 capability name 需要保留英文。

#### Scenario: 创建或更新项目文档

- **GIVEN** 维护者创建或更新 `PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`、`CHANGELOG.md` 或 OpenSpec artifacts
- **WHEN** 文档内容面向项目维护和产品说明
- **THEN** 正文默认使用中文
- **AND** 代码路径、函数名、localStorage keys、API routes、schema 名称和产品 capability names 可以保留英文
