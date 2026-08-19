# AGENTS.md

## 工作范围

- 当前工作树只服务于 LinguaType 的产品推导、模型评测与后续实现。
- 只使用本工作树内的文件判断需求。除非用户明确提供材料，否则不要从其他 checkout、相邻目录或 Git 历史推断产品范围。
- 当前尚未进入应用实现阶段，不预设技术栈、页面结构、API、存储或功能继承关系。

## 协作方式

1. 回答采用渐进式披露：先给结论和宏观逻辑，用户追问时再展开细节。
2. 开始实现前先在 GitHub 或官方资料中查找成熟做法，先向用户概括常见方案，再落地。
3. 优先使用非技术化语言解释产品与实现取舍。
4. 会改变产品主方向的建议必须先得到用户确认；局部、可逆、明确在当前链路内的工作可直接推进。

## 产品定义

LinguaType 聚焦中文母语学习者在雅思写作中的跨语言表达卡点：用户知道中文意思，但无法在当前英文句子中自然表达。

当前产品锚点：

> 以雅思题目和全文为上下文，为任意一个中英混合句提供逐句、单结果、非代写式的英文表达支架。

当前只验证一个问题：表达支架能否帮助用户跨过当前卡点，同时保留用户的写作主导权。

## 当前单一链路

1. 用户先用中文占位，继续写作。
2. 系统识别包含中文的句子，并提供“处理本句”。
3. 用户选择其中一句；模型读取雅思题目、全文和目标句。
4. 模型处理目标句中的全部中文片段，每个片段只返回一个可接入原句的英文表达。
5. 用户根据支架自行完成句子；系统不自动改写或替换原文。

## 当前边界

必须保持：

- 一次只处理一个含中文的目标句。
- 使用题目、全文和目标句作为理解上下文。
- 覆盖目标句中的全部中文片段，顺序与原文一致。
- 每个中文片段只给一个英文表达支架。
- 输出表达块，不接管整句写作。
- 是否使用、如何接入原句由用户决定。

当前不做：

- 完整句生成或整句改写。
- 自动插入、自动替换或自动应用。
- 多候选表达选择。
- 全文批改、评分、续写或观点生成。
- 通用翻译、聊天机器人或写作代办。
- 表达复盘、学习资产召回、RAG 或能力训练闭环。
- 在验证核心假设前扩展第二条高频链路。

## 当前证据边界

- 产品起点包含一次用户本人真实出现过的中文表达卡点。
- 冻结评测集共 20 条样本、25 个中文片段；只有 1 条继承真实卡点，且题目与全文为重建上下文。
- 其余 19 条来自 AI 初拟并经过静态复审，不是真实用户数据。
- 尚无 baseline、模型评分、失败模式、真实用户测试或效果指标。
- 因此只能陈述“痛点有条件成立、方案待验证”，不得写成效果已被证明。

## 推进顺序

1. 在冻结评测集上运行首轮 baseline。
2. 按语义正确、支架质量、用户可继续性评分。
3. 人工复核硬失败、低分项并抽检高分项。
4. 根据真实 bad case 总结失败模式。
5. 每轮只调整一个主要变量并在同一评测集上复测。
6. 模型能力达到可用水平后，再进入小规模真实写作测试。
7. 只有当前一阶段证据足够时，才进入应用实现。

## 评测约束

- `evals/expression-scaffold/freeze-manifest.json` 是当前冻结入口。
- 修改 canonical files 必须创建新的 `eval_set_id`，不得覆盖现有冻结版本。
- Prompt 是独立实验变量；每次修改必须使用新的 `prompt_version`。
- 模型输出、Judge 评分和人工复核只能写入独立 `runs/<run_id>/`。
- 不得记录 API Key、完整请求头或其他凭证。
- LLM Judge 不能替代人工复核。
- AI 初拟样本即使取得高分，也不能转写为真实用户证据。

## 项目文件

