# 设计说明

## 总体方向

本 change 是 v0.2.4 的体验 refinement，不改变 LinguaType 的核心产品边界：

- 仍然 editor-first。
- 仍然只处理最新非空句。
- 仍然不自动生成正文。
- 仍然不自动 Apply。
- 学习数据仍然只在明确 Apply 或明确 Save to Library 后保存。

## 文案策略

用户界面默认只显示中文。保留英文的范围仅限：

- 代码路径、API route、localStorage key、函数名、schema 名称。
- 必须作为产品内部 capability name 出现在文档或开发说明中的名词。

UI 中应从：

```text
写作准备 Writing Setup
界面主题 Theme
表达库 Learning Library
```

改为：

```text
写作准备
界面主题
表达库
```

测试应避免依赖旧的中英并列 UI 文案。

## Writing Setup 结构

Writing Setup 只负责写作准备，不再承载主题设置。

建议结构：

```text
写作准备
  |
  +-- 写作领域
  |     [科技] [个人成长] [历史] [艺术] [教育]
  |     [社会] [环境] [商业] [文化] [健康]
  |
  +-- 文章主题
  |     [输入框..........................][刷新]
  |
  +-- 大纲
        第 1 点 [输入框..................]
        第 2 点 [输入框..................]
        第 3 点 [输入框..................]
        [+ 添加一点] [- 删除最后一点]
```

写作领域不使用下拉框。领域选项直接展示为按钮、segmented cards 或紧凑 chips。选中状态必须清晰。

## 写作领域与预设主题

领域建议扩展为 10 个：

- 科技
- 个人成长
- 历史
- 艺术
- 教育
- 社会
- 环境
- 商业
- 文化
- 健康

每个领域提供 10 个中文预设文章主题。主题只是写作提示，不触发生成正文。

刷新按钮行为：

- 位于文章主题输入框最右侧。
- 点击后从当前领域的预设主题中选一个写入输入框。
- 若用户选择自定义领域或没有预设，可从通用主题池抽取。
- 刷新不调用 LLM。
- 刷新不覆盖大纲，除非用户明确重新生成或重置大纲；本 change 不要求自动生成大纲。

## 大纲数据模型

当前 v0.2.4 的 `outline: string` 应升级为结构化数组。

建议兼容模型：

```ts
type WritingSetup = {
  topicArea: WritingTopicArea;
  customTopicArea?: string;
  essayTopic: string;
  outlinePoints: string[];
  updatedAt: string;
};
```

迁移规则：

- 如果已有 `outline: string`，按换行拆分为 `outlinePoints`。
- 去掉空行。
- 如果拆分结果为空，默认 3 个空点。
- 保存新数据时使用 `outlinePoints`。
- 如为了兼容保留 `outline` 字段，不应作为主 UI 数据源。

## 主编辑器段落模型

主写作界面按大纲点数量展示同等数量的段落输入框。每个输入框前显示对应大纲点。

```text
第 1 段：大纲点 1
[段落输入框 1]

第 2 段：大纲点 2
[段落输入框 2]
```

内部可以维护：

```ts
type ParagraphDraft = {
  id: string;
  outlinePoint: string;
  text: string;
};
```

为了兼容现有 latest-sentence flow，可以在触发增强时把所有段落文本按空行拼接成 fullText。关键是需要保留当前输入框对应的 range 映射：

```text
paragraph drafts
  -> join with "\n\n"
  -> fullText
  -> extractLatestSentence
  -> replace captured range
  -> map replacement back to source paragraph
```

如果 range 映射复杂，首版可以约束 enhancement 只作用于当前 focused paragraph，并把 current paragraph text 作为 fullText 传入；但必须保持用户感知上仍是 latest-sentence enhancement。

## 主界面大纲编辑

主界面允许：

- 编辑大纲点文本。
- 增加大纲点和对应段落输入框。
- 删除大纲点和对应段落输入框。

删除时必须有保护：

- 不应误删已有段落文本。
- 如果对应段落已有文本，必须确认或将文本合并/保留为未归属段落；具体实现可在 apply 阶段选择最小安全方案。

## 大纲检查

新增后端 route：

```text
POST /api/check-outline
```

请求建议：

```ts
type OutlineCheckInput = {
  topicArea: WritingTopicArea;
  essayTopic: string;
  outlinePoints: string[];
  apiConfig: ApiConfig;
};
```

返回建议：

```ts
type OutlineCheckResult = {
  hasIssues: boolean;
  suggestionsZh: string[];
  shortSummaryZh: string;
};
```

规则：

- 只检查大纲是否符合文章主题、是否跑题、是否逻辑明显断裂。
- 不生成正文。
- 不改写用户大纲。
- 不自动 Apply 建议。
- 无问题时前端不提示。
- 有问题时显示轻量提示。
- 大纲修改后 debounce 调用，不能阻塞用户输入。
- 必须通过 `src/lib/llm/service.ts` 和 provider abstraction 调用。
- Mock Mode 必须 deterministic。

## 深色模式可读性

需要重点检查：

- Current Sentence popover。
- Suggested sentence / 原句 / explanation 区域。
- DiffViewer。
- Selection Actions popover。
- Inline Expression Menu。
- Proofreading floating panel。
- API Settings modal。
- Paragraph Flow panel。

修复策略：

- 为浮层和建议区域使用明确的 theme-aware background。
- 深色模式下正文文字使用高对比色。
- 不依赖浅色 `bg-white` + 浅灰文字组合。
- 避免新增大量一次性 class；优先使用共享 CSS token 或组件级清晰 class。

## 验证策略

优先 focused tests：

- UI 文案不再出现冗余英文并列文本。
- Writing Setup 领域以按钮/卡片展示，不使用 select。
- 主题刷新按钮从当前领域预设主题中填入主题。
- 大纲点默认 3 个，可增减。
- 主界面段落输入框数量跟随大纲点。
- 大纲修改触发 debounced `/api/check-outline`，无问题不提示，有问题提示。
- 深色模式下 popover 建议区域有可读 class 或 style。
- 现有 latest-sentence Apply/Cancel 流程仍通过。
