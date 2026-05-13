# 编辑器壳层规格更新

## MODIFIED Requirements

### Requirement: 主界面必须保持 editor-first 工作台结构

主界面必须让正文编辑器保持第一优先级，同时可提供可折叠写作存档侧栏和低频工具区。

#### Scenario: 用户进入主界面

- **GIVEN** 用户已经有 active archive 或完成 Writing Setup
- **WHEN** 主界面展示
- **THEN** 中央区域展示正文编辑器
- **AND** 写作存档和工具设置不得遮挡或取代正文编辑器
- **AND** 主界面不得呈现为聊天消息流

#### Scenario: 用户折叠写作存档栏

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击写作存档栏折叠按钮
- **THEN** 写作存档栏收起为窄栏或图标栏
- **AND** 正文编辑器仍保持可见和可输入
- **AND** 用户仍能找到展开入口

### Requirement: 进入主界面后必须在编辑器内轻量修改 Writing Setup

用户进入主界面后，修改写作领域、文章主题或大纲必须通过编辑器内的轻量内联交互完成，不再使用主界面 Writing Setup 抽屉。

#### Scenario: 用户修改主题

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击文章主题旁的轻量编辑入口
- **THEN** 文章主题在编辑器区域内进入内联编辑态
- **AND** 正文编辑器仍保留在当前界面中
- **AND** 应用不展开 Writing Setup 抽屉

#### Scenario: 用户取消设置修改

- **GIVEN** 用户正在编辑器内修改主题、领域或大纲点
- **WHEN** 用户点击取消
- **THEN** 应用退出内联编辑态
- **AND** 不保存草稿修改
- **AND** 不调用 `/api/check-outline`

#### Scenario: 用户确认设置修改

- **GIVEN** 用户正在编辑器内修改主题、领域或大纲点
- **WHEN** 用户点击确定
- **THEN** 应用保存新的 Writing Setup
- **AND** active archive 同步保存新的 setup
- **AND** 应用可以按显式规则调用 `/api/check-outline`

### Requirement: 大纲默认必须处于锁定状态

主界面中的大纲默认只读展示。用户必须明确进入修改状态后才能编辑大纲。

#### Scenario: 用户未点击修改大纲点

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户查看段落标题的大纲点
- **THEN** 大纲点以只读提示展示
- **AND** 不显示可直接编辑的大纲输入框

#### Scenario: 用户点击单个大纲点编辑入口

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击某个段落标题旁的大纲编辑入口
- **THEN** 仅该大纲点进入内联编辑态
- **AND** 其他大纲点保持只读展示
- **AND** 应用不展开 Writing Setup 抽屉
