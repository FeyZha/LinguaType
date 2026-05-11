import { describe, expect, it } from "vitest";
import { enhanceWithMockProvider } from "./mock";
import type { EnhanceLatestSentenceInput } from "../types";

function input(latestSentence: string): EnhanceLatestSentenceInput {
  return {
    fullText: latestSentence,
    latestSentence,
    previousContext: "",
    currentParagraph: latestSentence,
    writingMode: "natural",
    apiConfig: {
      provider: "mock",
      baseUrl: "",
      endpointPath: "/v1/chat/completions",
      apiKey: "",
      model: "",
      temperature: 0.2,
      maxTokens: 900,
      supportsJsonMode: false,
      mockMode: true,
    },
  };
}

describe("mock provider", () => {
  it("converts Chinese and fixes grammar deterministically", async () => {
    const result = await enhanceWithMockProvider(
      input("Social media 影响年轻人的价值观 and make them more likely to compare themselves with others."),
    );
    expect(result.finalSentence).toBe(
      "Social media affects young people's values and makes them more likely to compare themselves with others.",
    );
    expect(result.taskType).toBe("mixed_sentence_enhancement");
    expect(result.hasChinese).toBe(true);
  });

  it("lightly polishes pure English without forcing a rewrite", async () => {
    const result = await enhanceWithMockProvider(input("Online learning is convenient."));
    expect(result.finalSentence).toBe("Online learning is convenient.");
    expect(result.taskType).toBe("english_sentence_polishing");
    expect(result.hasCorrection).toBe(false);
  });
});
