import { describe, expect, it } from "vitest";
import {
  analyzeProofreading,
  calculateTextStats,
  normalizePersonalDictionary,
} from "./proofreading";

describe("proofreading text stats", () => {
  it("counts English words, sentences, paragraphs, and characters locally", () => {
    const stats = calculateTextStats("This is a short sentence.\n\nThis may 影响 young people's values.");

    expect(stats).toEqual({
      characterCount: 61,
      englishWordCount: 10,
      sentenceCount: 2,
      paragraphCount: 2,
    });
  });
});

describe("local proofreading signals", () => {
  it("detects grammar, punctuation, style, and length signals without rewriting text", () => {
    const result = analyzeProofreading(
      [
        "This is teh result,and it is very important for students because they need practice and they need feedback and they need time and they need clear examples and they need confidence.",
        "They they can improve.",
      ].join(" "),
    );

    expect(result.signals.map((signal) => signal.type)).toEqual(
      expect.arrayContaining(["grammar", "punctuation", "style", "length"]),
    );
    expect(result.signals.some((signal) => signal.replacement === "the")).toBe(true);
    expect(result.signals.some((signal) => signal.excerpt === "result,and")).toBe(true);
    expect(result.signals.some((signal) => signal.excerpt.toLowerCase() === "they they")).toBe(true);
  });

  it("uses the personal dictionary to suppress user-approved typo-like terms", () => {
    const result = analyzeProofreading("The product name is teh.", ["teh"]);

    expect(result.signals.some((signal) => signal.excerpt.toLowerCase() === "teh")).toBe(false);
  });
});

describe("personal dictionary normalization", () => {
  it("deduplicates terms case-insensitively and removes empty entries", () => {
    expect(normalizePersonalDictionary([" LinguaType ", "linguatype", "", "IELTS"])).toEqual([
      "LinguaType",
      "IELTS",
    ]);
  });
});
