# 样本字段与数据边界

本文件只定义样本字段、分类枚举和各阶段数据边界，不保存模型输出、评分或失败结论。

## 样本字段

| 字段 | 用途 |
|---|---|
| `case_id` | 跨版本保持稳定的样本编号 |
| `case_type` | 保留现有的常规、语境依赖、复杂混写和边界分组 |
| `source_type` | 区分真实片段、重建上下文和 AI 初拟样本，并保留静态复审状态 |
| `task_prompt` | IELTS Task 2 题目 |
| `full_essay` | 用户触发处理时的全文快照 |
| `target_sentence` | 本次只处理的中英混合句 |
| `segments` | 目标句中按原文顺序排列的中文片段及金标元数据 |
| `must_not_add` | 当前样本最容易被擅自补入、但原文没有表达的内容 |

每个 `segments` 项包含：

```yaml
source_zh: 缓解学生的经济压力
intent_zh: 减轻学生因学费或生活支出承受的财务压力。
slot_function: predicate
span_scope: word_or_phrase
```

## source_type

| 值 | 含义 |
|---|---|
| `real_fragment_reconstructed_context` | 中文卡点来自真实经历，但题目和全文语境由 AI 重建 |
| `ai_draft_static_reviewed` | 样本源自 AI 初拟，并已完成逐条静态复审；它仍不是真实用户数据 |

`source_type` 只记录样本来源与审核状态，不代表模型已通过该样本，也不代表样本来自真实用户。

## slot_function

表示中文片段在完整 `target_sentence` 中承担的外部功能，而不是中文片段内部包含什么词。

| 值 | 含义 | 示例位置 |
|---|---|---|
| `subject` | 充当句子或分句主语 | `公共交通投资` can improve mobility |
| `predicate` | 提供动作、状态或判断 | may `缓解经济压力` |
| `object` | 充当动词或介词的对象、内容 | improve `公众可达性` |
| `complement` | 补全动词、形容词、名词或系动结构所需要表达的内容 | become `进入大学的障碍`; the argument that `只增加警力无法解决根因` |
| `noun_modifier` | 限定或描述名词，但不充当该名词的内容补语 | a `由政府资助的` programme |
| `adverbial_modifier` | 修饰动作或整句，表达时间、条件、原因、让步、程度等 | `尽管初期成本较高`, the policy... |
| `linker` | 只表达句间逻辑关系，不包含核心命题 | `因此`, governments... |
| `main_clause` | 提供一个不受其他成分支配的完整核心判断 | ..., but `低收入家庭仍会承受更大压力` |

### 分类规则

1. 按中文片段在整个 `target_sentence` 中的外部功能分类。
2. `Research shows that 中文` 中的完整分句仍标为 `object`。
3. `because / although / if + 中文` 中的分句标为 `adverbial_modifier`。
4. 只有中文本身构成核心断言，且不是嵌入或从属成分时，才标为 `main_clause`。
5. `linker` 只用于“然而、因此、相比之下”等连接成分。
6. “并不一定”等立场或否定表达按实际位置归入 `adverbial_modifier`，不另外增加先验标签。
7. `the argument / claim / fact that 中文` 中说明名词具体内容的分句标为 `complement`；普通限定或描述名词的成分才标为 `noun_modifier`。

## span_scope

表示单个中文片段自身的结构大小。

| 值 | 含义 |
|---|---|
| `word_or_phrase` | 不包含完整主谓命题的词或短语 |
| `clause` | 包含一个完整命题 |
| `multi_clause` | 单个中文片段包含两个及以上命题 |

每个中文片段必须且只能填写一个 `slot_function` 和一个 `span_scope`。

## 冻结规则

- 当前冻结版本由 `freeze-manifest.json` 中的 `eval_set_id` 和 SHA-256 指纹共同识别。
- 冻结后不得直接修改 `cases.md`、`case-schema.md`、`model-output.md`、`rubric.md` 或 `scoring.md`。
- 任一冻结文件需要修改时，必须创建新的 `eval_set_id` 和 manifest；已产生的 run 继续引用原版本。
- 模型输出、Judge 评分、人工复核和 bad case 只写入 `runs/<run_id>/`，不得回写样本本体。

## 数据边界

| 阶段 | 可以使用的数据 |
|---|---|
| 被测模型输入 | `task_prompt`、`full_essay`、`target_sentence` |
| 语义金标 | `segments.source_zh`、`segments.intent_zh`、`must_not_add` |
| 首轮 LLM Judge | 被测模型输入、语义金标、`system_output` 和统一 rubric |
| 样本覆盖与实验后切片 | `case_id`、`case_type`、`source_type`、`slot_function`、`span_scope` |
| 实验结果 | 模型输出、各维度分数、事实性人工说明，以及实际产生后的失败记录 |

首轮 Judge 不读取 `slot_function` 和 `span_scope`。评分完成后，再通过 `case_id` 合并这两个字段进行分组统计。

样本标签只描述已知事实；失败归因只能来自实际实验结果。
