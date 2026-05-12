import { describe, expect, it } from "vitest";
import { enhanceLatestSentenceWithLLM, explainSelectionWithLLM } from "./service";
import type { EnhanceLatestSentenceInput, SelectionExplainInput } from "./types";

describe("enhanceLatestSentenceWithLLM", () => {
  it("uses mock mode without requiring real API settings", async () => {
    const input: EnhanceLatestSentenceInput = {
      fullText: "Many student believe that AI tools can 提高学习效率.",
      latestSentence: "Many student believe that AI tools can 提高学习效率.",
      previousContext: "",
      currentParagraph: "Many student believe that AI tools can 提高学习效率.",
      writingMode: "natural",
      enhancementLevel: "balanced",
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

describe("explainSelectionWithLLM", () => {
  it("uses mock mode for non-mutating selected text explanation", async () => {
    const apiConfig = {
      provider: "openai-compatible",
      baseUrl: "",
      endpointPath: "/v1/chat/completions",
      apiKey: "",
      model: "",
      temperature: 0.2,
      maxTokens: 900,
      supportsJsonMode: false,
      mockMode: true,
    };
    const input: SelectionExplainInput = {
      selectedText: "pay attention to",
      fullText: "Parents should pay attention to children.",
      currentParagraph: "Parents should pay attention to children.",
      writingMode: "natural",
      apiConfig,
    };

    const result = await explainSelectionWithLLM(input, apiConfig);
    expect(result.selectedText).toBe("pay attention to");
    expect(result.expressionType).toBe("collocation");
  });
});
