import { describe, expect, it } from "vitest";
import { enhanceLatestSentenceWithLLM } from "./service";
import type { EnhanceLatestSentenceInput } from "./types";

describe("enhanceLatestSentenceWithLLM", () => {
  it("uses mock mode without requiring real API settings", async () => {
    const input: EnhanceLatestSentenceInput = {
      fullText: "Many student believe that AI tools can 提高学习效率.",
      latestSentence: "Many student believe that AI tools can 提高学习效率.",
      previousContext: "",
      currentParagraph: "Many student believe that AI tools can 提高学习效率.",
      writingMode: "natural",
      apiConfig: {
        provider: "openai-compatible",
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

    const result = await enhanceLatestSentenceWithLLM(input, input.apiConfig);
    expect(result.finalSentence).toBe("Many students believe that AI tools can improve learning efficiency.");
  });
});
