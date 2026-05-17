# LinguaType 模块边界

## 模块清单

| 模块 | 主要文件 | 职责 |
| --- | --- | --- |
| App shell | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `public/brand/*` | 挂载应用、定义 metadata、提供全局样式、主题样式和主题对应的品牌图片资产。 |
| 主流程编排 | `src/components/LinguaTypeApp.tsx` | 管理 editor state、setup gating、writing archives、fixed left navigation、workspace view、theme-resolved brand display、inline setup edit、API calls、Apply 冲突检测、学习提取、outline check、document map 和 localStorage hydration。 |
| 写作存档 | `src/components/LinguaTypeApp.tsx`, `src/lib/storage.ts` | 保存本地写作稿的标题、正文和 setup；支持新建、切换、重命名、删除和可折叠侧栏；不保存学习数据。 |
| 写作准备 | `src/components/WritingSetupPanel.tsx`, `src/components/LinguaTypeApp.tsx`, `src/lib/storage.ts` | 首次进入时收集领域、主题和大纲点；进入主界面后通过编辑器内联交互修改 setup；不调用 LLM，不生成正文。 |
| 文档编辑器 | `src/components/WritingEditor.tsx` | 以原生 `textarea` 承载单块长文本正文，负责光标/选区上报、固定底部状态栏、句旁建议入口定位、文章地图状态入口和内联建议展开时的临时句子焦点视图。 |
| 当前句建议 | `src/components/EnhancementPopover.tsx`, `src/components/DiffViewer.tsx`, `src/lib/sentence.ts`, `src/lib/storage.ts` | 展示当前句建议、本地 diff、中文占位表达映射、Apply/Cancel/Regenerate/Copy；已生成的中文占位句建议写入本地缓存，重新打开页面时优先恢复。 |
| 主题偏好 | `src/components/ThemePreferenceControl.tsx`, `src/app/globals.css`, `src/lib/storage.ts` | 管理 light/dark/system，只在主写作界面展示为轻量弹出菜单。 |
| 大纲检查 API | `src/app/api/check-outline/route.ts`, `src/lib/llm/service.ts`, `src/lib/llm/prompts.ts`, `src/lib/llm/types.ts` | 检查大纲是否贴合主题；只提示，不修改。 |
| 文章地图 | `src/components/DocumentMapPanel.tsx`, `src/components/LinguaTypeApp.tsx`, `src/lib/documentMap.ts`, `src/app/api/check-document-map/route.ts` | 生成全文结构地图，展示全文主旨、结构判断、全文问题、段落角色、段落关系和优先修改建议；支持本地 freshness 感知和安静时自动预检查缓存，但自动逻辑只更新入口状态和缓存；段落健康建议在卡片内展开，检查本段进入二级检查界面；只诊断、定位和调度，不全文改写、不评分、不自动 Apply。 |
| 表达库 | `src/components/LearningLibraryPanel.tsx`, `src/lib/storage.ts`, `src/lib/personalDictionary.ts` | 管理本地表达资产，支持搜索、收藏、复制、插入、删除和导出；以统一小卡片网格展示长期积累内容，个人词典作为类型选项在此管理。 |
| 表达复现提示 | `src/lib/expressionReappearance.ts`, `src/components/LinguaTypeApp.tsx`, `src/components/WritingEditor.tsx` | 本地匹配正文中已自然复现的表达库 phrase/collocation，并在写作区原位显示视觉-only 的卡片压印式低打扰学习强化提示；不调用模型、不改正文。 |
| 写作习惯 | `src/components/WritingHabitsPanel.tsx`, `src/lib/storage.ts` | 基于 Correction Events 聚合写作习惯。 |
| 个人词典工具 | `src/lib/personalDictionary.ts` | 只负责个人词典条目的本地归一化和去重；写作页不再运行本地文本校对 tag 或独立校对面板。 |
| 段落流畅度 | `src/components/LinguaTypeApp.tsx`, `src/components/DocumentMapPanel.tsx`, `src/components/WritingEditor.tsx`, `src/app/api/check-paragraph-flow/route.ts` | 通过 Ctrl/Cmd + K、折叠侧边栏图标或文章地图段落节点手动检查当前段落；结果进入文章地图二级检查界面，可返回 revisedParagraph 和 detailIssues，但不自动 Apply。 |
| Selection Actions | `src/components/SelectionActionsPopover.tsx`, `src/app/api/explain-selection/route.ts` | 选中正文后显示轻量功能条，支持 Explain selected、Save to Library 和 Copy selected，不改写选中文本；浮层根据选区动态定位并结构化展示解释。 |
| 低频设置 | `src/components/LinguaTypeApp.tsx`, `src/components/ApiSettingsModal.tsx`, `src/components/TriggerSettingsPanel.tsx`, `src/components/DataControlPanel.tsx`, `src/lib/storage.ts` | 在中间主舞台分别管理 API 设置、触发与打扰设置、数据管理、快捷键帮助和 provider 连接测试；包含文章地图自动检查模式。保存/清空/测试类动作给本地反馈，不改 provider 请求形态。 |
| 句子工具 | `src/lib/sentence.ts` | 当前句提取、range replacement、当前段落、上下文和 diff。 |
| 本地存储 | `src/lib/storage.ts` | localStorage keys、迁移、normalize、dedupe、export、写作习惯聚合、`linguatype.placeholderSuggestionCache.v1` 建议缓存和带段落指纹/freshness 的 `linguatype.documentMapCache.v1` 文章地图缓存。 |
| LLM contracts | `src/lib/llm/types.ts` | zod schema 和 TypeScript 类型。 |
| LLM prompts | `src/lib/llm/prompts.ts` | 集中维护 prompt。 |
| LLM providers | `src/lib/llm/providers/*`, `src/lib/llm/normalize.ts`, `src/lib/json.ts` | Mock Mode、OpenAI-compatible adapter、JSON parsing、validation 和 API key redaction。 |

