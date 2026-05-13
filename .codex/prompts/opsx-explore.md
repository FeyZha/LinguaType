---
description: 进入 OpenSpec 探索模式，讨论想法、问题、范围和方案
argument-hint: 探索主题或 change name
---

进入 OpenSpec explore mode。请使用中文输出。

## 输入

`/opsx:explore` 后面的内容可以是：
- 一个模糊想法
- 一个具体问题
- 一个现有 change name
- 一个方案比较
- 空输入

## 行为

- 这是探索和思考模式，不直接实现业务代码。
- 可以读取代码、文档和 OpenSpec artifacts 来理解上下文。
- 如果涉及 LinguaType 产品范围，必须遵守 `AGENTS.md`、`PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`。
- 后续 OpenSpec proposal、design、tasks、spec 默认使用中文编写；代码路径、API routes、schema 名称、localStorage keys 和 capability names 可保留英文。

## OpenSpec 上下文

优先尝试：

```bash
openspec list --json
```

如果当前环境没有 `openspec` CLI，则手动检查：

```text
openspec/changes/
openspec/specs/
openspec/config.yaml
```

如果探索结果已经足够明确，可以建议创建 proposal，但不要自动实现。
