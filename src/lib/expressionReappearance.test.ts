import { describe, expect, it } from "vitest";
import type { LearningItem } from "./llm/types";
import { findExpressionReappearanceCues } from "./expressionReappearance";

function makeItem(partial: Partial<LearningItem>): LearningItem {
  return {
    id: partial.id ?? "item-id",
    type: partial.type ?? "phrase",
    content: partial.content ?? "",
    chineseMeaning: partial.chineseMeaning ?? "",
    usageNote: partial.usageNote ?? "",
    sourceSentence: partial.sourceSentence ?? "",
    writingMode: partial.writingMode ?? "natural",
    createdAt: "2026-05-16T00:00:00.000Z",
    updatedAt: "2026-05-16T00:00:00.000Z",
    useCount: 1,
    favorite: false,
    tags: [],
    ...partial,
  };
}

describe("expression reappearance cues", () => {
  it("matches exact phrase and collocation items with case and punctuation normalization", () => {
    const text = "First, I Took the train; IN AS A RESULT, we arrived on time. Next, another sentence.";
    const matches = findExpressionReappearanceCues(text, [
      makeItem({ id: "phrase-1", type: "phrase", content: "in as a result" }),
      makeItem({ id: "col-1", type: "collocation", content: "took the train" }),
      makeItem({ id: "bad-1", type: "sentence_pattern", content: "train" }),
    ]);

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      itemId: "col-1",
      expression: "took the train",
      matchedText: "Took the train",
      start: 9,
      end: 23,
    });
    expect(matches[1]).toMatchObject({
      itemId: "phrase-1",
      expression: "in as a result",
      matchedText: "IN AS A RESULT",
      start: 25,
      end: 39,
    });
  });

  it("filters out single-word and non-phrase/collocation library items", () => {
    const text = "I have a good idea about this project.";
    const matches = findExpressionReappearanceCues(text, [
      makeItem({ id: "single-1", type: "phrase", content: "good" }),
      makeItem({ id: "pattern-1", type: "sentence_pattern", content: "good idea" }),
      makeItem({ id: "phrase-2", type: "phrase", content: "have a good idea" }),
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      itemId: "phrase-2",
      expression: "have a good idea",
      matchedText: "have a good idea",
    });
  });

  it("supports possessive placeholder matching inside an expression", () => {
    const text = "My plan shaped young people's values. Social media can shape their values.";
    const matches = findExpressionReappearanceCues(text, [
      makeItem({ id: "poss-1", type: "phrase", content: "shape one's values" }),
      makeItem({ id: "noise", type: "phrase", content: "short" }),
    ]);

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => match.matchedText)).toEqual([
      "shaped young people's values",
      "shape their values",
    ]);
  });

  it("supports simple conservative verb inflections", () => {
    const text = "Family education plays a crucial role in childhood. Parents played a crucial role in this shift.";
    const matches = findExpressionReappearanceCues(text, [
      makeItem({ id: "verb-1", type: "collocation", content: "play a crucial role in" }),
      makeItem({ id: "verb-2", type: "phrase", content: "run" }),
    ]);

    expect(matches).toHaveLength(2);
    expect(matches.map((match) => match.matchedText)).toEqual([
      "plays a crucial role in",
      "played a crucial role in",
    ]);
  });

  it("keeps one match per sentence and favors the strongest/longest match", () => {
    const text = "I need to make progress in communication and make progress every day.";
    const matches = findExpressionReappearanceCues(text, [
      makeItem({ id: "short", type: "phrase", content: "make progress" }),
      makeItem({ id: "long", type: "phrase", content: "make progress in" }),
      makeItem({ id: "tiny", type: "collocation", content: "communication" }),
    ]);

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      itemId: "long",
      expression: "make progress in",
      matchedText: "make progress in",
    });
  });

  it("applies per-sentence throttling across multiple sentences", () => {
    const text = "We can make progress in this week.\nLet's make progress every day.";
    const matches = findExpressionReappearanceCues(text, [
      makeItem({ id: "long", type: "phrase", content: "make progress in" }),
      makeItem({ id: "short", type: "phrase", content: "make progress" }),
    ]);

    expect(matches).toHaveLength(2);
    expect(matches[0]).toMatchObject({
      itemId: "long",
      matchedText: "make progress in",
    });
    expect(matches[1]).toMatchObject({
      itemId: "short",
      matchedText: "make progress",
    });
  });
});
