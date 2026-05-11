import { containsChinese } from "@/lib/sentence";
import { normalizeEnhancementResult } from "../normalize";
import type { EnhanceLatestSentenceInput, EnhanceLatestSentenceResult } from "../types";

type Replacement = {
  before: string;
  after: string;
  type:
    | "expression_translation"
    | "grammar"
    | "word_order"
    | "collocation"
    | "tone"
    | "coherence"
    | "polishing";
  reason: string;
};

const REPLACEMENTS: Replacement[] = [
  {
    before: "影响年轻人的价值观",
    after: "affects young people's values",
    type: "expression_translation",
    reason: "将中文表达转换为自然英文。",
  },
  {
    before: "提高学习效率",
    after: "improve learning efficiency",
    type: "expression_translation",
    reason: "将中文短语转换为常见英文搭配。",
  },
  {
    before: "使用社交媒体",
    after: "use social media",
    type: "expression_translation",
    reason: "将中文动词短语转换为自然英文。",
  },
  {
    before: "培养解决问题的能力",
    after: "develop problem-solving skills",
    type: "expression_translation",
    reason: "将中文表达转换为简洁自然的英文搭配。",
  },
  {
    before: "加剧青少年的焦虑",
    after: "intensifies teenagers' anxiety",
    type: "expression_translation",
    reason: "将中文表达转换为自然英文谓语结构。",
  },
  {
    before: "获取更多信息",
    after: "access more information",
    type: "expression_translation",
    reason: "将中文表达转换为自然英文搭配。",
  },
  {
    before: "Many student believe",
    after: "Many students believe",
    type: "grammar",
    reason: "Many 后面应使用复数名词 students。",
  },
  {
    before: "and make them",
    after: "and makes them",
    type: "grammar",
    reason: "主语 Social media 是单数概念，谓语需要第三人称单数形式。",
  },
  {
    before: "pay more attention on",
    after: "pay more attention to",
    type: "collocation",
    reason: "pay attention 的固定搭配通常使用介词 to。",
  },
  {
    before: "learn knowledge",
    after: "acquire knowledge",
    type: "collocation",
    reason: "acquire knowledge 比 learn knowledge 更自然。",
  },
  {
    before: "It also help people",
    after: "It also helps people",
    type: "grammar",
    reason: "主语 It 是第三人称单数，动词应使用 helps。",
  },
];

export async function enhanceWithMockProvider(
  input: EnhanceLatestSentenceInput,
): Promise<EnhanceLatestSentenceResult> {
  let finalSentence = input.latestSentence;
  const used: Replacement[] = [];

  for (const replacement of REPLACEMENTS) {
    if (finalSentence.includes(replacement.before)) {
      finalSentence = finalSentence.split(replacement.before).join(replacement.after);
      used.push(replacement);
    }
  }

  const result: EnhanceLatestSentenceResult = {
    taskType: containsChinese(input.latestSentence)
      ? "mixed_sentence_enhancement"
      : "english_sentence_polishing",
    originalSentence: input.latestSentence,
    finalSentence,
    hasChinese: containsChinese(input.latestSentence),
    insertedExpressions: used
      .filter((item) => item.type === "expression_translation")
      .map((item) => ({ before: item.before, after: item.after })),
    hasCorrection: finalSentence !== input.latestSentence,
    corrections: used.map((item) => ({
      before: item.before,
      after: item.after,
      type: item.type,
      reason: item.reason,
    })),
    coherenceRisk: { hasRisk: false, message: "未发现明显连贯性风险。" },
    learningItems: used.slice(0, 3).map((item) => ({
      type: item.type === "collocation" ? "collocation" : "phrase",
      content: item.after,
      chineseMeaning: item.before,
      usageNote: item.reason,
    })),
  };

  return normalizeEnhancementResult(result, input.latestSentence);
}
