# LinguaType 架构说明

## 总览

LinguaType 是基于 Next.js App Router 的本地优先 Web 应用。前端由 React 组件承载 editor-first 写作体验，浏览器 localStorage 保存本地数据，服务端 API routes 通过 LLM service abstraction 调用 Mock Mode 或 OpenAI-compatible provider。

```text
src/app/page.tsx
  -> src/components/LinguaTypeApp.tsx
      -> 写作准备 / 固定可折叠左侧导航 / 原生长文本写作面 / 表达库页 / 写作习惯页 / API 设置页 / 数据与触发设置页 / 行内当前句建议
      -> src/lib/sentence.ts
      -> src/lib/storage.ts
      -> src/lib/documentMap.ts
      -> src/lib/personalDictionary.ts
      -> src/lib/expressionReappearance.ts
      -> src/app/api/* via fetch

src/app/api/*/route.ts
  -> src/lib/llm/service.ts
      -> src/lib/llm/providers/mock.ts
      -> src/lib/llm/providers/openaiCompatible.ts
```

## 主编排层

`src/components/LinguaTypeApp.tsx` 是当前应用的主编排层，负责：

- localStorage hydration。
- 写作准备 gating。
- 写作存档的新建、切换、重命名、删除、侧栏折叠和 active archive 保存。
- 主题偏好应用到 document root，并把解析后的 light/dark 主题传给侧栏品牌图片。
- 草稿文本保存和恢复。
- 当前句增强请求、快照、冲突检测和 Apply。
- Apply 后后台学习提取。
- 段落健康 / 段落流畅度。
- 文章地图手动检查、自动预检查、缓存恢复、过期提示、段落定位和段落节点入口调度。
- Selection Actions。
- 编辑器内联 Writing Setup 修改和显式 outline check。
- 原生长文本写作面、句旁建议入口、行内当前句建议展示和中间主舞台页面切换。
- 用本地表达库和正文计算表达复现提示；该计算不调用 API，不写学习数据。
- 左侧固定导航中的 Writing Archives、表达库、写作习惯、数据管理、触发设置和快捷键入口，以及顶部 API 设置入口。

主题品牌图片位于 `public/brand/`。`LinguaTypeApp` 只根据 resolved theme 选择 `linguatype-wordmark-light.png`、`linguatype-wordmark-dark.png`、`linguatype-mark-light.png` 或 `linguatype-mark-dark.png`，不写入 localStorage，也不影响 API 设置或 provider 行为。

## 写作准备数据流

```text
App load
  -> loadWritingSetupFromStorage()
  -> 未完成 setup 时显示 WritingSetupPanel
  -> 用户选择领域、主题、大纲点
  -> saveWritingSetup()
  -> 进入主写作界面
```

`WritingSetup` 当前使用 `outlinePoints: string[]`。旧数据中的 `outline: string` 会被拆分并迁移为 `outlinePoints`，同时继续写出 `outline` 字段作为兼容字段。

进入主界面后，用户不再回到独立准备页修改主题或大纲，也不再使用主界面设置抽屉。主题、写作领域和大纲点在编辑器区域内轻量内联编辑。内联编辑维护草稿态，点击取消不保存，点击确认后才写入 active archive 和 `linguatype.writingSetup.v1`。

`LinguaTypeApp` 使用 `activeWorkspaceView` 在中间主舞台切换 `editor`、`library`、`habits`、`api`、`data`、`triggers` 和 `shortcuts`。左侧导航固定在视口内，只有存档列表在左栏内部滚动；中间区域保持正常滚动。右侧不再承载常驻管理面板，只保留主界面顶部的主题切换和 API 设置入口。

API 设置、触发设置、数据管理和快捷键帮助作为低频页面进入中间主舞台。个人词典不再作为独立工具面板，而是由表达库页面中的“个人词典”类型管理。

这些页面的保存、清空、重置、测试连接等动作只做本地状态反馈，测试连接失败给出脱敏上下文，不改变 provider 调用约定。

## 写作存档数据流

```text
App load
  -> loadWritingArchivesFromStorage()
  -> 如无 archives，则从 writingDraft / writingSetup 初始化默认 archive
  -> active archive 驱动当前 text 和 Writing Setup
  -> 编辑、切换、重命名、删除时 saveWritingArchives()
```

写作存档使用 `linguatype.writingArchives.v1`。旧的 `linguatype.writingDraft.v1` 和 `linguatype.writingSetup.v1` 继续保留作为兼容镜像，不在迁移时删除。

删除存档只更新 `linguatype.writingArchives.v1`。删除非当前存档不改变编辑器正文；删除当前存档时优先切换到剩余存档中最近打开的一项；删除唯一存档时创建新的空白“未命名写作”存档并保持编辑器可用。删除存档不写入表达库、Correction Events，也不触发 `/api/extract-learning`。

