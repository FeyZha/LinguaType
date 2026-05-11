import { z } from "zod";

export const writingModeSchema = z.enum(["natural", "ielts", "academic", "business", "concise"]);
export type WritingMode = z.infer<typeof writingModeSchema>;

export const correctionTypeSchema = z.enum([
  "expression_translation",
  "grammar",
  "word_order",
  "collocation",
  "tone",
  "coherence",
  "polishing",
]);

export const learningItemTypeSchema = z.enum(["phrase", "collocation", "sentence_pattern"]);

export const learningItemSchema = z.object({
  type: learningItemTypeSchema,
  content: z.string(),
  chineseMeaning: z.string(),
  usageNote: z.string(),
});
export type LearningItem = z.infer<typeof learningItemSchema>;

export const enhancementResultSchema = z.object({
  taskType: z.enum(["mixed_sentence_enhancement", "english_sentence_polishing"]),
  originalSentence: z.string(),
  finalSentence: z.string(),
  hasChinese: z.boolean(),
  insertedExpressions: z.array(
    z.object({
      before: z.string(),
      after: z.string(),
    }),
  ),
  hasCorrection: z.boolean(),
  corrections: z.array(
    z.object({
      before: z.string(),
      after: z.string(),
      type: correctionTypeSchema,
      reason: z.string(),
    }),
  ),
  coherenceRisk: z.object({
    hasRisk: z.boolean(),
    message: z.string(),
  }),
  learningItems: z.array(learningItemSchema),
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
  apiConfig: apiConfigSchema,
});
export type EnhanceLatestSentenceInput = z.infer<typeof enhanceRequestSchema>;

export const learningHistoryItemSchema = learningItemSchema.extend({
  id: z.string(),
  sourceSentence: z.string(),
  writingMode: writingModeSchema,
  createdAt: z.string(),
  useCount: z.number().int().nonnegative(),
});
export type LearningHistoryItem = z.infer<typeof learningHistoryItemSchema>;
