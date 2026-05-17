# 设计：文章地图自动预检查

## 分层

自动逻辑分为三层：

1. 本地自动感知：不调用模型，只计算段落数量、词数、文本 hash、段落指纹和缓存新鲜度。
2. 轻量后台预检查：在用户停顿、变化达到阈值、API 可用且没有其他 AI 请求时，静默调用 `/api/check-document-map` 并写入缓存。
3. 用户主动深度检查：用户点击文章地图后才展开结果；点击“查看建议”才调用段落健康；点击“检查本段”才调用 Paragraph Flow。

## 触发模式

`TriggerSettings.documentMapAutoCheck` 支持四个值：

- `off`：不自动判断、不自动调用。
- `remind_only`：只本地判断是否可检查或过期，不调用模型。
- `auto_idle`：默认值。安静时满足阈值后后台预检查。
- `manual_first`：正文变化后只标记过期，用户点击后才生成。

## 自动规则

默认规则：

- 至少 2 个段落。
- 至少 120 个英文词。
- 用户停止输入约 10 秒。
- 变化至少 40 词，或变化比例达到 18%。
- 两次自动预检查至少间隔 3 分钟。
- 单次写作会话最多自动预检查 5 次。

这些规则只决定是否排队后台预检查，不决定是否展示完整结果。

## 缓存与快照

缓存继续使用 `linguatype.documentMapCache.v1`，记录需要包含：

- archiveId
- textHash
- paragraphFingerprints
- essayTopicHash
- outlineHash
- domain
- model
- result
- freshness
- generatedAt
- lastAutoCheckedAt
- autoCheckCountInSession

后台请求发起时保存 snapshot text hash 和段落指纹。请求返回后，如果当前文本已经明显变化，结果仍可保存为过期缓存，但入口只显示“可能已过期”，不能显示为“新发现”。

## UI

文章地图入口显示轻状态：

- `检查文章地图`
- `文章地图 · 可检查`
- `文章地图 · 整理中`
- `文章地图 · N 个发现`
- `文章地图 · 可能已过期`

自动预检查成功后不展开文章地图，不滚动定位，不打开二级检查界面。

## API

`POST /api/check-document-map` 请求增加：

```ts
trigger: "manual" | "auto_idle" | "after_apply" | "after_outline_change"
```

`trigger` 不改变响应 schema。Prompt 可在 `auto_idle` 时要求更短、更高优先级的结果；`manual` 保持完整文章地图。

