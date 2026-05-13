# 设计说明

## 当前架构快照

LinguaType 是一个基于 Next.js App Router 的 Web 应用。前端是 editor-first 的 React 写作界面，本地数据保存在浏览器 localStorage 中，服务端 API routes 通过 LLM provider abstraction 调用模型。

```text
用户
  |
  v
src/app/page.tsx
  |
  v
src/components/LinguaTypeApp.tsx
  |
  +--> 编辑器与高频 UI
  |       - WritingEditor
  |       - EnhancementPopover
  |       - InlineExpressionMenu
  |       - SelectionActionsPopover
  |
  +--> 本地域工具
  |       - src/lib/sentence.ts
  |       - src/lib/storage.ts
  |       - src/lib/proofreading.ts
  |
  +--> API routes
          - /api/enhance-fast
          - /api/extract-learning
          - /api/check-paragraph-health
          - /api/check-paragraph-flow
          - /api/explain-selection
          - /api/test-connection
          - /api/enhance-latest-sentence legacy
              |
              v
          src/lib/llm/service.ts
              |
              v
          src/lib/llm/providers/*
```

## 需要文档化的模块边界

| 模块 | 主要文件 | 职责 |
| --- | --- | --- |
| App shell | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | 挂载 LinguaType 主体验并提供全局样式。 |
| 主流程编排 | `src/components/LinguaTypeApp.tsx` | 负责编辑器状态、API 调用、增强请求快照、Apply 冲突检测、后台学习提取、Paragraph Health gating、Selection Actions、侧边栏状态和 localStorage hydration。 |
| 编辑器 UI | `src/components/WritingEditor.tsx`, `src/components/ModeSelector.tsx`, `src/components/EnhancementLevelSelector.tsx`, `src/components/ShortcutHint.tsx` | 展示写作控件，并把用户输入和快捷键触发交回主流程编排层。 |
| 增强结果展示 | `src/components/EnhancementPopover.tsx`, `src/components/DiffViewer.tsx`, `src/components/StateViews.tsx` | 展示当前句建议、代码生成的 diff、简短解释、Apply、Cancel、Regenerate、Copy 和状态视图。 |
| 表达与选区 UI | `src/components/InlineExpressionMenu.tsx`, `src/components/SelectionActionsPopover.tsx`, `src/components/NextExpressionToolbox.tsx` | 把高频表达动作放在编辑器附近，但不自动续写、不重写选中文本。 |
| 侧边栏与管理面板 | `src/components/LearningLibraryPanel.tsx`, `src/components/WritingHabitsPanel.tsx`, `src/components/ParagraphFlowPanel.tsx`, `src/components/TriggerSettingsPanel.tsx`, `src/components/DataControlPanel.tsx`, `src/components/PersonalDictionaryPanel.tsx`, `src/components/ApiSettingsModal.tsx` | 管理低频 Review、Learning Library、Writing Habits、设置、Paragraph Flow、Data Control、Personal Dictionary 和 API Settings。 |
| 句子与范围工具 | `src/lib/sentence.ts` | 提取最新句/当前段落、保留 range、替换捕获 range、生成代码 diff。 |
| 本地存储与聚合 | `src/lib/storage.ts` | 负责 localStorage keys、迁移、normalize、dedupe、export、trigger settings、Paragraph Health cache、Personal Dictionary、Writing Habits 聚合。 |
| 本地 proofreading | `src/lib/proofreading.ts` | 在本地生成轻量 proofreading signals，不调用 LLM，也不调用 LanguageTool public API。 |
| LLM contract | `src/lib/llm/types.ts` | 定义请求、响应、learning data、correction events、paragraph checks、selection explanation 的 zod schema 和 TypeScript 类型。 |
| LLM prompts | `src/lib/llm/prompts.ts` | 把产品 prompt 与 UI、provider 实现分离。 |
| LLM service | `src/lib/llm/service.ts` | 选择 provider，并暴露 API routes 使用的产品级 service functions。 |
| Provider adapters | `src/lib/llm/providers/mock.ts`, `src/lib/llm/providers/openaiCompatible.ts`, `src/lib/llm/normalize.ts`, `src/lib/json.ts` | 实现 deterministic Mock Mode、OpenAI-compatible 调用、稳健 JSON 处理、normalize、validation 和 API key redaction。 |
| API routes | `src/app/api/*/route.ts` | 校验请求，调用 service layer，并返回 route-specific 输出。 |
| Tests | `*.test.ts`, `*.test.tsx`, `src/test/setup.ts` | 覆盖句子提取/替换、存储、provider、prompt contract、UI flow 和面板行为。 |

