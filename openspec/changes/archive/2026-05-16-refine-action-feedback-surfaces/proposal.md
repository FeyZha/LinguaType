# refine-action-feedback-surfaces

## Why

LinguaType 的主写作链已经回到 editor-first，但低频页面和部分动作反馈还需要继续收敛。用户在写作时应能明确知道每个动作是否生效，同时页面不能变成管理 dashboard 或打断写作的说明页。

## What Changes

- 统一低频页面的动作反馈：复制、插入、删除、清空、保存、测试连接等动作应有轻量状态提示。
- 强化空态和危险动作确认文案，使用户能理解数据边界。
- 保持表达库是表达记忆、写作习惯是行动反馈、本地校对是轻量信号的产品定位。
- 不改 latest-sentence enhancement、Apply/Cancel、range replacement、learning extraction 的核心链路。

## Non-Goals

- 不新增登录、数据库、云同步、导入或支付。
- 不新增自动写作、整段自动改写、作文评分或聊天界面。
- 不重写主应用结构，不把低频页面塞回编辑器右侧常驻栏。
