import { describe, expect, it } from "vitest";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_MEMORY_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  DOCUMENT_MAP_CACHE_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  THEME_SETTINGS_STORAGE_KEY,
  TRIGGER_SETTINGS_STORAGE_KEY,
  PARAGRAPH_HEALTH_CACHE_STORAGE_KEY,
  PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY,
  PERSONAL_DICTIONARY_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  WRITING_ARCHIVES_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  aggregateWritingHabits,
  defaultApiSettings,
  defaultThemeSettings,
  defaultTriggerSettings,
  defaultWritingSetup,
  exportLearningLibraryJson,
  exportWritingHabitsJson,
  filterLearningLibrary,
  loadCorrectionEventsFromStorage,
  loadDocumentMapCache,
  loadLearningLibraryFromStorage,
  loadPlaceholderSuggestionCache,
  loadPersonalDictionaryFromStorage,
  loadThemeSettingsFromStorage,
  loadTriggerSettingsFromStorage,
  loadWritingArchivesFromStorage,
  loadWritingSetupFromStorage,
  savePlaceholderSuggestionCache,
  savePersonalDictionary,
  saveDocumentMapCache,
  saveParagraphHealthCache,
  saveThemeSettings,
  saveTriggerSettings,
  saveWritingArchives,
  saveWritingSetup,
  upsertPlaceholderSuggestionCache,
  upsertDocumentMapCache,
  upsertCorrectionEvents,
  upsertLearningItems,
  type PlaceholderSuggestionCacheRecord,
} from "./storage";
import type {
  CorrectionEvent,
  CorrectionEventDraft,
  LearningItem,
  LearningItemDraft,
  ParagraphHealthCacheItem,
  ParagraphHealthResult,
  DocumentMapCacheRecord,
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
    expect(DOCUMENT_MAP_CACHE_STORAGE_KEY).toBe("linguatype.documentMapCache.v1");
    expect(PARAGRAPH_HEALTH_CACHE_STORAGE_KEY).toBe("linguatype.paragraphHealthCache.v1");
    expect(TRIGGER_SETTINGS_STORAGE_KEY).toBe("linguatype.triggerSettings.v1");
    expect(PERSONAL_DICTIONARY_STORAGE_KEY).toBe("linguatype.personalDictionary.v1");
    expect(DRAFT_STORAGE_KEY).toBe("linguatype.writingDraft.v1");
    expect(WRITING_SETUP_STORAGE_KEY).toBe("linguatype.writingSetup.v1");
    expect(WRITING_ARCHIVES_STORAGE_KEY).toBe("linguatype.writingArchives.v1");
    expect(THEME_SETTINGS_STORAGE_KEY).toBe("linguatype.themeSettings.v1");
    expect(PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY).toBe("linguatype.placeholderSuggestionCache.v1");
  });

  it("defaults to JSON mode off and enough tokens for structured responses", () => {
    const settings = defaultApiSettings();
    expect(settings.supportsJsonMode).toBe(false);
    expect(settings.maxTokens).toBe(20000);
    expect(settings.mockMode).toBe(false);
    expect(settings.useServerApiKey).toBe(false);
  });
});

