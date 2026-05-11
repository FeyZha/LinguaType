import { describe, expect, it } from "vitest";
import {
  API_SETTINGS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  defaultApiSettings,
  upsertLearningItems,
} from "./storage";
import type { LearningHistoryItem, LearningItem, WritingMode } from "./llm/types";

describe("storage constants", () => {
  it("uses versioned localStorage keys", () => {
    expect(API_SETTINGS_STORAGE_KEY).toBe("linguatype.apiSettings.v1");
    expect(LEARNING_HISTORY_STORAGE_KEY).toBe("linguatype.learningHistory.v1");
    expect(DRAFT_STORAGE_KEY).toBe("linguatype.writingDraft.v1");
  });

  it("defaults to JSON mode off and enough tokens for structured responses", () => {
    const settings = defaultApiSettings();
    expect(settings.supportsJsonMode).toBe(false);
    expect(settings.maxTokens).toBeGreaterThanOrEqual(1600);
  });
});

describe("learning history", () => {
  it("deduplicates by type and content and increments useCount", () => {
    const existing: LearningHistoryItem[] = [
      {
        id: "existing",
        type: "collocation",
        content: "pay attention to",
        chineseMeaning: "注意",
        usageNote: "Use with to.",
        sourceSentence: "Parents should pay attention to children.",
        writingMode: "natural",
        createdAt: "2026-05-12T00:00:00.000Z",
        useCount: 1,
      },
    ];
    const incoming: LearningItem[] = [
      {
        type: "collocation",
        content: "pay attention to",
        chineseMeaning: "注意",
        usageNote: "Use with to.",
      },
    ];

    const result = upsertLearningItems(existing, incoming, {
      sourceSentence: "Parents should pay attention to children.",
      writingMode: "natural" satisfies WritingMode,
      now: "2026-05-12T01:00:00.000Z",
      createId: () => "new",
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("existing");
    expect(result[0].useCount).toBe(2);
  });
});
