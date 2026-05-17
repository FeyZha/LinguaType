# 设计

## 总体分层

v0.3 采用三层检测模型：

| 层级 | 功能名 | 触发方式 | 是否生成改写 | 是否可 Apply |
| --- | --- | --- | --- | --- |
| 全文层 | 文章地图 | 用户点击“检查文章地图” | 否 | 否 |
| 段落轻诊断 | 查看建议 | 用户在段落节点内点击 | 否 | 否 |
| 段落深检查 | 检查本段 | 用户明确点击 | 是，只限当前段 | 是，手动 Apply |
| 句子层 | 当前句增强 | 快捷键或句旁入口 | 是，只限当前句 | 是，手动 Apply |

文章地图负责全文主旨、段落角色、段落关系和全文结构问题。它不承接 Paragraph Health 或 Paragraph Flow 的改写能力，也不替代当前句增强。

## API 与 LLM 层

新增 `POST /api/check-document-map`。

请求包含：

- `text`
- `essayTopic`
- `outlinePoints`
- `domain`
- `paragraphs`，由前端按空行切分并携带 `paragraphId`、`index`、`range` 和 `text`
- `apiSettings`

后端 route 调用新增 service function `checkDocumentMapWithLLM`。Prompt 放在 `src/lib/llm/prompts.ts`，schema 和类型放在 `src/lib/llm/types.ts`，Mock Mode 和 OpenAI-compatible provider 继续复用 provider abstraction。

响应只允许包含结构诊断数据：

- `overallMainIdeaZh`
- `structureSummaryZh`
- `paragraphs[]`
- `globalIssues[]`
- `nextActions[]`

响应不得包含 `revisedDocument`、全文改写、作文评分、学习数据或可直接应用的替换文本。

## 前端流程

1. 用户在主写作页点击“检查文章地图”。
2. 前端检查正文是否至少包含两个非空段落。
3. 前端按空行切分段落，生成稳定的 `paragraphId`、`index` 和全文 offset range。
4. 前端计算缓存 key，优先读取 `linguatype.documentMapCache.v1`。
5. 未命中缓存时调用 `/api/check-document-map`。
6. 成功后在编辑器上方或中间主舞台打开文章地图面板。
7. 用户展开段落节点查看段落主旨、全文关系、健康摘要和相关全文问题。
8. 用户点击“定位段落”时，正文滚动到对应 range 并短暂高亮。
9. 用户点击“查看建议”时，优先读取现有 paragraph health cache；没有可用结果时可按段落健康规则调用 `/api/check-paragraph-health`。
10. 用户点击“检查本段”时，复用现有 Paragraph Flow 当前段检查链路。

## UI 结构

文章地图不是 dashboard，也不是右侧常驻管理面板。它应作为主写作页附近的低频检查面板出现，可在编辑器上方或中间主舞台展开，正文仍保留为下方连续长文本写作面。

面板包含四块：

- 全文概览：全文主旨、结构判断、总体状态。
- 全文问题：只展示主旨偏移、段落重复、段落跳跃、过渡不足、论证递进不清、题目/大纲回应不足等全文结构问题。
- 段落地图：默认每段一行，展开后显示段落主旨、与全文关系、段落健康摘要、相关问题和操作入口。
- 优先修改建议：给出轻量下一步顺序，不提供一键优化或全文改写。

用户可见文案中文优先。按钮和状态建议使用“检查文章地图”“正在整理文章结构……”“已生成文章地图”“正文已修改，当前文章地图可能不是最新结果”“文章地图生成失败，请检查 API 设置后重试”。

## 缓存

新增 localStorage key `linguatype.documentMapCache.v1`。

缓存记录应包含：

- `archiveId`
- `textHash`
- `essayTopic`
- `outlinePointsHash`
- `domain`
- `model`
- `createdAt`
- `result`

正文未变时可直接恢复文章地图。正文有小改动时显示过期提醒并允许重新检查。正文变化较大或切换 archive 后没有匹配缓存时提示重新检查。文章地图不得自动高频重算。

## 冲突与边界

文章地图的 paragraph range 来自发起检查时的正文快照。定位和“检查本段”前必须确认当前正文仍能匹配该段 range 或段落指纹；不匹配时提示重新检查文章地图或重新定位当前段。

文章地图不得触发学习提取、写作习惯保存、全文替换、段落自动替换或当前句自动增强。所有可改写能力仍由 Paragraph Flow 或当前句增强单独承接，并保留原有 Apply/Cancel 和冲突检测。

## 测试

优先覆盖：

- 少于两个段落时不调用 document map API。
- `/api/check-document-map` 使用 provider service，拒绝非法返回结构。
- Mock Mode 返回 deterministic document map。
- 文章地图不返回全文改写、不触发 `/api/extract-learning`。
- 缓存命中、过期提示和切换 archive 恢复。
- 点击段落节点能够定位到连续 textarea 中的正确段落。
- “查看建议”不会生成改写或保存学习数据。
- “检查本段”仍只检查并可替换当前段。
