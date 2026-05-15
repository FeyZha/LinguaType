import { containsChinese } from "@/lib/sentence";
import {
  createParagraphFingerprint,
  normalizeEnhancementResult,
  normalizeFastEnhanceResult,
  normalizeLearningExtractionResult,
  normalizeOutlineCheckResult,
  normalizeParagraphCheckResult,
  normalizeParagraphHealthResult,
  normalizeSelectionExplainResult,
  normalizeWritingDomainResult,
} from "../normalize";
import type {
  ClassifyWritingDomainInput,
  ClassifyWritingDomainResult,
  CorrectionDraft,
  CorrectionEventDraft,
  EnhanceLatestSentenceInput,
  EnhanceLatestSentenceResult,
  FastEnhanceInput,
  FastEnhanceResult,
  LearningExtractionInput,
  LearningExtractionResult,
  OutlineCheckInput,
  OutlineCheckResult,
  ParagraphCheckInput,
  ParagraphCheckResult,
  ParagraphHealthInput,
  ParagraphHealthResult,
  SelectionExplainInput,
  SelectionExplainResult,
} from "../types";

type Replacement = CorrectionDraft;

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
    before: "鎻愰珮瀛︿範鏁堢巼",
    after: "improve learning efficiency",
    type: "expression_translation",
    reason: "Convert the Chinese phrase into natural English.",
  },
  {
    before: "閹绘劙鐝€涳缚绡勯弫鍫㈠芳",
    after: "improve learning efficiency",
    type: "expression_translation",
    reason: "Convert the Chinese phrase into natural English.",
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

export async function enhanceFastWithMockProvider(input: FastEnhanceInput): Promise<FastEnhanceResult> {
  let finalSentence = input.latestSentence;

  for (const replacement of REPLACEMENTS) {
    if (finalSentence.includes(replacement.before)) {
      finalSentence = finalSentence.split(replacement.before).join(replacement.after);
    }
  }

  return normalizeFastEnhanceResult(
    {
      taskType: containsChinese(input.latestSentence) ? "mixed_chinese_rewrite" : "english_polish",
      originalSentence: input.latestSentence,
      finalSentence,
      explanationZh: finalSentence === input.latestSentence
        ? "The sentence is already natural."
        : "Fast enhancement prepared for the latest sentence.",
      hasChinese: containsChinese(input.latestSentence),
    },
    input.latestSentence,
  );
}

export async function extractLearningWithMockProvider(
  input: LearningExtractionInput,
): Promise<LearningExtractionResult> {
  const used = REPLACEMENTS.filter(
    (replacement) =>
      input.originalSentence.includes(replacement.before) ||
      input.finalSentence.includes(replacement.after),
  );

  return normalizeLearningExtractionResult({
    learningItems: used.slice(0, 3).map((item) => ({
      type: item.type === "collocation" ? "collocation" : "phrase",
      content: item.after,
      chineseMeaning: item.before,
      usageNote: item.reason,
      difficultyLevel: item.type === "collocation" ? 3 : 2,
    })),
    correctionEvents: used.map((item) => ({
      before: item.before,
      after: item.after,
      type: mapCorrectionEventType(item),
      reason: item.reason,
    })),
  });
}

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
    taskType: containsChinese(input.latestSentence) ? "mixed_chinese_rewrite" : "english_polish",
    originalSentence: input.latestSentence,
    finalSentence,
    explanationZh: finalSentence === input.latestSentence ? "句子已经自然，无需修改。" : "已按当前增强强度修改最新一句。",
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
      difficultyLevel: item.type === "collocation" ? 3 : 2,
    })),
  };

  return normalizeEnhancementResult(result, input.latestSentence);
}

export async function checkParagraphFlowWithMockProvider(
  input: ParagraphCheckInput,
): Promise<ParagraphCheckResult> {
  if (/for example,\s*for example/iu.test(input.currentParagraph)) {
    const revisedParagraph = input.currentParagraph.replace(/For example,\s*for example,/u, "For example,");
    return normalizeParagraphCheckResult(
      {
        originalParagraph: input.currentParagraph,
        revisedParagraph,
        hasIssues: true,
        issues: [
          {
            type: "repetition",
            original: "For example, for example",
            suggestion: "For example",
            reason: "重复使用同一个举例连接表达，删去一次会更自然。",
          },
        ],
        summary: "段落整体清楚，但有重复表达。",
      },
      input.currentParagraph,
    );
  }

  return normalizeParagraphCheckResult(
    {
      originalParagraph: input.currentParagraph,
      revisedParagraph: input.currentParagraph,
      hasIssues: false,
      issues: [],
      summary: "未发现明显段落连贯问题。",
    },
    input.currentParagraph,
  );
}

