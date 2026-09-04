# v3 运行、汇总与复测

## 1. 两个检查点

| 检查点 | 来源 | 判断 |
|---|---|---|
| `initial_targeting` | 20 个原始 case | 动作、聚焦质量或直接英文支架 |
| `actual_path_support` | 本次 initial 实际 `request_focus` item | 对真实可点击选项只给一个英文支架 |

不再把冻结文字探针混入 `actual_path_support`。

## 2. 确定性选择策略

```text
对每个结构合规的 initial request_focus item
→ 选择 focusOptionsZh[0]
→ 保存 selection_source=actual_initial_output
→ 保存 selection_policy=first_focus_option
→ 运行 selected_focus
```

选择策略只用于离线复现，不代表用户偏好。实际 selected-focus 调用数由模型输出决定，必须与 initial 逐项对账。

## 3. 报告顺序

1. 20 次 initial 的调用与结构结果；
2. initial 的实际 D / R 分布及与人工路由参考的差异；
3. 真实可达 selected-focus 生成数、完成数与失败数；
4. 35 个或实际产生的 item/阶段四维分布；
5. 20 case 取最差项分布；
6. Codex 预审与用户人工覆盖；
7. 评分锁定后再合并分类切片字段。

不得用固定金标的 11 个 R 替代实际 selected-focus 数量。

四维分别报告 1 / 2 / 3 分布，不求总分：

```text
semantic_fidelity
scaffold_quality
assistance_calibration
user_continuability
```

## 4. 人机校准

- Codex 子 Agent 只读取冻结语义金标、v3 路由参考、原始输出和 rubric；不读取旧 Judge 结论。
- 人工复核所有 1 / 2 分、协议硬失败和部分全 3 项。
- 人工覆盖另存，不改写 Codex 原始评分。

## 5. 版本边界

- v3 改变了 v2 的路由与聚焦合法性，因此 v2 与 v3 不能直接写成效果提升。
- v3 首次运行建立新 baseline。
- 后续只有相同 v3 eval set、rubric、选择策略和模型参数下的单变量修改才能直接比较。
- 离线轨迹不代表真实用户点击、采纳、完成速度或 IELTS 提分。
