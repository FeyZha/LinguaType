---
description: 实现一个 OpenSpec change 的 tasks
argument-hint: change name
---

执行 OpenSpec change。请使用中文输出。

## 输入

`/opsx:apply` 后面可以指定 change name。若未指定：
- 如果只有一个 active change，可以使用它。
- 如果有多个 active changes，必须让用户选择。

## 执行前

读取：
- `openspec/config.yaml`
- `AGENTS.md`
- `openspec/changes/<change-name>/proposal.md`
- `openspec/changes/<change-name>/design.md`
- `openspec/changes/<change-name>/tasks.md`
- 相关 `openspec/changes/<change-name>/specs/**/spec.md`

## 规则

- 按 tasks 逐项执行。
- 每完成一项，立即在 `tasks.md` 中把 `- [ ]` 改为 `- [x]`。
- 改动必须最小化，符合 proposal/design/spec。
- 对 LinguaType：不要破坏最新句主流程，不自动 Apply，不新增 cloud/database/login/payment，不把产品改成 chatbot 或 dashboard。
- 文档和 specs 默认使用中文。

## CLI 优先

如果 `openspec` CLI 可用，优先使用：

```bash
openspec status --change "<name>" --json
openspec instructions apply --change "<name>" --json
```

## CLI 不可用时的 fallback

如果当前环境没有 `openspec` CLI，则手动读取 change artifacts 和 tasks，按现有目录结构执行。
