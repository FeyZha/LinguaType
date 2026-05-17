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
  difficultyLevel: z.number().int().min(1).max(5).optional(),
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
  useServerApiKey: z.boolean().optional(),
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

export const paragraphDetailIssueTypeSchema = z.enum([
  "grammar",
  "spelling",
  "punctuation",
  "article",
  "tense",
  "word_form",
  "preposition",
  "collocation",
  "spacing",
]);
export type ParagraphDetailIssueType = z.infer<typeof paragraphDetailIssueTypeSchema>;

export const paragraphDetailIssueSchema = z.object({
  type: paragraphDetailIssueTypeSchema,
  original: z.string(),
  suggestion: z.string(),
  reason: z.string(),
});
export type ParagraphDetailIssue = z.infer<typeof paragraphDetailIssueSchema>;

export const paragraphCheckResultSchema = z.object({
  originalParagraph: z.string(),
  revisedParagraph: z.string(),
  hasIssues: z.boolean(),
  issues: z.array(paragraphIssueSchema),
  detailIssues: z.array(paragraphDetailIssueSchema).optional().default([]),
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

export const documentMapParagraphRangeSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
}).strict();
export type DocumentMapParagraphRange = z.infer<typeof documentMapParagraphRangeSchema>;

export const documentMapParagraphInputSchema = z.object({
  paragraphId: z.string().min(1),
  index: z.number().int().positive(),
  range: documentMapParagraphRangeSchema,
  text: z.string(),
  hash: z.string().optional(),
  wordCount: z.number().nonnegative().int().optional(),
}).strict();
export type DocumentMapParagraphInput = z.infer<typeof documentMapParagraphInputSchema>;

export const documentMapParagraphFingerprintSchema = z.object({
  paragraphId: z.string().min(1),
  range: documentMapParagraphRangeSchema,
  hash: z.string(),
  wordCount: z.number().int().nonnegative(),
}).strict();
export type DocumentMapParagraphFingerprint = z.infer<typeof documentMapParagraphFingerprintSchema>;

export const documentMapParagraphStatusSchema = z.enum([
  "healthy",
  "has_suggestions",
  "needs_attention",
  "weak_connection",
  "repeated",
  "insufficient_response",
]);
export type DocumentMapParagraphStatus = z.infer<typeof documentMapParagraphStatusSchema>;

export const documentMapIssueTypeSchema = z.enum([
  "main_idea_drift",
  "repetition",
  "jump",
  "weak_transition",
  "unclear_progression",
  "insufficient_topic_response",
]);
export type DocumentMapIssueType = z.infer<typeof documentMapIssueTypeSchema>;

export const documentMapIssueSeveritySchema = z.enum(["low", "medium", "high"]);
export type DocumentMapIssueSeverity = z.infer<typeof documentMapIssueSeveritySchema>;

export const documentMapParagraphSchema = z.object({
  paragraphId: z.string().min(1),
  index: z.number().int().positive(),
  range: documentMapParagraphRangeSchema,
  roleZh: z.string(),
  mainPointZh: z.string(),
  status: documentMapParagraphStatusSchema,
  healthSummaryZh: z.string(),
  relationToPreviousZh: z.string().nullable().optional().default(null),
  issueRefs: z.array(z.string()).optional().default([]),
}).strict();
export type DocumentMapParagraph = z.infer<typeof documentMapParagraphSchema>;

export const documentMapGlobalIssueSchema = z.object({
  id: z.string().min(1),
  type: documentMapIssueTypeSchema,
  severity: documentMapIssueSeveritySchema,
  titleZh: z.string(),
  paragraphIds: z.array(z.string()),
  explanationZh: z.string(),
  suggestionZh: z.string(),
}).strict();
export type DocumentMapGlobalIssue = z.infer<typeof documentMapGlobalIssueSchema>;

export const documentMapNextActionSchema = z.object({
  targetParagraphIds: z.array(z.string()),
  actionZh: z.string(),
}).strict();
export type DocumentMapNextAction = z.infer<typeof documentMapNextActionSchema>;

export const documentMapResultSchema = z.object({
  overallMainIdeaZh: z.string(),
  structureSummaryZh: z.string(),
  paragraphs: z.array(documentMapParagraphSchema),
  globalIssues: z.array(documentMapGlobalIssueSchema),
  nextActions: z.array(documentMapNextActionSchema),
}).strict();
export type DocumentMapResult = z.infer<typeof documentMapResultSchema>;

export const documentMapRequestSchema = z.object({
  text: z.string(),
  essayTopic: z.string().optional().default(""),
  outlinePoints: z.array(z.string()).optional().default([]),
  domain: z.string().optional().default("custom"),
  writingMode: writingModeSchema,
  paragraphs: z.array(documentMapParagraphInputSchema).min(2),
  trigger: z.enum(["manual", "auto_idle", "after_apply", "after_outline_change"]).default("manual"),
  apiConfig: apiConfigSchema,
});
export type DocumentMapInput = z.infer<typeof documentMapRequestSchema>;

export const documentMapFreshnessSchema = z.enum([
  "empty",
  "fresh",
  "stale",
  "needs_check",
  "checking",
  "ready",
  "failed",
]);
export type DocumentMapFreshness = z.infer<typeof documentMapFreshnessSchema>;

export const documentMapCacheRecordSchema = z.object({
  cacheKey: z.string().min(1),
  archiveId: z.string().nullable(),
  textHash: z.string().min(1),
  essayTopic: z.string(),
  essayTopicHash: z.string().optional(),
  outlinePointsHash: z.string().optional(),
  outlineHash: z.string().optional(),
  paragraphFingerprints: z.array(documentMapParagraphFingerprintSchema).default([]),
  domain: z.string(),
  model: z.string(),
  createdAt: z.string(),
  generatedAt: z.string().optional(),
  freshness: documentMapFreshnessSchema.default("ready"),
  lastAutoCheckedAt: z.string().optional(),
  autoCheckCountInSession: z.number().int().nonnegative().default(0),
  result: documentMapResultSchema,
}).strict();
export type DocumentMapCacheRecord = z.infer<typeof documentMapCacheRecordSchema>;

export const writingDomainSchema = z.enum([
  "technology",
  "personal_growth",
  "history",
  "art",
  "education",
  "society",
  "environment",
  "business",
  "custom",
]);
export type WritingDomain = z.infer<typeof writingDomainSchema>;

export const classifyWritingDomainRequestSchema = z.object({
  title: z.string(),
  fullText: z.string(),
  outlinePoints: z.array(z.string()).optional().default([]),
  allowedDomains: z.array(writingDomainSchema),
  apiConfig: apiConfigSchema,
});
export type ClassifyWritingDomainInput = z.infer<typeof classifyWritingDomainRequestSchema>;

export const classifyWritingDomainResultSchema = z.object({
  topicArea: writingDomainSchema,
  confidence: z.number().min(0).max(1).optional().default(0.5),
});
export type ClassifyWritingDomainResult = z.infer<typeof classifyWritingDomainResultSchema>;
