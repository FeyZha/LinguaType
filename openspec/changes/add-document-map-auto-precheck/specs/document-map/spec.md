# Document Map Auto Precheck Spec Delta

## ADDED Requirements

### Requirement: 文章地图必须支持低打扰自动预检查

文章地图可以在用户写作过程中自动感知结构变化，并在满足低打扰条件时后台生成或更新缓存。自动预检查只负责发现、预热和提醒，不得自动展开文章地图、不得自动改写正文、不得自动定位段落、不得自动进入段落流畅度检查。

#### Scenario: 安静时后台预检查

- **GIVEN** 正文至少包含 2 个段落且达到最小词数
- **AND** 用户停止输入达到空闲阈值
- **AND** 正文相对上次地图变化达到自动检查阈值
- **AND** API 设置可用且当前没有其他 AI 请求
- **AND** 触发设置为 `auto_idle`
- **WHEN** 自动预检查运行
- **THEN** 应用调用 `POST /api/check-document-map`
- **AND** 请求包含 `trigger: "auto_idle"`
- **AND** 成功后只更新 `linguatype.documentMapCache.v1` 和文章地图入口状态
- **AND** 不自动展开文章地图面板
- **AND** 不调用 `POST /api/check-paragraph-flow`
- **AND** 不调用 `/api/extract-learning`

#### Scenario: 自动预检查结果先收起

- **GIVEN** 后台预检查成功生成文章地图
- **WHEN** 用户仍在写作
- **THEN** 页面只在文章地图入口显示轻量状态，例如“文章地图 · 3 个发现”
- **AND** 正文输入区保持当前光标和滚动状态
- **AND** 用户点击入口后才显示完整文章地图

### Requirement: 文章地图自动检查必须可配置

触发设置必须提供“文章地图自动检查”模块，支持 `off`、`remind_only`、`auto_idle` 和 `manual_first` 四种模式。修改该设置必须只写入本地触发设置，不得调用 LLM。

#### Scenario: 关闭自动检查

- **GIVEN** 触发设置为 `off`
- **WHEN** 用户持续写作并达到自动检查阈值
- **THEN** 应用不得自动调用 `POST /api/check-document-map`

#### Scenario: 仅提醒模式

- **GIVEN** 触发设置为 `remind_only`
- **WHEN** 本地检测到文章地图需要更新
- **THEN** 应用可以显示“文章地图 · 可检查”或“文章地图 · 可能已过期”
- **AND** 不得自动调用 `POST /api/check-document-map`

#### Scenario: 手动优先模式

- **GIVEN** 触发设置为 `manual_first`
- **WHEN** 正文在已有文章地图后发生变化
- **THEN** 应用只能标记地图可能过期
- **AND** 用户点击“检查文章地图”后才调用 `POST /api/check-document-map`

### Requirement: 文章地图缓存必须保存段落指纹和新鲜度

`linguatype.documentMapCache.v1` 记录必须支持段落指纹、正文 hash、题目 hash、大纲 hash、freshness、生成时间和自动检查元数据。读取缓存时必须兼容旧记录。

#### Scenario: 读取旧缓存

- **GIVEN** 本地存在只包含 `createdAt` 和 `outlinePointsHash` 的旧文章地图缓存
- **WHEN** 应用加载缓存
- **THEN** 应用保留该记录
- **AND** 用安全默认值补齐 `generatedAt`、`freshness`、`paragraphFingerprints` 和自动检查元数据

#### Scenario: 请求返回后快照已过期

- **GIVEN** 后台预检查基于旧正文快照发起
- **WHEN** 请求返回时当前正文已经明显变化
- **THEN** 应用不得把结果显示为“新发现”
- **AND** 可以保存为过期缓存
- **AND** 入口应提示“文章地图 · 可能已过期”

