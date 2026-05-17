import { describe, expect, it } from "vitest";
import { checkParagraphFlowWithLLM, checkParagraphHealthWithLLM } from "./service";
import type { ParagraphCheckInput, ParagraphHealthInput } from "./types";

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

describe("checkParagraphFlowWithLLM", () => {
  it("returns a valid deterministic mock paragraph check response", async () => {
    const input: ParagraphCheckInput = {
      fullText: "AI tools are useful. For example, for example, they save time.",
      currentParagraph: "AI tools are useful. For example, for example, they save time.",
      writingMode: "natural",
      apiConfig,
    };

    const result = await checkParagraphFlowWithLLM(input, apiConfig);

    expect(result.originalParagraph).toBe(input.currentParagraph);
    expect(result.hasIssues).toBe(true);
    expect(result.issues[0].type).toBe("repetition");
    expect(result.detailIssues.length).toBeGreaterThan(0);
    expect(result.revisedParagraph).not.toBe(input.currentParagraph);
  });

  it("treats unchanged paragraph output as valid", async () => {
    const input: ParagraphCheckInput = {
      fullText: "Online learning is convenient and flexible.",
      currentParagraph: "Online learning is convenient and flexible.",
      writingMode: "natural",
      apiConfig,
    };

    const result = await checkParagraphFlowWithLLM(input, apiConfig);

    expect(result.hasIssues).toBe(false);
    expect(result.revisedParagraph).toBe(input.currentParagraph);
    expect(result.issues).toEqual([]);
    expect(result.detailIssues).toEqual([]);
  });
});

describe("checkParagraphHealthWithLLM", () => {
  it("returns a lightweight mock result", async () => {
    const input: ParagraphHealthInput = {
      fullText: "AI tools are useful. For example, for example, they save time.",
      currentParagraph: "AI tools are useful. For example, for example, they save time.",
      writingMode: "natural",
      apiConfig,
    };

    const result = await checkParagraphHealthWithLLM(input, apiConfig);

    expect(result.paragraphFingerprint).toBeTruthy();
    expect(result.hasIssues).toBe(true);
    expect(result.issueCount).toBeGreaterThan(0);
    expect(result.issueTypes).toEqual(["repetition"]);
  });
});
