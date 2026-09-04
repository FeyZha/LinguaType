# LinguaType

LinguaType 聚焦一个具体的雅思写作卡点：用户知道中文意思，但无法在当前英文句子中自然表达。

## 版本边界

本仓库的当前版本位于 GitHub 的 [`codex/vnext-review`](https://github.com/FeyZha/LinguaType/tree/codex/vnext-review) 分支，包含产品推导、模型评测和 `prototype/` 高保真原型。旧版 `v0.3.1` 保留在 [`main`](https://github.com/FeyZha/LinguaType/tree/main)，不再作为当前版本的代码、需求或功能继承来源。

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

- 核心链路已从 v1 迭代到当前 v7：DeepSeek V4 Flash 单次非流式生成，产品侧锁定中文片段与帮助路由，复杂支架在浏览器本地揭示。
- 当前原型已支持多篇作文、本设备恢复、多句卡片、原创题库与自定义题目；OpenDesign 高保真前端已于 2026-09-04 合入 `prototype/`。
- 产品所有者已完成 1 次真实写作自测，支架帮助其继续写作，最终组句仍由本人完成。这只是单人单次正向信号。
- 当前暂停邀请外部用户，也不扩展第二条 AI 主链路；先审查高保真版本、修复发布阻塞问题并完成最小回归。
- 尚未证明：外部用户价值、稳定英文质量、字符阈值路由的真实泛化、跨设备同步或业务指标。

v1—v7 的任务定义并不相同，以下离线数字只用于追溯各阶段决策，不能直接写成能力或体验提升。

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
