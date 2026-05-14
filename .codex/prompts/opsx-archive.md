---
description: 归档已完成的 OpenSpec change
argument-hint: change name
---

归档已完成的 OpenSpec change。请使用中文输出。

## 输入

`/opsx:archive` 后面可以指定 change name。若未指定：
- 如果只有一个 active change，可以使用它。
- 如果有多个 active changes，必须让用户选择。

## 归档前检查

- 读取 `openspec/changes/<change-name>/tasks.md`。
- 如果存在未完成 `- [ ]`，必须提示用户确认后再继续。
- 检查 delta specs：`openspec/changes/<change-name>/specs/`。
- 如果有 delta specs，归档前应同步到 `openspec/specs/<capability>/spec.md`。

## 归档

目标目录格式：

```text
openspec/changes/archive/YYYY-MM-DD-<change-name>/
```

移动整个 change 目录，保留 proposal、design、tasks 和 specs。

## CLI 优先

如果 `openspec` CLI 可用，优先使用：

```bash
openspec status --change "<name>" --json
```

## CLI 不可用时的 fallback

如果当前环境没有 `openspec` CLI，则手动检查 tasks、同步 specs，并移动目录到 archive。