## 当前最新句增强数据流

```text
1. 用户在 WritingEditor 中写作
   |
   v
2. LinguaTypeApp 把 draft 保存到 localStorage
   key: linguatype.writingDraft.v1
   |
   v
3. 用户触发增强
   Ctrl/Cmd + Enter、启用时的 legacy Ctrl/Cmd + J，或按钮
   |
   v
4. LinguaTypeApp 调用 extractLatestSentence(fullText)
   file: src/lib/sentence.ts
   output: latestSentenceRange + originalSentence
   |
   v
5. LinguaTypeApp 捕获增强请求状态
   requestId
   snapshotFullText
   latestSentenceRange
   originalSentence
   requestInput
   |
   v
6. LinguaTypeApp POST /api/enhance-fast
   input 包含最新句、previous context、writing mode、
   enhancement level 和本次请求携带的 API settings
   |
   v
7. API route 调用 enhanceFastWithLLM()
   file: src/lib/llm/service.ts
   provider: mock 或 OpenAI-compatible adapter
   |
   v
8. API 只返回：
   originalSentence
   finalSentence
   explanationZh
   taskType
   hasChinese
   |
   v
9. LinguaTypeApp 保存 completed enhancement result
   |
   v
10. EnhancementPopover 展示：
    original sentence
    final sentence
    code-generated diff
    short explanation
    Apply / Cancel / Regenerate / Copy
```

## 当前 Apply 与保存数据流

```text
1. 用户点击 Apply
   |
   v
2. LinguaTypeApp 做冲突检测：
   current text 必须等于 snapshotFullText
   |
   +--> 如果冲突：显示 warning，不自动 Apply
   |
   v
3. replaceLatestSentence(text, capturedRange, finalSentence)
   file: src/lib/sentence.ts
   |
   v
4. 编辑器文本立即更新
   draft 通过现有 draft 行为写入 localStorage
   |
   v
5. 后台 POST /api/extract-learning
   只在显式 Apply 后触发
   |
   v
6. API route 调用 extractLearningWithLLM()
   |
   v
7. LinguaTypeApp upsert 返回数据：
   learningItems -> linguatype.learningLibrary.v1
   correctionEvents -> linguatype.correctionEvents.v1
   legacy learning history 可为了兼容继续更新
   |
   v
8. 如果 trigger settings、段落长度、句子数量、cache、
   throttle 和 in-flight 状态允许，可触发可选 Paragraph Health check
```

## 文档实现计划

### `PRODUCT.md`

用稳定中文说明当前产品身份和范围：

- LinguaType 是什么
- LinguaType 不是什么
- 目标用户和核心任务
- v0.2.2 当前主流程
- hard non-goals

`PRODUCT.md` 不替代 `AGENTS.md`；它面向需要理解产品的人，而不是完整 agent rulebook。

### `ARCHITECTURE.md`

记录当前架构和数据流：

- 应用分层
- 最新句增强流程
- Apply 与后台学习提取流程
- Paragraph Health 与 Paragraph Flow 的边界
- Selection Actions 流程
- localStorage 模型
- provider abstraction

### `MODULES.md`

记录模块归属：

- 模块名称
- 对应文件
- 职责
- 允许的依赖方向
- 边界规则

### `CHANGELOG.md`

创建简洁项目 changelog：

- v0.1 核心 latest-sentence flow
- v0.2 expression learning assistant
- v0.2.1 fast enhancement 与 background extraction
- v0.2.2 editor-near UI、Selection Actions、proofreading、Data Control
- v0.2.3 architecture documentation cleanup

### `AGENTS.md`

只更新与架构文档交接有关的内容：

- 指向 `PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`
- 保持 `AGENTS.md` 作为产品约束 source of truth
- 避免在 `AGENTS.md` 中重复长篇架构说明

## 实现约束

- 不改变应用运行时行为。
- 不编辑 `src/` 下的业务代码。
- 不重命名模块或移动文件。
- 不改变 localStorage keys。
- 不改变 API route contracts。
- 不启动长期运行的 dev server。
- 除非文档包含需要校验的代码片段，否则验证以文档一致性检查为主。
- 后续项目文档默认使用中文，保留必要英文 capability names 和代码标识符。
