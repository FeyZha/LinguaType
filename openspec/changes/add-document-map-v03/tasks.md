# Tasks

- [x] 定义 document map 类型、zod schema、Mock Mode 响应和 prompt。
- [x] 新增 `checkDocumentMapWithLLM` service function，并保持 provider-specific code 只在 `src/lib/llm/providers/`。
- [x] 新增 `POST /api/check-document-map` route，校验请求和响应，禁止返回全文改写或评分字段。
- [x] 在 storage 层新增 `linguatype.documentMapCache.v1` 的读写、hash、过期判断和 archive 作用域。
- [x] 在前端新增按空行切分段落、生成 paragraphId/range、定位段落和高亮段落的辅助逻辑。
- [x] 在主写作页新增“检查文章地图”入口、加载/成功/过期/错误状态和可折叠文章地图面板。
- [x] 将文章地图展示调整为宽屏左右对照布局，避免面板把正文整体顶到下方。
- [x] 将文章地图左右对照区调整为地图栏和原文栏独立隐藏滚动，避免原文滚动带动地图位置。
- [x] 在段落节点内整合“查看建议”，优先读取 paragraph health cache，必要时按现有规则调用 `/api/check-paragraph-health`。
- [x] 修正段落健康浮层“查看建议”误触发 Paragraph Flow 的问题，只展开轻量健康摘要。
- [x] 删除右下角段落健康浮层，将“查看建议”结果直接显示在文章地图段落卡片内。
- [x] 在段落节点内整合“检查本段”，复用现有 Paragraph Flow 链路和 Apply Paragraph 冲突检测。
- [x] 将“检查本段”和折叠侧栏检查入口改为进入文章地图二级检查界面，并提供运行中动效。
- [x] 扩展 Paragraph Flow schema 和 prompt，返回并展示当前段的语法、拼写、标点等 `detailIssues`。
- [x] 补充目标测试：API schema、Mock Mode、缓存、段落定位、查看建议、检查本段、不触发学习提取。
- [x] 修正文章地图段落检测规则：空行优先，没有空行时识别单换行自然段落，避免正常作文被误判为 1 段。
- [x] 同步 `AGENTS.md`、`PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md`、`CHANGELOG.md` 和 active specs。
- [x] 运行与变更风险匹配的最小验证；若进入 release-level handoff，再运行 `npm test`、`npm run lint` 和 `npm run build`。
