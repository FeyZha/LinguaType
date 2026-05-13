# 任务清单

## 1. 写作存档数据层

- [x] 1.1 在 `src/lib/storage.ts` 新增 `linguatype.writingArchives.v1` key、类型、默认值、load/save helper。
- [x] 1.2 支持从现有 `linguatype.writingDraft.v1` 和 `linguatype.writingSetup.v1` 初始化默认 archive，但不删除旧 key。
- [x] 1.3 实现 archive title 生成规则：优先 essay topic，否则“未命名写作”。
- [x] 1.4 支持 active archive 的新建、切换、重命名和自动保存。
- [x] 1.5 增加 storage focused tests，覆盖初始化、保存、切换和 legacy key 共存。

## 2. 主界面壳层

- [x] 2.1 调整 `LinguaTypeApp` 主布局，加入写作存档侧边栏或可折叠侧栏。
- [x] 2.2 保持中央正文编辑器为第一优先级，避免消息流或聊天输入语义。
- [x] 2.3 将当前文章标题、主题和修改入口放在主界面高频区域。
- [x] 2.4 右侧低频区域继续承载 Learning Library、Writing Habits、Tools / Settings、Data Control。
- [x] 2.5 更新样式，使界面更接近现代 AI 写作工作台，但不引入 landing page 或 dashboard 化首页。

## 3. 抽屉式 Writing Setup

- [x] 3.1 将进入主界面后的主题/大纲修改改为展开设置抽屉，而不是回到独立准备页。
- [x] 3.2 抽屉内维护 `draftSetup`，输入过程不立即写入 `writingSetup` 或 archive。
- [x] 3.3 实现“取消”丢弃草稿、“确定”保存草稿的行为。
- [x] 3.4 首次无 setup/archive 时保留初始 Writing Setup 页。
- [x] 3.5 修改主题和重命名存档的关系：存档标题可单独重命名，主题修改只通过 Writing Setup 抽屉完成。

## 4. 大纲锁定与显式检查

- [x] 4.1 删除或隐藏主界面独立“文章大纲”管理卡片。
- [x] 4.2 在正文段落标题中显示大纲点，并嵌入“修改大纲”入口。
- [x] 4.3 默认大纲只读；只有打开设置抽屉后才可编辑。
- [x] 4.4 新增、删除、修改大纲点时不调用 `/api/check-outline`。
- [x] 4.5 点击“确定”保存大纲后才调用 `/api/check-outline`。
- [x] 4.6 删除大纲点时保护已有段落正文，避免无提示丢失文本。
- [x] 4.7 更新 outline check tests，覆盖“编辑过程不调用、确定后调用”。

## 5. Selection Actions 交互

- [x] 5.1 扩展 `WritingEditor` selection callback，上报选区所在段落和可用于定位的 rect 信息。
- [x] 5.2 将 `SelectionActionsPopover` 从固定位置改为基于选区动态定位。
- [x] 5.3 优先在选区上方展示，空间不足时自动切到下方，并限制在编辑器容器内。
- [x] 5.4 修复第二段选中文本时浮层仍显示在第一段区域的问题。
- [x] 5.5 删除“Selection Actions”等重复英文用户文案。
- [x] 5.6 将解释结果展示为结构化中文区块。
- [x] 5.7 保持 Selection Actions 只支持解释和保存到表达库，不新增选中文本改写。

## 6. 选中文本解释 schema 与 provider

- [x] 6.1 评估是否扩展 `SelectionExplainResult`，如扩展则在 `src/lib/llm/types.ts` 增加兼容字段。
- [x] 6.2 更新 `src/lib/llm/prompts.ts`，要求结构化中文解释，不返回 replacement 或候选改写。
- [x] 6.3 更新 normalize、mock provider 和 openai-compatible provider 的解析与默认值。
- [x] 6.4 更新 `/api/explain-selection` 相关 tests，覆盖旧字段兼容和结构化展示。

## 7. 文档和规格

- [x] 7.1 更新 `PRODUCT.md`，说明写作存档、抽屉式 Writing Setup 和显式大纲检查边界。
- [x] 7.2 更新 `ARCHITECTURE.md`，记录 `writingArchives` localStorage 数据流。
- [x] 7.3 更新 `MODULES.md`，补充 archive、setup drawer、selection positioning 的模块边界。
- [x] 7.4 更新 `CHANGELOG.md`，加入本次产品变更摘要。
- [x] 7.5 如新增 localStorage key 或调整规则，更新 `AGENTS.md` 的当前约束。

## 8. 验证

- [x] 8.1 运行与 storage、Writing Setup、outline check、Selection Actions 相关的 focused tests。
- [x] 8.2 验证旧 latest-sentence Apply/Cancel、Regenerate、Copy 行为不回归。
- [x] 8.3 验证切换 archive 不触发 learning extraction 或 Correction Events。
- [x] 8.4 如 UI 变更较广，运行 `npm test` 和 `npm run lint`；只有 release-level handoff 或风险足够高时再运行 `npm run build`。