## 长文本编辑器数据流

主写作界面把正文作为一个连续的 `text` 管理，并通过 `WritingEditor` 的原生 `textarea` 写作面渲染。这样可以优先保证中文输入法、光标点击定位、选区、追加输入和浏览器默认编辑行为稳定。

`WritingEditor` 负责：

- 根据 textarea selection 暴露 `focus()`、`getSelectionRange()` 和 `setCursor()`。
- 用透明 position probe 估算目标句行高位置，只用于放置句旁建议入口，不拦截文本点击。
- 在无内联卡片时保持原生输入面；打开建议后临时把目标句拆出为焦点段落并把卡片放在句子下方。
- 固定底部状态栏，展示词数、句数、段落数、模式、强度、触发、领域和文章地图轻状态入口。
- 不再渲染写作区右侧文本校对 tag 或底部/右下角校对卡片；细节问题进入用户主动触发的“检查本段”二级界面。
- 将表达库命中的 phrase/collocation 渲染为正文原位的视觉-only 表达复现提示，使用卡片压印式一次性微动效，不接管 hover/focus。

这样可以保留既有能力：

- `extractCurrentSentence(text, cursor)`
- `replaceLatestSentence(text, capturedRange, finalSentence)`
- `getCurrentParagraph(text, cursor)`
- Apply 冲突检测
- 后台学习提取

Selection Actions 接收全文 offset，但解释和保存动作不直接改写正文。`检查本段` 使用当前光标 offset 定位当前段落，`Ctrl/Cmd + K` 和折叠侧边栏图标都直接进入段落流畅度检查，不再经过表达菜单弹窗。

## 中文占位建议数据流

```text
用户输入包含中文的完整句
  -> extractChinesePlaceholderSentences(text)
  -> createPlaceholderRequestKey(archive/draft + original sentence + mode + level + domain)
  -> lookup linguatype.placeholderSuggestionCache.v1
  -> 命中时恢复 PlaceholderSuggestionRecord，不请求模型
  -> 未命中时停顿 800ms 后后台 POST /api/enhance-fast
  -> 生成 PlaceholderSuggestionRecord 并 upsert cache
  -> WritingEditor 显示目标句右侧轻入口
  -> 用户打开入口
  -> 内联卡片展示建议、表达映射和结构
  -> 用户采纳后 range replacement + 后台学习提取
```

后台自动检测只处理已经稳定且包含中文的完整句。它不会自动替换正文，不会在正文下方显示常驻加载条，也不会阻塞用户继续输入。页面加载、切换存档或恢复草稿时，已有建议优先从 `linguatype.placeholderSuggestionCache.v1` 派生为句旁入口；只有缓存未命中且 API 设置可用时才请求 `/api/enhance-fast`。

## 当前句增强数据流

```text
用户触发增强
  -> extractCurrentSentence(text, cursor)
  -> 捕获 snapshotFullText 和 latestSentenceRange
  -> POST /api/enhance-fast
  -> enhanceFastWithLLM()
  -> provider 返回 finalSentence
  -> 行内当前句建议展示本地 diff
  -> 用户 Apply
  -> replaceLatestSentence()
  -> POST /api/extract-learning
```

模型不生成 diff。Diff 由本地代码生成。

## 表达复现提示数据流

```text
用户编辑正文
  -> findExpressionReappearanceCues(text, learningLibrary)
  -> 只匹配本地 phrase / collocation
  -> WritingEditor 在命中文本上显示卡片压印式极轻一次性微动效
  -> 不显示 hover/focus 说明卡片
```

表达复现提示不调用模型，不触发 `/api/extract-learning`，不写入表达库或 Correction Events，也不修改正文。它是视觉-only 的被动强化提示，与 AI 修改入口和文章地图 / 段落检查入口保持不同视觉语言。

## 段落健康数据流

```text
after_every_apply:
  用户 Apply 当前句建议
  -> 取当前句所在段落
  -> 按段落指纹检查 cache / running / 30 秒节流 / 至少两句
  -> POST /api/check-paragraph-health
  -> 仅显示轻量提醒，不改正文

after_paragraph_complete:
  用户输入空行完成一段
  -> 取刚完成段落
  -> 按段落指纹检查 cache / running / 30 秒节流 / 至少两句
  -> POST /api/check-paragraph-health
  -> 仅显示轻量提醒，不改正文
```

段落健康始终开启，只允许选择 Apply 后触发或段落完成后触发。它不要求 40 个英文词，不返回 `revisedParagraph`，不生成 diff，不保存学习数据，也不会自动 Apply。段落健康运行态、段落流畅度运行态和 30 秒节流都按段落指纹分别判断，避免一个段落阻塞另一个段落。

