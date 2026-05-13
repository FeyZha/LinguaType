# 任务清单

## 1. 写作存档侧栏

- [x] 1.1 将写作存档侧栏改为可折叠结构，提供展开/折叠按钮。
- [x] 1.2 折叠状态下保留新建写作和展开入口，正文编辑器仍保持主视觉中心。
- [x] 1.3 将 archive item 调整为 ChatGPT 式列表项：当前项高亮，hover/focus 显示 `...` 操作按钮。
- [x] 1.4 实现 archive item 操作菜单，至少包含重命名和删除。
- [x] 1.5 为删除操作增加确认 UI，文案说明只删除本地写作存档。

## 2. 写作存档删除数据流

- [x] 2.1 实现删除非当前 archive：更新 `linguatype.writingArchives.v1`，不改变当前正文。
- [x] 2.2 实现删除当前 archive：优先切换到剩余 archive 中最近打开的一项。
- [x] 2.3 实现删除唯一 archive：创建空白“未命名写作” archive，并保持主编辑器可用。
- [x] 2.4 确保删除 archive 不写入 `linguatype.learningLibrary.v1`、`linguatype.correctionEvents.v1`，不调用 `/api/extract-learning`。
- [x] 2.5 增加 storage 或 app focused tests 覆盖删除、activeId 切换和唯一 archive fallback。

## 3. 移除主界面设置抽屉

- [x] 3.1 删除主界面“修改主题”和“修改大纲”打开 `SetupDrawer` 的交互。
- [x] 3.2 移除 `SetupDrawer` 组件和相关 drawer state，保留首次无本地写作时的 `WritingSetupPanel`。
- [x] 3.3 清理旧抽屉相关测试，改为内联编辑测试。

## 4. 编辑器内联主题与领域修改

- [x] 4.1 在编辑器顶部以低调 metadata 样式展示文章主题和写作领域。
- [x] 4.2 为文章主题提供轻量内联编辑入口，确认保存前只维护草稿态。
- [x] 4.3 为写作领域提供轻量内联编辑入口，固定领域仍用按钮，自定义领域仍支持输入。
- [x] 4.4 取消内联编辑时丢弃草稿，不保存 setup/archive，不调用 `/api/check-outline`。
- [x] 4.5 确认保存时同步 `writingSetup`、active archive 和 localStorage。

## 5. 编辑器内联大纲修改

- [x] 5.1 将每段段落标题中的大纲点改为只读展示 + 低调编辑入口。
- [x] 5.2 点击编辑入口后，仅该大纲点进入内联 input 草稿态。
- [x] 5.3 大纲点输入中不调用 `/api/check-outline`。
- [x] 5.4 确认保存大纲点后才调用 `/api/check-outline`。
- [x] 5.5 提供低调新增大纲点入口。
- [x] 5.6 提供低调删除大纲点入口；若对应段落有正文，阻止删除并提示先清空正文。

## 6. 大纲检查和状态提示

- [x] 6.1 将大纲检查触发来源从 drawer confirm 改为 inline edit confirm。
- [x] 6.2 保持检查非阻断，只展示建议，不自动修改主题、大纲或正文。
- [x] 6.3 确保取消、输入、打开菜单、新建/切换/删除 archive 不触发 `/api/check-outline`，除非用户确认保存了 setup 变更。

## 7. 文档和规格

- [x] 7.1 更新 `PRODUCT.md`，说明可折叠写作存档栏和编辑器内联 setup 修改。
- [x] 7.2 更新 `ARCHITECTURE.md`，记录 archive delete 和 inline setup edit 数据流。
- [x] 7.3 更新 `MODULES.md`，补充 archive sidebar、inline setup controls 和 outline edit 边界。
- [x] 7.4 更新 `CHANGELOG.md`，加入本次产品变更摘要。
- [x] 7.5 更新 `AGENTS.md` 当前约束，删除主界面 setup drawer 作为默认修改方式的描述。

## 8. 验证

- [x] 8.1 运行与 archive sidebar、archive delete、inline setup edit、outline check 相关的 focused tests。
- [x] 8.2 运行 `npm test` 验证旧 latest-sentence、Apply/Cancel、Selection Actions 和 storage 行为不回归。
- [x] 8.3 运行 `npm run lint`。
- [x] 8.4 UI 变更较广，完成后运行 `npm run build`。
