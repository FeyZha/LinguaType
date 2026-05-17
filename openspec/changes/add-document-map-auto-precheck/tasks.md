# Tasks

- [x] 定义 `DocumentMapFreshness`、自动规则常量和段落指纹 helper。
- [x] 增加本地新鲜度/自动预检查资格判断 helper，并覆盖新增、删除、明显变长、小修小改和缓存命中场景。
- [x] 升级 `DocumentMapCacheRecord`，兼容旧缓存，并补充 paragraph fingerprints、freshness、generatedAt 和 auto check metadata。
- [x] 给 `POST /api/check-document-map` 请求增加 `trigger` 字段，保持响应 schema 不变。
- [x] 更新 document map prompt 和 Mock Mode，区分 manual 与 auto idle 的指令强度。
- [x] 在 `TriggerSettings` 和触发设置 UI 中新增“文章地图自动检查”四种模式。
- [x] 在主写作页文章地图入口显示轻量状态，不自动弹出面板。
- [x] 实现 `auto_idle` 静默后台预检查：满足阈值、用户停顿、API 可用、无其他 AI 请求时更新缓存。
- [x] 确保 `off`、`remind_only`、`manual_first` 不会自动调用模型。
- [x] 确保自动预检查不会触发 `/api/check-paragraph-flow`、`/api/extract-learning` 或任何正文替换。
- [x] 同步 `AGENTS.md`、`PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`、`README.md`、`CHANGELOG.md` 和 active specs。
- [x] 运行定向测试、lint 和 build。
