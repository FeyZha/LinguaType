import { describe, expect, it } from "vitest";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_MEMORY_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  TRIGGER_SETTINGS_STORAGE_KEY,
  PARAGRAPH_HEALTH_CACHE_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  aggregateWritingHabits,
  defaultApiSettings,
  defaultTriggerSettings,
  exportLearningLibraryJson,
  exportWritingHabitsJson,
  filterLearningLibrary,
  loadCorrectionEventsFromStorage,
  loadLearningLibraryFromStorage,
  loadTriggerSettingsFromStorage,
  saveParagraphHealthCache,
  saveTriggerSettings,
  upsertCorrectionEvents,
  upsertLearningItems,
} from "./storage";
import type {
  CorrectionEvent,
  CorrectionEventDraft,
  LearningItem,
  LearningItemDraft,
  ParagraphHealthCacheItem,
  ParagraphHealthResult,
  WritingMode,
} from "./llm/types";

function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}

describe("storage constants", () => {
  it("uses versioned localStorage keys", () => {
    expect(API_SETTINGS_STORAGE_KEY).toBe("linguatype.apiSettings.v1");
    expect(LEARNING_HISTORY_STORAGE_KEY).toBe("linguatype.learningHistory.v1");
    expect(LEARNING_LIBRARY_STORAGE_KEY).toBe("linguatype.learningLibrary.v1");
    expect(CORRECTION_MEMORY_STORAGE_KEY).toBe("linguatype.correctionMemory.v1");
    expect(CORRECTION_EVENTS_STORAGE_KEY).toBe("linguatype.correctionEvents.v1");
    expect(PARAGRAPH_HEALTH_CACHE_STORAGE_KEY).toBe("linguatype.paragraphHealthCache.v1");
    expect(TRIGGER_SETTINGS_STORAGE_KEY).toBe("linguatype.triggerSettings.v1");
    expect(DRAFT_STORAGE_KEY).toBe("linguatype.writingDraft.v1");
  });

  it("defaults to JSON mode off and enough tokens for structured responses", () => {
    const settings = defaultApiSettings();
    expect(settings.supportsJsonMode).toBe(false);
    expect(settings.maxTokens).toBeGreaterThanOrEqual(1600);
  });
});

describe("v0.2.2 trigger settings storage", () => {
  it("loads default low-intrusion trigger settings", () => {
    expect(defaultTriggerSettings()).toEqual({
      sentenceEnhancementShortcut: "ctrl_enter",
      inlineExpressionMenuTrigger: "ctrl_k",
      paragraphHealthTrigger: "after_every_apply",
      writingHabitsFeedback: "badge",
      statusFeedbackStyle: "popover_footer",
      popoverBehavior: {
        autoCloseAfterApply: true,
        escapeCloses: true,
        suppressLargePanelAutoOpen: true,
      },
    });
  });

  it("persists trigger settings and fills missing fields with defaults", () => {
    const storage = createMemoryStorage({
      [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        sentenceEnhancementShortcut: "disable_shortcut",
        popoverBehavior: { escapeCloses: false },
      }),
    });

    const loaded = loadTriggerSettingsFromStorage(storage);
    expect(loaded.sentenceEnhancementShortcut).toBe("disable_shortcut");
    expect(loaded.inlineExpressionMenuTrigger).toBe("ctrl_k");
    expect(loaded.popoverBehavior).toEqual({
      autoCloseAfterApply: true,
      escapeCloses: false,
      suppressLargePanelAutoOpen: true,
    });

    const saved = saveTriggerSettings(storage, {
      ...loaded,
      paragraphHealthTrigger: "manual_only",
    });
    expect(saved.paragraphHealthTrigger).toBe("manual_only");
    expect(JSON.parse(storage.getItem(TRIGGER_SETTINGS_STORAGE_KEY) ?? "{}").paragraphHealthTrigger).toBe("manual_only");
  });
});

