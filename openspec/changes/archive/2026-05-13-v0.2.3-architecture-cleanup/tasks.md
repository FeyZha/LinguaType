# 任务清单

## 1. 记录当前产品范围

- [x] 1.1 创建 `PRODUCT.md`，说明当前 LinguaType 产品定义、目标用户、v0.2.2 当前范围、核心流程和 hard non-goals。
- [x] 1.2 保持 `PRODUCT.md` 与 `AGENTS.md` 一致，不引入新的产品能力。
- [x] 1.3 文档默认使用中文；必要时保留 English capability names，例如 `Learning Library`、`Writing Habits`、`Current Sentence`、`API Settings`。

## 2. 记录当前应用架构

- [x] 2.1 创建 `ARCHITECTURE.md`，说明当前 Next.js 应用结构和运行时分层。
- [x] 2.2 记录最新句数据流：从编辑器输入，到 `/api/enhance-fast`，再到 popover 展示。
- [x] 2.3 记录 Apply 数据流：冲突检测、range replacement、draft persistence、background extraction、Learning Library 保存、Correction Events 保存，以及可选 Paragraph Health check。
- [x] 2.4 记录轻量 Paragraph Health 与手动 Paragraph Flow 的边界。
- [x] 2.5 记录 Selection Explain 与 Save to Library 流程，不新增 selected-text rewriting。

## 3. 记录模块边界

- [x] 3.1 创建 `MODULES.md`，列出主要模块和对应文件。
- [x] 3.2 覆盖 app shell、主流程编排、编辑器 UI、增强展示、表达 UI、侧边栏面板、句子工具、存储工具、本地 proofreading、LLM contracts、prompts、service layer、provider adapters、API routes 和 tests。
- [x] 3.3 补充边界规则，保护 provider abstraction、range-based replacement、code-generated diff、localStorage ownership 和 Apply-gated learning persistence。

## 4. 添加 Changelog

- [x] 4.1 创建 `CHANGELOG.md`，记录 v0.1、v0.2、v0.2.1、v0.2.2 和计划中的 v0.2.3 文档清理。
- [x] 4.2 Changelog 保持事实性和高层摘要，不写成 agent instruction。

## 5. 更新 agent 交接说明

- [x] 5.1 更新 `AGENTS.md`，指向 `PRODUCT.md`、`ARCHITECTURE.md` 和 `MODULES.md`。
- [x] 5.2 保持 `AGENTS.md` 作为产品约束 source of truth。
- [x] 5.3 避免在 `AGENTS.md` 中重复会和新文档漂移的长篇架构叙述。

## 6. 验证文档-only change

- [x] 6.1 检查所有新增文档是否与当前代码路径和 `AGENTS.md` 一致。
- [x] 6.2 确认没有修改 `src/` 下的业务代码。
- [x] 6.3 不运行长期命令。
- [x] 6.4 如需验证命令，优先使用轻量检查。
