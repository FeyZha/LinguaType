# 设计

## 布局

主界面改为固定高度三栏：

- 左侧 `AppSidebar`：`position: sticky` 或固定在 viewport 高度内，内部可滚动但不跟随中间正文滚动。折叠后保留品牌缩写、展开、新建和核心入口。
- 中间 `MainStage`：唯一主要滚动区域。根据当前 view 显示 `editor`、`library`、`habits`、`settings`。
- 右上 `ThemeMenu`：位于中间舞台右上方，显示当前主题并可展开选择 `浅色`、`深色`、`跟随系统`。

## 导航模型

新增本地 UI 状态 `activeWorkspaceView`：

- `editor`：显示写作编辑器。
- `library`：显示表达库页面。
- `habits`：显示写作习惯页面。
- `settings`：显示设置页面。

切换 view 不应触发 LLM，不应保存学习数据，不应改写正文。

## 设置整合

设置页合并以下功能：

- API Settings：使用现有 `ApiSettingsModal` 的保存、清空和测试逻辑，但嵌入中间页面展示，不再只靠独立右上按钮。
- 触发与打扰设置：复用 `TriggerSettingsPanel` 行为。
- Data Control：复用 `DataControlPanel` 行为。

左侧底部只显示一个 `设置` 入口。

## 表达库与个人词典

表达库页面承载：

- 学习表达卡片列表。
- 原有搜索、筛选、收藏、复制、插入、删除、导出。
- Personal Dictionary 作为表达库中的一种类型/分区，而不是独立页面。

表达库筛选里新增 `个人词典` 选项。选择后展示本地词典条目，支持添加和删除，不参与 LLM 调用。

## 深色主题

使用 `data-theme` 切换 CSS 变量：

- `--lt-bg`
- `--lt-surface`
- `--lt-surface-soft`
- `--lt-text`
- `--lt-muted`
- `--lt-border`
- `--lt-accent`

尽量把主界面从硬编码颜色迁移到 CSS 变量，确保 light/dark/system 共用同一结构。

## 字体

全局字体栈调整为更适合英文输入和阅读的主流字体：

`Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

正文编辑区域使用同一 sans 栈，保留中文系统字体 fallback。

## 风险

- `LinguaTypeApp` 已经承担较多编排职责，本次先按现有文件内局部组件重构，避免引入跨文件状态迁移风险。
- 表达库页面化会影响旧测试中对右侧 tab 的查询方式，需要更新测试语义。
- 深色主题需要覆盖足够多的主界面组件，不能只改 body 背景。
