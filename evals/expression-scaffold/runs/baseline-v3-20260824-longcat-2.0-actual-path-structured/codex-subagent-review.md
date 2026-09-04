# v3 Codex 子 Agent 独立预审

状态：`pending_human_calibration`。本文件不代表用户最终判断。

## 结论

- 审核单位：25 个预期 initial item + 9 个真实可达 selected-focus，共 34 个 item / 阶段。
- item / 阶段：29 `pass`、3 `needs_improvement`、2 `bad_case`。
- 20 个 case 取最差项：15 `pass`、3 `needs_improvement`、2 `bad_case`。
- 生成模型 LongCat-2.0 没有参与审核；预审由三个隔离的 Codex 子 Agent 完成。

## 真实轨迹

| 检查 | 结果 |
|---|---:|
| initial 调用 | 20 |
| 结构可用 / 失败 | 18 / 2 |
| 预期顶层 item | 25 |
| 正确覆盖 / 遗漏或替换 | 23 / 2 |
| 已覆盖 item 的 D / R 路由命中 | 23 / 23 |
| 金标 R item | 11 |
| 因无效 initial 被阻断 | 2 |
| 实际 selected-focus | 9 |
| selection 来自对应 initial 第一项 | 9 / 9 |
| selected-focus 成功且只回答所选项 | 9 / 9 |

`LT-ESC-016` 的 item 2、3 首轮聚焦内容本身合格，但由于同次 initial 遗漏 item 1，整次调用被拒绝，因此不能声称它们的二轮路径已被验证。

## 非通过项

| case / 阶段 | 输出或问题 | 四维分数 | 预审结论 |
|---|---|---:|---|
| LT-ESC-001 / initial | `public accessibility` | 3 / 2 / 3 / 3 | `needs_improvement` |
| LT-ESC-009 / initial | 虚构三个 `sourceZh`，并重译已有英文框架 | 3 / 2 / 1 / 2 | `bad_case` |
| LT-ESC-021 / initial | `default practice` | 3 / 2 / 3 / 3 | `needs_improvement` |
| LT-ESC-016 / initial item 1 | 遗漏“综合来看” | 1 / 1 / 1 / 1 | `bad_case` |
| LT-ESC-017 / selected | `the government takes the primary responsibility` | 3 / 2 / 3 / 2 | `needs_improvement` |

具体理由：

- `LT-ESC-001`：语境足以恢复公共交通含义，但搭配生硬，也容易被理解成笼统的“公共可达性”。
- `LT-ESC-009`：预期唯一顶层片段是“门槛”，模型却虚构三个中文来源并给出三个英文块，触发来源覆盖和过量帮助硬失败。
- `LT-ESC-021`：能够理解为惯常做法，但用于学生逐渐形成的日常行为时有明显翻译腔。
- `LT-ESC-016`：完全遗漏“综合来看”，用户未获得该连接功能块的帮助。
- `LT-ESC-017 selected`：核心语义正确，但 `take the primary responsibility` 不够自然；同时无法轻量接到已有 `One practical arrangement is to ...` 框架，需要改为 `is to have the government take...`、`is for the government to take...` 或重构句子。

## 分歧裁决

两位专项审核者将 `LT-ESC-017 / selected` 判为 `needs_improvement`，总审初判为 `pass`。总审收到这一条的事实理由后独立复议，确认它超过允许的轻量安装调整，并将结论修正为 `needs_improvement`。其余非通过项没有结论分歧。

## 维度分布

| 维度 | 1 分 | 2 分 | 3 分 |
|---|---:|---:|---:|
| semantic_fidelity | 1 | 0 | 33 |
| scaffold_quality | 1 | 4 | 29 |
| assistance_calibration | 2 | 0 | 32 |
| user_continuability | 1 | 2 | 31 |

## 版本说明

- v3 已由 `freeze-manifest.json` 固定并被 runner 记录为 `evalSetStatus=frozen`。
- 冻结后的 `cases.md` 内仍残留 `状态：draft`，属于 v3 元数据瑕疵；不回改冻结文件。后续若修改 canonical files，应创建新 eval set 版本。
- v3 与 v2 的任务定义和路由不同，不能把本结果写成相对 v2 的效果提升。
- 当前全部样本仍以 AI 初拟样本为主，离线结果不能外推为真实用户效果。
