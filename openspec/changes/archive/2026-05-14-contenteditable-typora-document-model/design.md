# 设计说明

## 总体原则

本 change 采用 B 路线：允许将编辑器从多 textarea 文档流升级为 `contentEditable` 文档表面。核心目标是实现参考图里的 Typora 式 WYSIWYG 写作体验，同时尽量保留现有业务数据流。

`text` 仍是 LinguaType 的业务真相。`contentEditable` 只负责输入体验和视觉呈现；latest-sentence extraction、range replacement、autosave、archives、learning extraction 和 API payload 都继续基于 `text` 字符串。

## 文档模型

第一阶段采用轻量 block 模型，不引入完整 Markdown AST：

```ts
type EditorBlock =
  | { type: "heading"; level: 2; outlineIndex: number; text: string }
  | { type: "paragraph"; paragraphIndex: number; text: string };
```

规则：

- `writingSetup.essayTopic` 在编辑器顶部以 H1 视觉显示，但不并入 `text`。
- `writingSetup.outlinePoints` 以 H2 视觉显示，但不并入 `text`。
- 正文 `text` 按空行拆成 paragraph blocks。
- DOM 中只允许 paragraph block 的正文区域可编辑；heading 可通过轻量按钮进入 inline edit。
- 用户编辑正文时，将 DOM paragraph text 重新拼接为 `paragraphs.join("\n\n")`。

这样可以让界面像一张文档，同时避免把主题和大纲混入 latest-sentence extraction。

## Selection 和 offset 映射

`contentEditable` 必须提供两类映射：

1. DOM selection -> 全文 offset
   - 选中正文文本时，计算所在 paragraph block 的起始 offset。
   - paragraph offset 等于前序段落长度加上 `\n\n` 分隔符。
   - selection start/end = paragraph offset + block 内 selection offset。

2. 全文 range -> 可视定位
   - 当前句建议优先定位到 captured range 所在 paragraph block 之后。
   - 第一阶段不要求逐字包裹原句 DOM；建议条可插在当前 paragraph 下方。
   - Apply 仍由 `LinguaTypeApp` 对全文 `text` 做 range replacement。

## 输入与 IME

为降低中文输入风险：

- `onInput` 同步 paragraph text，但在 composition 中避免做结构性重排。
- 使用 `onCompositionStart` / `onCompositionEnd` 标记输入法状态。
- 不在每次输入时重建整个 editable DOM。
- 只在外部 `value` 与内部快照不一致时刷新 block 内容。

## 当前句 Inline Diff

新增或改造当前句建议组件为 `InlineSuggestionBar`：

- 接收 `targetParagraphIndex` 或 fallback 到编辑器末尾。
- 显示本地 diff parts。
- 删除内容使用低饱和红色删除线。
- 新增内容使用低饱和绿色背景或紫色强调，保持参考图的轻量感。
- 操作按钮为：采纳、忽略、重试、复制。
- conflict 状态显示“正文已变化，请重新增强”，并禁用采纳。

数据流不变：

```text
contentEditable input
  -> text string
  -> trigger latest sentence
  -> capture snapshotFullText + latestSentenceRange
  -> POST /api/enhance-fast
  -> local diff generation
  -> InlineSuggestionBar in document flow
  -> Apply / Cancel / Regenerate / Copy
  -> Apply replaces captured latestSentenceRange only
  -> background /api/extract-learning after Apply
```

## 壳层视觉

视觉按参考图和 `DESIGN.md` 落地：

- 页面背景：暖纸色 `#f7f4ed`。
- 主文字：`#1c1c1c` 和透明度灰阶。
- 顶栏弱化，打字时通过 CSS 降低 opacity。
- 左侧 collapsed sidebar 只保留细线和少量 icon-like 按钮。
- 右侧低频工具弱化为提示和入口，不抢正文权重。
- 不使用重 shadow、大卡片或强 dashboard 面板。

## 风险与缓解

- 中文 IME 风险：避免 composition 中重排 DOM，并保留 focused tests。
- Selection offset 风险：先只支持正文 paragraph block 的精确 offset，heading edits 走独立 setup 流。
- React contentEditable 警告风险：使用受控边界和内部 DOM 同步，避免每次 keystroke 强制重渲染全文。
- 测试环境风险：jsdom 对 selection 支持有限，核心映射逻辑应抽到纯函数测试。

