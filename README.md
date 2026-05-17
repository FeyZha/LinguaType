# LinguaType

面向中文母语者的英文写作辅助工具。

LinguaType 不是聊天机器人、翻译器或作文生成器。它更像一个贴在写作现场旁边的英文表达助手：当你英文写作卡住、夹了中文、或者觉得一句话不够自然时，它给出低打扰、原位式的表达建议、句子润色和修改解释。

[在线体验](https://lingua-type.vercel.app/)

## 一句话定位

面向中文母语者的英文写作辅助工具。

## 核心价值

在英文写作卡壳时，提供低打扰、原位式的表达建议、句子润色和修改解释。用户仍然保留写作主导权，所有模型建议都需要手动确认后才会应用。

## 适合谁

- 正在写英文作文、论文段落、申请材料或工作英文的人
- 经常先用中文想清楚意思，再尝试转成英文的人
- 想知道“为什么这样改更自然”的英语学习者
- 希望把常用表达和修改习惯沉淀下来的人

## 你可以体验什么

- 中英文混合输入改写
- 英文句子润色
- 修改差异对比
- 表达问题解释
- 本地表达库与写作习惯沉淀
- 写作存档
- 段落流畅度检查
- 文章地图：查看全文结构、段落角色、段落关系和优先修改建议

## 如何使用

1. 打开 [在线体验版](https://lingua-type.vercel.app/)。
2. 首次进入会看到欢迎页和示例文档，可以不用自己写文章就开始试用。
3. 在正文里写英文，也可以在卡住时夹中文，例如 `This may 影响 young people's values.`
4. 把光标放在当前句附近，点击增强当前句，查看建议和差异。
5. 确认建议有用后点击 Apply；不满意可以 Cancel 或重新生成。
6. 写到多个段落后，可以使用检查本段或文章地图查看段落和全文结构问题。

如果你已经打开过旧版本，浏览器可能保留了本地数据。想重新体验欢迎页和示例文档，可以用无痕窗口打开。

## 数据和隐私

- 写作存档、表达库、写作习惯、主题设置和触发设置保存在浏览器 `localStorage`。
- 公开体验版不要求访客填写 API key；模型调用使用 Vercel 服务端环境变量中的 key。
- 真实 API key 不保存在 GitHub，不写入浏览器 `localStorage`，也不会下发到前端页面。
- 模型建议不会自动替换正文，必须由用户点击 Apply。
- 学习数据只在用户明确采纳建议或手动保存后写入本地。
- 当前版本不包含登录、数据库、云同步、支付、社交功能或作文评分。

## 产品边界

LinguaType 专注于写作中的表达辅助，不做这些事情：

- 不自动生成整篇作文
- 不替用户决定论点
- 不自动改写整段或全文
- 不做作文打分
- 不做云端账号同步
- 不作为真实系统输入法或浏览器插件

## 本地运行

```bash
npm install
npm run dev
```

常用检查：

```bash
npm run lint
npm run build
npm test
```

## 自行部署

项目基于 Next.js，可直接导入 Vercel。仓库不会保存真实 API key；如果你部署自己的公开体验版，请在 Vercel Project Settings 里配置环境变量：

```env
NEXT_PUBLIC_LINGUATYPE_DEMO_API_ENABLED=true
LINGUATYPE_API_PROVIDER=openai-compatible
LINGUATYPE_API_BASE_URL=https://api.openai.com
LINGUATYPE_API_ENDPOINT_PATH=/v1/chat/completions
LINGUATYPE_API_MODEL=你的模型名
LINGUATYPE_API_KEY=你的真实 API key
LINGUATYPE_API_TEMPERATURE=0.2
LINGUATYPE_API_MAX_TOKENS=20000
LINGUATYPE_API_SUPPORTS_JSON_MODE=false
```

如果使用其他 OpenAI-compatible 服务，把 `LINGUATYPE_API_BASE_URL` 和 `LINGUATYPE_API_MODEL` 换成对应服务商提供的值。
