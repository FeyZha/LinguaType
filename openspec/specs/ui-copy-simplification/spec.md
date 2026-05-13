# UI 文案精简规格

## Requirements

### Requirement: 用户界面必须默认只显示中文

LinguaType 用户可见界面必须默认使用中文文案，不再使用冗余的“中文 + 英文”并列显示。

#### Scenario: 用户查看主界面和准备页

- **GIVEN** 用户打开 LinguaType
- **WHEN** 用户浏览 Writing Setup、主编辑器、弹层、设置、数据管理和侧边栏
- **THEN** UI 文案默认只显示中文
- **AND** 不出现 `写作准备 Writing Setup`、`界面主题 Theme`、`表达库 Learning Library` 这类冗余并列文案

### Requirement: 开发标识符可以保留英文

代码路径、API route、localStorage key、schema 名称、函数名和开发文档中的必要 capability name 可以继续使用英文。

#### Scenario: 开发者阅读文档或代码

- **GIVEN** 开发者查看 OpenSpec、代码或架构文档
- **WHEN** 内容涉及 API route、localStorage key、schema 或函数
- **THEN** 可以保留英文标识符
- **AND** 不要求把代码标识符翻译成中文