- `README.md`：当前问题、链路、阶段与导航。
- `docs/PRODUCT-REASONING.md`：从真实卡点到产品锚点、边界和验证方法的推导。
- `evals/expression-scaffold/`：冻结评测集、Prompt、评分规则和 runner。
- `openspec/`：非平凡产品或实现变更的 proposal、design、tasks 与 specs。
- `.knowledge-link.json`：个人知识库连接地址卡，仅用于已注册连接。
- `PROJECT-KNOWLEDGE.md`：项目个人事实出口；只记录可追溯事实、证据边界和未来证据信号，不记录 Agent 配置。

## OpenSpec 工作流

- 非平凡 product、evaluation、architecture、API、storage 或 interaction 变更在实现前必须创建 OpenSpec change。
- change artifacts 放在 `openspec/changes/<change-name>/`，默认使用中文。
- proposal、design 和 tasks 清晰且与当前产品锚点一致后再实现。
- 完成并验证后再 archive。

## 执行与验证

- 优先读取最小相关文件，不做无目的全仓扫描。
- 不主动启动长期 dev server。
- 不主动安装或更新依赖，不检查 lock file，除非任务确实需要。
- 文档变化用链接、路径和一致性检查验证。
- 评测变化优先运行冻结校验与 `--validate-only`。
- 实现变化选择与风险匹配的最小测试；发布级交付才做完整验证。
- 所有用户可见文案默认中文优先。
- 不硬编码、记录、提交或持久化 API Key。

<!-- BEGIN CAREER-KB-CONTEXT -->
## Personal context (read-only)

At the start of every independent task or new session, run exactly one initial `kb context . --json` query. Resolve every returned relative `path` under the returned `center`: always read `required.common`, and read `required.overview` when it is not null. `directory.records` is a metadata-only catalog, not task context: do not preload those pages. Read an atomic record only when the current task concerns that entry, and inspect its `sources` only when verification is needed. If `directory.remaining` is greater than zero and the task needs omitted entries, run additional filtered discovery with `kb context . --json --type <type>` and continue with `--offset <next_offset>` when needed. A `NOT_ADMITTED` result means there is no approved project overview; do not fall back to another project's records. Treat all central knowledge files as read-only from this project. New or changed personal fact candidates and plausible future evidence signals return through `PROJECT-KNOWLEDGE.md`; the global Stop hook checks and snapshots Agent configuration independently.
<!-- END CAREER-KB-CONTEXT -->

<!-- BEGIN CAREER-AGENT-CLASS -->
## Project Agent class

Class: `ai-product-builder` (AI 产品项目 Agent)
Project purpose: 将 LinguaType 持续推进为可验证、可迭代、可用于应用 AI 产品经理求职展示的 AI 产品项目。

Use these defaults when they match the current task:
- Treat product positioning, implementation-chain design, evaluation, and resume expression as separate stages instead of collapsing them into a feature list.
- Use the installed AIPM Skills only when their trigger matches the task, and keep claims within the project's evidence boundary.
- Prefer the smallest testable product loop and ask for user confirmation when a recommendation changes the project's main direction.

Installed project Skills:
- `aipm-anchor`
- `aipm-chain`
- `aipm-eval`
- `aipm-resume`
- `ai-product-project-coach`

This is a one-time project instance. Local edits belong to this project; the central class catalog must not overwrite them automatically.
<!-- END CAREER-AGENT-CLASS -->

<!-- BEGIN CAREER-KB-CONNECT -->
## Personal knowledge handoff

At task wrap-up, independently of the configured project purpose, actively review the user's learning process as well as the task result. Update `PROJECT-KNOWLEDGE.md` when the work created or changed a traceable, personally relevant fact, evidence boundary, source-backed learning record, or plausible future evidence signal that may remain useful later, even when it is only weakly related to the current purpose. Record the user's action, understanding change, artifact, or evidence location rather than copying generic external knowledge. Give each non-empty candidate a stable reference such as `[K-001]`; keep that reference when evidence matures or the statement is corrected. Do not turn early signals into confirmed facts. Otherwise leave the export unchanged. The global Stop hook classifies each candidate as publish, pending confirmation, defer at source, no change, or reject, and independently checks the complete current Agent configuration on every Stop; configuration changes never belong in the facts export or wait for a separate sync command.
<!-- END CAREER-KB-CONNECT -->