export async function checkParagraphHealthWithMockProvider(
  input: ParagraphHealthInput,
): Promise<ParagraphHealthResult> {
  const hasRepetition = /for example,\s*for example/iu.test(input.currentParagraph);
  return normalizeParagraphHealthResult(
    {
      paragraphFingerprint: createParagraphFingerprint(input.currentParagraph),
      hasIssues: hasRepetition,
      issueCount: hasRepetition ? 1 : 0,
      issueTypes: hasRepetition ? ["repetition"] : [],
      shortSummaryZh: hasRepetition
        ? "The paragraph may contain repeated expression."
        : "Paragraph looks okay.",
    },
    input.currentParagraph,
  );
}

export async function checkOutlineWithMockProvider(
  input: OutlineCheckInput,
): Promise<OutlineCheckResult> {
  const points = input.outlinePoints.map((point) => point.trim()).filter(Boolean);
  const hasEmpty = points.length < 2;
  const hasUnrelated = points.some((point) => /\bunrelated\b|跑题|无关/iu.test(point));
  const hasDuplicate = new Set(points.map((point) => point.toLowerCase())).size !== points.length;

  return normalizeOutlineCheckResult({
    hasIssues: hasEmpty || hasUnrelated || hasDuplicate,
    suggestionsZh: [
      hasEmpty ? "大纲至少需要两个明确的小点，才能支撑当前主题。" : "",
      hasUnrelated ? "有大纲点和文章主题关联不够明确，建议改成直接回应主题的角度。" : "",
      hasDuplicate ? "有重复的大纲点，建议合并或换成不同论证角度。" : "",
    ],
  });
}

export async function explainSelectionWithMockProvider(
  input: SelectionExplainInput,
): Promise<SelectionExplainResult> {
  const selectedText = input.selectedText.trim();
  const expressionType = inferSelectionExpressionType(selectedText);
  return normalizeSelectionExplainResult(
    {
      selectedText,
      meaningZh: `Selected expression "${selectedText}" means a reusable English expression in this context.`,
      usageNoteZh: "Use it when the same meaning or collocation fits your own sentence.",
      contextRoleZh: "It helps carry the local meaning without rewriting the sentence.",
      expressionType,
    },
    selectedText,
  );
}

export async function classifyWritingDomainWithMockProvider(
  input: ClassifyWritingDomainInput,
): Promise<ClassifyWritingDomainResult> {
  const corpus = `${input.title} ${input.outlinePoints?.join(" ") ?? ""} ${input.fullText}`.toLowerCase();
  if (/\b(ai|software|database|technology|tech|app|algorithm|digital)\b/u.test(corpus)) {
    return normalizeWritingDomainResult({ topicArea: "technology", confidence: 0.74 });
  }
  if (/\b(student|education|school|teacher|learning|academic)\b/u.test(corpus)) {
    return normalizeWritingDomainResult({ topicArea: "education", confidence: 0.72 });
  }
  if (/\b(environment|climate|pollution|carbon|nature)\b/u.test(corpus)) {
    return normalizeWritingDomainResult({ topicArea: "environment", confidence: 0.72 });
  }
  if (/\b(company|market|business|consumer|brand)\b/u.test(corpus)) {
    return normalizeWritingDomainResult({ topicArea: "business", confidence: 0.7 });
  }
  return normalizeWritingDomainResult({ topicArea: "custom", confidence: 0.45 });
}

function mapCorrectionEventType(item: CorrectionDraft): CorrectionEventDraft["type"] {
  if (item.type === "expression_translation") {
    return "chinese_transfer";
  }
  if (
    item.type === "word_order" ||
    item.type === "collocation" ||
    item.type === "tone" ||
    item.type === "coherence" ||
    item.type === "polishing"
  ) {
    return item.type;
  }
  return "other";
}

function inferSelectionExpressionType(text: string): SelectionExplainResult["expressionType"] {
  const normalized = text.trim().toLowerCase();
  if (normalized === "acquire knowledge" || normalized === "pay attention to" || /\b(to|for|on|with)\b/u.test(normalized)) {
    return "collocation";
  }
  if (normalized.includes("...")) {
    return "sentence_pattern";
  }
  if (/[.!?]$/u.test(normalized)) {
    return "sentence";
  }
  if (normalized.split(/\s+/u).filter(Boolean).length <= 1) {
    return "word";
  }
  return "phrase";
}
