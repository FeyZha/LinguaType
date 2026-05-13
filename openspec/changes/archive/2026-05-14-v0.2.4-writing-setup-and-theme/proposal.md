# v0.2.4 写作准备页与主题设置

## 背景

LinguaType 当前主流程从编辑器直接开始，适合快速写作和 latest-sentence enhancement。但面向雅思、留学申请、研究生日常英文输出等练习场景时，用户在进入写作前通常需要先明确写作领域、文章主题和大纲。

本次 change 目标是在不破坏 editor-first 主流程的前提下，增加一个轻量 Writing Setup 写作准备入口，并提供 Light / Dark / System 主题设置。

## 改动范围

- 在进入主写作体验前增加 Writing Setup 页面或入口状态。
- 用户可以选择写作领域，例如科技、个人成长、历史、艺术等。
- 用户选择领域后，需要填写文章主题和大纲。
- 用户可以选择界面主题：浅色 Light、深色 Dark、跟随系统 System。
- Writing Setup 信息和 theme preference 保存在 localStorage。
- 进入编辑器后，现有 latest-sentence enhancement、Apply/Cancel、background learning extraction、Learning Library、Writing Habits 等行为保持不变。

## 非目标

- 不生成文章正文。
- 不根据大纲自动续写。
- 不替用户决定观点、论点或写作方向。
- 不把启动页做成营销 landing page。
- 不新增登录、数据库、云同步、支付或账户系统。
- 不改变 `/api/enhance-fast` 的返回 contract。
- 不改变 Apply-gated learning persistence。
- 不重写当前主编辑器流程。

## 用户体验目标

用户首次进入或开始新写作时，先完成轻量准备：

```text
选择写作领域
  -> 填写文章主题
  -> 填写大纲
  -> 选择界面主题
  -> 进入编辑器
```

如果已经有本地 draft 或已保存的 setup，用户应能继续上次写作，避免启动页成为写作阻力。

## 产品边界

Writing Setup 收集的信息只能作为用户写作上下文和界面状态。它可以帮助用户明确当前练习任务，也可以在后续 enhancement request 中作为轻量 context 参考，但不得触发自动写作、自动段落生成或整篇文章生成。

Theme preference 只是 UI preference，不影响 API settings、LLM provider、learning data、Correction Events、Paragraph Health cache 或 selection behavior。

## 风险

- 启动页可能增加进入编辑器的摩擦，需要提供继续上次写作或跳过路径。
- 主题和写作设置如果混入 API Settings，会让低频设置混乱，需要单独建模。
- 大纲字段可能被误用为 essay generator 输入，需要在 spec 中明确禁止自动生成正文。
