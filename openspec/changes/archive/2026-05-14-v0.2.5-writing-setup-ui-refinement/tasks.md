# 任务清单

## 1. 精简 UI 文案

- [x] 1.1 扫描并移除核心界面中冗余的“中文 + 英文”标题文案。
- [x] 1.2 将用户可见 UI 默认改为中文，例如 `写作准备 Writing Setup` 改为 `写作准备`。
- [x] 1.3 保留代码标识符、API route、localStorage key、schema 名称和必要开发文档中的英文。
- [x] 1.4 更新依赖旧中英并列文案的测试。

## 2. 调整 Theme Preference 位置与深色模式可读性

- [x] 2.1 从 Writing Setup 中移除 Theme Preference 控件。
- [x] 2.2 只在主写作界面保留主题设置入口。
- [x] 2.3 修复深色模式中 Current Sentence popover 建议区域文字不易读的问题。
- [x] 2.4 检查并修复其它浮层、建议区域和状态提示的深色模式可读性。
- [x] 2.5 更新测试，覆盖准备页不再展示主题设置、主界面仍可保存主题设置。

## 3. 改造 Writing Setup 领域与主题输入

- [x] 3.1 将写作领域从 select 改为直接展示的领域按钮。
- [x] 3.2 提供当前存储模型支持的领域：科技、个人成长、历史、艺术、教育、社会、环境、商业、自定义。
- [x] 3.3 为每个领域预设 10 个文章主题。
- [x] 3.4 文章主题保留输入框。
- [x] 3.5 在文章主题输入框右侧增加刷新按钮。
- [x] 3.6 点击刷新按钮时，从当前领域预设主题中抽取一个填入主题输入框。
- [x] 3.7 刷新主题不调用 LLM，不生成正文，不自动修改大纲。

## 4. 改造大纲编辑

- [x] 4.1 将 Writing Setup 的大纲从单一 textarea 改为多个独立输入框。
- [x] 4.2 默认展示 3 个大纲点输入框。
- [x] 4.3 每个输入框前标注“第 N 点”。
- [x] 4.4 提供增加大纲点按钮。
- [x] 4.5 提供减少大纲点按钮，并在主界面避免误删已有正文内容。
- [x] 4.6 将 storage 数据模型升级为 `outlinePoints: string[]`，并兼容旧 `outline: string`。

## 5. 改造主写作界面段落输入

- [x] 5.1 主界面根据大纲点数量展示对应数量的段落输入框。
- [x] 5.2 每个段落输入框前提示对应大纲点。
- [x] 5.3 用户可在主界面编辑大纲点。
- [x] 5.4 用户可在主界面增加或减少大纲点，并同步段落输入框数量。
- [x] 5.5 保持 latest-sentence enhancement 作用于当前草稿文本中的最新非空句。
- [x] 5.6 保持 Apply/Cancel、Regenerate、Copy、background extraction 行为不变。
- [x] 5.7 保持 draft localStorage 自动保存和恢复。

## 6. 新增大纲检查

- [x] 6.1 新增 `/api/check-outline` route。
- [x] 6.2 在 `src/lib/llm/types.ts` 中定义 Outline Check request/result schema。
- [x] 6.3 在 `src/lib/llm/prompts.ts` 中新增 outline check prompt。
- [x] 6.4 在 `src/lib/llm/service.ts` 中新增 `checkOutlineWithLLM`。
- [x] 6.5 在 Mock provider 和 OpenAI-compatible provider 中实现 outline check。
- [x] 6.6 前端在用户修改大纲后 debounce 调用 outline check。
- [x] 6.7 outline check 只提示问题，不自动修改大纲；无问题时不展示提示。
- [x] 6.8 outline check 不阻塞用户继续输入。

## 7. 更新文档与 specs

- [x] 7.1 更新 `PRODUCT.md`，说明 v0.2.5 的写作准备页、分段写作和大纲检查边界。
- [x] 7.2 更新 `ARCHITECTURE.md`，记录分段 draft、outline check API 和数据流。
- [x] 7.3 更新 `MODULES.md`，补充预设主题、分段编辑和 outline check 模块边界。
- [x] 7.4 更新 `CHANGELOG.md`，加入 v0.2.5。
- [x] 7.5 如新增 localStorage key 或 API route，更新 `AGENTS.md`。

## 8. 验证

- [x] 8.1 增加 focused tests 覆盖 Writing Setup 领域按钮和主题刷新。
- [x] 8.2 增加 focused tests 覆盖大纲点 storage 迁移。
- [x] 8.3 增加 focused tests 覆盖主界面段落输入框数量跟随大纲。
- [ ] 8.4 增加 focused tests 覆盖 outline check 的 debounce、无问题不提示、有问题提示。
- [x] 8.5 增加或更新 tests 覆盖主题设置只在主界面展示。
- [ ] 8.6 运行与风险匹配的测试；至少运行 `npm test` 和 `npm run lint`。
