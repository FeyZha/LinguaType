# LinguaType

LinguaType 聚焦一个具体的雅思写作卡点：用户知道中文意思，但无法在当前英文句子中自然表达。

当前验证的问题是：

> 系统能否结合雅思题目与全文，为中英混合句中的中文片段提供足以继续写作、又不替用户完成整句的英文表达支架？

## 当前链路

```text
用户用中文占位
→ 选择一个含中文的句子
→ 模型读取题目、全文和目标句
→ 为每个中文片段返回一个英文表达
→ 用户自行完成句子
```

系统不自动改写原文，不输出完整句，不提供多个候选。

## 当前阶段

- 已完成：问题收敛、产品锚点、单一链路、评测规则和 20 条冻结样本。
- 正在进行：首轮模型能力 baseline 准备。
- 尚未完成：模型输出、Judge 与人工评分、失败模式归纳、真实用户测试和应用实现。

当前材料只能证明产品推导和评测准备，不能证明模型效果、用户偏好或能力提升。

## 项目导航

- [产品推导](./docs/PRODUCT-REASONING.md)
- [表达支架离线评测](./evals/expression-scaffold/README.md)
- [冻结清单](./evals/expression-scaffold/freeze-manifest.json)
- [首轮 Prompt](./evals/expression-scaffold/prompts/baseline-v1.md)

下一步：在不修改冻结样本的前提下运行首轮 baseline，再根据真实 bad case 决定是否调整 Prompt 或产品边界。
