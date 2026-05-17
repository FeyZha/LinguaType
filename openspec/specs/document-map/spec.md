# 文章地图规格

## Requirements

### Requirement: 文章地图必须是全文结构检查入口

文章地图必须把整篇正文整理为可折叠的段落结构地图，用于展示全文主旨、结构判断、段落角色、段落关系、全文结构问题和优先修改建议。它必须承担诊断、定位和调度职责，不得承担全文改写、全文评分或自动应用职责。

#### Scenario: 用户生成文章地图

- **GIVEN** 用户正在主写作页编辑一篇至少两个非空段落的文章
- **WHEN** 用户点击“检查文章地图”
- **THEN** 应用调用 `POST /api/check-document-map`
- **AND** 成功后展示全文主旨、结构判断、全文问题、段落地图和优先修改建议
- **AND** 正文仍保持为一个连续长文本输入面

#### Scenario: 正文内容不足

- **GIVEN** 正文少于两个非空段落
- **WHEN** 用户点击“检查文章地图”
- **THEN** 应用不调用 `POST /api/check-document-map`
- **AND** 显示“文章内容较少，写到至少 2 个段落后可以生成文章地图。”

### Requirement: 文章地图 API 必须只返回结构诊断

`POST /api/check-document-map` 必须只返回结构诊断数据，不得返回全文改写、作文评分、学习数据或可自动应用的替换文本。

#### Scenario: 后端处理文章地图请求

- **GIVEN** 前端调用 `POST /api/check-document-map`
- **WHEN** route 处理请求
- **THEN** route 调用 `checkDocumentMapWithLLM`
- **AND** provider-specific code 位于 `src/lib/llm/providers/`
- **AND** prompt 位于 `src/lib/llm/prompts.ts`
- **AND** schema 和类型位于 `src/lib/llm/types.ts`

#### Scenario: 模型返回非法全文改写字段

- **GIVEN** provider 返回包含 `revisedDocument`、全文改写、作文评分或学习数据的响应
- **WHEN** route 校验响应
- **THEN** 应用拒绝该响应或丢弃非法字段
- **AND** 前端不得显示一键全文优化或全文替换入口
- **AND** 不调用 `/api/extract-learning`

### Requirement: 文章地图必须使用前端段落 range 进行定位

前端必须把当前正文切分为自然段落，记录每个段落的 `paragraphId`、`index` 和全文 offset range。空行应作为明确段落分隔；当全文没有空行分隔时，单次手动换行也应作为段落边界。文章地图节点的定位和后续段落操作必须基于这些 range 或可验证的段落指纹。

#### Scenario: 用户使用单换行书写自然段落

- **GIVEN** 用户用单次 Enter 换行写出多个非空自然段落
- **WHEN** 用户点击“检查文章地图”
- **THEN** 应用把这些非空换行块识别为多个段落
- **AND** 应用不得误报“文章内容较少”
- **AND** 请求 `/api/check-document-map` 时包含每个段落的 `paragraphId`、`index`、`range` 和 `text`

#### Scenario: 用户定位段落节点

- **GIVEN** 文章地图中存在第 3 段节点
- **WHEN** 用户点击该节点的“定位段落”
- **THEN** 正文滚动到第 3 段所在位置
- **AND** 应用短暂高亮对应段落
- **AND** 不修改正文内容

#### Scenario: 正文已变化导致 range 不匹配

- **GIVEN** 文章地图基于旧正文快照生成
- **WHEN** 用户尝试定位或检查某个旧段落节点
- **THEN** 应用检测当前正文是否仍匹配该段 range 或段落指纹
- **AND** 不匹配时提示重新检查文章地图或重新定位当前段

### Requirement: 全文问题必须限制为结构问题

文章地图的全文问题必须聚焦结构关系，不得展示语法小问题、逐句表达问题或本地校对问题。

#### Scenario: 展示全文问题

- **GIVEN** 文章地图发现问题
- **WHEN** 前端渲染全文问题列表
- **THEN** 问题类型只来自主旨偏移、段落重复、段落跳跃、过渡不足、论证递进不清、题目/大纲回应不足等结构类别
- **AND** 每个问题可关联一个或多个 `paragraphId`
- **AND** 每个问题只给出定位或下一步处理建议，不给出可自动应用的全文改写

### Requirement: 段落地图必须整合查看建议和检查本段

每个段落节点必须能承载段落主旨、与全文关系、健康摘要和相关全文问题，并提供“查看建议”“检查本段”“定位段落”入口。入口必须复用现有段落健康和段落流畅度边界。

#### Scenario: 用户展开段落节点

- **GIVEN** 文章地图已经生成
- **WHEN** 用户展开某个段落节点
- **THEN** 节点显示段落主旨、与全文关系、段落健康摘要和相关全文问题
- **AND** 节点显示“查看建议”“检查本段”“定位段落”

#### Scenario: 用户点击查看建议

