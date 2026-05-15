# 任务清单

## 1. 工作台壳层

- [x] 1.1 降低主界面 header 视觉重量，保留 LinguaType、Mock Mode、主题偏好和 API Settings。
- [x] 1.2 调整主布局网格，使 Writing Archives 展开时编辑器仍是主视觉中心。
- [x] 1.3 调整 Writing Archives 收起状态，使编辑器恢复更宽的居中沉浸空间。
- [x] 1.4 弱化右侧低频工具区视觉权重，避免与正文编辑器竞争。
- [x] 1.5 确认窄屏下优先保证正文可写，侧栏/工具区不遮挡编辑器。

## 2. Typora 式编辑器

- [x] 2.1 将编辑器顶部 setup 展示整合进文档流：文章主题用 H1 风格，写作领域用低强调 metadata。
- [x] 2.2 将段落卡片改为无边框文档块，大纲点用 H2/段落标题风格展示。
- [x] 2.3 保留每段 textarea 和 `paragraphs.join("\n\n")` 底层模型。
- [x] 2.4 保留大纲点只读默认态和低调编辑入口。
- [x] 2.5 保留新增/删除大纲点规则；删除含正文段落的大纲点仍需阻止。
- [x] 2.6 确认 selection offset、inline expression menu 和 Selection Actions 仍能基于段落 offset 工作。

## 3. 行内当前句建议

- [x] 3.1 新增或改造当前句建议组件，使 diff 建议显示为靠近编辑器/当前段落的行内建议条。
- [x] 3.2 复用现有本地 diff parts，删除内容红色删除线，新增内容绿色高亮。
- [x] 3.3 保留 Apply、Cancel、Regenerate、Copy revised sentence 操作。
- [x] 3.4 Apply 仍使用 snapshot conflict detection 和 captured range replacement。
- [x] 3.5 未 Apply 时不保存 Learning Library，不写 Correction Events，不调用 `/api/extract-learning`。
- [x] 3.6 conflict 状态必须提示重新增强，不允许自动应用。

## 4. 写作存档侧边栏视觉收敛

- [x] 4.1 将 expanded archive sidebar 调整为轻量文档列表风格。
- [x] 4.2 保留新建、切换、当前项高亮、`...` 菜单、重命名、删除确认。
- [x] 4.3 将 collapsed archive sidebar 调整为窄栏，只保留展开和新建等必要入口。
- [x] 4.4 确保 rename archive title 不自动改写 essay topic。
- [x] 4.5 确保 delete archive 只更新 `linguatype.writingArchives.v1`。

## 5. API 与数据流回归保护

- [x] 5.1 确认 `/api/enhance-fast` 返回契约不扩大。
- [x] 5.2 确认 `/api/extract-learning` 仍只在 latest-sentence Apply 后调用。
- [x] 5.3 确认 `/api/check-outline` 仍只在用户确认 inline topic/outline 修改后调用。
- [x] 5.4 确认 Writing Archives、theme settings、trigger settings 仍为 localStorage-only。

## 6. 测试

- [x] 6.1 更新或新增 `WritingEditor` focused tests，覆盖 Typora 文档流中的段落拼接和大纲对应。
- [x] 6.2 更新或新增当前句建议 tests，覆盖 Apply/Cancel/Regenerate/Copy 和未 Apply 不提取学习数据。
- [x] 6.3 更新或新增 archive sidebar tests，覆盖 collapsed/expanded 入口和 delete/rename 行为不回归。
- [x] 6.4 运行相关 focused tests。
- [x] 6.5 UI 和核心流变更较广，完成实现后运行 `npm test`、`npm run lint`、`npm run build`。

## 7. 文档

- [x] 7.1 更新 `PRODUCT.md`，说明沉浸式 Typora 一体化工作台和行内当前句建议。
- [x] 7.2 更新 `ARCHITECTURE.md`，记录 shell/editor/suggestion 数据流变化。
- [x] 7.3 更新 `MODULES.md`，明确 `LinguaTypeApp`、`WritingEditor`、当前句建议组件的边界。
- [x] 7.4 更新 `CHANGELOG.md`。
- [x] 7.5 如产品约束有变化，更新 `AGENTS.md`，但不重复长篇架构说明。
