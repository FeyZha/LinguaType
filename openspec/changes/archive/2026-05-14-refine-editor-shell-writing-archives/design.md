# 设计说明

## 总体方向

本 change 是 v0.2.5 之后的主界面和本地写作管理升级。设计目标是让 LinguaType 看起来和操作起来更像现代 AI 写作工作台，但产品模型仍保持：

- editor-first，不使用聊天消息流作为主体验。
- localStorage-only，不新增账户、数据库或云同步。
- 最新句增强仍只处理用户已经写出的最新非空句。
- 所有模型输出仍需要用户明确 Apply 或 Save 后才写入正文或学习数据。

推荐主界面结构：

```text
+-------------------------------------------------------------+
| 顶部：当前写作标题 / 主题 / API 设置 / 主题偏好              |
+-------------+-----------------------------------+-----------+
| 写作存档     | 中央正文编辑器                    | 工具/设置  |
| - 新建       | 第 1 段：大纲点                    | 表达库     |
| - 当前稿     | [textarea]                         | 写作习惯   |
| - 历史稿     | 第 2 段：大纲点                    | 数据控制   |
|              | [textarea]                         |            |
+-------------+-----------------------------------+-----------+
                 抽屉式 Writing Setup 可从右侧或左侧展开
```

视觉可以参考 ChatGPT、豆包、千问的壳层层级：清晰的侧边栏、当前稿标题、轻量按钮和浮层。但不得出现“输入消息”“发送”“助手回复”等聊天语义。

## 写作存档数据模型

新增 localStorage key：

```text
linguatype.writingArchives.v1
```

建议类型：

```ts
type WritingArchiveItem = {
  id: string;
  title: string;
  text: string;
  setup: WritingSetup | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
};

type WritingArchivesState = {
  activeId: string | null;
  items: WritingArchiveItem[];
};
```

数据规则：

- 初次升级时，如果已有 `linguatype.writingDraft.v1` 或 `linguatype.writingSetup.v1`，应生成一个默认 archive。
- 默认标题优先使用 `setup.essayTopic`，为空时使用“未命名写作”。
- 用户可重命名 archive title，重命名只影响存档标题，不改变 essay topic，除非用户在 Writing Setup 抽屉中修改主题。
- 切换 archive 前应自动保存当前 active archive 的正文和 setup。
- 删除 archive 不属于首版必需能力；若实现，必须确认并避免删除 Learning Library 或 Writing Habits。

保留旧 key 以兼容现有逻辑：

- `linguatype.writingDraft.v1` 可继续作为 active archive text 的兼容镜像。
- `linguatype.writingSetup.v1` 可继续作为 active archive setup 的兼容镜像。
- 不删除 legacy key。

## 抽屉式 Writing Setup

首次没有 setup/archive 时，仍可以展示完整 Writing Setup 初始页。用户进入主界面后，不再通过“退回准备页”离开编辑器，而是展开设置抽屉。

抽屉状态建议拆分：

```ts
type SetupDrawerState = {
  open: boolean;
  draftSetup: WritingSetup;
  mode: "topic" | "outline" | "all";
  dirty: boolean;
};
```

交互规则：

- 点击主界面“修改主题”或段落区域“修改大纲”时打开抽屉。
- 抽屉打开后，正文保持可见；可以选择是否在抽屉打开时保留正文可编辑。
- 抽屉内修改只更新 `draftSetup`，不立即写入 `writingSetup`。
- 点击“取消”丢弃 `draftSetup`。
- 点击“确定”后保存到 active archive 和 `linguatype.writingSetup.v1`。
- 点击“确定”后，如果主题和大纲满足检查条件，再调用 `/api/check-outline`。
- 抽屉不得调用 LLM 生成主题、大纲或正文。

## 大纲锁定和检查

主界面不再单独显示“文章大纲”管理卡片。大纲只在正文段落标题上展示：

```text
第 1 段：大纲点文本      [修改大纲]
[textarea]
```

默认状态：

- 大纲显示为只读提示。
- 不显示每个大纲点的独立编辑框。
- 不自动调用 `/api/check-outline`。

编辑状态：

- 用户点击“修改大纲”打开 Writing Setup 抽屉。
- 用户可以在抽屉中新增、删除、修改大纲点。
- 删除大纲点时，如果对应段落已有正文，应阻止删除或要求确认；首选阻止并提示先处理对应正文。
- 点击“确定”后同步段落输入框数量。

检查触发：

- 只有“确定”动作触发检查。
- 输入过程、添加大纲输入框、删除大纲输入框、主题刷新都不得触发检查。
- 检查结果有问题时显示建议；无问题时不显示成功提示或只显示短暂状态。
- 检查失败不阻止继续写作。

## Selection Actions 定位与结构化解释

当前固定 `left-4 top-4` 的浮层应改为基于选区位置计算。

建议事件数据：

```ts
type EditorSelectionInfo = {
  start: number;
  end: number;
  text: string;
  anchorRect: DOMRect;
  containerRect: DOMRect;
  paragraphIndex: number;
};
```

定位策略：

- 优先显示在选区上方。
- 如果上方空间不足，显示在选区下方。
- 水平方向尽量与选区中心对齐，并限制在编辑器容器内。
- 每个段落 textarea 都必须上报自己的 rect，避免第二段选区浮层显示在第一段。
- 滚动时应关闭浮层或重新计算位置，避免漂移。

文案策略：

- 标题从“选中文本操作 Selection Actions”改为“选中文本操作”。
- 按钮使用“解释选中内容”“保存到表达库”等中文优先文案。
- 保留 `Learning Library` 等英文 capability name 仅在低频管理区或开发文档中必要出现。

结构化解释建议展示：

```text
含义
  简明中文含义

用法
  在当前句子里的用法说明

语境作用
  为什么这里这样表达

表达类型
  短语 / 搭配 / 句型
```

后端 schema 可以在兼容旧字段的基础上扩展，例如增加 `contextRoleZh`、`structureNotesZh`。无论是否扩展 schema，前端都不得显示改写候选或替换按钮。

## 与现有流程的关系

latest-sentence enhancement：

- 继续使用当前 request state：`requestId`、`snapshotFullText`、`latestSentenceRange`、`originalSentence`、`requestInput`、`result`。
- Apply 仍只替换捕获 range。
- 文本冲突仍要求重新增强。
- background learning extraction 仍只在 Apply 后运行。

Learning Library / Writing Habits：

- 写作存档保存正文和 setup，不保存学习数据。
- Selection Actions 的 Save to Library 仍是显式用户动作。
- 切换 archive、重命名 archive、修改 setup 不写入 Correction Events。

## 验证策略

优先 focused tests：

- 已有 draft/setup 首次加载后会生成或显示一个 active archive。
- 新建、切换、重命名 archive 都只写 localStorage。
- 打开设置抽屉后编辑主题/大纲不会立即保存，也不会调用 `/api/check-outline`。
- 点击“确定”后保存 setup，并且只在此时调用 `/api/check-outline`。
- 主界面不再单独显示文章大纲管理卡片，段落标题仍显示大纲点。
- Selection Actions 在第二段选中文本时定位到第二段附近。
- Selection Actions 解释结果以结构化中文显示。
- latest-sentence Apply/Cancel、range replacement 和 background extraction 旧测试继续通过。
