# LinguaType 架构说明

## 总览

LinguaType 是基于 Next.js App Router 的本地优先 Web 应用。前端由 React 组件承载 editor-first 写作体验，浏览器 localStorage 保存本地数据，服务端 API routes 通过 LLM service abstraction 调用 Mock Mode 或 OpenAI-compatible provider。

```text
src/app/page.tsx
  -> src/components/LinguaTypeApp.tsx
      -> 写作准备 / 固定可折叠左侧导航 / 原生长文本写作面 / 表达库页 / 写作习惯页 / API 设置页 / 数据与触发设置页 / 行内当前句建议
      -> src/lib/sentence.ts
      -> src/lib/storage.ts
      -> src/lib/proofreading.ts
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
- 主题偏好应用到 document root。
- 草稿文本保存和恢复。
- 最新句增强请求、快照、冲突检测和 Apply。
- Apply 后后台学习提取。
- Paragraph Health / Paragraph Flow。
- Selection Actions。
- 编辑器内联 Writing Setup 修改和显式 outline check。
- 原生长文本写作面、句旁建议入口、行内当前句建议展示和中间主舞台页面切换。
- 左侧固定导航中的 Writing Archives、表达库、写作习惯、数据管理、触发设置和快捷键入口，以及顶部 API 设置入口。

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

API Settings、Trigger Settings、Data Control 和快捷键帮助作为低频页面进入中间主舞台。Personal Dictionary 不再作为独立工具面板，而是由 Learning Library 页面中的“个人词典”类型管理。

## 写作存档数据流

```text
App load
  -> loadWritingArchivesFromStorage()
  -> 如无 archives，则从 writingDraft / writingSetup 初始化默认 archive
  -> active archive 驱动当前 text 和 Writing Setup
  -> 编辑、切换、重命名、删除时 saveWritingArchives()
```

写作存档使用 `linguatype.writingArchives.v1`。旧的 `linguatype.writingDraft.v1` 和 `linguatype.writingSetup.v1` 继续保留作为兼容镜像，不在迁移时删除。

删除存档只更新 `linguatype.writingArchives.v1`。删除非当前存档不改变编辑器正文；删除当前存档时优先切换到剩余存档中最近打开的一项；删除唯一存档时创建新的空白“未命名写作”存档并保持编辑器可用。删除存档不写入 Learning Library、Correction Events，也不触发 `/api/extract-learning`。

## 长文本编辑器数据流

主写作界面把正文作为一个连续的 `text` 管理，并通过 `WritingEditor` 的原生 `textarea` 写作面渲染。这样可以优先保证中文输入法、光标点击定位、选区、追加输入和浏览器默认编辑行为稳定。

`WritingEditor` 负责：

- 根据 textarea selection 暴露 `focus()`、`getSelectionRange()` 和 `setCursor()`。
- 用透明 position probe 估算目标句行高位置，只用于放置句旁建议入口，不拦截文本点击。
- 在无内联卡片时保持原生输入面；打开建议后临时把目标句拆出为焦点段落并把卡片放在句子下方。
- 固定底部状态栏，展示统计、模式、强度、触发、领域和本地校对数量。

这样可以保留既有能力：

- `extractLatestSentence(text)`
- `replaceLatestSentence(text, capturedRange, finalSentence)`
- `getCurrentParagraph(text, cursor)`
- Apply 冲突检测
- 后台学习提取

Selection Actions 和 Inline Expression Menu 仍接收全文 offset，不直接改写正文。

## 中文占位建议数据流

```text
用户输入包含中文的完整句
  -> extractChinesePlaceholderSentences(text)
  -> 停顿 800ms 后后台 POST /api/enhance-fast
  -> 生成 PlaceholderSuggestionRecord
  -> WritingEditor 显示目标句右侧轻入口
  -> 用户打开入口
  -> 内联卡片展示建议、表达映射和结构
  -> 用户采纳后 range replacement + 后台学习提取
```

后台自动检测只处理已经稳定且包含中文的完整句。它不会自动替换正文，不会在正文下方显示常驻加载条，也不会阻塞用户继续输入。

## 最新句增强数据流

```text
用户触发增强
  -> extractLatestSentence(text)
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
- `explainSelectionWithLLM`
- `checkOutlineWithLLM`
- legacy-only `enhanceLatestSentenceWithLLM`

Prompt 位于 `src/lib/llm/prompts.ts`，schema 和类型位于 `src/lib/llm/types.ts`，provider-specific code 位于 `src/lib/llm/providers/`。
