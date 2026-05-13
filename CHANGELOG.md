# Changelog

## v0.2.7

- 写作存档侧栏改为可折叠结构，折叠后保留展开和新建写作入口。
- 存档条目增加 `...` 操作菜单，支持重命名和删除。
- 删除存档需要确认；删除当前存档后自动切换到剩余存档，删除唯一存档后创建空白“未命名写作”。
- 主界面移除 Writing Setup 抽屉，主题、写作领域和大纲点改为编辑器内联轻量修改。
- 大纲检查继续保持显式触发：输入中不调用，确认保存主题或大纲后才调用 `/api/check-outline`。

## v0.2.6

- 新增本地写作存档，支持保存、切换、新建和重命名写作稿。
- 主界面调整为写作存档侧栏、中央编辑器和低频工具区的工作台结构。
- 进入主界面后，主题和大纲修改改为抽屉式 Writing Setup，不离开正文编辑器。
- 主界面移除独立文章大纲管理卡片，大纲只嵌入段落标题和修改入口。
- 大纲检查改为显式触发：只在点击“确定并检查大纲”后调用 `/api/check-outline`。
- Selection Actions 改为根据选区动态定位，删除重复英文标题，并结构化展示解释结果。
- 新增 `linguatype.writingArchives.v1`，继续保留旧 draft 和 setup key。

## v0.2.5

- 写作准备页改为纯中文界面。
- 写作领域从下拉框改为直接展示的领域按钮。
- 每个领域提供 10 个本地预设文章主题，主题输入框右侧增加刷新按钮。
- 大纲从单个 textarea 改为多个独立输入框，默认 3 点，可增减。
- `WritingSetup` 存储升级为 `outlinePoints: string[]`，兼容旧 `outline: string`。
- 主写作界面按大纲点数量展示对应数量的段落输入框，并允许继续编辑大纲。
- 主题设置只放在主写作界面，不再放在写作准备页。
- 修复深色模式下建议区、状态提示和浮层区域的可读性问题。
- 新增 `POST /api/check-outline`，非阻塞检查大纲是否贴合文章主题，只提示不修改。

## v0.2.4

- 增加 Writing Setup 写作准备入口，用户可选择写作领域并填写文章主题和大纲。
- 增加 Theme Preference，支持 Light、Dark、System。
- 新增 `linguatype.writingSetup.v1` 和 `linguatype.themeSettings.v1` 本地存储。
- 保持 latest-sentence enhancement、Apply/Cancel、background learning extraction 和本地学习数据规则不变。

## v0.2.3

- 新增 OpenSpec 配置和中文 spec 写作约定。
- 新增 `PRODUCT.md`、`ARCHITECTURE.md`、`MODULES.md` 和 `CHANGELOG.md`。
- 梳理当前产品范围、应用结构、模块归属和最新句数据流。
- 明确本版本是 documentation-only architecture cleanup，不改变用户体验和业务代码。

## v0.2.2

- 将高频交互移动到编辑器附近。
- 引入 Current Sentence Popover，用于展示当前句建议、代码生成 diff、简短解释、Apply、Cancel、Regenerate 和 Copy。
- 增加 trigger settings、Selection Actions、本地 proofreading signals、Personal Dictionary 和 Data Control。
- 保持 Learning Library、Writing Habits、Paragraph Health 和 Paragraph Flow 的本地优先边界。

## v0.2.1

- 将最新句增强切换到 `/api/enhance-fast`。
- 将 learning extraction 移到 Apply 后后台运行。
- 将 raw Common Issues 升级为 Writing Habits 聚合视图。
- 增加轻量 Paragraph Health check。

## v0.2

- 从单一 latest-sentence enhancer 扩展为本地表达学习助手。
- 引入 Learning Library、Correction Events / Writing Habits、Paragraph Flow 和 expression toolbox 方向。
- 保持用户确认后才保存学习数据的原则。

## v0.1

- 建立核心 latest-sentence enhancement flow。
- 只处理最新非空句。
- 使用代码生成 diff。
- 用户必须明确 Apply 或 Cancel。
- Apply 后才替换编辑器文本。
