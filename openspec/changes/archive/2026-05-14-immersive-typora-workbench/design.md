# 设计说明

## 总体原则

本 change 是一次前端体验大改，但不是产品重写。实现应优先复用现有状态和数据流：`LinguaTypeApp.tsx` 继续持有 text、setup、archives、API 调用和 Apply 流程；`WritingEditor.tsx` 负责编辑器交互；`storage.ts` 继续负责 localStorage 读写和迁移。

设计目标是“Typora 式写作表面”：正文、主题、大纲和 AI 建议都围绕同一个文档流展开。高频动作靠近文本，低频工具退到侧边。

## 主界面布局

桌面端推荐结构：

```text
main
  ArchiveSidebar
    expanded: 248-280px
    collapsed: 48-64px

  ImmersiveEditorShell
    max-width: 860-960px
    centered when archive sidebar is collapsed
    no card frame around the whole editor

  UtilitySidebar
    optional / low-emphasis / can be visually narrower
```

关键行为：

- archive sidebar 展开时，编辑器仍居中在剩余主工作区。
- archive sidebar 收起时，编辑器恢复接近 100% 的沉浸式居中空间。
- 右侧工具区不能压缩到正文不可写；如空间不足，应优先弱化或折叠右侧工具，而不是牺牲编辑器。
- 顶部 header 应减重，可保留品牌、Mock Mode、主题偏好和 API Settings，但不应形成强 dashboard 感。

## Typora 式编辑器

现阶段不要求引入 `contentEditable`。推荐继续使用每段一个 `textarea`，但将视觉从卡片改为文档流：

- 文章主题展示为 H1 风格文本。
- 写作领域和状态作为 H1 下方低强调 metadata。
- 每个大纲点展示为 H2 或段落标题。
- 段落 textarea 无边框、无卡片背景、无 shadow。
- 段落之间通过字号、行距和垂直留白区分，而不是边框。
- 大纲编辑、删除、新增入口默认低强调，hover/focus 或靠近标题时可见。

底层文本仍使用：

```ts
const paragraphs = splitIntoParagraphInputs(value, outlinePoints.length);
onChange(paragraphs.join("\n\n"));
```

这样可保留：

- `extractLatestSentence(text)`
- `replaceLatestSentence(text, capturedRange, finalSentence)`
- `getCurrentParagraph(text, cursor)`
- Apply conflict detection
- autosave to draft/archive
- selection actions offset mapping

## 行内当前句建议

现有 `EnhancementPopover` 可被改造或包一层新组件，例如 `InlineSuggestionBar`。它应靠近当前编辑器区域，而不是固定成底部大浮层。

建议数据流不变：

```text
trigger latest sentence
  -> capture snapshotFullText + latestSentenceRange
  -> POST /api/enhance-fast
  -> local diff generation
  -> inline suggestion bar
  -> Apply / Cancel / Regenerate / Copy
  -> Apply replaces captured range only
  -> background /api/extract-learning
```

呈现规则：

- 删除内容使用红色或低饱和红色删除线。
- 新增内容使用绿色或低饱和绿色高亮。
- 未变化内容保持正文色。
- Apply/Cancel 按钮紧凑、低干扰，但必须可见。
- 发生 snapshot conflict 时，不显示可应用成功的错觉，必须提示重新增强。

第一阶段可接受建议条定位到当前编辑器底部或当前段落附近；若精确句子定位成本过高，不应为此重写 selection/range 系统。

## 写作存档侧边栏

保留 v0.2.7 数据行为，但视觉更贴近经典左侧文档栏：

- expanded 状态显示：新建写作、当前/最近 archive 列表、每项 `...` 菜单。
- collapsed 状态显示：展开入口、新建入口、可选当前文档提示。
- 切换、重命名、删除仍只更新 `linguatype.writingArchives.v1`。
- rename archive title 不自动改写 `setup.essayTopic`。
- delete archive 必须确认；删除不触发 `/api/extract-learning`。

## 右侧低频工具

右侧仍承载 Review status、Learning Library、Writing Habits、Tools / Settings、Data Control，但视觉应弱于编辑器：

- tab 控件降噪，避免强卡片感。
- 内容区可保持局部卡片，因为这些是管理工具，不属于正文流。
- 屏幕宽度不足时，允许右侧工具折叠或移动到抽屉。

## 后端影响

预计不需要新增 API route。

可能的小范围后端/LLM contract 检查：

- 确认 `/api/enhance-fast` 仍只返回 `originalSentence`、`finalSentence`、`explanationZh`、`taskType`、`hasChinese`。
- 确认 `/api/extract-learning` 仍只在 Apply 后调用。
- 确认 `/api/check-outline` 只在用户确认 inline topic/outline 修改后调用。

## 测试策略

Focused tests 优先覆盖行为，不为纯视觉类名写脆弱断言：

- archive sidebar 展开/收起后，正文仍可输入。
- collapsed archive sidebar 不隐藏新建和展开入口。
- Typora 文档流中每个大纲点仍对应一个段落 textarea。
- 段落编辑后拼接文本仍用空行分隔。
- latest-sentence enhancement 的 Apply 仍只替换 captured range。
- 行内建议条的 Apply/Cancel/Regenerate/Copy 行为和旧 popover 一致。
- 行内建议条未 Apply 时不触发 learning extraction。
- inline topic/outline 输入中不调用 `/api/check-outline`，确认后才调用。

## 分阶段实现建议

1. 先改壳层和视觉结构：header 降噪、archive sidebar 精简、右侧工具弱化。
2. 再改 `WritingEditor` 为 Typora 文档流，但保留 textarea 和文本拼接。
3. 再改当前句建议展示为行内建议条，复用现有 Apply/Cancel 数据流。
4. 最后补测试和文档，确认 API 行为没有扩大。
