import { z } from "zod";

export const writingModeSchema = z.enum(["natural", "ielts", "academic", "business", "concise"]);
export type WritingMode = z.infer<typeof writingModeSchema>;

export const enhancementLevelSchema = z.enum(["minimal", "balanced", "polished"]);
export type EnhancementLevel = z.infer<typeof enhancementLevelSchema>;

export const correctionTypeSchema = z.enum([
  "expression_translation",
  "grammar",
  "word_order",
  "collocation",
  "tone",
  "coherence",
  "polishing",
]);
export type CorrectionType = z.infer<typeof correctionTypeSchema>;

export const correctionEventTypeSchema = z.enum([
  "singular_plural",
  "tense",
  "article",
  "word_order",
  "collocation",
  "preposition",
  "repetition",
  "tone",
  "chinese_transfer",
  "coherence",
  "polishing",
  "other",
]);
export type CorrectionEventType = z.infer<typeof correctionEventTypeSchema>;

export const learningItemTypeSchema = z.enum(["phrase", "collocation", "sentence_pattern"]);
export type LearningItemType = z.infer<typeof learningItemTypeSchema>;

export const selectionExpressionTypeSchema = z.enum([
  "word",
  "phrase",
  "collocation",
  "sentence_pattern",
  "sentence",
]);
export type SelectionExpressionType = z.infer<typeof selectionExpressionTypeSchema>;

export const taskTypeSchema = z.enum([
  "mixed_chinese_rewrite",
  "english_polish",
  "unchanged",
  "mixed_sentence_enhancement",
  "english_sentence_polishing",
]);
export type TaskType = z.infer<typeof taskTypeSchema>;

export const learningItemDraftSchema = z.object({
  type: learningItemTypeSchema,
  content: z.string(),
  chineseMeaning: z.string(),
  usageNote: z.string(),
  tags: z.array(z.string()).optional(),
  topic: z.string().optional(),
});
export type LearningItemDraft = z.infer<typeof learningItemDraftSchema>;

export const learningItemSchema = learningItemDraftSchema.extend({
  id: z.string(),
  sourceSentence: z.string(),
  writingMode: writingModeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedAt: z.string().optional(),
  useCount: z.number().int().nonnegative(),
  favorite: z.boolean(),
  tags: z.array(z.string()),
  topic: z.string().optional(),
});
export type LearningItem = z.infer<typeof learningItemSchema>;
export type LearningHistoryItem = LearningItem;

export const correctionDraftSchema = z.object({
  before: z.string(),
  after: z.string(),
  type: correctionTypeSchema,
  reason: z.string(),
});
export type CorrectionDraft = z.infer<typeof correctionDraftSchema>;

export const correctionMemorySchema = correctionDraftSchema.extend({
  id: z.string(),
  sourceSentence: z.string(),
  writingMode: writingModeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedAt: z.string().optional(),
  useCount: z.number().int().nonnegative(),
});
export type CorrectionMemory = z.infer<typeof correctionMemorySchema>;

export const enhancementResultSchema = z.object({
  taskType: taskTypeSchema,
  originalSentence: z.string(),
  finalSentence: z.string(),
  explanationZh: z.string().optional(),
  hasChinese: z.boolean(),
  insertedExpressions: z.array(
    z.object({
      before: z.string(),
      after: z.string(),
    }),
  ),
  hasCorrection: z.boolean(),
  corrections: z.array(correctionDraftSchema),
  coherenceRisk: z.object({
    hasRisk: z.boolean(),
    message: z.string(),
  }),
  learningItems: z.array(learningItemDraftSchema),
});
export type EnhanceLatestSentenceResult = z.infer<typeof enhancementResultSchema>;

export const apiConfigSchema = z.object({
  provider: z.string().default("openai-compatible"),
  baseUrl: z.string().optional().default(""),
  endpointPath: z.string().optional().default("/v1/chat/completions"),
  apiKey: z.string().optional().default(""),
  model: z.string().optional().default(""),
  temperature: z.number().min(0).max(2).optional().default(0.2),
  maxTokens: z.number().int().positive().optional().default(900),
  supportsJsonMode: z.boolean().optional().default(false),
  mockMode: z.boolean().optional().default(false),
});
export type ApiConfig = z.infer<typeof apiConfigSchema>;

export const enhanceRequestSchema = z.object({
  fullText: z.string(),
  latestSentence: z.string(),
  previousContext: z.string(),
  currentParagraph: z.string(),
  writingMode: writingModeSchema,
  enhancementLevel: enhancementLevelSchema.default("balanced"),
  apiConfig: apiConfigSchema,
});
export type EnhanceLatestSentenceInput = z.infer<typeof enhanceRequestSchema>;

export const fastEnhanceRequestSchema = enhanceRequestSchema;
export type FastEnhanceInput = z.infer<typeof fastEnhanceRequestSchema>;

export const fastEnhanceResultSchema = z.object({
  originalSentence: z.string().optional().default(""),
  finalSentence: z.string(),
  explanationZh: z.string().optional().default(""),
  taskType: z.enum(["mixed_chinese_rewrite", "english_polish", "unchanged"]).optional().default("english_polish"),
  hasChinese: z.boolean().optional().default(false),
});
export type FastEnhanceResult = z.infer<typeof fastEnhanceResultSchema>;

