# LinguaType

LinguaType 聚焦一个具体的雅思写作卡点：用户知道中文意思，但无法在当前英文句子中自然表达。

## 版本边界

本仓库只承载从需求重新推导的新版本：产品推导、模型评测和 `prototype/` 高保真原型。已发布在 [GitHub](https://github.com/FeyZha/LinguaType) 的 `v0.3.1` 旧版由独立归档仓库保留，不再作为本仓库的代码、需求或功能继承来源。

使用 ChatGPT 网页端审查本项目时，请先阅读 [当前版本审查导读](./CHATGPT-REVIEW-CONTEXT.md)。

当前验证的问题是：

> 系统能否用一次生成准备好按需揭示的表达支架，在降低等待的同时仍不替用户完成命题？

## 当前链路

```text
用户用中文占位
→ 选择一个含中文的句子
→ 模型读取题目、全文和目标句
→ 可直接支援的词语给一个英文；复杂表达一次生成多个“中文支架 + 隐藏英文”
→ 用户可依次点击多个中文支架，本地揭示英文，不再等待模型
→ 用户自行取舍、组合并完成句子
```

系统不自动改写原文，不预先组装完整命题，不为同一支架提供多个英文候选。即使用户揭示全部支架，也仍需自行移动、变形、连接和取舍。

## 当前阶段

- 已完成：问题收敛、v1 单一链路、20 条冻结样本、LongCat-2.0 baseline 输出和首轮独立 LLM Judge。
- 已发现：v1 输出规则会把“整段翻译”和“几乎无需用户组句”误当作优质支架，三维 case 级评分也会掩盖同句内不同片段的差异。
- 已完成：v2 “直接表达 / 先聚焦”契约、逐 item 四维评价、冻结评测集与 LongCat-2.0 新 baseline。
- 已完成：v2 的 3 个 Codex 子 Agent 隔离审核与用户人工校准。
- 已完成：冻结 v3；允许非连续但可追溯的最小语义支架，并让二轮输入来自本次首轮真实选项。
- 已完成：LongCat-2.0 v3 baseline 与 3 个 Codex 子 Agent 独立预审；34 个实际 item/阶段预审为 29 pass、3 needs improvement、2 bad case。
- 已完成：冻结 v4“一次生成、按需多次揭示”契约、Prompt、schema、rubric 与 runner。
- 已完成：LongCat-2.0 v4 首次 baseline；20/20 次调用结构成功，首屏未泄漏隐藏英文。
- 已完成：v4 作文上下文量 A/B/C 探索性消融与 3 路隔离 Codex 盲审；用户确认沿用 A（题目＋完整全文＋目标句），字段消融关闭，不再复测 B/C。
- 已完成：按 A 输入拆解最小交互原型的 L1—L8 实现链、状态、失败边界和完成定义。
- 已完成：内部最小交互原型 v0.1；已接通本地中文句识别、A 输入、LongCat-2.0 单次调用、分层展示、本地揭示、反馈和测试记录导出，并发布为仅所有者可访问的私有站点。
- 已完成：DeepSeek V4 Flash 非思考模式的速度与成本初筛、v5/v6 控制权外移实验、用户人工校准与延迟分段诊断。
- 已确认：采用 v7 完整版控制 Prompt；复杂项默认 2 个、最多 3 个支架，附属成分不得独立成项；流式返回与精简 Prompt 暂时搁置。
- 已完成：内部原型切换到产品侧锁定 source/路由、模型只填内容的 v7 链路；冻结 20 case 的本地真实 API 回归为 20/20 通过，P50/P90 约 1.08/1.69 秒。
- 已完成：v7 完整版原型以 Sites 私有版本重新发布，仍只允许所有者访问。
- 下一步：用一次真实雅思写作会话做本人自测；通过后再决定是否邀请小规模外部用户。
- 尚未完成：真实用户测试和正式应用实现。

v1 LLM Judge 的 13 pass、6 needs improvement、1 bad case 只保留为旧规则下的历史记录。v2 改变了任务定义，未来结果不能与这组数字直接写成能力提升。

## 项目导航

- [产品推导](./docs/PRODUCT-REASONING.md)
- [MVP 主链路实现卡](./docs/MVP-IMPLEMENTATION-CHAIN.md)
- [国内模型速度—成本初筛](./docs/MODEL-SPEED-COST-SCREENING.md)
- [内部原型说明](./prototype/README.md)
- [表达支架离线评测](./evals/expression-scaffold/README.md)
- [v1 冻结清单](./evals/expression-scaffold/freeze-manifest.json)
- [v2 冻结版本](./evals/expression-scaffold/eval-sets/expression-scaffold.dev.v2/README.md)
- [v2 模型输出规则](./evals/expression-scaffold/eval-sets/expression-scaffold.dev.v2/model-output.md)
- [v2 评价标准](./evals/expression-scaffold/eval-sets/expression-scaffold.dev.v2/rubric.md)
- [v3 冻结版本](./evals/expression-scaffold/eval-sets/expression-scaffold.dev.v3/README.md)
- [v3 Codex 预审](./evals/expression-scaffold/runs/baseline-v3-20260824-longcat-2.0-actual-path-structured/codex-subagent-review.md)
- [v4 冻结版本](./evals/expression-scaffold/eval-sets/expression-scaffold.dev.v4/README.md)
- [v4 Prompt](./evals/expression-scaffold/prompts/baseline-v4.md)
- [当前采用的 v7 完整版 Prompt](./evals/expression-scaffold/prompts/baseline-v7-full-controlled.md)
- [v7 原型 20 case 回归](./evals/expression-scaffold/runs/prototype-v7-full20-20260825/summary.json)
- [v4 上下文消融定义](./evals/expression-scaffold/experiments/context-ablation-v4-20260825/README.md)
- [v4 上下文消融人工校准材料](./evals/expression-scaffold/runs/context-ablation-v4-20260825-abc-comparison/human-calibration.md)

v2 baseline 共执行 30 次调用：20 次初轮、10 次离线聚焦探针；30 次均得到响应。LongCat-2.0 同模型 Judge 已被用户否决并降级为历史记录。Codex 子 Agent 覆盖 35 / 35 个 item/阶段，用户随后校准全部 7 个非通过项；最终离线分布为 29 pass、5 needs improvement、1 bad case，20 case 取最差项为 15/4/1。`LT-ESC-005` 的人工覆盖同时证明 v2 规则过严；另有 3 个 selected-focus 探针与实际首轮选项不连通。以上不代表真实用户效果。

v3 baseline 共执行 20 次 initial；18 次结构可用、2 次协议失败。由有效 initial 实际产生 9 次 selected-focus，9 次均完成。三个隔离 Codex 子 Agent 预审 25 个预期 initial item 与 9 个真实二轮 item，结论为 29 pass、3 needs improvement、2 bad case；当前等待用户人工校准。冻结后的 `cases.md` 仍残留 `draft` 状态字样，作为元数据瑕疵保留，不回写冻结文件。

v4 baseline `baseline-v4-20260824-longcat-2.0-one-call-progressive-reveal` 共执行 20 次模型调用，20 次均通过结构与协议校验；25 个 item 的实际动作分布为 14 个直接表达、11 个支架包，共 27 个可揭示支架，首屏英文泄漏为 0。随后只改变 `full_essay` 实际取值，完成 A 全文、B 相邻窗口、C 仅目标句的探索性消融。结构有效 case 为 20/19/18；隔离 Codex 预审为 A 13/4/3、B 14/2/4、C 8/3/9（pass / needs improvement / bad case）。用户基于产品取舍确认沿用 A，B/C 仅保留为历史实验，不再作为推进阻塞项。该决策不等于模型质量或真实体验已被证明。
