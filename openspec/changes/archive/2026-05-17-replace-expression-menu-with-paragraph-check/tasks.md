# 任务

- [x] 1. 写失败测试：`Ctrl/Cmd + K` 直接触发 `/api/check-paragraph-flow`，不出现表达菜单。
- [x] 2. 写失败测试：触发设置页不再显示表达菜单触发方式，storage 默认值不再包含 `inlineExpressionMenuTrigger`。
- [x] 3. 写失败测试：折叠侧边栏快捷区包含“检查本段”按钮，并可触发段落流畅度检查。
- [x] 4. 实现编辑器快捷键改绑，移除表达菜单组件挂载和相关状态。
- [x] 5. 移除 `inlineExpressionMenuTrigger` 类型、默认值、校验和设置 UI。
- [x] 6. 删除 `InlineExpressionMenu.tsx`，同步快捷键帮助和文档/OpenSpec。
- [x] 7. 运行 targeted tests、lint 和 `git diff --check`。
