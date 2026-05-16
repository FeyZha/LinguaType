# LinguaType

LinguaType 是面向中文母语英语学习者的网页写作辅助工具。它的核心不是聊天、翻译或自动写作文，而是让用户在写英文时可以自然地夹入中文卡词表达，然后在句子完成后获得一个可采纳、可复习的英文表达建议。

当前版本：`v0.2.8`

## 产品定位

LinguaType 是：

- 类输入法的当前句增强工具
- 中英混写句子的英文表达转换器
- 轻量英文润色工具
- 本地文本校对信号工具
- 本地表达库和写作习惯分析工具

LinguaType 不是：

- 通用翻译器
- 聊天机器人
- 作文生成器
- 全文批改或作文评分工具
- 系统级输入法
- Chrome 插件
- 云同步产品

## 核心写作链路

1. 用户在写作页直接输入长文本，体验接近 Word / Typora。
2. 如果一句话里卡词，可以临时夹入中文，例如 `I found that many students lack 自主学习能力.`
3. 只有当句子完成并稳定后，系统才会处理当前句；已生成过的建议会先从本地缓存恢复，未命中时才后台请求模型。
4. 界面只在目标句右侧显示一个低干扰入口。
5. 用户点击入口后，目标句临时独立成段，内联卡片紧跟句子下方。
6. 用户可以采纳、忽略或换一种说法；模型输出不会自动写入正文。
7. 采纳后只替换被捕获的当前句范围，并在后台保存表达学习资产。

当前句增强仍然遵守范围替换规则：只处理单句，不重写整段，不生成新观点，不自动应用模型结果。

已生成过的中文占位句建议会按文档、原句、模式、强度和领域写入本地缓存。重新打开页面或切回同一存档时，命中缓存只恢复句旁入口和内联建议，不重复调用大模型。

## 写作页体验

- 正文区使用单一长文本输入面，避免分段卡片破坏光标和选区体验。
- 标题与正文左边界保持一致，写作区不使用正文卡片背景。
- AI 建议入口保持低干扰，不用虚线或边框持续标记已修改文本。
- 表达复现提示只在用户自然写出已学表达时出现，用极淡的原位线和一次微动效提示“这来自你的表达库”。
- 底部状态栏固定在写作页最底部，展示词数、句数、段落数、模式、强度、触发方式、领域和校对提示数量。
- 文本校对问题直接以写作区右侧轻量 tag 呈现；鼠标悬停或键盘聚焦 tag 时，对应正文片段会轻微高亮。
- 有校对 tag 时不再弹出独立校对详情面板，避免用户离开正文定位问题。
- 选中文本后显示轻量功能条，支持解释、保存到表达库、复制和关闭。
- 选区功能不会改写或替换选中文本。

## 表达库

表达库保存可复用的表达资产，来源包括：

- 当前句建议被用户采纳后的学习项
- 用户明确选择保存的选中文本

表达库支持搜索、筛选、收藏、复制、插入、删除和 JSON 导出。保存时会按 `type + normalized content` 去重，重复内容会累计使用次数并更新时间。

当正文命中表达库中的短语或搭配时，写作区会给一次极轻的表达复现提示。它不调用模型、不推荐候选、不改正文，也不会写入新的学习数据。

## 写作习惯

写作习惯基于已采纳的修改记录聚合生成，不展示原始流水账。它用于帮助用户识别长期表达问题，例如：

- 中式表达迁移
- 搭配不自然
- 语序迁移
- 单复数不稳定
- 冠词遗漏

趋势图只统计已应用的修正。无数据时显示轻量空状态，有数据时显示近 7 天节奏和频率分档。

## 本地数据与隐私

LinguaType 当前保持本地优先，不引入登录、数据库或云同步。主要数据保存在浏览器 `localStorage`：

- `linguatype.apiSettings.v1`
- `linguatype.writingDraft.v1`
- `linguatype.writingSetup.v1`
- `linguatype.writingArchives.v1`
- `linguatype.themeSettings.v1`
- `linguatype.learningLibrary.v1`
- `linguatype.correctionEvents.v1`
- `linguatype.paragraphHealthCache.v1`
- `linguatype.placeholderSuggestionCache.v1`
- `linguatype.triggerSettings.v1`
- `linguatype.personalDictionary.v1`

历史兼容键：

- `linguatype.learningHistory.v1`
- `linguatype.correctionMemory.v1`

清空表达库或写作习惯时只清对应的新键，不会删除历史兼容键。

## API 与模型边界

主要 API：

- `POST /api/enhance-fast`
- `POST /api/extract-learning`
- `POST /api/check-paragraph-health`
- `POST /api/check-paragraph-flow`
- `POST /api/check-outline`
- `POST /api/explain-selection`
- `POST /api/test-connection`

规则：

- 产品逻辑不直接调用厂商 API，统一走 provider service。
- API Key 只随请求发送到 Next.js API route，不提交、不硬编码、不服务端持久化。
- Mock Mode 可用于开发和演示，不需要真实 Base URL、API Key 或 Model。
- JSON mode 默认关闭，避免 OpenAI-compatible provider 不支持 `response_format` 时失败。

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

在 Windows 上如果 Vitest 进程挂起，可以先运行：

```bash
npm run lint
npm run build
```

再用浏览器验证写作页的关键交互。

## 目录速览

- `src/components/`：主要 UI 组件
- `src/lib/`：句子提取、存储、校对和 LLM provider 逻辑
- `src/app/api/`：Next.js API routes
- `openspec/`：产品变更提案、任务和规格
- `PRODUCT.md`：产品身份和边界
- `ARCHITECTURE.md`：架构与数据流
- `MODULES.md`：模块职责和依赖方向
- `AGENTS.md`：当前产品约束和执行规则

## 开发原则

- 写作优先，高频功能靠近编辑器。
- 低频管理进入左侧导航页面。
- 模型建议必须由用户确认后才进入正文。
- 学习数据只在明确采纳或明确保存后写入。
- Diff 由本地代码生成，不由模型生成。
- 不把 LinguaType 扩展成聊天界面、全文批改工具或作文生成器。
