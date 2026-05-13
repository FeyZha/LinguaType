# v0.2.5 写作准备与深色模式体验优化

## 背景

v0.2.4 已经加入 Writing Setup 和 Theme Preference，但当前体验仍有几个明显问题：

- UI 中大量“中文 + English capability name”并列显示，信息密度高且冗余。
- Theme Preference 出现在 Writing Setup，分散了准备页的核心任务。
- 深色模式下部分 popover / 建议区域的文字和背景对比不足。
- 写作领域使用下拉框，选择不够直观。
- 文章主题和大纲仍偏自由文本，不能有效帮助用户快速开始写作。
- 主编辑器仍是单一写作框，无法直接映射用户准备阶段的大纲结构。

本 change 目标是在不改变 latest-sentence enhancement 核心规则的前提下，优化 Writing Setup、主编辑器结构、主题设置位置和大纲检查体验。

## 改动范围

- 精简所有用户界面文案：默认只显示中文，删除冗余英文并列文本。
- Theme Preference 从 Writing Setup 移除，只保留在主写作界面。
- 修复深色模式下 popover、建议框、diff、selection actions、inline menu 等浮层的可读性问题。
- 将 Writing Setup 的写作领域从下拉框改为直接展示的可选项。
- 每个写作领域提供 10 个预设文章主题。
- 文章主题输入框右侧提供刷新按钮，从当前领域的预设主题中抽取一个填入。
- 大纲从单一 textarea 改为多个独立输入框，默认 3 点，支持增减。
- 主编辑器根据大纲数量拆成相同数量的段落写作框，每个写作框显示对应大纲提示。
- 主界面允许用户增减大纲点并编辑大纲内容。
- 用户修改大纲后，在不影响输入的前提下调用后端大模型检查大纲是否符合文章主题；有问题时提示修改意见，无问题时不提示。

## 非目标

- 不生成文章正文。
- 不根据预设主题自动写正文。
- 不根据大纲自动续写。
- 不评分作文。
- 不把大纲检查做成强制阻断。
- 不改变 Apply/Cancel、range replacement、background learning extraction 规则。
- 不新增登录、数据库、云同步或服务端持久化。

## 预期结果

用户进入 Writing Setup 后能更快完成准备：

```text
选择领域卡片
  -> 输入或刷新文章主题
  -> 编辑 3 个默认大纲点，可增减
  -> 进入写作
```

进入主界面后：

```text
大纲点 1 -> 段落输入框 1
大纲点 2 -> 段落输入框 2
大纲点 3 -> 段落输入框 3
```

用户可以继续使用原有 latest-sentence enhancement。系统仍只增强当前用户写出的最新非空句，不自动生成内容。

## 风险

- 将主编辑器拆成多个段落输入框可能影响现有 range replacement、selection actions、inline menu 和 proofreading，需要明确文本拼接与 range 映射策略。
- 大纲检查调用 LLM 可能打扰写作，需要 debounce、后台执行和非阻断提示。
- UI 文案去英文后，测试中依赖旧英文文本的断言可能需要同步更新。
- 深色模式修复需要检查所有浮层和建议区域，避免只修一个 popover。
