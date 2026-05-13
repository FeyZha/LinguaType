# 设计说明

## 总体原则

本 change 是 v0.2.6 主界面的收敛优化，不重写产品结构。中央正文编辑器继续是第一优先级；写作存档侧栏是导航与本地稿件管理；右侧栏继续承载低频工具。所有新增状态仍保存在 localStorage，不新增后端持久化。

## 主界面结构

```text
┌───────────────┬──────────────────────────────────┬───────────────┐
│ ArchiveNav    │ Editor Surface                   │ Tool Sidebar  │
│               │                                  │               │
│ [collapse]    │ topic / area inline metadata      │ review status │
│ + 新建写作     │ outline labels inside paragraphs  │ library       │
│ recent items  │ latest-sentence enhancement       │ habits        │
│ item ... menu │ Apply / Cancel near editor        │ settings      │
└───────────────┴──────────────────────────────────┴───────────────┘
```

侧栏折叠时不应让页面变成 dashboard，也不应隐藏正文编辑器。折叠栏宽度应稳定，避免展开/收起造成正文过大跳动。若移动端空间不足，可将侧栏作为覆盖层或窄栏，但正文编辑仍是主要区域。

## 写作存档侧栏

新增或调整主界面状态：

```ts
type ArchiveSidebarState = {
  collapsed: boolean;
  openMenuArchiveId: string | null;
  deleteCandidateId: string | null;
};
```

状态可以先保持 React state，不必新增 localStorage key。若后续需要记住折叠偏好，可以独立提出。

每条 archive item：

- 主体点击切换 archive。
- 当前 archive 高亮。
- hover/focus 时显示 `...` 操作按钮。
- `...` 菜单提供“重命名”和“删除”。
- 重命名可以复用当前 active title input 的逻辑，也可以变成 item 内联 input；推荐先做 item 内联 input，让重命名发生在条目附近。

删除流程：

1. 用户点击 archive item 的 `...`。
2. 点击“删除”。
3. 显示轻量确认弹层或确认行，文案明确说明只删除本地写作存档。
4. 用户确认后删除 `writingArchives.items` 中对应项。
5. 如果删除项是 active archive：
   - 优先切换到 `lastOpenedAt` 最新的剩余 archive。
   - 如果没有剩余 archive，创建新的空白 archive，标题为“未命名写作”。
6. 删除不写入 Learning Library，不写入 Correction Events，不调用 `/api/extract-learning`。

## 编辑器内联 Writing Setup 修改

移除主界面 `SetupDrawer` 作为主题/大纲修改入口。首次无本地写作时的 `WritingSetupPanel` 保留。

进入主界面后，setup 修改分为三个轻量编辑点：

- 文章主题：编辑器顶部 metadata 行显示当前主题，旁边小号编辑图标或弱按钮。
- 写作领域：主题下方或同一 metadata 行显示领域，点击后显示固定领域按钮和自定义输入。
- 大纲点：每个段落标题显示对应大纲点，旁边小号编辑图标；点击后该点原地变为 input。

内联编辑必须有草稿态：

```ts
type InlineSetupEditState =
  | { kind: "none" }
  | { kind: "topic"; draft: string }
  | { kind: "area"; draftArea: WritingTopicArea; draftCustomArea?: string }
  | { kind: "outline-point"; index: number; draft: string };
```

确认保存时：

- 更新 `writingSetup`。
- 同步 active archive 的 `setup`。
- 保存到 `linguatype.writingSetup.v1` 和 `linguatype.writingArchives.v1`。
- 若主题或大纲满足检查条件，调用 `/api/check-outline`。

取消时：

- 丢弃内联草稿。
- 不保存。
- 不调用 `/api/check-outline`。

## 大纲增删

新增大纲点不应做成醒目的主按钮。推荐在段落/大纲区域底部放一个轻量 `+ 大纲点`。删除可通过对应大纲点附近的低调菜单完成。

删除规则：

- 如果对应段落正文为空，可以删除该大纲点并同步段落结构。
- 如果对应段落正文非空，阻止删除并提示先清空该段正文。
- 删除过程不调用 `/api/check-outline`。
- 删除确认保存后才按显式规则检查大纲。

## 大纲检查

沿用 v0.2.6 的显式触发原则，但将触发来源从抽屉确认改为内联编辑确认。

- 输入中：不检查。
- 取消：不检查。
- 确认保存主题、领域或大纲点：可以检查。
- 检查非阻断，只展示建议，不改写 setup 或正文。

## 组件边界

推荐实现边界：

- `LinguaTypeApp.tsx`：继续持有 archive/setup/text 的顶层状态和持久化函数。
- `ArchiveSidebar`：可从 `LinguaTypeApp.tsx` 内联拆出，负责折叠、列表、菜单和删除确认 UI。
- `WritingEditor`：只负责展示段落、大纲点和编辑器事件；通过 props 暴露 outline edit/add/delete intent。
- `InlineSetupControls`：可作为轻量组件放在 editor surface 顶部，负责 topic/area inline edit UI。
- `storage.ts`：新增 delete archive helper 或在 app 层用现有 save helper 更新 `WritingArchivesState`。

避免让 `WritingEditor` 直接读写 localStorage 或调用 `/api/check-outline`。

## 测试策略

Focused tests 应覆盖：

- 侧栏展开/折叠不影响当前正文。
- archive item `...` 菜单可打开，删除非当前 archive 后不会改变当前正文。
- 删除当前 archive 后切换到剩余 archive。
- 删除唯一 archive 后创建空白 archive 并保持编辑器可用。
- 删除 archive 不写入 Learning Library、Correction Events，不调用 `/api/extract-learning`。
- 主题内联编辑输入时不调用 `/api/check-outline`，确认后才调用。
- 大纲点内联编辑输入时不调用 `/api/check-outline`，确认后才调用。
- 删除含正文段落对应的大纲点会被阻止。
