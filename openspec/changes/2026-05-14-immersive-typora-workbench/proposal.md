# 沉浸式 Typora 一体化工作台

## 背景

v0.2.7 已经具备写作存档、编辑器内联 setup 修改、分段编辑和显式大纲检查，但主界面视觉仍偏“卡片式工作台”。段落输入框、顶部信息卡、右侧低频工具和当前句建议浮层共同占据较多视觉重量，容易削弱正文写作的第一优先级。

Stitch 中的 `LinguaType - Typora 沉浸式一体化工作台` 给出了更符合下一阶段产品方向的形态：左侧保留经典可折叠写作存档栏，中央正文变成 Typora 式文档流，文章主题和大纲标题直接融入正文，AI 建议以更贴近文本的行内 diff 呈现。

## 改动范围

- 将主写作界面改为沉浸式一体化工作台：
  - 左侧 Writing Archives 仍是可折叠侧边栏。
  - 中央编辑器成为视觉中心。
  - 右侧低频工具区降噪，不与正文竞争。
- 将当前卡片式段落编辑器改为 Typora 式文档流：
  - 文章主题以 H1 风格展示在正文流顶部。
  - 大纲点以 H2/段落标题风格嵌入正文流。
  - 正文输入区域无边框、弱背景、以留白和字阶区分层级。
- 保留现有底层文本模型：
  - 段落内容仍拼接为单个 `text`。
  - latest-sentence extraction、range replacement、Apply conflict detection 和 autosave 不改变。
- 将当前句建议从独立大浮层调整为靠近当前句/当前段落的行内 diff 建议条。
- 当前句建议仍必须由用户显式 Apply / Cancel，不能自动写入。
- 保持 Writing Archives localStorage-only，不新增登录、数据库、云同步或服务端持久化。
- 后端仅在必要时跟随前端 payload 或提示状态做小范围调整，不新增持久化 API。

## 非目标

- 不把 LinguaType 改成聊天消息流、dashboard 或 essay generator。
- 不引入 `contentEditable` 作为第一阶段实现要求。
- 不改变 `/api/enhance-fast` 的核心返回契约。
- 不让模型生成 diff；diff 仍由本地代码生成。
- 不自动改写整段、自动续写、自动决定观点或自动 Apply。
- 不扩展 Selection Actions 到 selected text rewriting。
- 不新增登录、数据库、云同步、支付、导入或多端同步。

## 预期结果

用户进入主界面后看到的是一个以正文为中心的写作空间：

```text
┌────────────────────┬───────────────────────────────────────┬──────────────────┐
│ Writing Archives   │ Typora Writing Flow                   │ Low-frequency    │
│                    │                                       │ Tools            │
│ + 新建写作          │ H1: 文章主题                           │ Review status    │
│ archive items      │ meta: 写作领域                          │ Learning Library │
│ item ... menu      │ H2: 大纲点 1                            │ Writing Habits   │
│ collapse           │ paragraph textarea, borderless         │ Settings/Data    │
│                    │ inline current sentence diff + actions │                  │
└────────────────────┴───────────────────────────────────────┴──────────────────┘
```

侧边栏收起后，中央编辑器获得更宽的沉浸式居中空间。AI 建议靠近正在修改的句子，以红色删除线和绿色新增高亮呈现，但仍通过 Apply/Cancel gate 进入正文和学习数据提取流程。

## 风险

- 若直接切换到 `contentEditable`，会高风险影响中文输入、selection offset、range replacement 和现有测试；第一阶段应避免。
- 行内 diff 建议条更接近正文，必须用清晰状态区分“建议尚未应用”和“正文已修改”。
- 视觉降噪不能移除低频能力入口，Learning Library、Writing Habits、API Settings 和 Data Control 仍需可发现。
- 编辑器从卡片变文档流后，段落和大纲的对应关系必须继续稳定，避免删除大纲点时丢失已有段落正文。
