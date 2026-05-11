# LinguaType

LinguaType 是一个面向中文母语英语学习者的轻量级网页写作助手。它只处理编辑器里的最新非空句子：中英混写时转换中文片段并修正语法，纯英文时只做必要的轻度润色。用户必须点击“应用”后，修改才会写回编辑器，学习表达也只会在应用后保存。

## 启动

```bash
npm install
npm run dev
```

打开终端显示的本地地址即可使用。常见地址是 `http://127.0.0.1:3000`，如果端口被占用，可以换到其他端口：

```bash
npm run dev -- --hostname 127.0.0.1 --port 3002
```

## 常用命令

```bash
npm test
npm run lint
npm run build
```

项目的 npm 脚本已经处理了 Windows 终端里常见的尾随说明写法，所以下面这种命令也可以：

```bash
npm test # 执行单元测试
npm run lint # 代码格式与语法检查
npm run build # 生产构建
```

## 使用方式

1. 在编辑器中自然写作，可以中英混写。
2. 按 `Ctrl/Cmd + Enter`，或点击“润色最新一句”。
3. 查看建议修改、词级 diff 和中文修改说明。
4. 点击“应用”只替换最新一句；点击“取消”则不做任何改动。

兼容快捷键 `Ctrl/Cmd + J` 只在编辑器聚焦时生效，并会阻止浏览器默认快捷键行为。

## API 设置

从顶部栏打开“API 设置”。

- 默认启用 **Mock 模式**，使用本地固定演示结果，不需要真实 API。
- 使用真实模型时，关闭 Mock 模式，并填写 API Base URL、API Key 和模型名称。
- 高级设置包括 endpoint path、温度、最大 tokens 和 JSON mode。
- JSON mode 默认关闭，因为很多 OpenAI-compatible provider 不支持 `response_format`。
- “测试连接”只发送最小请求，要求 provider 返回 `{"ok": true}`。

## Mock 模式

Mock 模式用于开发、演示和自动化测试：

- 不需要 API Base URL、API Key 或模型名称。
- 返回确定性的本地演示结果。
- 可以覆盖中英混写、语法修正、搭配修正和纯英文不改写等场景。

## 隐私说明

v0.1 没有数据库，也不会在服务器端持久化 API Key。

API 设置会保存在浏览器 localStorage 中：

- `linguatype.apiSettings.v1`
- `linguatype.learningHistory.v1`
- `linguatype.writingDraft.v1`

真实 API Key 会从浏览器随每次请求发送到 Next.js API route，但不会写入服务器存储。请只在可信设备和可信模型服务上使用自己的 API Key。

## v0.1 限制

- 只润色最新一句。
- 不改写整段。
- 不做 essay 级别批改。
- 不生成新论点。
- 不预测用户下一句观点。
- 不提供多个候选译文。
- 不包含数据库、登录、支付、Chrome 插件、真实系统输入法、云同步、间隔复习或社交功能。
- 输出质量取决于用户提供的模型服务。
