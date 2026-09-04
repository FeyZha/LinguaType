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

> 以雅思题目和全文为上下文，为任意一个中英混合句提供逐句、单结果、分层且非代写式的英文表达支架。

当前只验证一个问题：表达支架能否帮助用户跨过当前卡点，同时保留用户的写作主导权。

## 当前单一链路

1. 用户先用中文占位，继续写作。
2. 系统识别包含中文的句子，并提供“处理本句”。
3. 用户选择其中一句；模型读取雅思题目、全文和目标句。
4. 产品侧锁定中文片段与帮助动作，模型只运行一次：直接项返回一个英文表达；复杂项默认生成 2 个、最多 3 个“中文语义支架 + 对应英文”的内部支架包。
5. 界面首次只展示中文支架；用户可以依次选择多个，已选支架的英文由本地状态揭示并保持可见，不再调用模型。
6. 用户自行取舍、组合、调整词序、词形或连接方式并完成句子；系统不自动改写或替换原文。

## 当前边界

必须保持：

- 一次只处理一个含中文的目标句。
- 使用题目、全文和目标句作为理解上下文。
- 覆盖目标句中的全部顶层中文片段，顺序与原文一致。
- 每个具体语义支架只给一个英文表达，不给多个英文候选。
- 能作为单一最小支架的词或短语默认直接支援；复杂片段一次预生成默认 2 个、最多 3 个更小的中文语义支架及其隐藏英文。
- 连接词、情态词、程度词、结构助词或其他附属成分不得独立成为支架，必须吸收到相邻实义支架。
- 聚焦项必须可追溯到原中文含义，但不强制为原文连续子片段；可以做不改变原意的轻量语义归纳，不得新增信息、改变立场、关系或范围。
- 未选择的英文不得在首屏暴露；揭示一个或多个支架必须是本地状态变化，模型调用次数为零。
- 即使全部支架被揭示，仍必须由用户决定取舍、词序、词形、连接和接入方式，不得预先拼装完整命题。
- 支架允许用户自行移动位置、变换词形、补冠词或介词；不要求原位零改动替换。
- 输出最低但足够的表达块，不接管完整命题或整句写作。
- 是否使用、如何接入原句由用户决定。

当前不做：

- 完整句生成或整句改写。
- 直接翻译完整命题，或把多个支架预先拼成完整答案。
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
- 已保存唯一 LongCat-2.0 v1 baseline 模型输出；20 条均得到结构化 output。独立 LLM Judge 预评为 13 pass、6 needs improvement、1 bad case。人工规则复核发现，v1 同时要求“原位替换”和“允许整段分句”，并把“改动越少”当作可继续性，容易奖励直接交答案；因此该批结果只保留为历史基线，不能沿用为 v2 效果结论。
- v2 已冻结 25 个顶层片段的帮助策略：15 个直接表达、10 个先聚焦，并改为逐 item 评价。LongCat-2.0 新 baseline 已执行 20 次初轮和 10 次离线聚焦探针；30 次均取得模型响应。用户否决 LongCat-2.0 同模型 Judge 后，3 个 Codex 子 Agent 隔离审核全部 35 个 item/阶段并完成分歧裁决；用户进一步校准全部 7 个非通过项，最终离线分布为 29 pass、5 needs improvement、1 bad case，20 case 取最差项为 15/4/1。`LT-ESC-005` 从机器 bad case 覆盖为人工 pass，说明 v2 的“较长短语必须直给英文”和“聚焦项必须连续原文”规则过严；这属于评测规则问题，不是模型失败。另有 3 个 selected-focus 冻结探针无法从本次 initial 输出点击到达。该结果仍不能证明真实用户效果。
- v3 已冻结 25 个顶层片段的帮助策略：14 个直接表达、11 个先聚焦；允许可追溯的非连续语义单位，并从本次 initial 的实际第一选项生成二轮输入。LongCat-2.0 的 20 次 initial 中 18 次结构可用、2 次协议失败，实际产生的 9 次 selected-focus 均完成。3 个隔离 Codex 子 Agent 预审 34 个 item/阶段并裁决分歧后为 29 pass、3 needs improvement、2 bad case；当前仍待用户人工校准，不能视为最终质量结论。冻结后的 v3 `cases.md` 残留 `draft` 状态字样，属于元数据瑕疵，不得回写冻结文件。
- v4 已冻结同一批 20 case、25 个顶层片段的新交互定义：20 个 case 各调用模型一次，14 个直接项立即显示，11 个复杂项一次预生成可逐个揭示的支架包；任何揭示不再调用模型。LongCat-2.0 首次 baseline 已完成 20/20 次调用，结构与协议均成功，实际返回 14 个直接项、11 个支架包、27 个支架，首屏英文泄漏为 0。该结果只证明单次生成契约可运行，尚未经过独立质量审核，也不能证明真实等待或写作体验改善。
- 用户已确认采用 DeepSeek V4 Flash 非思考模式与 v7 完整版控制 Prompt，并暂停流式返回和提示词精简。v7 将 source 与帮助路由锁定在产品侧，复杂支架收紧为默认 2 个、最多 3 个，并禁止附属成分独立成项。更新后的内部原型已完成冻结 20 case 的本地真实 API 回归：20/20 通过结构、路由、单次调用与首屏投影检查，P50/P90 约为 1.08/1.69 秒。该结果仍只证明原型链路与协议可运行，不证明英文质量或真实用户价值。
- 因此只能陈述“痛点有条件成立、方案待验证”，不得写成效果已被证明。

