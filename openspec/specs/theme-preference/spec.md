# Theme Preference 规格

## Requirements

### Requirement: 应用必须支持三种界面主题偏好

LinguaType 必须允许用户选择浅色 Light、深色 Dark、跟随系统 System 三种界面主题偏好。

#### Scenario: 用户选择浅色主题

- **GIVEN** 用户打开 theme preference 控件
- **WHEN** 用户选择 Light
- **THEN** 应用使用浅色界面
- **AND** theme preference 保存为 `light`

#### Scenario: 用户选择深色主题

- **GIVEN** 用户打开 theme preference 控件
- **WHEN** 用户选择 Dark
- **THEN** 应用使用深色界面
- **AND** theme preference 保存为 `dark`

#### Scenario: 用户选择跟随系统

- **GIVEN** 用户打开 theme preference 控件
- **WHEN** 用户选择 System
- **THEN** 应用根据 `prefers-color-scheme` 使用浅色或深色界面
- **AND** theme preference 保存为 `system`

### Requirement: Theme Preference 必须本地保存

Theme preference 必须保存在 localStorage，不得写入服务端。

#### Scenario: 保存 theme preference

- **GIVEN** 用户选择界面主题
- **WHEN** 应用保存偏好
- **THEN** 数据写入 `linguatype.themeSettings.v1`
- **AND** 不调用服务端持久化接口

### Requirement: Theme Preference 只能位于主写作界面

Theme Preference 不应出现在 Writing Setup 中，只应位于主写作界面。

#### Scenario: 用户打开 Writing Setup

- **GIVEN** 用户位于 Writing Setup
- **WHEN** 页面展示
- **THEN** 不显示主题设置控件

#### Scenario: 用户进入主写作界面

- **GIVEN** 用户已经进入主写作界面
- **WHEN** 用户查看顶部或设置区域
- **THEN** 可以找到主题设置控件

### Requirement: 深色模式下浮层内容必须可读

深色模式下，所有浮层和建议区域必须有足够的文字与背景对比度。

#### Scenario: 用户查看当前句建议

- **GIVEN** 用户使用深色模式
- **WHEN** Current Sentence popover 展示建议句、原句、diff 和解释
- **THEN** 建议部分文字清晰可读
- **AND** 背景色与文字色不会都偏暗或都偏浅

#### Scenario: 用户查看其它浮层

- **GIVEN** 用户使用深色模式
- **WHEN** 用户打开 Selection Actions、Inline Expression Menu、Proofreading panel、API Settings modal 或 Paragraph Flow panel
- **THEN** 浮层正文、按钮和提示文本清晰可读

### Requirement: Theme Preference 默认跟随系统

当用户没有保存主题偏好时，应用必须默认使用 System。

#### Scenario: 没有已保存主题设置

- **GIVEN** `linguatype.themeSettings.v1` 不存在或无效
- **WHEN** 应用初始化 theme preference
- **THEN** 默认 preference 为 `system`
- **AND** UI 按当前系统颜色偏好展示

### Requirement: Theme Preference 不得影响产品数据和 AI 行为

Theme preference 只能影响界面外观，不得改变编辑器文本、API settings、LLM provider、learning data、Correction Events、Paragraph Health 或 Selection Actions。

#### Scenario: 用户切换主题

- **GIVEN** 用户已经在编辑器中写入文本
- **WHEN** 用户切换 Light、Dark 或 System
- **THEN** 编辑器文本保持不变
- **AND** `linguatype.apiSettings.v1` 保持不变
- **AND** `linguatype.learningLibrary.v1` 保持不变
- **AND** `linguatype.correctionEvents.v1` 保持不变

#### Scenario: 主题设置与 API Settings 分离

- **GIVEN** 用户打开 API Settings
- **WHEN** 用户查看 provider 配置
- **THEN** theme preference 不应作为 provider/API 设置出现
- **AND** theme preference 不影响 `/api/test-connection` 或 `/api/enhance-fast`
