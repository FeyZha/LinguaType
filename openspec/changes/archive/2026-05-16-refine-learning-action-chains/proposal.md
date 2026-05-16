# refine-learning-action-chains

## Why

LinguaType 当前需要把表达库、写作习惯、本地校对、选中内容和段落提示重新收敛到学习型写作闭环里。主链仍然是 latest sentence -> suggestion -> Apply/Cancel -> Apply 后沉淀学习数据；低频管理功能不能重新变成打断写作的 dashboard 或隐式 AI 行为。

## What Changes

- 收紧会暗中调用 LLM 的动作：存档切换、删除 outline point 等本地组织动作不得触发模型。
- 补齐本地校对入口：默认折叠在编辑器底部状态栏，点击后才展示 Text Stats 和本地 signals。
- 统一段落能力心智：Apply 后只出现轻提示，完整 Paragraph Flow 保持显式手动检查和显式 Apply。
- 将表达库呈现为表达记忆层，强调来源、含义、用法、使用次数和写作中召回。
- 将写作习惯呈现为行动反馈，突出高频模式、最近例句和下次写作提醒。

## Non-Goals

- 不引入登录、数据库、云同步或新后端持久化。
- 不增加全文作文生成、作文评分、自动段落改写、选中文本改写。
- 不改变 latest-sentence range replacement 和 Apply/Cancel 核心规则。
