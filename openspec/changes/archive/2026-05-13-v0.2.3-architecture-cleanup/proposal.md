# v0.2.3 架构文档清理

## 背景

LinguaType v0.2.2 已经从“最新句增强器”扩展为以编辑器为中心的英文表达学习助手。当前产品约束已经集中写在 `AGENTS.md` 中，但应用结构、模块归属、端到端数据流还没有形成一份稳定的交接文档。

本次 change 的目标是基于当前代码补齐架构文档，让后续维护者和 Codex agent 能在不改变现有体验的前提下理解系统边界，避免误把 LinguaType 做成聊天机器人、翻译器、作文批改器或大型 dashboard。

## 改动范围

- 新增并补齐当前状态的产品与架构文档：
  - `PRODUCT.md`
  - `ARCHITECTURE.md`
  - `MODULES.md`
  - `CHANGELOG.md`
  - 更新 `AGENTS.md`
- 梳理当前应用的主要模块。
- 标注每个模块对应的主要文件。
- 明确用户从输入、增强、展示、Apply、替换到本地保存的完整数据流。
- 明确 UI 组件、句子/范围工具、本地存储、API routes、LLM service/provider、测试之间的边界。
- 保持现有 v0.2.2 产品行为不变。

## 非目标

- 不新增用户可见功能。
- 不调整现有 UX。
- 不做大规模重构。
- 不删除已有功能。
- 不新增后端数据库、登录、云同步、支付、Chrome extension 或真实系统输入法。
- 不改变最新句增强、Apply/Cancel、段落检查、Selection Actions、本地 proofreading、localStorage key 或 API contract。

## 预期结果

实现完成后，未来维护者应能快速回答：

- LinguaType 当前是什么产品，不是什么产品？
- 当前主要模块分别由哪些文件负责？
- 用户文本如何从编辑器进入增强流程，再展示结果并 Apply？
- Learning Library 和 Writing Habits 数据保存在哪里？
- 哪些模块边界不能在没有新 OpenSpec change 的情况下随意跨越？

## 风险

主要风险是文档漂移，或在整理文档时无意写出与 `AGENTS.md` 冲突的规则。因此实现时应只描述当前行为，把 `AGENTS.md` 继续保留为产品约束的 source of truth，并避免任何业务行为改动。