段落流畅度检查是手动动作。入口包括 `Ctrl/Cmd + K`、折叠侧边栏的“检查本段”图标和文章地图段落节点。前端只把当前段落作为可检查和可替换对象，`fullText` 仅作为上下文传给 `/api/check-paragraph-flow`。结果在文章地图二级检查界面展示，不再渲染主写作页底部的段落工具；模型等待期间显示 `paragraph-flow` 运行态。返回结构包含段落级 `issues` 和语法、拼写、标点等 `detailIssues`，但空格类细碎排版问题不单独铺满列表。

## 文章地图数据流

```text
本地自动感知
  -> splitDocumentIntoParagraphs(text)
  -> createDocumentMapParagraphFingerprints()
  -> evaluateDocumentMapFreshness()
  -> 入口显示“可检查 / 可能已过期 / 整理中 / N 个发现”

安静时预检查:
  用户停止输入
  -> documentMapAutoCheck === "auto_idle"
  -> 至少 2 段 + 至少 120 词 + 变化达到阈值
  -> 没有其他 AI 请求 + API 设置可用 + 间隔和会话次数未超限
  -> POST /api/check-document-map with trigger="auto_idle"
  -> 只 upsert linguatype.documentMapCache.v1
  -> 不自动打开 DocumentMapPanel
  -> 不定位段落 / 不触发 Paragraph Flow / 不保存学习数据

用户点击“检查文章地图”
  -> splitDocumentIntoParagraphs(text)
  -> createDocumentMapCacheKey(archive + text hash + setup + model)
  -> lookup linguatype.documentMapCache.v1
  -> 命中时恢复缓存结果
  -> 未命中时 POST /api/check-document-map with trigger="manual"
  -> checkDocumentMapWithLLM()
  -> provider 返回 overallMainIdeaZh / structureSummaryZh / paragraphs / globalIssues / nextActions
  -> upsertDocumentMapCache()
  -> DocumentMapPanel 展示可折叠全文结构地图
  -> 宽屏下与 WritingEditor 组成左右对照区
  -> 对照区锁定外层滚动，地图栏和原文栏独立隐藏滚动
```

文章地图只做全文结构诊断和段落导航，不返回 `revisedDocument`，不评分，不保存学习数据，不触发 `/api/extract-learning`。前端优先使用正文空行切分段落；当全文没有空行分隔时，单次手动换行也作为自然段落边界，并用得到的 range 定位段落。`documentMapAutoCheck` 支持 `off`、`remind_only`、`auto_idle` 和 `manual_first`：`remind_only` 与 `manual_first` 只更新本地 freshness，`auto_idle` 才允许在严格条件下静默请求模型并更新缓存。自动结果返回后如果当前正文 snapshot 已明显变化，只能作为过期缓存或过期状态处理，不能直接展开面板。打开地图时，`LinguaTypeApp` 在宽屏使用“文章地图对照区”把 `DocumentMapPanel` 和 `WritingEditor` 并排展示，窄屏回退为上下排列，正文仍是一个原生长文本面。对照区打开时外层写作舞台不再承载滚动，地图栏和原文栏各自使用隐藏滚动条的内部滚动容器，避免原文滚动时带动地图位置。“查看建议”复用 Paragraph Health，只在段落卡片内展示 `shortSummaryZh` 和风险类型，不触发 Paragraph Flow，也不显示右下角浮层；“检查本段”复用 Paragraph Flow，并进入 `DocumentMapPanel` 的二级检查界面，Apply Paragraph 仍沿用段落快照和 range 冲突检测。

## 大纲检查数据流

```text
用户在编辑器内联修改主题或大纲
  -> 点击确认保存
  -> POST /api/check-outline
  -> checkOutlineWithLLM()
  -> provider 返回 hasIssues / suggestionsZh
  -> 前端只在有问题时显示提示
```

大纲检查不保存学习数据，不修改大纲，不阻塞用户输入。

## LLM 层

产品逻辑不直接调用 vendor API。所有 AI 能力都通过 `src/lib/llm/service.ts` 分发：

- `enhanceFastWithLLM`
- `extractLearningWithLLM`
- `checkParagraphHealthWithLLM`
- `checkParagraphFlowWithLLM`
- `checkDocumentMapWithLLM`
- `explainSelectionWithLLM`
- `checkOutlineWithLLM`
- legacy-only `enhanceLatestSentenceWithLLM`

Prompt 位于 `src/lib/llm/prompts.ts`，schema 和类型位于 `src/lib/llm/types.ts`，provider-specific code 位于 `src/lib/llm/providers/`。