## 推进顺序

1. 保留 v1 冻结评测集、首轮 baseline 与 Judge 结果，不回写或重解释旧产物。
2. 保留已冻结的 v2 帮助路由、输出契约、逐项 rubric 与样本迁移记录，不回写人工推翻的规则。
3. 保留 v2 baseline 原始输出；v1 与 v2 因任务定义不同，不直接比较效果提升。
4. 保留已冻结的 v3 与首次 baseline，不回写 canonical 文件或原始输出。
5. 保留已冻结的 v4 单次生成 / 本地揭示契约，不回写 canonical 文件。
6. 保留 DeepSeek v4—v7 的模型对照、人工校准、延迟诊断和 Prompt 精简实验，不把不同任务定义的数字直接写成能力或体验提升。
7. 当前原型采用 v7 完整版；精简版、流式返回与细节 Prompt 优化暂时搁置。
8. 在私有原型完成发布回归后，进入一次真实写作会话的自测，再决定是否邀请小规模外部用户。
9. 真实写作测试必须记录等待、揭示、继续编辑和主观反馈，离线协议通过不能替代用户价值证据。

## 评测约束

- `evals/expression-scaffold/freeze-manifest.json` 是不可变的 v1 冻结入口。
- `evals/expression-scaffold/eval-sets/expression-scaffold.dev.v2/freeze-manifest.json` 是 v2 冻结入口；其人工校准结果可以陈述为离线结果，但规则修正必须创建新的 `eval_set_id`。
- 修改 canonical files 必须创建新的 `eval_set_id`，不得覆盖现有冻结版本。
- Prompt 是独立实验变量；每次修改必须使用新的 `prompt_version`。
- 模型输出、Judge 评分和人工复核只能写入独立 `runs/<run_id>/`。
- 不得记录 API Key、完整请求头或其他凭证。
- LLM Judge 不能替代人工复核。
- 评价模型不得与被测生成模型相同；若当前外部服务没有更强独立模型，优先使用隔离的 Codex 子 Agent 审核，不再用生成模型自评。
- AI 初拟样本即使取得高分，也不能转写为真实用户证据。

## 项目文件

- `README.md`：当前问题、链路、阶段与导航。
- `docs/PRODUCT-REASONING.md`：从真实卡点到产品锚点、边界和验证方法的推导。
- `evals/expression-scaffold/`：冻结评测集、Prompt、评分规则和 runner。
- `.knowledge-link.json`：个人知识库连接地址卡，仅用于已注册连接。
- `PROJECT-KNOWLEDGE.md`：项目个人事实出口；只记录可追溯事实、证据边界和未来证据信号，不记录 Agent 配置。

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
The project purpose is a current priority, not a boundary for learning or knowledge handoff.
Proactively notice source-backed learning and future evidence that may remain valuable even when it is only weakly related to that purpose.

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
- `grill-me`
- `grilling`

This is a one-time project instance. Local edits belong to this project; the central class catalog must not overwrite them automatically.
<!-- END CAREER-AGENT-CLASS -->

<!-- BEGIN CAREER-KB-CONNECT -->
## Personal knowledge handoff

At task wrap-up, independently of the configured project purpose, actively review the user's learning process as well as the task result. Update `PROJECT-KNOWLEDGE.md` when the work created or changed a traceable, personally relevant fact, evidence boundary, source-backed learning record, or plausible future evidence signal that may remain useful later, even when it is only weakly related to the current purpose. Record the user's action, understanding change, artifact, or evidence location rather than copying generic external knowledge. Give each non-empty candidate a stable reference such as `[K-001]`; keep that reference when evidence matures or the statement is corrected. Do not turn early signals into confirmed facts. Otherwise leave the export unchanged. The global Stop hook classifies each candidate as publish, pending confirmation, defer at source, no change, or reject, and independently checks the complete current Agent configuration on every Stop; configuration changes never belong in the facts export or wait for a separate sync command.
<!-- END CAREER-KB-CONNECT -->
