# 写作习惯规格

## Requirements

### Requirement: 写作习惯必须展示聚合后的习惯洞察

写作习惯必须基于本地 Correction Events 聚合长期表达模式，而不是展示原始流水日志。

#### Scenario: 用户查看写作习惯

- **GIVEN** 本地存在 correction events
- **WHEN** 用户进入写作习惯页面
- **THEN** 页面展示聚合后的高频问题、例子和改进建议
- **AND** 默认不展示原始 correction events 列表

### Requirement: 写作习惯必须采用报告流组织

写作习惯必须像写作观察报告，而不是仪表盘卡片集合。

#### Scenario: 用户查看写作习惯报告

- **GIVEN** 本地存在 correction events
- **WHEN** 用户进入写作习惯页面
- **THEN** 高频问题以自然报告流、分组行或表格流展示
- **AND** 页面不使用大卡片作为主要组织形式

### Requirement: 修改例子必须使用规整前后对照

写作习惯中的例子不得使用 `->` 表示修改前后。

#### Scenario: 用户查看修改例子

- **GIVEN** 某个写作习惯包含修改例子
- **WHEN** 页面展示该例子
- **THEN** 页面用 `修改前` 和 `修改后` 标签展示对照
- **AND** 页面不显示 `->`
