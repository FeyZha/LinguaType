# 主题可读性规格

## ADDED Requirements

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
