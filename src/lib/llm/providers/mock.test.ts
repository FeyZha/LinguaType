import { describe, expect, it } from "vitest";
import {
  checkParagraphHealthWithMockProvider,
  enhanceFastWithMockProvider,
  enhanceWithMockProvider,
  explainSelectionWithMockProvider,
  extractLearningWithMockProvider,
} from "./mock";
import type {
  EnhancementLevel,
  EnhanceLatestSentenceInput,
  FastEnhanceInput,
  LearningExtractionInput,
  ParagraphHealthInput,
  SelectionExplainInput,
} from "../types";

function input(latestSentence: string, enhancementLevel: EnhancementLevel = "balanced"): EnhanceLatestSentenceInput {
  return {
    fullText: latestSentence,
    latestSentence,
    previousContext: "",
    currentParagraph: latestSentence,
    writingMode: "natural",
    enhancementLevel,
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

function fastInput(latestSentence: string, enhancementLevel: EnhancementLevel = "balanced"): FastEnhanceInput {
  return {
    fullText: latestSentence,
    latestSentence,
    previousContext: "",
    currentParagraph: latestSentence,
    writingMode: "natural",
    enhancementLevel,
    apiConfig: input(latestSentence, enhancementLevel).apiConfig,
  };
}

describe("mock provider", () => {
  it("returns only fast enhancement fields for the fast provider", async () => {
    const result = await enhanceFastWithMockProvider(
      fastInput("Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼."),
    );

    expect(result.finalSentence).toBe("Many students believe that AI tools can improve learning efficiency.");
    expect("learningItems" in result).toBe(false);
    expect("corrections" in result).toBe(false);
  });

  it("extracts learning items and correction events after Apply", async () => {
    const extraction: LearningExtractionInput = {
      originalSentence: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.",
      finalSentence: "Many students believe that AI tools can improve learning efficiency.",
      explanationZh: "Fixed the latest sentence.",
      writingMode: "natural",
      enhancementLevel: "balanced",
      fullText: "Many students believe that AI tools can improve learning efficiency.",
      currentParagraph: "Many students believe that AI tools can improve learning efficiency.",
      apiConfig: input("").apiConfig,
    };

    const result = await extractLearningWithMockProvider(extraction);

    expect(result.learningItems[0].content).toBe("improve learning efficiency");
    expect(result.correctionEvents.some((event) => event.type === "chinese_transfer")).toBe(true);
    expect(result.correctionEvents.some((event) => event.type === "other")).toBe(true);
  });

  it("returns lightweight paragraph health without a revised paragraph", async () => {
    const healthInput: ParagraphHealthInput = {
      fullText: "AI tools are useful. For example, for example, they save time.",
      currentParagraph: "AI tools are useful. For example, for example, they save time.",
      writingMode: "natural",
      apiConfig: input("").apiConfig,
    };

    const result = await checkParagraphHealthWithMockProvider(healthInput);

    expect(result.hasIssues).toBe(true);
    expect(result.issueTypes).toContain("repetition");
    expect("revisedParagraph" in result).toBe(false);
  });

  it("explains selected text without rewriting it", async () => {
    const selectionInput: SelectionExplainInput = {
      selectedText: "acquire knowledge",
      fullText: "Students acquire knowledge through practice.",
      currentParagraph: "Students acquire knowledge through practice.",
      writingMode: "academic",
      apiConfig: input("").apiConfig,
    };

    const result = await explainSelectionWithMockProvider(selectionInput);

    expect(result.selectedText).toBe("acquire knowledge");
    expect(result.meaningZh).toContain("acquire knowledge");
    expect(result.expressionType).toBe("collocation");
    expect("finalSentence" in result).toBe(false);
  });

  it("converts Chinese and fixes grammar deterministically", async () => {
    const result = await enhanceWithMockProvider(
      input("Social media 影响年轻人的价值观 and make them more likely to compare themselves with others."),
    );
    expect(result.finalSentence).toBe(
      "Social media affects young people's values and makes them more likely to compare themselves with others.",
    );
    expect(result.taskType).toBe("mixed_chinese_rewrite");
    expect(result.hasChinese).toBe(true);
  });

  it("lightly polishes pure English without forcing a rewrite in minimal mode", async () => {
    const result = await enhanceWithMockProvider(input("Online learning is convenient.", "minimal"));
    expect(result.finalSentence).toBe("Online learning is convenient.");
    expect(result.taskType).toBe("unchanged");
    expect(result.hasCorrection).toBe(false);
  });
});
