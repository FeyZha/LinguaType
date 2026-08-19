# LinguaType 表达支架离线评测

当前状态：20 条样本已冻结为 `expression-scaffold.dev.v1`，进入模型能力测试准备；尚未运行 baseline。

本目录只评估一个问题：

> 系统能否结合题目与全文，正确理解目标句中的中文，并提供一个可继续写作、但不替用户重写整句的英文表达支架？

## 文件导航

| 文件 | 只回答的问题 |
|---|---|
| [cases.md](./cases.md) | 用哪些样本测试？ |
| [case-schema.md](./case-schema.md) | 样本字段如何定义，哪些数据可以进入哪一阶段？ |
| [model-output.md](./model-output.md) | 被测模型需要填写什么？ |
| [rubric.md](./rubric.md) | 什么样的输出算好或算错？ |
| [scoring.md](./scoring.md) | 如何给分、记录版本和复测？ |
| [review.md](./review.md) | 20 条样本及其分类是否保留、修改或删除？ |
| [freeze-manifest.json](./freeze-manifest.json) | 当前冻结版本和文件指纹是什么？ |
| [verify-freeze.mjs](./verify-freeze.mjs) | 如何在运行前检查冻结文件未变化？ |
| [prompts/baseline-v1.md](./prompts/baseline-v1.md) | 首轮被测模型使用什么 Prompt？ |
| [run-baseline.mjs](./run-baseline.mjs) | 如何校验配置并运行首轮被测模型？ |
| [runs/README.md](./runs/README.md) | 实际运行结果如何隔离保存？ |

## 两个分类字段的用途

`slot_function` 描述中文片段在目标句中的外部功能，`span_scope` 描述中文片段自身的结构大小。

它们只用于：

- 检查评测集是否覆盖不同类型的中文卡点；
- 评分完成后按样本类型切片统计。

它们不提供给被测模型，首轮 LLM Judge 也不依赖这两个标签评分。

## 使用顺序

```text
审核样本和分类
→ 冻结评测集
→ 运行被测模型
→ LLM Judge 评分
→ 人工复核
→ 根据真实 bad case 总结失败模式
→ 同集复测
```

当前已完成前两步。任何冻结文件变化都必须创建新的 `eval_set_id`；实际输出、评分和人工复核只能写入 `runs/<run_id>/`。

运行模型前先执行：

```text
node evals/expression-scaffold/run-baseline.mjs --validate-only
```

该命令只校验冻结指纹、20 条样本、25 个中文片段和 Prompt，不调用模型，也不创建 run。实际运行命令与本地环境变量见 `runs/README.md`。

## 证据边界

- `LT-ESC-001` 只继承用户真实出现过的“公众可达性”中文卡点，题目和全文为 AI 重建上下文。
- 其余 19 条源自 AI 初拟，虽已完成逐条静态复审，仍不是真实用户数据。
- 当前没有 baseline 输出、评测分数、失败模式、改进幅度或真实用户效果。
