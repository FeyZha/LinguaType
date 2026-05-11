import { containsChinese } from "@/lib/sentence";
import type { EnhanceLatestSentenceResult } from "./types";

export function normalizeEnhancementResult(
  result: EnhanceLatestSentenceResult,
  latestSentence: string,
): EnhanceLatestSentenceResult {
  const hasChinese = containsChinese(latestSentence);
  return {
    ...result,
    originalSentence: latestSentence,
    hasChinese,
    taskType: hasChinese ? "mixed_sentence_enhancement" : "english_sentence_polishing",
    hasCorrection: result.finalSentence !== latestSentence || result.corrections.length > 0,
  };
}
