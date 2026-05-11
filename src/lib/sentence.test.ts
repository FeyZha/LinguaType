import { describe, expect, it } from "vitest";
import {
  containsChinese,
  createWordDiff,
  extractLatestSentence,
  getCurrentParagraph,
  getPreviousContext,
  replaceLatestSentence,
} from "./sentence";

describe("latest sentence utilities", () => {
  it("detects Chinese characters", () => {
    expect(containsChinese("AI tools can \u63d0\u9ad8\u5b66\u4e60\u6548\u7387.")).toBe(true);
    expect(containsChinese("AI tools can improve learning efficiency.")).toBe(false);
  });

  it("returns the full latest sentence when text ends with punctuation", () => {
    const result = extractLatestSentence("Online learning is convenient.");
    expect(result).toEqual({
      sentence: "Online learning is convenient.",
      start: 0,
      end: 30,
    });
  });

  it("extracts an unfinished latest sentence after earlier punctuation", () => {
    const text = "Online learning is flexible. Many student believe AI can \u63d0\u9ad8\u5b66\u4e60\u6548\u7387";
    const result = extractLatestSentence(text);
    expect(result.sentence).toBe("Many student believe AI can \u63d0\u9ad8\u5b66\u4e60\u6548\u7387");
    expect(text.slice(result.start, result.end)).toBe(result.sentence);
  });

  it("uses newlines as sentence boundaries", () => {
    const text = "Technology makes communication easier.\nIt also help people \u83b7\u53d6\u66f4\u591a\u4fe1\u606f";
    const result = extractLatestSentence(text);
    expect(result.sentence).toBe("It also help people \u83b7\u53d6\u66f4\u591a\u4fe1\u606f");
  });

  it.each([
    [".", "Second sentence."],
    ["?", "Second sentence?"],
    ["!", "Second sentence!"],
    ["\u3002", "Second sentence\u3002"],
    ["\uff1f", "Second sentence\uff1f"],
    ["\uff01", "Second sentence\uff01"],
    [";", "Second sentence;"],
    ["\uff1b", "Second sentence\uff1b"],
  ])("treats %s as a sentence boundary", (boundary, expected) => {
    const text = `First sentence${boundary} ${expected}`;
    const result = extractLatestSentence(text);
    expect(result.sentence).toBe(expected);
    expect(text.slice(result.start, result.end)).toBe(expected);
  });

  it("returns an empty range for whitespace-only text", () => {
    expect(extractLatestSentence("")).toEqual({ sentence: "", start: 0, end: 0 });
    expect(extractLatestSentence("  \n\t ")).toEqual({ sentence: "", start: 0, end: 0 });
  });

  it("preserves trailing whitespace outside the replacement range", () => {
    const text = "First sentence. Latest draft   \n";
    const range = extractLatestSentence(text);
    expect(replaceLatestSentence(text, range, "Final sentence.")).toBe(
      "First sentence. Final sentence.   \n",
    );
  });

  it("replaces by range rather than earlier duplicate text", () => {
    const text = "AI helps students. AI helps students";
    const range = extractLatestSentence(text);
    expect(replaceLatestSentence(text, range, "AI helps learners.")).toBe(
      "AI helps students. AI helps learners.",
    );
  });

  it("gets previous context before the latest sentence", () => {
    const text = "First sentence. Second sentence";
    const range = extractLatestSentence(text);
    expect(getPreviousContext(text, range.start)).toBe("First sentence.");
  });

  it("gets the paragraph containing the latest sentence", () => {
    const text = "Para one.\n\nPara two starts. Latest sentence";
    const range = extractLatestSentence(text);
    expect(getCurrentParagraph(text, range.start)).toBe("Para two starts. Latest sentence");
  });

  it("creates word-level diff parts", () => {
    const parts = createWordDiff("Many student learn knowledge.", "Many students acquire knowledge.");
    expect(parts.some((part) => part.removed && part.value.includes("student"))).toBe(true);
    expect(parts.some((part) => part.added && part.value.includes("students"))).toBe(true);
  });
});
