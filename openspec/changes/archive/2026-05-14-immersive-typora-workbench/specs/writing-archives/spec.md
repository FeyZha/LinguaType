# 写作存档规格更新

## MODIFIED Requirements

### Requirement: 应用必须支持本地写作存档

应用必须允许用户在浏览器本地保存多篇写作内容，每篇存档包含正文、写作设置和标题。写作存档必须通过可折叠侧栏展示，并服务于沉浸式正文写作。

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
- **THEN** 存档列表收起为窄栏
- **AND** 用户仍可找到展开入口和新建写作入口
- **AND** 正文编辑器获得更宽的沉浸式居中空间

### Requirement: 用户必须能通过存档菜单管理写作存档

每条写作存档必须提供低调的操作菜单。菜单至少支持重命名和删除。

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

### Requirement: 写作存档必须保持 localStorage-only

写作存档数据必须只保存在 localStorage 中，不得引入登录、数据库或云同步。

#### Scenario: 保存写作存档

- **GIVEN** 用户正在编辑正文
- **WHEN** 应用保存当前写作存档
- **THEN** 数据写入 `linguatype.writingArchives.v1`
- **AND** 不创建账户、数据库、云同步或服务端 session
