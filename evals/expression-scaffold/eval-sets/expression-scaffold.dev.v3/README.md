# expression-scaffold.dev.v3

状态：`frozen`。冻结日期：2026-08-24。本版本只修正经 v2 人工校准确认的评测定义问题，不把旧数字迁移成新版本结论。

## 相对 v2 的两个变化

1. 聚焦项从“必须是连续原文”改为“必须是可追溯的最小中文语义单元”。允许轻量语义归纳，但不得新增信息、改变立场、关系或范围。
2. 第二阶段不再使用冻结文字探针。runner 必须从本次 initial 实际返回的 `focusOptionsZh` 中按固定策略选择，因此 selected-focus 是真实可达路径。

## 链路

```text
20 个 case initial
→ 对每个实际 request_focus item 选择 focusOptionsZh[0]
→ 以该真实选项运行 selected_focus
```

选择第一个选项不是对真实用户偏好的模拟，只是可复现的离线轨迹策略。它能证明本次两阶段链路可达，不能证明用户会选择该项。

## 当前文件

| 文件 | 作用 |
|---|---|
| `cases.md` | 25 个顶层片段的 v3 路由与参考语义单元 |
| `case-schema.md` | 样本、运行轨迹和选择来源字段 |
| `model-output.md` | 两阶段输出契约 |
| `model-output.schema.json` | 基础结构化输出 schema |
| `rubric.md` | 四维人工 / Codex 审核标准 |
| `scoring.md` | 实际路径汇总、校准和版本边界 |
| `validate-v3.mjs` | 静态契约检查 |

冻结入口为 `freeze-manifest.json`。Prompt 仍是独立实验变量，不纳入 eval-set 冻结指纹。

## 首次 baseline

运行 `baseline-v3-20260824-longcat-2.0-actual-path-structured`：20 次 initial 中 18 次结构可用、2 次协议失败；有效 initial 实际产生 9 次 selected-focus，9 次均完成。三个隔离 Codex 子 Agent 预审 34 个 item/阶段为 29 pass、3 needs improvement、2 bad case，当前等待用户校准。

冻结后的 `cases.md` 内仍残留 `状态：draft`。这是 v3 的元数据瑕疵；为保持冻结完整性不回改 canonical 文件，后续若需要修正应创建新版本。
