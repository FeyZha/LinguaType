# LinguaType 国内模型速度—成本初筛

更新：2026-08-25

## 一页结论

公开数据初筛之后，项目已完成 DeepSeek V4 Flash 非思考模式与 LongCat-2.0 的真实 API 对照：

1. **DeepSeek V4 Flash**：完整 20 case 的 P50 1.11 秒、P90 1.93 秒，估算 1 万次约 $2.03。
2. **LongCat-2.0**：同轮 P50 18.98 秒、P90 57.40 秒，估算 1 万次约 $16.34。
3. **兼容性阻塞**：DeepSeek 硬协议通过 17/20，冻结帮助策略动作一致 13/20；3 个失败 case 追加 6 次复测全部失败，因此不能直接替换 LongCat。

完整证据见 [DeepSeek vs LongCat 实测结果](../evals/expression-scaffold/runs/model-latency-v4-20260825-deepseek-longcat-full20/results.md)。当前推荐不是切换模型，而是先用新的 Prompt / 输入实验修复顶层中文片段约束和帮助路由，再复测 7 个不兼容 case。

## 实测摘要

| 运行 | DeepSeek | LongCat | 解释 |
| --- | --- | --- | --- |
| 6 case × 3 次 | 18/18；P50 0.96 秒；P90 1.63 秒 | 18/18；P50 22.14 秒；P90 33.21 秒 | 代表 case 的重复速度筛选 |
| 完整 20 case × 1 次 | 17/20；P50 1.11 秒；P90 1.93 秒 | 20/20；P50 18.98 秒；P90 57.40 秒 | 全部冻结 case 的协议确认 |
| 3 个失败 case × 2 次复测 | 0/6 | 6/6 | DeepSeek 失败稳定复现 |

本轮只做最低语义抽检和冻结帮助策略对照，没有进行新的独立质量 Judge，因此不能把速度优势写成整体产品效果提升。

## 本产品历史 token 基线

v4 全文 baseline A 没有保存 token usage；可精确计算的是随后 B/C 两组上下文消融的 40 次模型调用：

| 指标 | 结果 |
| --- | ---: |
| 调用数 | 40 |
| 平均输入 | 1,022 token / 次 |
| 平均输出 | 657 token / 次 |
| 输出中位数 | 275 token / 次 |
| 输出 P90 | 1,361 token / 次 |
| 输出范围 | 92—2,219 token / 次 |
| LongCat 平均完整返回时间 | 15.85 秒 |
| LongCat P50 / P90 | 7.50 / 29.92 秒 |

均值明显高于中位数，说明少数高 token 响应拉高了时间与成本；现有记录没有继续拆分可见输出与思考 token。对 LinguaType 这类短结构任务，后续候选模型应优先关闭深度思考，并把最大输出量收紧；657 token 仍作为第一轮保守计费基线。

数据来源：

- `evals/expression-scaffold/runs/ablation-v4-20260825-b-local-window/call-metrics.jsonl`
- `evals/expression-scaffold/runs/ablation-v4-20260825-c-target-only/call-metrics.jsonl`

## 国内候选纸面测算

估算统一使用 1,022 输入 token、657 输出 token。生成时间只计算 `输出 token ÷ 榜单 token/s`，**不包含首 token 等待、网络、排队和结构校验**。价格按公开页面当前价格粗算；Qwen 按人民币官方限时价并以 1 美元≈7.2 元仅作表内换算。

| 模型 | 榜单速度 | 657 token 纯生成时间 | 估算 1 万次成本 | 相对 DeepSeek | 初筛判断 |
| --- | ---: | ---: | ---: | ---: | --- |
| Qwen3.7 Max | 203 t/s | 3.23 秒 | 约 $24.93 / ¥179 | 7.6× | 速度上限；贵 |
| GLM-5.2 | 199 t/s | 3.30 秒 | 约 $24.12 | 7.4× | 速度上限；价格需直连复核 |
| DeepSeek V4 Flash | 120 t/s | 5.47 秒 | 约 $3.27 | 1.0× | **当前首选** |
| MiniMax M3 | 105 t/s | 6.25 秒 | 约 $10.94 | 3.3× | 被 DeepSeek 纸面压制 |
| MiMo-V2.5 | 98.9 t/s | 6.64 秒 | 约 $3.27 | 1.0× | 备用；需看真实首 token |
| Tencent Hy3 | 60 t/s | 10.94 秒 | 约 $5.24 | 1.6× | 免费层可试，正式链路偏慢 |
| LongCat-2.0 | 无同榜速度 | 历史实测平均 15.85 秒 | 约 $10.94 | 3.3× | 现有基线，纸面无成本优势 |

## 为什么不直接选择榜首

LinguaType 每次只生成一个很短的结构化支架。Qwen3.7 Max / GLM-5.2 相比 DeepSeek V4 Flash，理论上只节约约 2.2 秒的持续生成时间，但成本约增加 7.5 倍。更重要的是，榜单没有包含首 token 等待；实际总等待可能不会按这 2.2 秒排序。

公开数据阶段建议测试的组合是：

```text
LongCat-2.0（现状）
vs DeepSeek V4 Flash 非思考（成本候选）
vs GLM-5.2 或 Qwen3.7 Max 非思考（速度上限）
```

该测试现已完成。DeepSeek 的速度和成本达到候选标准，但结构与帮助路由未达到直接替换标准。

## 数据边界

- 速度来自 [LLMRank 生成速度榜](https://llmrank.top/guides/speed-rankings/)，其原始指标是 Artificial Analysis 的 API 输出速度中位数。
- 该榜单只覆盖持续生成速度，不覆盖 TTFT；榜单也提示国内调用位置、服务负载与缓存会改变实际体验。
- 速度页内嵌价格与 LLMRank 主价格页存在不一致，因此本报告没有直接使用速度页的全部价格列；DeepSeek、Qwen、MiniMax 优先采用厂商当前公开定价，其余只用于候选筛选。
- [DeepSeek 官方价格](https://api-docs.deepseek.com/quick_start/pricing/)：输入 $0.14 / 百万 token、输出 $0.28 / 百万 token（缓存未命中，V4 Flash）。
- [Qwen3.7 Max 官方价格](https://help.aliyun.com/zh/model-studio/model-pricing)：中国区当前限时价为输入 ¥6 / 百万 token、输出 ¥18 / 百万 token；活动价格可能变化。
- [MiniMax M3 官方价格](https://platform.minimax.io/subscribe/token-plan?tab=api-enterprise)：当前优惠价为输入 $0.30 / 百万 token、输出 $1.20 / 百万 token（上下文不超过 512K）。
- A 全文输入比 B/C 更长，本报告的输入成本可能轻微低估正式链路；正式结论以 A 的真实 API 实测为准。
- 本报告不能证明任何候选模型已经满足 LinguaType 的结构、质量或真实用户体验要求。
