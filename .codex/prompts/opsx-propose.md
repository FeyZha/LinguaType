---
description: 创建 OpenSpec change，并生成 proposal、design、tasks 和相关 specs
argument-hint: change name 或变更描述
---

为 LinguaType 创建 OpenSpec proposal。请使用中文输出，所有新建 proposal、design、tasks、spec 默认使用中文。

## 输入

`/opsx:propose` 后面的内容是 change name 或变更描述。

## 规则

- change artifacts 放在 `openspec/changes/<change-name>/`。
- 必须先读取 `openspec/config.yaml`、`AGENTS.md`，并根据需要读取 `PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`。
- 不直接修改业务代码。
- 不新增与 proposal 无关的功能或重构。
- 如果涉及 LinguaType 产品行为，必须保持 editor-first、localStorage-only、Apply-gated learning persistence。

## CLI 优先

如果 `openspec` CLI 可用，优先使用：

```bash
openspec new change "<name>"
openspec status --change "<name>" --json
openspec instructions <artifact-id> --change "<name>" --json
```

## CLI 不可用时的 fallback

如果当前环境没有 `openspec` CLI，则手动创建：

```text
openspec/changes/<change-name>/proposal.md
openspec/changes/<change-name>/design.md
openspec/changes/<change-name>/tasks.md
openspec/changes/<change-name>/specs/<capability>/spec.md
```

artifact 内容必须符合 `openspec/config.yaml` 的中文文档约定。
