# 写作存档规格更新

## MODIFIED Requirements

### Requirement: 应用必须支持本地写作存档

应用必须允许用户在浏览器本地保存多篇写作内容，每篇存档包含正文、写作设置和标题。写作存档必须通过可折叠侧栏展示，侧栏参考现代 AI 产品的历史列表模式，但不得把正文写作改成聊天流。

#### Scenario: 用户新建写作存档

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户点击新建写作
- **THEN** 应用创建一个新的本地写作存档
- **AND** 新存档成为当前 active archive
- **AND** 不调用服务端持久化接口

#### Scenario: 用户切换写作存档

- **GIVEN** 用户已有多个写作存档
- **WHEN** 用户选择另一个存档
- **THEN** 应用先保存当前 active archive 的正文和 setup
- **AND** 应用加载被选择存档的正文和 setup
- **AND** 不写入 Learning Library 或 Correction Events

#### Scenario: 用户折叠写作存档栏

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户折叠写作存档栏
- **THEN** 存档列表收起
- **AND** 用户仍可展开侧栏
- **AND** 正文编辑器不被隐藏

### Requirement: 用户必须能通过存档菜单管理写作存档

每条写作存档必须提供低调的操作菜单，类似 ChatGPT 对话列表中的三个点菜单。菜单至少支持重命名和删除。

#### Scenario: 用户打开存档菜单

- **GIVEN** 用户位于写作存档侧栏
- **WHEN** 用户点击某条存档的 `...` 操作按钮
- **THEN** 应用展示该存档的操作菜单
- **AND** 菜单包含重命名和删除

#### Scenario: 用户重命名存档

- **GIVEN** 用户已有一个 archive
- **WHEN** 用户通过存档菜单修改存档标题并确认
- **THEN** 该 archive 的 `title` 更新
- **AND** `setup.essayTopic` 不因重命名而自动改变

### Requirement: 用户必须能删除本地写作存档

应用必须允许用户删除写作存档。删除只影响 `linguatype.writingArchives.v1` 中的对应 archive，不得删除学习数据或旧 legacy key。

#### Scenario: 用户删除非当前存档

- **GIVEN** 用户已有多个写作存档
- **AND** 用户选择删除的存档不是 active archive
- **WHEN** 用户确认删除
- **THEN** 应用从 `linguatype.writingArchives.v1` 删除该 archive
- **AND** 当前正文和 active archive 不改变
- **AND** 不写入 Learning Library 或 Correction Events

#### Scenario: 用户删除当前存档且仍有其他存档

- **GIVEN** 用户已有多个写作存档
- **AND** 用户选择删除的存档是 active archive
- **WHEN** 用户确认删除
- **THEN** 应用删除当前 archive
- **AND** 应用切换到剩余 archive 中最近打开或合理的下一项
- **AND** 编辑器加载新的 active archive 正文和 setup

#### Scenario: 用户删除唯一存档

- **GIVEN** 用户只有一个写作存档
- **WHEN** 用户确认删除该存档
- **THEN** 应用删除该 archive
- **AND** 应用创建一个新的空白“未命名写作” archive
- **AND** 主编辑器保持可用

#### Scenario: 删除存档需要确认

- **GIVEN** 用户点击删除存档
- **WHEN** 删除确认 UI 出现
- **THEN** 文案说明该操作只删除本地写作存档
- **AND** 用户取消时不删除 archive

### Requirement: 写作存档不得保存学习数据

写作存档只保存正文和写作设置，不得把切换、重命名、删除或自动保存视为学习数据保存动作。

#### Scenario: 删除当前写作

- **GIVEN** 用户确认删除一个写作存档
- **WHEN** 应用更新 archive state
- **THEN** 不写入 `linguatype.learningLibrary.v1`
- **AND** 不写入 `linguatype.correctionEvents.v1`
- **AND** 不触发 `/api/extract-learning`
