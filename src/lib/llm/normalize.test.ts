import { describe, expect, it } from "vitest";
import { normalizeEnhancementResult } from "./normalize";
import type { EnhanceLatestSentenceResult } from "./types";

const baseResult: EnhanceLatestSentenceResult = {
  taskType: "english_polish",
  originalSentence: "Social media 影响年轻人的价值观.",
  finalSentence: "Social media affects young people's values.",
  hasChinese: false,
  insertedExpressions: [],
  hasCorrection: true,
  corrections: [],
  coherenceRisk: { hasRisk: false, message: "" },
  learningItems: [],
};

describe("enhancement result normalization", () => {
  it("overrides hasChinese and taskType based on latestSentence", () => {
    const result = normalizeEnhancementResult(baseResult, "Social media 影响年轻人的价值观.");
    expect(result.hasChinese).toBe(true);
    expect(result.taskType).toBe("mixed_chinese_rewrite");
  });

  it("allows unchanged pure English polishing", () => {
    const result = normalizeEnhancementResult(
      {
        ...baseResult,
        originalSentence: "Online learning is convenient.",
        finalSentence: "Online learning is convenient.",
      },
      "Online learning is convenient.",
    );
    expect(result.hasChinese).toBe(false);
    expect(result.taskType).toBe("unchanged");
    expect(result.finalSentence).toBe("Online learning is convenient.");
  });
});