describe("writing archives storage", () => {
  it("seeds a complete demo archive for first-time visitors", () => {
    const storage = createMemoryStorage();

    const archives = loadWritingArchivesFromStorage(storage, {
      now: "2026-05-17T01:00:00.000Z",
      createId: () => "demo-archive",
    });

    expect(archives.activeId).toBe("demo-archive");
    expect(archives.items).toHaveLength(1);
    expect(archives.items[0]).toMatchObject({
      id: "demo-archive",
      title: "体验示例：Independent learning habits",
      setup: expect.objectContaining({
        topicArea: "education",
        essayTopic: "How students can build independent learning habits",
      }),
      createdAt: "2026-05-17T01:00:00.000Z",
    });
    expect(archives.items[0].text).toContain("把它落实到每天的行动中");
    expect(archives.items[0].text.split("\n\n")).toHaveLength(4);
    expect(JSON.parse(storage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}").items).toHaveLength(1);
  });

  it("initializes a default archive from legacy draft and setup without deleting legacy keys", () => {
    const setup = {
      topicArea: "technology",
      essayTopic: "How AI changes education",
      outlinePoints: ["Benefits", "Risks"],
      outline: "Benefits\nRisks",
      updatedAt: "2026-05-14T00:00:00.000Z",
    };
    const storage = createMemoryStorage({
      [DRAFT_STORAGE_KEY]: "Existing draft sentence.",
      [WRITING_SETUP_STORAGE_KEY]: JSON.stringify(setup),
    });

    const archives = loadWritingArchivesFromStorage(storage, {
      now: "2026-05-14T01:00:00.000Z",
      createId: () => "archive-1",
    });

    expect(archives.activeId).toBe("archive-1");
    expect(archives.items).toHaveLength(1);
    expect(archives.items[0]).toMatchObject({
      id: "archive-1",
      title: "How AI changes education",
      text: "Existing draft sentence.",
      setup: expect.objectContaining({ essayTopic: "How AI changes education" }),
      createdAt: "2026-05-14T01:00:00.000Z",
      updatedAt: "2026-05-14T01:00:00.000Z",
    });
    expect(storage.getItem(DRAFT_STORAGE_KEY)).toBe("Existing draft sentence.");
    expect(storage.getItem(WRITING_SETUP_STORAGE_KEY)).toBe(JSON.stringify(setup));
    expect(JSON.parse(storage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}").items).toHaveLength(1);
  });

  it("normalizes and saves active writing archives locally", () => {
    const storage = createMemoryStorage();
    const saved = saveWritingArchives(storage, {
      activeId: "active",
      items: [
        {
          id: "active",
          title: "  ",
          text: "Draft",
          setup: null,
          createdAt: "2026-05-14T00:00:00.000Z",
          updatedAt: "2026-05-14T00:00:00.000Z",
        },
      ],
    });

    expect(saved.items[0].title).toBe("未命名写作");
    expect(loadWritingArchivesFromStorage(storage).activeId).toBe("active");
  });
});

describe("writing setup storage", () => {
  it("returns null when no setup has been saved", () => {
    expect(loadWritingSetupFromStorage(createMemoryStorage())).toBeNull();
  });

  it("normalizes and saves writing setup locally", () => {
    const storage = createMemoryStorage();
    const saved = saveWritingSetup(storage, {
      topicArea: "custom",
      customTopicArea: "  public health  ",
      essayTopic: "  How technology affects healthcare  ",
      outlinePoints: ["  1. Benefits  ", "2. Risks  "],
      outline: "  1. Benefits\n2. Risks  ",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });

    expect(saved).toEqual({
      topicArea: "custom",
      customTopicArea: "public health",
      essayTopic: "How technology affects healthcare",
      outlinePoints: ["1. Benefits", "2. Risks"],
      outline: "1. Benefits\n2. Risks",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });
    expect(loadWritingSetupFromStorage(storage)).toEqual(saved);
    expect(JSON.parse(storage.getItem(WRITING_SETUP_STORAGE_KEY) ?? "{}")).toMatchObject({
      topicArea: "custom",
      customTopicArea: "public health",
    });
  });

  it("fills invalid writing setup fields with safe defaults", () => {
    const storage = createMemoryStorage({
      [WRITING_SETUP_STORAGE_KEY]: JSON.stringify({
        topicArea: "invalid",
        customTopicArea: "ignored",
        essayTopic: 123,
        outline: "  outline  ",
      }),
    });

    expect(loadWritingSetupFromStorage(storage)).toMatchObject({
      topicArea: defaultWritingSetup().topicArea,
      customTopicArea: undefined,
      essayTopic: "",
      outlinePoints: ["outline"],
      outline: "outline",
    });
  });
});

describe("theme settings storage", () => {
  it("defaults to system theme", () => {
    expect(defaultThemeSettings().preference).toBe("system");
    expect(loadThemeSettingsFromStorage(createMemoryStorage()).preference).toBe("system");
  });

  it("normalizes and saves theme settings locally", () => {
    const storage = createMemoryStorage();
    const saved = saveThemeSettings(storage, {
      preference: "dark",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });

    expect(saved).toEqual({
      preference: "dark",
      updatedAt: "2026-05-14T00:00:00.000Z",
    });
    expect(loadThemeSettingsFromStorage(storage)).toEqual(saved);
    expect(JSON.parse(storage.getItem(THEME_SETTINGS_STORAGE_KEY) ?? "{}").preference).toBe("dark");
  });

  it("falls back to system for invalid theme settings", () => {
    const storage = createMemoryStorage({
      [THEME_SETTINGS_STORAGE_KEY]: JSON.stringify({ preference: "sepia" }),
    });

    expect(loadThemeSettingsFromStorage(storage).preference).toBe("system");
  });
});

describe("personal dictionary storage", () => {
  it("loads and saves normalized local dictionary terms", () => {
    const storage = createMemoryStorage({
      [PERSONAL_DICTIONARY_STORAGE_KEY]: JSON.stringify([" LinguaType ", "linguatype", "", "IELTS"]),
    });

    expect(loadPersonalDictionaryFromStorage(storage)).toEqual(["LinguaType", "IELTS"]);
    expect(savePersonalDictionary(storage, ["  DeepSeek  ", "deepseek"])).toEqual(["DeepSeek"]);
    expect(JSON.parse(storage.getItem(PERSONAL_DICTIONARY_STORAGE_KEY) ?? "[]")).toEqual(["DeepSeek"]);
  });
});

describe("v0.2.2  storage", () => {
  it("loads default low-intrusion ", () => {
    expect(defaultTriggerSettings()).toEqual({
      sentenceEnhancementShortcut: "ctrl_enter",
      paragraphHealthTrigger: "after_every_apply",
      documentMapAutoCheck: "auto_idle",
      writingHabitsFeedback: "badge",
      statusFeedbackStyle: "popover_footer",
      popoverBehavior: {
        autoCloseAfterApply: true,
        escapeCloses: true,
        suppressLargePanelAutoOpen: true,
      },
    });
  });

  it("persists  and fills missing fields with defaults", () => {
    const storage = createMemoryStorage({
      [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        sentenceEnhancementShortcut: "disable_shortcut",
        popoverBehavior: { escapeCloses: false },
      }),
    });

    const loaded = loadTriggerSettingsFromStorage(storage);
    expect(loaded.sentenceEnhancementShortcut).toBe("button_only");
    expect(loaded.documentMapAutoCheck).toBe("auto_idle");
    expect("inlineExpressionMenuTrigger" in loaded).toBe(false);
    expect(loaded.popoverBehavior).toEqual({
      autoCloseAfterApply: true,
      escapeCloses: true,
      suppressLargePanelAutoOpen: true,
    });

    const saved = saveTriggerSettings(storage, {
      ...loaded,
      paragraphHealthTrigger: "after_paragraph_complete",
    });
    expect(saved.paragraphHealthTrigger).toBe("after_paragraph_complete");
    expect(saved.documentMapAutoCheck).toBe("auto_idle");
    expect(JSON.parse(storage.getItem(TRIGGER_SETTINGS_STORAGE_KEY) ?? "{}").paragraphHealthTrigger).toBe("after_paragraph_complete");
  });

  it("normalizes document map auto check modes", () => {
    const storage = createMemoryStorage({
      [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        documentMapAutoCheck: "remind_only",
      }),
    });
    expect(loadTriggerSettingsFromStorage(storage).documentMapAutoCheck).toBe("remind_only");

    const invalid = createMemoryStorage({
      [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        documentMapAutoCheck: "always",
      }),
    });
    expect(loadTriggerSettingsFromStorage(invalid).documentMapAutoCheck).toBe("auto_idle");
  });

  it("migrates removed paragraph health triggers to enabled modes", () => {
    const legacyThreeApply = createMemoryStorage({
      [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        paragraphHealthTrigger: "after_3_applied_edits",
      }),
    });
    expect(loadTriggerSettingsFromStorage(legacyThreeApply).paragraphHealthTrigger).toBe("after_paragraph_complete");
    expect(JSON.parse(legacyThreeApply.getItem(TRIGGER_SETTINGS_STORAGE_KEY) ?? "{}").paragraphHealthTrigger).toBe(
      "after_paragraph_complete",
    );

    for (const legacyTrigger of ["manual_only", "off"]) {
      const storage = createMemoryStorage({
        [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
          paragraphHealthTrigger: legacyTrigger,
        }),
      });
      expect(loadTriggerSettingsFromStorage(storage).paragraphHealthTrigger).toBe("after_every_apply");
      expect(JSON.parse(storage.getItem(TRIGGER_SETTINGS_STORAGE_KEY) ?? "{}").paragraphHealthTrigger).toBe(
        "after_every_apply",
      );
    }
  });

  it("migrates the removed legacy Ctrl/Cmd + J trigger to Ctrl/Cmd + Enter", () => {
    const storage = createMemoryStorage({
      [TRIGGER_SETTINGS_STORAGE_KEY]: JSON.stringify({
        sentenceEnhancementShortcut: "ctrl_j_legacy",
      }),
    });

    expect(loadTriggerSettingsFromStorage(storage).sentenceEnhancementShortcut).toBe("ctrl_enter");
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
    expect(filterLearningLibrary(items, { writingMode: "academic" }).map((item) => item.id)).toEqual(["b", "a"]);
    expect(filterLearningLibrary(items, { difficultyLevel: 3 }).map((item) => item.id)).toEqual([]);
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

  it("aggregates correction events into writing habits with 10/30 count thresholds instead of raw issue logs", () => {
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
        useCount: 10,
      },
      {
        id: "word-order-1",
        before: "innovation speed",
        after: "the speed of innovation",
        type: "word_order",
        reason: "Use a natural noun phrase.",
        sourceSentence: "The speed of innovation matters.",
        writingMode: "natural",
        createdAt: now,
        updatedAt: "2026-05-12T04:00:00.000Z",
        useCount: 11,
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
        useCount: 20,
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
        useCount: 11,
      },
    ];

    const insights = aggregateWritingHabits(items);

    expect(insights[0]).toMatchObject({
      type: "collocation",
      titleZh: "搭配问题",
      count: 31,
      severity: "high",
    });
    expect(insights[0].examples).toHaveLength(2);
    expect(insights[1]).toMatchObject({ type: "word_order", count: 11, severity: "medium" });
    expect(insights[2]).toMatchObject({ type: "other", count: 10, severity: "low" });
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

describe("document map cache", () => {
  const sampleRecord: DocumentMapCacheRecord = {
    cacheKey: "archive-1|hash|topic|outline|education|model",
    archiveId: "archive-1",
    textHash: "hash",
    essayTopic: "How exam pressure affects students",
    outlinePointsHash: "outline",
    essayTopicHash: "topic-hash",
    paragraphFingerprints: [
      {
        paragraphId: "p1",
        range: { start: 0, end: 40 },
        hash: "paragraph-hash",
        wordCount: 16,
      },
    ],
    freshness: "ready",
    generatedAt: "2026-05-17T00:00:00.000Z",
    autoCheckCountInSession: 0,
    domain: "education",
    model: "model",
    createdAt: "2026-05-17T00:00:00.000Z",
    result: {
      overallMainIdeaZh: "文章主要讨论考试压力对学生学习方式的影响。",
      structureSummaryZh: "背景 -> 原因 -> 影响",
      paragraphs: [
        {
          paragraphId: "p1",
          index: 1,
          range: { start: 0, end: 40 },
          roleZh: "背景 + 立场",
          mainPointZh: "提出考试压力影响学习方式。",
          status: "healthy",
          healthSummaryZh: "主旨清楚。",
          relationToPreviousZh: null,
          issueRefs: [],
        },
      ],
      globalIssues: [],
      nextActions: [],
    },
  };

  it("stores document map cache records and replaces the same cache key", () => {
    const storage = createMemoryStorage();
    const first = upsertDocumentMapCache(storage, [], sampleRecord);
    const second = upsertDocumentMapCache(storage, first, {
      ...sampleRecord,
      createdAt: "2026-05-17T00:01:00.000Z",
      result: {
        ...sampleRecord.result,
        structureSummaryZh: "更新后的结构判断",
      },
    });

    expect(second).toHaveLength(1);
    expect(second[0].result.structureSummaryZh).toBe("更新后的结构判断");
    expect(loadDocumentMapCache(storage)[0].createdAt).toBe("2026-05-17T00:01:00.000Z");
  });

  it("caps saved document map cache records to recent entries", () => {
    const storage = createMemoryStorage();
    const records = Array.from({ length: 26 }, (_, index): DocumentMapCacheRecord => ({
      ...sampleRecord,
      cacheKey: `cache-${index}`,
      createdAt: `2026-05-17T00:${String(index).padStart(2, "0")}:00.000Z`,
    }));

    const saved = saveDocumentMapCache(storage, records);

    expect(saved).toHaveLength(20);
    expect(saved[0].cacheKey).toBe("cache-25");
    expect(JSON.parse(storage.getItem(DOCUMENT_MAP_CACHE_STORAGE_KEY) ?? "[]")).toHaveLength(20);
  });

  it("loads legacy document map cache items without schema upgrades", () => {
    const storage = createMemoryStorage({
      [DOCUMENT_MAP_CACHE_STORAGE_KEY]: JSON.stringify([
        {
          cacheKey: "archive-legacy|hash|topic|outline|education|model",
          archiveId: "archive-legacy",
          textHash: "legacy-hash",
          essayTopic: "Legacy topic",
          outlinePointsHash: "legacy-outline",
          domain: "education",
          model: "gpt-4o-mini",
          createdAt: "2026-05-16T00:00:00.000Z",
          result: {
            overallMainIdeaZh: "Legacy map summary",
            structureSummaryZh: "Legacy structure",
            paragraphs: [
              {
                paragraphId: "p1",
                index: 1,
                range: { start: 0, end: 1 },
                roleZh: "背景",
                mainPointZh: "Legacy main point",
                status: "healthy",
                healthSummaryZh: "Legacy status",
                issueRefs: [],
                relationToPreviousZh: null,
              },
            ],
            globalIssues: [],
            nextActions: [],
          },
        },
      ]),
    });

    const loaded = loadDocumentMapCache(storage);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toMatchObject({
      cacheKey: "archive-legacy|hash|topic|outline|education|model",
      freshness: "ready",
    });
    expect(loaded[0].paragraphFingerprints).toEqual([]);
  });
});

describe("placeholder suggestion cache", () => {
  const now = "2026-05-16T00:00:00.000Z";

  const sampleCacheItem: PlaceholderSuggestionCacheRecord = {
    id: "record-1",
    requestKey: "archive-1|natural|balanced|education|I miss Chinese phrases.",
    requestInputSnapshot: {
      writingMode: "natural" as const,
      enhancementLevel: "balanced" as const,
      domain: "education",
    },
    archiveId: "archive-1",
    originalSentence: "I miss Chinese phrases.",
    finalSentence: "I still miss Chinese phrases.",
    explanationZh: "Use concise wording.",
    taskType: "mixed_chinese_rewrite",
    hasChinese: true,
    markerState: "available" as const,
    reviewed: false,
    latestSentenceRange: { start: 0, end: 25, sentence: "I miss Chinese phrases." },
    reviewedRange: { start: 0, end: 25, sentence: "I miss Chinese phrases." },
    placeholderRange: {
      sentence: "I miss Chinese phrases.",
      start: 0,
      end: 25,
      placeholders: [{ text: "Chinese", start: 7, end: 13 }],
    },
    placeholderHint: {
      sourceText: "Chinese",
      targetText: "Chinese",
      structure: "noun phrase",
    },
    updatedAt: now,
  };

  it("stores and caps placeholder suggestion cache entries", () => {
    const storage = createMemoryStorage();
    const items = Array.from({ length: 121 }, (_, index) => ({
      ...sampleCacheItem,
      id: `record-${index + 1}`,
      requestKey: `archive-1|natural|balanced|education|sentence ${index + 1}`,
      updatedAt: `2026-05-16T00:${String(index).padStart(2, "0")}:00.000Z`,
      latestSentenceRange: {
        ...sampleCacheItem.latestSentenceRange,
        start: index,
        end: index + 10,
        sentence: `sentence ${index + 1}`,
      },
      reviewedRange: {
        ...sampleCacheItem.reviewedRange,
        start: index,
        end: index + 10,
        sentence: `sentence ${index + 1}`,
      },
      originalSentence: `sentence ${index + 1}`,
      finalSentence: `improved sentence ${index + 1}`,
    }));

    const saved = savePlaceholderSuggestionCache(storage, items);
    expect(saved).toHaveLength(120);
    expect(JSON.parse(storage.getItem(PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY) ?? "[]")).toHaveLength(120);
  });

  it("dedupes placeholder cache records by request key and keeps the newest", () => {
    const storage = createMemoryStorage();
    const first = { ...sampleCacheItem };
    const second = {
      ...sampleCacheItem,
      id: "record-2",
      finalSentence: "I miss Chinese vocabulary.",
      updatedAt: "2026-05-16T00:05:00.000Z",
    };

    let cache = upsertPlaceholderSuggestionCache(storage, [], first);
    cache = upsertPlaceholderSuggestionCache(storage, cache, second);

    expect(cache).toHaveLength(1);
    expect(cache[0].finalSentence).toBe("I miss Chinese vocabulary.");
    expect(cache[0].updatedAt).toBe("2026-05-16T00:05:00.000Z");
    expect(loadPlaceholderSuggestionCache(storage)[0].finalSentence).toBe("I miss Chinese vocabulary.");
  });
});