describe("learning library storage", () => {
  const now = "2026-05-12T01:00:00.000Z";
  const writingMode = "natural" satisfies WritingMode;

  it("migrates legacy learning history into the new library key without deleting legacy data", () => {
    const legacy = [
      {
        id: "legacy-1",
        type: "phrase",
        content: "improve learning efficiency",
        chineseMeaning: "提高学习效率",
        usageNote: "Useful for education topics.",
        sourceSentence: "Many students improve learning efficiency.",
        writingMode,
        createdAt: "2026-05-12T00:00:00.000Z",
        useCount: 2,
      },
    ];
    const storage = createMemoryStorage({
      [LEARNING_HISTORY_STORAGE_KEY]: JSON.stringify(legacy),
    });

    const result = loadLearningLibraryFromStorage(storage, { now });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "legacy-1",
      favorite: false,
      tags: [],
      updatedAt: "2026-05-12T00:00:00.000Z",
      useCount: 2,
    });
    expect(storage.getItem(LEARNING_HISTORY_STORAGE_KEY)).toBe(JSON.stringify(legacy));
    expect(JSON.parse(storage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("saves learning items after Apply with normalized type and content deduplication", () => {
    const existing: LearningItem[] = [
      {
        id: "existing",
        type: "collocation",
        content: "Pay Attention To",
        chineseMeaning: "注意",
        usageNote: "Use with to.",
        sourceSentence: "Parents should pay attention to children.",
        writingMode,
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        useCount: 1,
        favorite: true,
        tags: ["education"],
      },
    ];
    const incoming: LearningItemDraft[] = [
      {
        type: "collocation",
        content: " pay attention to ",
        chineseMeaning: "注意",
        usageNote: "Fixed collocation.",
      },
    ];

    const result = upsertLearningItems(existing, incoming, {
      sourceSentence: "Parents should pay attention to children.",
      writingMode,
      now,
      createId: () => "new",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "existing",
      useCount: 2,
      favorite: true,
      tags: ["education"],
      updatedAt: now,
      lastUsedAt: now,
    });
  });

  it("skips empty or meaningless learning items", () => {
    const incoming: LearningItemDraft[] = [
      { type: "phrase", content: "   ", chineseMeaning: "表达", usageNote: "note" },
      { type: "phrase", content: "valid phrase", chineseMeaning: "", usageNote: "" },
    ];

    const result = upsertLearningItems([], incoming, {
      sourceSentence: "A source sentence.",
      writingMode,
      now,
      createId: () => "new",
    });

    expect(result).toEqual([]);
  });

  it("filters, sorts, toggles favorite-compatible data, exports JSON, and deletes by id", () => {
    const items: LearningItem[] = [
      {
        id: "a",
        type: "phrase",
        content: "as a result",
        chineseMeaning: "因此",
        usageNote: "Show result.",
        sourceSentence: "As a result, students learn faster.",
        writingMode: "natural",
        createdAt: "2026-05-10T00:00:00.000Z",
        updatedAt: "2026-05-10T00:00:00.000Z",
        useCount: 5,
        favorite: false,
        tags: [],
      },
      {
        id: "b",
        type: "collocation",
        content: "acquire knowledge",
        chineseMeaning: "获取知识",
        usageNote: "Formal collocation.",
        sourceSentence: "Students acquire knowledge.",
        writingMode: "academic",
        createdAt: "2026-05-11T00:00:00.000Z",
        updatedAt: "2026-05-11T00:00:00.000Z",
        useCount: 2,
        favorite: true,
        tags: [],
      },
    ];

    expect(filterLearningLibrary(items, { query: "知识" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterLearningLibrary(items, { type: "phrase" }).map((item) => item.id)).toEqual(["a"]);
    expect(filterLearningLibrary(items, { writingMode: "academic" }).map((item) => item.id)).toEqual(["b"]);
    expect(filterLearningLibrary(items, { favoriteOnly: true }).map((item) => item.id)).toEqual(["b"]);
    expect(filterLearningLibrary(items, { sortBy: "useCount" }).map((item) => item.id)).toEqual(["a", "b"]);
    expect(filterLearningLibrary(items, { sortBy: "updatedAt" }).map((item) => item.id)).toEqual(["b", "a"]);
    expect(JSON.parse(exportLearningLibraryJson(items))).toHaveLength(2);
    expect(items.filter((item) => item.id !== "a").map((item) => item.id)).toEqual(["b"]);
  });
});

describe("correction events and writing habits", () => {
  const now = "2026-05-12T02:00:00.000Z";

  it("migrates legacy correction memory into correction events without deleting legacy data", () => {
    const legacy = [
      {
        id: "legacy",
        before: "Many student",
        after: "Many students",
        type: "grammar",
        reason: "Use plural noun after Many.",
        sourceSentence: "Many students believe it.",
        writingMode: "natural",
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        useCount: 2,
      },
    ];
    const storage = createMemoryStorage({
      [CORRECTION_MEMORY_STORAGE_KEY]: JSON.stringify(legacy),
    });

    const result = loadCorrectionEventsFromStorage(storage);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "legacy",
      type: "other",
      useCount: 2,
    });
    expect(storage.getItem(CORRECTION_MEMORY_STORAGE_KEY)).toBe(JSON.stringify(legacy));
    expect(JSON.parse(storage.getItem(CORRECTION_EVENTS_STORAGE_KEY) ?? "[]")).toHaveLength(1);
  });

  it("saves correction events after extraction and deduplicates by before, after, and type", () => {
    const existing: CorrectionEvent[] = [
      {
        id: "existing",
        before: "learn knowledge",
        after: "acquire knowledge",
        type: "collocation",
        reason: "More natural collocation.",
        sourceSentence: "Students acquire knowledge.",
        writingMode: "academic",
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        useCount: 1,
      },
    ];
    const incoming: CorrectionEventDraft[] = [
      {
        before: " Learn Knowledge ",
        after: " acquire knowledge ",
        type: "collocation",
        reason: "Use acquire knowledge.",
      },
    ];

    const result = upsertCorrectionEvents(existing, incoming, {
      sourceSentence: "Students acquire knowledge.",
      writingMode: "academic",
      now,
      createId: () => "new",
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "existing",
      useCount: 2,
      updatedAt: now,
      lastUsedAt: now,
    });
  });

  it("does not save empty correction events or unchanged before and after text", () => {
    const incoming: CorrectionEventDraft[] = [
      { before: "", after: "fixed", type: "other", reason: "empty before" },
      { before: "same", after: " same ", type: "other", reason: "unchanged" },
    ];

    const result = upsertCorrectionEvents([], incoming, {
      sourceSentence: "A source sentence.",
      writingMode: "natural",
      now,
      createId: () => "new",
    });

    expect(result).toEqual([]);
  });

  it("aggregates correction events into writing habits instead of raw issue logs", () => {
    const items: CorrectionEvent[] = [
      {
        id: "grammar-1",
        before: "student believe",
        after: "students believe",
        type: "other",
        reason: "Plural noun.",
        sourceSentence: "Many students believe it.",
        writingMode: "natural",
        createdAt: now,
        updatedAt: now,
        useCount: 1,
      },
      {
        id: "collocation-1",
        before: "learn knowledge",
        after: "acquire knowledge",
        type: "collocation",
        reason: "Natural collocation.",
        sourceSentence: "Students acquire knowledge.",
        writingMode: "academic",
        createdAt: now,
        updatedAt: now,
        useCount: 3,
      },
      {
        id: "collocation-2",
        before: "make progress on",
        after: "make progress in",
        type: "collocation",
        reason: "Use in for this collocation.",
        sourceSentence: "They make progress in English.",
        writingMode: "academic",
        createdAt: now,
        updatedAt: "2026-05-12T03:00:00.000Z",
        useCount: 2,
      },
    ];

    const insights = aggregateWritingHabits(items);

    expect(insights[0]).toMatchObject({
      type: "collocation",
      titleZh: "搭配问题",
      count: 5,
      severity: "high",
    });
    expect(insights[0].examples).toHaveLength(2);
    expect(insights[1]).toMatchObject({ type: "other", count: 1, severity: "low" });
    expect(JSON.parse(exportWritingHabitsJson(items))[0].type).toBe("collocation");
  });
});

describe("paragraph health cache", () => {
  it("stores at most 20 health results and replaces the same fingerprint", () => {
    const storage = createMemoryStorage();
    const result: ParagraphHealthResult = {
      paragraphFingerprint: "same",
      hasIssues: true,
      issueCount: 1,
      issueTypes: ["transition"],
      shortSummaryZh: "有一个衔接问题。",
    };
    const items: ParagraphHealthCacheItem[] = Array.from({ length: 21 }, (_, index) => ({
      paragraphFingerprint: `old-${index}`,
      result: { ...result, paragraphFingerprint: `old-${index}` },
      checkedAt: `2026-05-12T00:${String(index).padStart(2, "0")}:00.000Z`,
    }));

    saveParagraphHealthCache(storage, [
      ...items,
      { paragraphFingerprint: "same", result, checkedAt: "2026-05-12T01:00:00.000Z" },
      { paragraphFingerprint: "same", result, checkedAt: "2026-05-12T01:01:00.000Z" },
    ]);

    const saved = JSON.parse(storage.getItem(PARAGRAPH_HEALTH_CACHE_STORAGE_KEY) ?? "[]") as ParagraphHealthCacheItem[];
    expect(saved).toHaveLength(20);
    expect(saved.filter((item) => item.paragraphFingerprint === "same")).toHaveLength(1);
  });
});