## 边界规则

- UI 不直接调用 vendor API。
- API routes 不复制 prompt 或 provider parsing。
- Storage 迁移、normalize 和 dedupe 集中在 `src/lib/storage.ts`。
- Writing Archives 只保存正文和 setup，不写入表达库或 Correction Events；删除 archive 也不得触发学习数据保存。
- 当前句增强只处理光标所在当前句，不改写整段。
- 文档编辑器只是 UI 组织方式；即使临时展开内联建议，也不改变 Apply/Cancel、原生输入、空行和 range replacement 规则。
- 中文占位句建议必须先查本地缓存；页面加载或切换存档不能因为已有缓存建议而重复调用模型。
- 表达复现提示只读表达库和正文，只做本地规则匹配；不得复用 AI 修改入口、文章地图或段落检查入口的视觉语言，也不得显示 hover/focus 说明卡片。
- 主题 H1 和 setup 元数据不并入正文 `text`；current-sentence extraction 只基于正文草稿文本。
- 大纲检查只在用户确认内联 setup 修改后触发，只提示问题，不生成正文、不改写大纲、不保存学习数据。
- 文章地图完整查看只在用户打开入口后展示；自动预检查只能在 `auto_idle` 模式和严格节流条件下静默更新缓存与入口状态，不得自动展开、自动定位、触发 Paragraph Flow、返回全文改写、作文评分或自动应用载荷，也不得触发 `/api/extract-learning`。段落节点的“查看建议”不得弹出独立右下角健康面板，“检查本段”不得在页面底部渲染段落工具。
- 写作页不再保留本地校对信号、右侧校对 tag 或独立校对详情弹窗；语法、拼写、标点等细节问题只在用户主动进入“检查本段”后展示。
- 高频写作动作放在编辑器附近；低频管理通过左侧固定导航打开中间页面，右侧不得恢复常驻工具侧栏。
- 数据管理、触发设置、API 设置、表达库、写作习惯的本地操作不直接调用模型；动作结果由本地状态反馈承接，清空/删除提示作用范围。
