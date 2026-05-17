# 段落健康默认开启触发改造

## 背景

段落健康检查目前可以设置为仅手动或关闭，也包含“累计三次 Apply 后触发”的模式。现在产品需要把段落健康作为默认开启的轻量写作反馈，不再提供关闭或仅手动选项，并把三次 Apply 模式改为段落完成后自动检查一次。

## 变更

- 删除 `paragraphHealthTrigger` 中的 `manual_only` 和 `off`。
- 将 `after_3_applied_edits` 迁移为 `after_paragraph_complete`。
- 每次 Apply 模式继续在 Apply 后尝试检查当前段落。
- 段落完成模式在用户写完一段后对该段默认检查一次。
- 段落健康检查的运行中、段落流畅度运行中、30 秒节流改为按段落分别判断。
- 删除段落至少 40 个英文词的过滤条件，保留至少两句的轻量过滤。

## 非目标

- 不改变 `/api/check-paragraph-health` 的返回契约。
- 不让段落健康返回改写段落或自动 Apply。
- 不改变段落流畅度手动检查和 Apply Paragraph 的行为。
