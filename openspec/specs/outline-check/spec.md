# 大纲检查规格

## Requirements

### Requirement: 应用必须显式检查大纲与主题的一致性

应用必须只在用户确认保存大纲或主题修改后调用后端大模型检查大纲是否符合文章主题。编辑过程中的新增、删除、输入、菜单打开和存档操作不得自动触发大纲检查。

#### Scenario: 用户编辑内联大纲草稿

- **GIVEN** 用户在编辑器内打开某个大纲点的内联编辑态
- **WHEN** 用户继续输入、添加大纲点或尝试删除大纲点
- **THEN** 应用不得调用 `/api/check-outline`
- **AND** 用户仍可继续编辑草稿

#### Scenario: 用户确认内联大纲修改

- **GIVEN** 用户在编辑器内完成主题或大纲修改
- **WHEN** 用户点击确定
- **THEN** 应用保存新的 Writing Setup
- **AND** 应用调用 `POST /api/check-outline`
- **AND** 检查过程不得阻塞正文写作

#### Scenario: 用户取消内联大纲修改

- **GIVEN** 用户正在编辑器内修改大纲点
- **WHEN** 用户点击取消
- **THEN** 应用丢弃草稿修改
- **AND** 不调用 `/api/check-outline`

#### Scenario: 用户操作写作存档栏

- **GIVEN** 用户位于主写作界面
- **WHEN** 用户展开侧栏、打开 archive 菜单、切换 archive、重命名 archive 或删除 archive
- **THEN** 应用不得因此调用 `/api/check-outline`

### Requirement: 大纲检查必须使用 provider abstraction

大纲检查必须通过 LLM service abstraction 调用 provider，不得在产品逻辑中直接调用 vendor API。

#### Scenario: 后端处理大纲检查

- **GIVEN** 前端调用 `POST /api/check-outline`
- **WHEN** route 处理请求
- **THEN** route 调用 `checkOutlineWithLLM`
- **AND** provider-specific code 位于 `src/lib/llm/providers/`
- **AND** prompt 位于 `src/lib/llm/prompts.ts`
- **AND** schemas 位于 `src/lib/llm/types.ts`

### Requirement: 大纲检查不得自动修改内容

大纲检查只能返回提示，不得自动修改大纲或正文。

#### Scenario: 大纲存在问题

- **GIVEN** 大纲检查返回 `hasIssues: true`
- **WHEN** 前端收到结果
- **THEN** 前端显示轻量修改意见
- **AND** 不自动改写大纲
- **AND** 不自动改写正文

#### Scenario: 大纲没有问题

- **GIVEN** 大纲检查返回 `hasIssues: false`
- **WHEN** 前端收到结果
- **THEN** 前端不显示持续性建议面板

### Requirement: Mock Mode 必须 deterministic

大纲检查在 Mock Mode 下必须 deterministic，便于测试和本地演示。

#### Scenario: Mock Mode 检查大纲

- **GIVEN** API settings 使用 Mock Mode
- **WHEN** 前端调用 `/api/check-outline`
- **THEN** 返回稳定结果
- **AND** 不需要 Base URL、API Key 或 Model
