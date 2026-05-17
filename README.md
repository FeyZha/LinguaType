# LinguaType

LinguaType 是面向中文母语者的英文写作辅助工具。它不是聊天机器人、翻译器或作文生成器，而是在英文写作卡壳时，提供低打扰、原位式的表达建议、句子润色、修改解释和文章结构检查。

当前版本：`v0.3.1`

## 核心功能

- 中英文混合输入改写
- 英文句子润色
- 修改差异对比
- 选中表达解释与保存
- 本地表达库与写作习惯沉淀
- 检查本段与文章地图
- 首访示例文档和欢迎页

## 本地运行

```bash
npm install
npm run dev
```

常用验证：

```bash
npm run lint
npm run build
npm test
```

## Vercel 部署

GitHub 仓库不保存真实 API Key。`.env*` 已被忽略，仓库只保留 `.env.example` 作为变量模板。

在 Vercel Project Settings 中配置：

```bash
NEXT_PUBLIC_LINGUATYPE_DEMO_API_ENABLED=true
LINGUATYPE_API_PROVIDER=openai-compatible
LINGUATYPE_API_BASE_URL=https://api.openai.com
LINGUATYPE_API_ENDPOINT_PATH=/v1/chat/completions
LINGUATYPE_API_MODEL=你的模型名
LINGUATYPE_API_KEY=你的真实 API Key
LINGUATYPE_API_TEMPERATURE=0.2
LINGUATYPE_API_MAX_TOKENS=20000
LINGUATYPE_API_SUPPORTS_JSON_MODE=false
```

开启 `NEXT_PUBLIC_LINGUATYPE_DEMO_API_ENABLED=true` 后，公开体验版会使用 Vercel 服务端环境变量中的 API Key。真实 key 不会写入 GitHub、不进入浏览器 localStorage，也不会下发到前端。

仓库没有内置额外用量限制；公开部署产生的实际用量由 Vercel 环境变量中的服务端 key 承担。

## 数据与隐私

- 写作存档、表达库、写作习惯、主题和触发设置保存在浏览器 `localStorage`。
- 学习数据只在用户明确 Apply 或手动保存后写入。
- 模型建议不会自动应用到正文。
- 当前版本不包含登录、数据库、云同步、支付或导入系统。

## 项目结构

- `src/components/`：主要 UI 组件
- `src/app/api/`：Next.js API routes
- `src/lib/`：句子提取、存储、文章地图和 LLM provider 逻辑
- `public/brand/`：logo、wordmark 和 mark 资产
- `openspec/`：产品变更提案、任务和规格
