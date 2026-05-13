# 设计说明

## 总体方向

本 change 增加一个进入主编辑器前的轻量 Writing Setup 状态，并增加全局 theme preference。它不改变现有 editor-first 主流程，而是在进入编辑器前收集用户自己提供的写作上下文。

```text
App load
  |
  +-- has active draft/setup? --> Continue Writing
  |
  v
Writing Setup
  |
  +-- topic area
  +-- essay topic
  +-- outline
  +-- theme preference
  |
  v
LinguaType editor
  |
  v
existing latest-sentence flow unchanged
```

## Writing Setup 数据模型

建议新增 localStorage key：

```text
linguatype.writingSetup.v1
```

建议 shape：

```ts
type WritingTopicArea =
  | "technology"
  | "personal_growth"
  | "history"
  | "art"
  | "education"
  | "society"
  | "environment"
  | "business"
  | "custom";

type WritingSetup = {
  topicArea: WritingTopicArea;
  customTopicArea?: string;
  essayTopic: string;
  outline: string;
  updatedAt: string;
};
```

字段约束：

- `topicArea` 必填。
- `customTopicArea` 只在 `topicArea === "custom"` 时使用。
- `essayTopic` 必填，保存用户自己输入的文章主题。
- `outline` 必填或至少在 UI 上明确要求填写；可以是多行文本。
- 不在 setup 阶段调用 LLM。
- 不在 setup 阶段保存 Learning Library 或 Correction Events。

## Theme Preference 数据模型

建议新增 localStorage key：

```text
linguatype.themeSettings.v1
```

建议 shape：

```ts
type ThemePreference = "light" | "dark" | "system";

type ThemeSettings = {
  preference: ThemePreference;
  updatedAt: string;
};
```

默认值建议为 `system`。

Theme 应用规则：

- `light`：强制浅色界面。
- `dark`：强制深色界面。
- `system`：使用 `prefers-color-scheme`。
- theme 只影响 CSS class 或 data attribute，不影响 API、storage、LLM、learning data。

## UI 结构

Writing Setup 不应做成营销页。它是一个任务准备界面，第一屏应直接提供可操作表单。

建议结构：

```text
Writing Setup
  |
  +-- 领域选择 Topic Area
  |     科技 / 个人成长 / 历史 / 艺术 / 教育 / 社会 / 环境 / 商业 / 自定义
  |
  +-- 文章主题 Essay Topic
  |
  +-- 大纲 Outline
  |
  +-- 界面主题 Theme
  |     跟随系统 / 浅色 / 深色
  |
  +-- 进入写作
  +-- 继续上次写作（如果有 draft）
```

## 与现有主流程关系

进入编辑器后，现有主流程保持：

```text
latest sentence
  -> /api/enhance-fast
  -> code-generated diff
  -> Apply / Cancel
  -> immediate editor replacement
  -> background learning extraction after Apply
```

Writing Setup 可以被主流程读取为 writing context，但必须遵守：

- latest-sentence enhancement 仍只处理最新非空句。
- previous context 只用于 tone、meaning、coherence reference。
- 不根据 outline 自动补全文章。
- 不因为 topic area 改写整段。
- 不在用户没有 Apply 时保存学习数据。

## 与现有文件的预期关系

预期新增或调整位置：

- `src/lib/storage.ts`：新增 writing setup 和 theme settings 的 localStorage key、default、load/save helper。
- `src/lib/llm/types.ts`：如需要，可新增 writing setup 类型，或仅在 storage 层定义 UI-only 类型。
- `src/components/LinguaTypeApp.tsx`：增加进入主编辑器前的 setup state gating。
- `src/components/WritingSetupPanel.tsx`：新增写作准备表单组件。
- `src/components/ThemePreferenceControl.tsx`：新增或内联 theme selector。
- `src/app/globals.css`：补充 light/dark 主题 tokens 或 class。

应避免：

- 在 API Settings 中混入 theme preference。
- 在 provider prompt 中直接要求生成正文。
- 在 setup 阶段调用 `/api/enhance-fast` 或其他 LLM routes。
- 改动 `src/app/api/*` route contract，除非后续明确需要。

## 验证思路

优先使用 focused tests：

- setup 数据保存和恢复。
- 有 draft 时可以继续写作。
- 进入编辑器后 latest-sentence flow 仍可用。
- theme preference 三种模式的 class/data attribute 行为。
- setup 不触发 LLM、不保存 learning data。

不需要启动长期 dev server，除非实现阶段需要手动 UI 检查。
