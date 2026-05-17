# 设计

## 交互

`Ctrl/Cmd + K` 从“打开表达菜单”改为“检查本段”。快捷键由编辑器读取当前光标位置，直接把光标 offset 传给主应用的段落流畅度检查逻辑。折叠侧边栏在“增强当前句”按钮下方增加一个小图标按钮，执行同一条检查路径。

## 状态与设置

删除运行时的 `inlineMenu` 状态和 `InlineExpressionMenu` 组件挂载。`TriggerSettings` 不再暴露 `inlineExpressionMenuTrigger`，旧 localStorage 中的该字段会被忽略，并在下一次保存触发设置时自然清理。

## 数据链

触发链路变为：

`Ctrl/Cmd + K` 或折叠侧边栏按钮 -> 当前光标所在段落 -> `/api/check-paragraph-flow` -> `ParagraphFlowPanel` 展示 summary、issues、diff -> 用户 Apply/Cancel。

`fullText` 仍只作为上下文传入，实际检查和替换对象仍是当前段落。

## 文档

同步更新 `AGENTS.md`、`ARCHITECTURE.md`、`MODULES.md` 和 OpenSpec active spec，避免继续描述 Inline Expression Menu。
