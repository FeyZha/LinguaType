# 任务清单

## 1. 建立 Writing Setup 数据模型

- [x] 1.1 在本地 storage 层新增 `linguatype.writingSetup.v1` key。
- [x] 1.2 定义 topic area 枚举：科技、个人成长、历史、艺术、教育、社会、环境、商业、自定义。
- [x] 1.3 增加 Writing Setup 的 default、load、save、normalize helper。
- [x] 1.4 确保 setup 数据 localStorage-only，不写入服务端。

## 2. 建立 Theme Preference 数据模型

- [x] 2.1 在本地 storage 层新增 `linguatype.themeSettings.v1` key。
- [x] 2.2 支持 `light`、`dark`、`system` 三种 preference。
- [x] 2.3 默认使用 `system`。
- [x] 2.4 确保 theme preference 不影响 API Settings、LLM provider 或学习数据。

## 3. 实现 Writing Setup UI

- [x] 3.1 新增写作准备组件，默认中文 UI。
- [x] 3.2 提供 topic area 选择框。
- [x] 3.3 在用户选择领域后要求填写文章主题和大纲。
- [x] 3.4 提供进入写作按钮。
- [x] 3.5 如果存在 draft 或已有 setup，提供继续上次写作路径，避免阻断用户。
- [x] 3.6 不在 setup 阶段调用 LLM 或保存 Learning Library / Correction Events。

## 4. 实现 Theme Preference UI 和应用逻辑

- [x] 4.1 提供浅色 Light、深色 Dark、跟随系统 System 的选择控件。
- [x] 4.2 将 theme preference 应用到应用根节点或 document class/data attribute。
- [x] 4.3 `system` 模式跟随 `prefers-color-scheme`。
- [x] 4.4 保证主题切换不改变编辑器文本、API settings、Learning Library、Writing Habits 或 Correction Events。

## 5. 接入主编辑器流程

- [x] 5.1 在 `LinguaTypeApp` 中增加 setup gating：未完成 setup 时显示 Writing Setup，完成后显示现有编辑器。
- [x] 5.2 保持现有 latest-sentence enhancement、Apply/Cancel、Regenerate、Copy 和 background extraction 行为不变。
- [x] 5.3 如将 setup 信息作为 context 使用，只能作为 tone、meaning、coherence reference，不得生成正文或改写整段。
- [x] 5.4 保持高频 UI 仍靠近编辑器，sidebar 仍用于低频管理。

## 6. 更新文档与 OpenSpec

- [x] 6.1 更新 `PRODUCT.md`，说明 Writing Setup 是写作准备，不是 landing page 或 essay generator。
- [x] 6.2 更新 `ARCHITECTURE.md`，记录 setup gating、writing setup storage 和 theme settings。
- [x] 6.3 更新 `MODULES.md`，补充 Writing Setup 和 Theme Preference 模块边界。
- [x] 6.4 更新 `CHANGELOG.md`，加入 v0.2.4 条目。
- [x] 6.5 如新增 localStorage keys，更新 `AGENTS.md` 中 key 列表和相关规则。

## 7. 验证

- [x] 7.1 增加或更新 focused tests，覆盖 Writing Setup storage helper。
- [x] 7.2 增加或更新 focused tests，覆盖 theme preference helper 或 UI class/data attribute 行为。
- [x] 7.3 验证 setup 阶段不触发 LLM routes。
- [x] 7.4 验证进入编辑器后现有 latest-sentence Apply/Cancel 流程不变。
- [x] 7.5 运行与改动风险匹配的最小测试；仅在必要时运行完整 test/lint/build。
