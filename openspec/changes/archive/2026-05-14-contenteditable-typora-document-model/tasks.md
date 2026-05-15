# 任务清单

## 1. 文档模型与测试

- [x] 1.1 新增纯函数将 `text + outlinePoints` 转为轻量 editor blocks。
- [x] 1.2 新增纯函数计算 paragraph block 的全文 offset。
- [x] 1.3 新增纯函数将 paragraph block text 拼回全文 `text`。
- [x] 1.4 为 block 拆分、拼接、offset 映射写 focused tests，并先确认失败。

## 2. contentEditable 编辑器

- [x] 2.1 将 `WritingEditor` 的正文输入从多 textarea 改为 contentEditable 文档表面。
- [x] 2.2 保持主题 H1 和大纲 H2 的文档流视觉，但它们不并入正文 `text`。
- [x] 2.3 实现 contentEditable onInput 到 `onChange(text)` 的同步。
- [x] 2.4 支持 composition start/end，避免中文输入过程中重排。
- [x] 2.5 保留 Ctrl/Cmd + Enter、Ctrl/Cmd + J、Ctrl/Cmd + K 和 Escape 行为。
- [x] 2.6 保留 Selection Actions 和 Inline Expression Menu 的全文 offset 输入。

## 3. 行内 Diff 建议

- [x] 3.1 将当前句建议组件改为正文级 `InlineSuggestionBar`。
- [x] 3.2 根据 captured latest sentence range 定位到对应 paragraph block 下方。
- [x] 3.3 保留采纳、忽略、重试、复制操作。
- [x] 3.4 conflict 状态禁用采纳，并提示重新增强。
- [x] 3.5 未采纳时不调用 `/api/extract-learning`。

## 4. Typora 极简壳层

- [x] 4.1 按参考图重做顶栏、左侧存档栏、右侧低频工具和底部状态视觉。
- [x] 4.2 使用 `DESIGN.md` 的暖纸色、透明度灰阶和低边界深度。
- [x] 4.3 避免强卡片、重阴影、dashboard 式大面板。
- [x] 4.4 窄屏优先保证正文可写，侧栏和工具区可折叠。

## 5. 数据流回归

- [x] 5.1 Apply 仍只替换 captured range。
- [x] 5.2 Cancel/Copy/Regenerate 不保存 Learning Library 或 Correction Events。
- [x] 5.3 `/api/check-outline` 仍只在确认 inline topic/outline 后调用。
- [x] 5.4 Archive rename/delete 仍只更新 writing archives localStorage。

## 6. 验证与文档

- [x] 6.1 运行 focused tests。
- [x] 6.2 运行 `npm run lint`。
- [x] 6.3 如改动范围需要，运行 `npm test` 和 `npm run build`。
- [x] 6.4 更新 `PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`、`CHANGELOG.md`。
- [x] 6.5 如最终行为改变 AGENTS 约束，更新 `AGENTS.md`。
