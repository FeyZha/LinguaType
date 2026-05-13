import { describe, expect, it } from "vitest";
import {
  buildFastEnhancementUserPrompt,
  buildLearningExtractionUserPrompt,
  buildParagraphHealthUserPrompt,
  buildParagraphFlowUserPrompt,
  buildSelectionExplainUserPrompt,
  FAST_ENHANCEMENT_SYSTEM_PROMPT,
  LEARNING_EXTRACTION_SYSTEM_PROMPT,
  PARAGRAPH_HEALTH_SYSTEM_PROMPT,
  PARAGRAPH_FLOW_SYSTEM_PROMPT,
  SELECTION_EXPLAIN_SYSTEM_PROMPT,
} from "./prompts";
import type {
  FastEnhanceInput,
  LearningExtractionInput,
  ParagraphCheckInput,
  ParagraphHealthInput,
  SelectionExplainInput,
} from "./types";

const apiConfig = {
  provider: "openai-compatible",
  baseUrl: "",
  endpointPath: "/v1/chat/completions",
  apiKey: "",
  model: "",
  temperature: 0.2,
  maxTokens: 1800,
  supportsJsonMode: false,
  mockMode: true,
};

describe("LLM prompts", () => {
  it.each(["minimal", "balanced", "polished"] as const)(
    "includes enhancementLevel %s in the fast enhancement prompt",
    (enhancementLevel) => {
      const input: FastEnhanceInput = {
        fullText: "Online learning is convenient.",
        latestSentence: "Online learning is convenient.",
        previousContext: "",
        currentParagraph: "Online learning is convenient.",
        writingMode: "natural",
        enhancementLevel,
        apiConfig,
      };

      const prompt = buildFastEnhancementUserPrompt(input);

      expect(FAST_ENHANCEMENT_SYSTEM_PROMPT).toContain("Do not extract learning items");
      expect(prompt).toContain(`Enhancement level: ${enhancementLevel}`);
      expect(prompt).toContain("minimal:");
      expect(prompt).toContain("balanced:");
      expect(prompt).toContain("polished:");
    },
  );

  it("does not ask the model to return code-owned fast enhancement fields", () => {
    const input: FastEnhanceInput = {
      fullText: "This may 影响 young people's values.",
      latestSentence: "This may 影响 young people's values.",
      previousContext: "",
      currentParagraph: "This may 影响 young people's values.",
      writingMode: "natural",
      enhancementLevel: "balanced",
      apiConfig,
    };

    const prompt = buildFastEnhancementUserPrompt(input);

    expect(prompt).toContain('"finalSentence"');
    expect(prompt).toContain('"explanationZh"');
    expect(prompt).toContain("do not use double quote characters");
    expect(prompt).not.toContain('"originalSentence"');
    expect(prompt).not.toContain('"hasChinese"');
    expect(prompt).not.toContain('"taskType"');
  });

  it("keeps learning extraction focused on learning items and correction events", () => {
    const input: LearningExtractionInput = {
      originalSentence: "Many student learn knowledge.",
      finalSentence: "Many students acquire knowledge.",
      explanationZh: "Fixed grammar and collocation.",
      writingMode: "academic",
      enhancementLevel: "balanced",
      fullText: "Many students acquire knowledge.",
      currentParagraph: "Many students acquire knowledge.",
      apiConfig,
    };

    const prompt = buildLearningExtractionUserPrompt(input);

    expect(LEARNING_EXTRACTION_SYSTEM_PROMPT).toContain("Do not revise the sentence");
    expect(prompt).toContain("correctionEvents");
    expect(prompt).toContain("singular_plural");
    expect(prompt).not.toContain("finalSentence\":");
  });

  it("keeps prompt lightweight without revised paragraphs", () => {
    const input: ParagraphHealthInput = {
      fullText: "First sentence. Second sentence.",
      currentParagraph: "First sentence. Second sentence.",
      writingMode: "natural",
      apiConfig,
    };

    const prompt = buildParagraphHealthUserPrompt(input);

    expect(PARAGRAPH_HEALTH_SYSTEM_PROMPT).toContain("Do not return a revisedParagraph");
    expect(prompt).toContain("ParagraphHealthResult");
    expect(prompt).not.toContain("revisedParagraph");
  });

  it("keeps paragraph flow checking manual, JSON-only, and non-essay-scoring", () => {
    const input: ParagraphCheckInput = {
      fullText: "First paragraph.",
      currentParagraph: "First paragraph.",
      writingMode: "academic",
      apiConfig,
    };

    const prompt = buildParagraphFlowUserPrompt(input);

    expect(PARAGRAPH_FLOW_SYSTEM_PROMPT).toContain("Do not score essays");
    expect(PARAGRAPH_FLOW_SYSTEM_PROMPT).toContain("Do not generate new arguments");
    expect(prompt).toContain("Current paragraph: First paragraph.");
    expect(prompt).toContain("ParagraphCheckResult");
  });

  it("keeps selection explanation non-mutating and JSON-only", () => {
    const input: SelectionExplainInput = {
      selectedText: "acquire knowledge",
      fullText: "Students acquire knowledge through practice.",
      currentParagraph: "Students acquire knowledge through practice.",
      writingMode: "academic",
      apiConfig,
    };

    const prompt = buildSelectionExplainUserPrompt(input);

    expect(SELECTION_EXPLAIN_SYSTEM_PROMPT).toContain("Do not rewrite");
    expect(prompt).toContain("SelectionExplainResult");
    expect(prompt).toContain("acquire knowledge");
    expect(prompt).not.toContain("finalSentence");
  });
});