- **GIVEN** 用户在段落节点中点击“查看建议”
- **WHEN** 应用已有该段可用的 paragraph health cache
- **THEN** 应用在当前段落卡片内展示轻量段落健康建议
- **AND** 不返回或应用 `revisedParagraph`
- **AND** 不调用 `POST /api/check-paragraph-flow`
- **AND** 不显示右下角独立段落健康浮层
- **AND** 不保存 Learning Library 或 Correction Events

#### Scenario: 用户点击检查本段

- **GIVEN** 用户在段落节点中点击“检查本段”
- **WHEN** 当前正文仍可定位到该段
- **THEN** 应用调用 `POST /api/check-paragraph-flow`
- **AND** 应用在文章地图内打开“本段检查”二级界面
- **AND** 等待模型响应时显示明确的运行中动效
- **AND** 被检查和可替换的对象只限该段
- **AND** Apply Paragraph 继续使用冲突检测

### Requirement: 文章地图必须使用本地缓存且不得自动高频重算

文章地图结果必须可缓存到 `linguatype.documentMapCache.v1`。缓存作用域应包含 archive、正文 hash、essay topic、outline points、domain 和 model，并记录段落指纹、freshness、生成时间、自动检查时间和会话内自动检查次数。文章地图不得在用户输入时自动高频重算；只允许在明确节流和用户空闲条件下做低频自动预检查。

#### Scenario: 缓存命中

- **GIVEN** `linguatype.documentMapCache.v1` 中存在与当前 archive、正文、setup 和 model 匹配的记录
- **WHEN** 用户打开或请求文章地图
- **THEN** 应用可以直接恢复缓存结果
- **AND** 不重新调用 `POST /api/check-document-map`

#### Scenario: 正文修改后缓存过期

- **GIVEN** 文章地图基于旧正文生成
- **WHEN** 用户修改正文后再次查看文章地图
- **THEN** 应用显示“正文已修改，当前文章地图可能不是最新结果。”
- **AND** 提供“重新检查”
- **AND** 不因用户查看旧地图而强制请求全文地图；自动预检查只能按独立的空闲和节流规则运行

### Requirement: 文章地图自动预检查必须只做发现和缓存

系统可以在本地检测文章地图 freshness，并在用户允许的模式下静默预检查文章地图，但自动逻辑只能发现、预热和提醒，不得自动展开地图、定位段落、改写正文、触发段落流畅度检查、保存学习数据或评分。

#### Scenario: 安静时自动预检查成功

- **GIVEN** 触发设置为 `auto_idle`
- **AND** 正文至少 2 段且至少 120 个英文词
- **AND** 用户停止输入达到预设 idle 时间
- **AND** 正文变化达到 changed words 或 changed ratio 阈值
- **AND** 当前没有其他 AI 请求且 API 设置可用
- **WHEN** 自动预检查被调度
- **THEN** 应用调用 `POST /api/check-document-map` 且请求包含 `trigger: "auto_idle"`
- **AND** 成功后更新 `linguatype.documentMapCache.v1`
- **AND** 入口只显示轻状态，例如“文章地图 · N 个发现”
- **AND** 不自动打开 `DocumentMapPanel`
- **AND** 不调用 `POST /api/check-paragraph-flow`
- **AND** 不调用 `/api/extract-learning`

#### Scenario: 手动优先模式不自动请求模型

- **GIVEN** 触发设置为 `manual_first`
- **WHEN** 正文变化导致文章地图 freshness 为 `needs_check`
- **THEN** 应用可以显示“文章地图 · 可检查”
- **AND** 不自动调用 `POST /api/check-document-map`

#### Scenario: 自动预检查期间正文继续变化

- **GIVEN** 自动预检查基于旧正文 snapshot 发出请求
- **WHEN** 结果返回时当前正文已经明显变化
- **THEN** 应用不得自动展开地图或把旧结果当成最新发现强提示
- **AND** 应将结果作为过期缓存或显示“文章地图 · 可能已过期”

### Requirement: 文章地图不得保存学习数据

文章地图、查看全文问题、定位段落、展开段落节点和查看优先修改建议都不得保存 Learning Library、Correction Events 或触发 `/api/extract-learning`。

#### Scenario: 用户浏览文章地图

- **GIVEN** 用户已经生成文章地图
- **WHEN** 用户展开节点、定位段落或查看全文问题
- **THEN** 应用不写入 `linguatype.learningLibrary.v1`
- **AND** 不写入 `linguatype.correctionEvents.v1`
- **AND** 不调用 `/api/extract-learning`

### Requirement: Mock Mode 必须 deterministic

文章地图在 Mock Mode 下必须返回稳定、可测试的结构结果，且不需要 Base URL、API Key 或 Model。

#### Scenario: Mock Mode 生成文章地图

- **GIVEN** API settings 使用 Mock Mode
- **WHEN** 前端调用 `/api/check-document-map`
- **THEN** route 返回 deterministic 的文章地图结果
- **AND** 结果包含至少全文概览、段落地图和优先修改建议
