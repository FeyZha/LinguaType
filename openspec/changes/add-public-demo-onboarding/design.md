# 设计：公开体验版欢迎页与部署准备

## 欢迎页

首访且本地没有写作存档、草稿或 setup 时显示欢迎页。欢迎页只负责介绍和引导，不调用 LLM，不写学习数据。点击“打开示例文档”后进入现有写作工作台；由于示例存档已经在本地初始化，后续刷新不会重复显示欢迎页。

视觉延续现有暖色编辑器设计：浅色画布、深色产品预览面、8px 内卡片半径、中文优先文案，并用 `animejs/waapi` 做一次性 logo、分隔线和内容的渐入动画。

## 示例存档

`loadWritingArchivesFromStorage` 在完全空白首访时生成一个本地示例存档。示例包含标题、教育领域 setup、outlinePoints 和四段正文。正文包含中英混写句、纯英文句和多段结构，便于体验当前句增强、选区解释、检查本段和文章地图。该存档只写入 `linguatype.writingArchives.v1`，不写表达库、Correction Events 或学习数据。

## Vercel API Key

新增服务端配置解析：当前端设置 `useServerApiKey` 或请求未携带浏览器 API Key 且服务端存在 `LINGUATYPE_API_KEY` 时，API route 使用 Vercel 环境变量补全 provider 配置。真实 key 只存在服务端环境变量中，不进入 GitHub、不进入 localStorage、不返回给浏览器。

前端通过 `NEXT_PUBLIC_LINGUATYPE_DEMO_API_ENABLED=true` 将默认 API 设置标记为公开体验模式。用户仍可在 API 设置页填写自己的 key 覆盖体验配置。
