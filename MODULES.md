# LinguaType 模块边界

## 模块清单

| 模块 | 主要文件 | 职责 |
| --- | --- | --- |
| App shell | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css` | 挂载应用、定义 metadata、提供全局样式和主题样式。 |
| 主流程编排 | `src/components/LinguaTypeApp.tsx` | 管理 editor state、setup gating、writing archives、archive sidebar、inline setup edit、API calls、Apply 冲突检测、学习提取、outline check、sidebar state 和 localStorage hydration。 |
| 写作存档 | `src/components/LinguaTypeApp.tsx`, `src/lib/storage.ts` | 保存本地写作稿的标题、正文和 setup；支持新建、切换、重命名、删除和可折叠侧栏；不保存学习数据。 |
| 写作准备 | `src/components/WritingSetupPanel.tsx`, `src/components/LinguaTypeApp.tsx`, `src/lib/storage.ts` | 首次进入时收集领域、主题和大纲点；进入主界面后通过编辑器内联交互修改 setup；不调用 LLM，不生成正文。 |
| 分段编辑器 | `src/components/WritingEditor.tsx` | 根据大纲点展示段落输入框、只读大纲提示和轻量内联大纲编辑入口，并把段落拼接为单个草稿文本交给主编排层。 |
| 当前句建议 | `src/components/EnhancementPopover.tsx`, `src/components/DiffViewer.tsx` | 展示最新句建议、本地 diff、解释、Apply/Cancel/Regenerate/Copy。 |
| 主题偏好 | `src/components/ThemePreferenceControl.tsx`, `src/app/globals.css`, `src/lib/storage.ts` | 管理 light/dark/system，v0.2.5 只在主写作界面展示。 |
| 大纲检查 API | `src/app/api/check-outline/route.ts`, `src/lib/llm/service.ts`, `src/lib/llm/prompts.ts`, `src/lib/llm/types.ts` | 检查大纲是否贴合主题；只提示，不修改。 |
| Learning Library | `src/components/LearningLibraryPanel.tsx`, `src/lib/storage.ts` | 管理本地表达资产，支持搜索、收藏、复制、插入、删除和导出。 |
| Writing Habits | `src/components/WritingHabitsPanel.tsx`, `src/lib/storage.ts` | 基于 Correction Events 聚合写作习惯。 |
| Paragraph Flow | `src/components/ParagraphFlowPanel.tsx`, `src/app/api/check-paragraph-flow/route.ts` | 手动检查当前段落，可返回 revisedParagraph，但不自动 Apply。 |
| Selection Actions | `src/components/SelectionActionsPopover.tsx`, `src/app/api/explain-selection/route.ts` | Explain selected 和 Save to Library，不改写选中文本；浮层根据选区动态定位并结构化展示解释。 |
| Inline Expression Menu | `src/components/InlineExpressionMenu.tsx` | 在编辑器附近插入本地表达或触发手动段落检查。 |
| Trigger Settings | `src/components/TriggerSettingsPanel.tsx`, `src/lib/storage.ts` | 管理快捷键、inline menu trigger 和 paragraph health trigger。 |
| Data Control | `src/components/DataControlPanel.tsx`, `src/lib/storage.ts` | 导出、清空和查看本地数据 key。 |
| API Settings | `src/components/ApiSettingsModal.tsx`, `src/app/api/test-connection/route.ts` | 管理本地 API settings 和 provider 连接测试。 |
| 句子工具 | `src/lib/sentence.ts` | 最新句提取、range replacement、当前段落、上下文和 diff。 |
| 本地存储 | `src/lib/storage.ts` | localStorage keys、迁移、normalize、dedupe、export 和 Writing Habits 聚合。 |
| LLM contracts | `src/lib/llm/types.ts` | zod schema 和 TypeScript 类型。 |
| LLM prompts | `src/lib/llm/prompts.ts` | 集中维护 prompt。 |
| LLM providers | `src/lib/llm/providers/*`, `src/lib/llm/normalize.ts`, `src/lib/json.ts` | Mock Mode、OpenAI-compatible adapter、JSON parsing、validation 和 API key redaction。 |

## 边界规则

- UI 不直接调用 vendor API。
- API routes 不复制 prompt 或 provider parsing。
- Storage 迁移、normalize 和 dedupe 集中在 `src/lib/storage.ts`。
- Writing Archives 只保存正文和 setup，不写入 Learning Library 或 Correction Events；删除 archive 也不得触发学习数据保存。
- 最新句增强只处理最新非空句，不改写整段。
- 分段编辑器只是 UI 组织方式，不改变 Apply/Cancel 和 range replacement 规则。
- 大纲检查只在用户确认内联 setup 修改后触发，只提示问题，不生成正文、不改写大纲、不保存学习数据。
- 高频写作动作放在编辑器附近；右侧 sidebar 保持低频管理用途。