export const fastEnhanceModelResultSchema = z.object({
  originalSentence: z.string().optional(),
  finalSentence: z.string(),
  explanationZh: z.string().optional().default(""),
  taskType: z.string().optional(),
  hasChinese: z.boolean().optional(),
});
export type FastEnhanceModelResult = z.infer<typeof fastEnhanceModelResultSchema>;

export const correctionEventDraftSchema = z.object({
  before: z.string(),
  after: z.string(),
  type: correctionEventTypeSchema,
  reason: z.string(),
});
export type CorrectionEventDraft = z.infer<typeof correctionEventDraftSchema>;

export const correctionEventSchema = correctionEventDraftSchema.extend({
  id: z.string(),
  sourceSentence: z.string(),
  writingMode: writingModeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  lastUsedAt: z.string().optional(),
  useCount: z.number().int().nonnegative(),
});
export type CorrectionEvent = z.infer<typeof correctionEventSchema>;

export const learningExtractionRequestSchema = z.object({
  originalSentence: z.string(),
  finalSentence: z.string(),
  explanationZh: z.string().optional(),
  writingMode: writingModeSchema,
  enhancementLevel: enhancementLevelSchema,
  fullText: z.string().optional(),
  currentParagraph: z.string().optional(),
  apiConfig: apiConfigSchema,
});
export type LearningExtractionInput = z.infer<typeof learningExtractionRequestSchema>;

export const learningExtractionResultSchema = z.object({
  learningItems: z.array(learningItemDraftSchema),
  correctionEvents: z.array(correctionEventDraftSchema),
});
export type LearningExtractionResult = z.infer<typeof learningExtractionResultSchema>;

export const writingHabitInsightSchema = z.object({
  id: z.string(),
  type: correctionEventTypeSchema,
  titleZh: z.string(),
  summaryZh: z.string(),
  count: z.number().int().nonnegative(),
  severity: z.enum(["low", "medium", "high"]),
  examples: z.array(
    z.object({
      before: z.string(),
      after: z.string(),
      reason: z.string(),
      sourceSentence: z.string(),
    }),
  ),
  suggestionZh: z.string(),
  updatedAt: z.string(),
});
export type WritingHabitInsight = z.infer<typeof writingHabitInsightSchema>;

export const paragraphIssueTypeSchema = z.enum([
  "repetition",
  "transition",
  "pronoun_reference",
  "logic_gap",
  "sentence_order",
  "tone_consistency",
  "weak_development",
]);
export type ParagraphIssueType = z.infer<typeof paragraphIssueTypeSchema>;

export const paragraphIssueSchema = z.object({
  type: paragraphIssueTypeSchema,
  original: z.string(),
  suggestion: z.string(),
  reason: z.string(),
});
export type ParagraphIssue = z.infer<typeof paragraphIssueSchema>;

export const paragraphCheckResultSchema = z.object({
  originalParagraph: z.string(),
  revisedParagraph: z.string(),
  hasIssues: z.boolean(),
  issues: z.array(paragraphIssueSchema),
  summary: z.string(),
});
export type ParagraphCheckResult = z.infer<typeof paragraphCheckResultSchema>;

export const paragraphCheckRequestSchema = z.object({
  fullText: z.string(),
  currentParagraph: z.string(),
  writingMode: writingModeSchema,
  apiConfig: apiConfigSchema,
});
export type ParagraphCheckInput = z.infer<typeof paragraphCheckRequestSchema>;

export const paragraphHealthResultSchema = z.object({
  paragraphFingerprint: z.string(),
  hasIssues: z.boolean(),
  issueCount: z.number().int().nonnegative(),
  issueTypes: z.array(paragraphIssueTypeSchema),
  shortSummaryZh: z.string(),
});
export type ParagraphHealthResult = z.infer<typeof paragraphHealthResultSchema>;

export const paragraphHealthRequestSchema = paragraphCheckRequestSchema;
export type ParagraphHealthInput = z.infer<typeof paragraphHealthRequestSchema>;

export const paragraphHealthCacheItemSchema = z.object({
  paragraphFingerprint: z.string(),
  result: paragraphHealthResultSchema,
  checkedAt: z.string(),
});
export type ParagraphHealthCacheItem = z.infer<typeof paragraphHealthCacheItemSchema>;

export const selectionExplainRequestSchema = z.object({
  selectedText: z.string(),
  fullText: z.string(),
  currentParagraph: z.string(),
  writingMode: writingModeSchema,
  apiConfig: apiConfigSchema,
});
export type SelectionExplainInput = z.infer<typeof selectionExplainRequestSchema>;

export const selectionExplainResultSchema = z.object({
  selectedText: z.string(),
  meaningZh: z.string(),
  usageNoteZh: z.string(),
  contextRoleZh: z.string().optional(),
  structureNotesZh: z.string().optional(),
  expressionType: selectionExpressionTypeSchema,
});
export type SelectionExplainResult = z.infer<typeof selectionExplainResultSchema>;

export const outlineCheckRequestSchema = z.object({
  essayTopic: z.string(),
  topicArea: z.string(),
  outlinePoints: z.array(z.string()).min(1),
  writingMode: writingModeSchema,
  apiConfig: apiConfigSchema,
});
export type OutlineCheckInput = z.infer<typeof outlineCheckRequestSchema>;

export const outlineCheckResultSchema = z.object({
  hasIssues: z.boolean(),
  suggestionsZh: z.array(z.string()),
});
export type OutlineCheckResult = z.infer<typeof outlineCheckResultSchema>;
