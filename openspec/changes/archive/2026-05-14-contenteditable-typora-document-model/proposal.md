# contentEditable Typora 文档模型

## 背景

用户已确认采用 B 路线：允许突破现有 textarea 段落输入模型，将主写作界面重构为更接近 Typora 的文档表面。目标不是只去掉输入框边界，而是让主题、大纲、正文和 AI 建议都像同一张纸上的自然内容，最大限度消除“界面感”。

现有 v0.2.7 已经提供写作存档、内联 setup 修改、行内当前句建议和 Typora 式视觉，但底层仍是每段一个 textarea。textarea 路线能保守维护 range replacement，却很难做到参考图中的正文级 inline diff 和真正 WYSIWYG 文档流。

## 改动范围

- 将中央写作区改为 `contentEditable` 文档模型：
  - 正文在一个可编辑文档表面中输入。
  - 文章主题以 H1 视觉融入文档顶部。
  - 大纲点以 H2/Markdown heading 视觉融入正文流。
  - 段落不再表现为独立 textarea 输入框。
- 建立稳定的 text <-> DOM selection 映射：
  - 继续维护单个 `text` 字符串作为业务真相。
  - 光标、选区、Selection Actions、latest sentence range 都映射回这个字符串。
  - 段落之间仍以空行语义分隔，保留现有文本工具函数的使用基础。
- 当前句建议升级为正文级 inline diff：
  - 建议插入在当前句附近或当前段落附近。
  - 删除、增加、说明和 Apply/Cancel 操作直接在文档流中呈现。
  - 未 Apply 前不得写入正文、学习数据或 Correction Events。
- 主壳层完全贴近参考图：
  - 左侧存档栏可展开为文档列表，也可折叠为极细引导线。
  - 顶栏、底栏、右侧低频工具都降噪。
  - 视觉采用 `DESIGN.md` 的暖纸色、低对比、透明度灰阶和浅层边界。

## 保留约束

- 仍只增强最新非空句。
- 仍必须由用户显式 Apply / Cancel。
- Apply 仍必须使用 snapshot conflict detection。
- Diff 仍由本地代码生成，模型不生成 diff。
- `/api/enhance-fast`、`/api/extract-learning`、`/api/check-outline` 的调用边界不扩大。
- Writing Archives、Theme Preference、Trigger Settings、Learning Library、Correction Events 仍 localStorage-only。
- 不新增登录、数据库、云同步、支付、Chrome extension 或聊天界面。

## 非目标

- 不实现完整 Markdown 解析器。
- 不实现多光标、协同编辑或云同步。
- 不把大纲检查变成自动写作或自动重写。
- 不扩展 Selection Actions 到 selected text rewriting。
- 不为了视觉改动保存或上传用户正文。

## 预期结果

用户看到的是一个桌面端极简写作空间：顶部和侧栏像浅浅的引导线，中央是一张暖色纸面。用户可以在正文中自然输入中英混写内容，按快捷键或按钮后，AI 建议直接出现在相关文本附近。采纳前，正文内容保持不变；采纳后，仅替换当时捕获的 latest sentence range，并按原规则触发后台学习提取。

