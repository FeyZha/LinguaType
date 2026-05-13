# 大纲检查规格

## ADDED Requirements

### Requirement: 应用必须在大纲修改后检查大纲与主题的一致性

当用户修改大纲后，应用必须在不影响正常输入的前提下调用后端大模型检查大纲是否符合文章主题。

#### Scenario: 用户修改大纲

- **GIVEN** 用户在主界面修改大纲点
- **WHEN** 应用检测到拼接后的大纲文本发生变化
- **THEN** 应用 debounce 后调用 `/api/check-outline`
- **AND** 用户仍可继续输入，不被阻塞

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
- **THEN** 前端不显示提示

### Requirement: Mock Mode 必须 deterministic

大纲检查在 Mock Mode 下必须 deterministic，便于测试和本地演示。

#### Scenario: Mock Mode 检查大纲

- **GIVEN** API settings 使用 Mock Mode
- **WHEN** 前端调用 `/api/check-outline`
- **THEN** 返回稳定结果
- **AND** 不需要 Base URL、API Key 或 Model
