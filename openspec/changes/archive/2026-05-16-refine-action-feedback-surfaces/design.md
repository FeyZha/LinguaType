# Design

## Product Principle

本轮只处理“用户做了动作后有没有反馈”和“低频页面是否符合当前定位”。反馈应短、中文优先、可自动消失或停留在页面局部，不抢正文焦点。

## Boundaries

- Learning Library 的动作反馈围绕表达记忆：复制、插入、收藏、删除后给出局部反馈，不新增复习系统。
- Writing Habits 的动作反馈围绕行动建议：删除某类习惯后说明只清理对应本地 Correction Events。
- Data / Trigger / API settings 的反馈围绕本地设置边界：保存、重置、清空、连接测试应给清楚状态，但不引入后台持久化。
- 所有改动保持 localStorage-only 和 explicit user action。

## Test Strategy

- 为改动页面补充或更新组件测试，验证按钮反馈、危险动作确认、本地存储边界和 UI 文案。
- 优先运行改动相关 targeted tests，再运行 lint/build；如范围扩大再跑 full test。
