import { describe, expect, it } from "vitest";
import {
  createDocumentMapCacheKey,
  createDocumentMapTextHash,
  createDocumentMapParagraphFingerprints,
  createDocumentMapOutlineHash,
  createStableHash,
  type DocumentMapFreshnessStateContext,
  evaluateDocumentMapFreshness,
  shouldQueueDocumentMapAutoCheck,
  splitDocumentIntoParagraphs,
} from "./documentMap";

function makeLongText() {
  const seed = [
    "Exam pressure shapes learning habits, turning attention into repeated drills and short-term strategies.",
    "Students often study longer but keep weaker long-term understanding, which harms creativity and depth.",
    "A balanced system should guide sustainable reading, reflection, and real communication practice.",
  ];
  return [
    ...Array.from({ length: 10 }, () => seed[0]),
    ...Array.from({ length: 10 }, () => seed[1]),
    ...Array.from({ length: 10 }, () => seed[2]),
  ].join("\n\n");
}

describe("document map helpers", () => {
  it("splits long text into trimmed paragraph ranges without changing the body text", () => {
    const text = "  First paragraph. It has two sentences.  \n\nSecond paragraph.\nStill second. \n\n";
    const paragraphs = splitDocumentIntoParagraphs(text);

    expect(paragraphs).toEqual([
      {
        paragraphId: "p1",
        index: 1,
        range: { start: 2, end: 40 },
        text: "First paragraph. It has two sentences.",
        hash: "aeab5d3d",
        wordCount: 6,
      },
      {
        paragraphId: "p2",
        index: 2,
        range: { start: 44, end: 75 },
        text: "Second paragraph.\nStill second.",
        hash: "e17b8aa4",
        wordCount: 4,
      },
    ]);
    expect(text.slice(paragraphs[0].range.start, paragraphs[0].range.end)).toBe(paragraphs[0].text);
  });

  it("treats single manual line breaks as paragraph breaks when the article has no blank lines", () => {
    const text = [
      "Opening claim. It sets the frame.",
      "Second claim. It gives evidence.",
      "Final point. It answers the topic.",
    ].join("\n");
    const paragraphs = splitDocumentIntoParagraphs(text);

    expect(paragraphs.map((paragraph) => paragraph.text)).toEqual([
      "Opening claim. It sets the frame.",
      "Second claim. It gives evidence.",
      "Final point. It answers the topic.",
    ]);
    expect(paragraphs).toHaveLength(3);
    for (const paragraph of paragraphs) {
      expect(text.slice(paragraph.range.start, paragraph.range.end)).toBe(paragraph.text);
    }
  });

  it("creates stable cache keys from archive, text, setup, domain, and model", () => {
    const textHash = createDocumentMapTextHash("A paragraph.\n\nAnother paragraph.");
    const first = createDocumentMapCacheKey({
      archiveId: "archive-1",
      textHash,
      essayTopic: "  Topic  ",
      outlinePoints: [" First ", "Second"],
      domain: "education",
      model: "glm-5.1",
    });
    const second = createDocumentMapCacheKey({
      archiveId: "archive-1",
      textHash,
      essayTopic: "Topic",
      outlinePoints: ["First", "Second"],
      domain: "education",
      model: "glm-5.1",
    });

    expect(first).toBe(second);
    expect(first).toContain("archive-1");
    expect(first).toContain(textHash);
  });

  it("creates paragraph fingerprints with hash and wordCount", () => {
    const text = "A first paragraph about testing.\n\nA second paragraph with more words.";
    const paragraphs = splitDocumentIntoParagraphs(text);
    const fingerprints = createDocumentMapParagraphFingerprints(paragraphs);

    expect(fingerprints).toEqual([
      {
        paragraphId: "p1",
        range: { start: 0, end: 32 },
        hash: createStableHash("a first paragraph about testing."),
        wordCount: 5,
      },
      {
        paragraphId: "p2",
        range: { start: 34, end: 69 },
        hash: createStableHash("a second paragraph with more words."),
        wordCount: 6,
      },
    ]);
  });

  it("evaluates fresh content from a matching cache as ready/fresh", () => {
    const text = makeLongText();
    const paragraphs = splitDocumentIntoParagraphs(text);
    const context: DocumentMapFreshnessStateContext = {
      text,
      essayTopic: "How exams affect learning",
      outlinePoints: ["Cause", "Impact", "Suggestion"],
      paragraphs,
      cache: {
        cacheKey: "cache-1",
        textHash: createDocumentMapTextHash(text),
        essayTopicHash: createStableHash("How exams affect learning"),
        outlinePointsHash: createDocumentMapOutlineHash(["Cause", "Impact", "Suggestion"]),
        paragraphFingerprints: createDocumentMapParagraphFingerprints(paragraphs),
        generatedAt: "2026-05-17T00:00:00.000Z",
        freshness: "ready",
      },
      now: Date.parse("2026-05-17T00:01:00.000Z"),
    };

    const result = evaluateDocumentMapFreshness(context);
    expect(result === "ready" || result === "fresh").toBe(true);
  });

  it("marks needs_check when changed content is significant", () => {
    const text = makeLongText();
    const cacheText = text;
    const paragraphs = splitDocumentIntoParagraphs(text);
    const addedWords = Array.from({ length: 45 }, (_, index) => `added${index + 1}`).join(" ");
    const changedText = `${cacheText}\n\n${addedWords}.`;
    const changedParagraphs = splitDocumentIntoParagraphs(changedText);

    const context: DocumentMapFreshnessStateContext = {
      text: changedText,
      essayTopic: "How exams affect learning",
      outlinePoints: ["Cause", "Impact", "Suggestion"],
      paragraphs: changedParagraphs,
      cache: {
        cacheKey: "cache-1",
        textHash: createDocumentMapTextHash(cacheText),
        essayTopicHash: createStableHash("How exams affect learning"),
        outlinePointsHash: createDocumentMapOutlineHash(["Cause", "Impact", "Suggestion"]),
        paragraphFingerprints: createDocumentMapParagraphFingerprints(paragraphs),
        generatedAt: "2026-05-17T00:00:00.000Z",
        freshness: "ready",
      },
      now: Date.parse("2026-05-17T00:02:00.000Z"),
    };

    const result = evaluateDocumentMapFreshness(context);
    expect(result).toBe("needs_check");
  });

  it("marks small text edits stale without queuing automatic checks", () => {
    const text = makeLongText();
    const paragraphs = splitDocumentIntoParagraphs(text);
    const changedText = text.replace("learning", "studying");
    const changedParagraphs = splitDocumentIntoParagraphs(changedText);
    const context: DocumentMapFreshnessStateContext = {
      text: changedText,
      essayTopic: "How exams affect learning",
      outlinePoints: ["Cause", "Impact", "Suggestion"],
      paragraphs: changedParagraphs,
      cache: {
        cacheKey: "cache-1",
        textHash: createDocumentMapTextHash(text),
        essayTopicHash: createStableHash("How exams affect learning"),
        outlinePointsHash: createDocumentMapOutlineHash(["Cause", "Impact", "Suggestion"]),
        paragraphFingerprints: createDocumentMapParagraphFingerprints(paragraphs),
        generatedAt: "2026-05-17T00:00:00.000Z",
        freshness: "ready",
      },
      now: Date.parse("2026-05-17T00:02:00.000Z"),
    };

    expect(evaluateDocumentMapFreshness(context)).toBe("stale");
    expect(
      shouldQueueDocumentMapAutoCheck(
        "stale",
        { lastAutoCheckedAt: "2026-05-17T00:00:00.000Z", autoCheckCountInSession: 0 },
        {
          now: Date.parse("2026-05-17T00:10:00.000Z"),
          lastInputAt: Date.parse("2026-05-17T00:09:40.000Z"),
        },
      ),
    ).toBe(false);
  });

  it("returns needs_check when topic or outline changes beyond cached hash", () => {
    const text = makeLongText();
    const paragraphs = splitDocumentIntoParagraphs(text);

    const context: DocumentMapFreshnessStateContext = {
      text,
      essayTopic: "How technology affects students",
      outlinePoints: ["Cause", "Impact", "Suggestion"],
      paragraphs,
      cache: {
        cacheKey: "cache-1",
        textHash: createDocumentMapTextHash(text),
        essayTopicHash: createStableHash("Original topic"),
        outlinePointsHash: createDocumentMapOutlineHash(["Cause", "Impact", "Suggestion"]),
        paragraphFingerprints: createDocumentMapParagraphFingerprints(paragraphs),
        generatedAt: "2026-05-17T00:00:00.000Z",
        freshness: "ready",
      },
      now: Date.parse("2026-05-17T00:02:00.000Z"),
    };

    expect(evaluateDocumentMapFreshness(context)).toBe("needs_check");
  });

  it("queues auto checks only after idle window and with session limit", () => {
    const now = Date.parse("2026-05-17T00:10:00.000Z");
    expect(shouldQueueDocumentMapAutoCheck("needs_check", { lastAutoCheckedAt: "2026-05-17T00:06:00.000Z", autoCheckCountInSession: 3 }, {
      now,
      lastInputAt: now - 9_000,
    })).toBe(false);
    expect(shouldQueueDocumentMapAutoCheck("stale", { lastAutoCheckedAt: "2026-05-17T00:06:00.000Z", autoCheckCountInSession: 3 }, {
      now,
      lastInputAt: now - 10_000,
    })).toBe(false);
    expect(
      shouldQueueDocumentMapAutoCheck(
        "needs_check",
        { autoCheckCountInSession: 5 },
        {
          now,
          lastInputAt: now - 30_000,
        },
      ),
    ).toBe(false);
    expect(
      shouldQueueDocumentMapAutoCheck(
        "needs_check",
        { lastAutoCheckedAt: "2026-05-17T00:06:00.000Z", autoCheckCountInSession: 1 },
        {
          now,
          lastInputAt: now - 20 * 60 * 1000,
        },
      ),
    ).toBe(true);
  });
});
