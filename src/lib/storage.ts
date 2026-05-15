import type {
  ApiConfig,
  CorrectionDraft,
  CorrectionEvent,
  CorrectionEventDraft,
  CorrectionEventType,
  CorrectionMemory,
  LearningItem,
  LearningItemDraft,
  LearningItemType,
  ParagraphHealthCacheItem,
  ParagraphIssueType,
  WritingHabitInsight,
  WritingMode,
} from "./llm/types";
import { normalizePersonalDictionary } from "./proofreading";

export const API_SETTINGS_STORAGE_KEY = "linguatype.apiSettings.v1";
export const LEARNING_HISTORY_STORAGE_KEY = "linguatype.learningHistory.v1";
export const LEARNING_LIBRARY_STORAGE_KEY = "linguatype.learningLibrary.v1";
export const CORRECTION_MEMORY_STORAGE_KEY = "linguatype.correctionMemory.v1";
export const CORRECTION_EVENTS_STORAGE_KEY = "linguatype.correctionEvents.v1";
export const PARAGRAPH_HEALTH_CACHE_STORAGE_KEY = "linguatype.paragraphHealthCache.v1";
export const TRIGGER_SETTINGS_STORAGE_KEY = "linguatype.triggerSettings.v1";
export const PERSONAL_DICTIONARY_STORAGE_KEY = "linguatype.personalDictionary.v1";
export const DRAFT_STORAGE_KEY = "linguatype.writingDraft.v1";
export const WRITING_SETUP_STORAGE_KEY = "linguatype.writingSetup.v1";
export const WRITING_ARCHIVES_STORAGE_KEY = "linguatype.writingArchives.v1";
export const THEME_SETTINGS_STORAGE_KEY = "linguatype.themeSettings.v1";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type WritingTopicArea =
  | "technology"
  | "personal_growth"
  | "history"
  | "art"
  | "education"
  | "society"
  | "environment"
  | "business"
  | "custom";

export type WritingSetup = {
  topicArea: WritingTopicArea;
  customTopicArea?: string;
  essayTopic: string;
  outlinePoints: string[];
  outline?: string;
  updatedAt: string;
};

export type WritingArchiveItem = {
  id: string;
  title: string;
  text: string;
  setup: WritingSetup | null;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
  topicAreaSource?: "auto" | "manual";
  topicAreaClassifiedAt?: string;
  topicAreaClassifiedText?: string;
};

export type WritingArchivesState = {
  activeId: string | null;
  items: WritingArchiveItem[];
};

export type ThemePreference = "light" | "dark" | "system";

export type ThemeSettings = {
  preference: ThemePreference;
  updatedAt: string;
};

export type TriggerSettings = {
  sentenceEnhancementShortcut: "ctrl_enter" | "ctrl_j_legacy" | "button_only" | "disable_shortcut";
  inlineExpressionMenuTrigger: "ctrl_k" | "floating_button" | "disabled";
  paragraphHealthTrigger: "after_every_apply" | "after_3_applied_edits" | "manual_only" | "off";
  writingHabitsFeedback: "badge" | "manual_only";
  statusFeedbackStyle: "popover_footer" | "inline" | "toast";
  popoverBehavior: {
    autoCloseAfterApply: boolean;
    escapeCloses: boolean;
    suppressLargePanelAutoOpen: boolean;
  };
};

export type UpsertLearningItemsOptions = {
  sourceSentence: string;
  writingMode: WritingMode;
  now?: string;
  createId?: () => string;
};

export type UpsertCorrectionMemoryOptions = UpsertLearningItemsOptions;
export type UpsertCorrectionEventsOptions = UpsertLearningItemsOptions;

export type LearningLibraryFilters = {
  query?: string;
  type?: LearningItemType | "all";
  writingMode?: WritingMode | "all";
  difficultyLevel?: LearningItemDifficulty | "all";
  favoriteOnly?: boolean;
  sortBy?: "updatedAt" | "useCount";
};

export type LearningItemDifficulty = 1 | 2 | 3 | 4 | 5;

export function defaultApiSettings(): ApiConfig {
  return {
    provider: "openai-compatible",
    baseUrl: "",
    endpointPath: "/v1/chat/completions",
    apiKey: "",
    model: "",
    temperature: 0.2,
    maxTokens: 20000,
    supportsJsonMode: false,
    mockMode: false,
  };
}

export function defaultTriggerSettings(): TriggerSettings {
  return {
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
  };
}

export function defaultWritingSetup(now = new Date().toISOString()): WritingSetup {
  return {
    topicArea: "custom",
    essayTopic: "",
    outlinePoints: ["", "", ""],
    outline: "",
    updatedAt: now,
  };
}

export function defaultThemeSettings(now = new Date().toISOString()): ThemeSettings {
  return {
    preference: "system",
    updatedAt: now,
  };
}

export function loadWritingSetupFromStorage(storage: StorageLike): WritingSetup | null {
  const stored = parseObject(storage.getItem(WRITING_SETUP_STORAGE_KEY));
  if (!stored) {
    return null;
  }
  return normalizeWritingSetup(stored);
}

export function saveWritingSetup(storage: StorageLike, setup: WritingSetup): WritingSetup {
  const normalized = normalizeWritingSetup(setup as unknown as Record<string, unknown>);
  storage.setItem(WRITING_SETUP_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadWritingArchivesFromStorage(
  storage: StorageLike,
  options: { now?: string; createId?: () => string } = {},
): WritingArchivesState {
  const stored = parseObject(storage.getItem(WRITING_ARCHIVES_STORAGE_KEY));
  if (stored) {
    return normalizeWritingArchives(stored);
  }

  const legacyText = storage.getItem(DRAFT_STORAGE_KEY) ?? "";
  const legacySetup = loadWritingSetupFromStorage(storage);
  if (!legacyText.trim() && !legacySetup) {
    return { activeId: null, items: [] };
  }

  const now = options.now ?? new Date().toISOString();
  const id = options.createId?.() ?? crypto.randomUUID();
  const migrated: WritingArchivesState = {
    activeId: id,
    items: [
      {
        id,
        title: writingArchiveTitleFromSetup(legacySetup),
        text: legacyText,
        setup: legacySetup,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      },
    ],
  };
  storage.setItem(WRITING_ARCHIVES_STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function saveWritingArchives(storage: StorageLike, state: WritingArchivesState): WritingArchivesState {
  const normalized = normalizeWritingArchives(state as unknown as Record<string, unknown>);
  storage.setItem(WRITING_ARCHIVES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function writingArchiveTitleFromSetup(setup: WritingSetup | null | undefined): string {
  const topic = setup?.essayTopic.trim();
  return topic || "未命名写作";
}

export function loadThemeSettingsFromStorage(storage: StorageLike): ThemeSettings {
  return normalizeThemeSettings(parseObject(storage.getItem(THEME_SETTINGS_STORAGE_KEY)));
}

export function saveThemeSettings(storage: StorageLike, settings: ThemeSettings): ThemeSettings {
  const normalized = normalizeThemeSettings(settings as unknown as Record<string, unknown>);
  storage.setItem(THEME_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadTriggerSettingsFromStorage(storage: StorageLike): TriggerSettings {
  return normalizeTriggerSettings(parseObject(storage.getItem(TRIGGER_SETTINGS_STORAGE_KEY)));
}

export function saveTriggerSettings(storage: StorageLike, settings: TriggerSettings): TriggerSettings {
  const normalized = normalizeTriggerSettings(settings as unknown as Record<string, unknown>);
  storage.setItem(TRIGGER_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadPersonalDictionaryFromStorage(storage: StorageLike): string[] {
  return normalizePersonalDictionary(parseStringArray(storage.getItem(PERSONAL_DICTIONARY_STORAGE_KEY)));
}

export function savePersonalDictionary(storage: StorageLike, terms: string[]): string[] {
  const normalized = normalizePersonalDictionary(terms);
  storage.setItem(PERSONAL_DICTIONARY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadLearningLibraryFromStorage(
  storage: StorageLike,
  options: { now?: string } = {},
): LearningItem[] {
  const storedLibrary = parseArray(storage.getItem(LEARNING_LIBRARY_STORAGE_KEY));
  if (storedLibrary.length > 0) {
    return storedLibrary.map((item) => normalizeLearningItem(item, options.now));
  }

  const legacyHistory = parseArray(storage.getItem(LEARNING_HISTORY_STORAGE_KEY));
  if (legacyHistory.length === 0) {
    return [];
  }

  const migrated = legacyHistory.map((item) => normalizeLearningItem(item, options.now));
  storage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function loadCorrectionMemoryFromStorage(storage: StorageLike): CorrectionMemory[] {
  return parseArray(storage.getItem(CORRECTION_MEMORY_STORAGE_KEY)).map((item) =>
    normalizeCorrectionMemory(item),
  );
}

export function loadCorrectionEventsFromStorage(storage: StorageLike): CorrectionEvent[] {
  const storedEvents = parseArray(storage.getItem(CORRECTION_EVENTS_STORAGE_KEY));
  if (storedEvents.length > 0) {
    return dedupeCorrectionEvents(storedEvents.map((item) => normalizeCorrectionEvent(item)));
  }

  const legacyMemory = parseArray(storage.getItem(CORRECTION_MEMORY_STORAGE_KEY));
  if (legacyMemory.length === 0) {
    return [];
  }

  const migrated = dedupeCorrectionEvents(
    legacyMemory.map((item) => normalizeCorrectionEvent({ ...item, type: mapLegacyCorrectionType(item.type) })),
  );
  storage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

export function upsertLearningItems(
  existing: LearningItem[],
  incoming: LearningItemDraft[],
  options: UpsertLearningItemsOptions,
): LearningItem[] {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const byKey = new Map(existing.map((item) => [learningKey(item), item]));

  for (const item of incoming) {
    const normalizedContent = item.content.trim();
    if (!normalizedContent) {
      continue;
    }
    if (!item.chineseMeaning.trim() && !item.usageNote.trim()) {
      continue;
    }

    const key = learningKey(item);
    const match = byKey.get(key);
    if (match) {
      byKey.set(key, {
        ...match,
        useCount: match.useCount + 1,
        updatedAt: now,
        lastUsedAt: now,
      });
      continue;
    }

    byKey.set(key, {
      id: createId(),
      type: item.type,
      content: normalizedContent,
      chineseMeaning: item.chineseMeaning,
      usageNote: item.usageNote,
      sourceSentence: options.sourceSentence,
      writingMode: options.writingMode,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      useCount: 1,
      favorite: false,
      tags: item.tags ?? [],
      topic: item.topic,
      difficultyLevel: normalizeDifficulty(item.difficultyLevel),
    });
  }

  return Array.from(byKey.values());
}

export function upsertCorrectionMemory(
  existing: CorrectionMemory[],
  incoming: CorrectionDraft[],
  options: UpsertCorrectionMemoryOptions,
): CorrectionMemory[] {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const byKey = new Map(existing.map((item) => [correctionKey(item), item]));

  for (const correction of incoming) {
    const before = correction.before.trim();
    const after = correction.after.trim();
    if (!before || !after || normalizeText(before) === normalizeText(after)) {
      continue;
    }

    const key = correctionKey(correction);
    const match = byKey.get(key);
    if (match) {
      byKey.set(key, {
        ...match,
        useCount: match.useCount + 1,
        updatedAt: now,
        lastUsedAt: now,
      });
      continue;
    }

    byKey.set(key, {
      id: createId(),
      before,
      after,
      type: correction.type,
      reason: correction.reason,
      sourceSentence: options.sourceSentence,
      writingMode: options.writingMode,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      useCount: 1,
    });
  }

  return Array.from(byKey.values());
}

export function upsertCorrectionEvents(
  existing: CorrectionEvent[],
  incoming: CorrectionEventDraft[],
  options: UpsertCorrectionEventsOptions,
): CorrectionEvent[] {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const byKey = new Map(existing.map((item) => [correctionEventKey(item), item]));

  for (const event of incoming) {
    const before = event.before.trim();
    const after = event.after.trim();
    if (!before || !after || normalizeText(before) === normalizeText(after)) {
      continue;
    }

    const key = correctionEventKey(event);
    const match = byKey.get(key);
    if (match) {
      byKey.set(key, {
        ...match,
        useCount: match.useCount + 1,
        updatedAt: now,
        lastUsedAt: now,
      });
      continue;
    }

    byKey.set(key, {
      id: createId(),
      before,
      after,
      type: event.type,
      reason: event.reason,
      sourceSentence: options.sourceSentence,
      writingMode: options.writingMode,
      createdAt: now,
      updatedAt: now,
      lastUsedAt: now,
      useCount: 1,
    });
  }

  return Array.from(byKey.values());
}

export function filterLearningLibrary(
  items: LearningItem[],
  filters: LearningLibraryFilters,
): LearningItem[] {
  const query = filters.query?.trim().toLowerCase() ?? "";
  return [...items]
    .filter((item) => {
      if (query) {
        const searchable = `${item.content} ${item.chineseMeaning}`.toLowerCase();
        if (!searchable.includes(query)) {
          return false;
        }
      }
      if (filters.type && filters.type !== "all" && item.type !== filters.type) {
        return false;
      }
      if (
        filters.difficultyLevel &&
        filters.difficultyLevel !== "all" &&
        item.difficultyLevel !== filters.difficultyLevel
      ) {
        return false;
      }
      if (filters.favoriteOnly && !item.favorite) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === "useCount") {
        return b.useCount - a.useCount || b.updatedAt.localeCompare(a.updatedAt);
      }
      return b.updatedAt.localeCompare(a.updatedAt) || b.useCount - a.useCount;
    });
}

export function sortCorrectionMemory(items: CorrectionMemory[]): CorrectionMemory[] {
  return [...items].sort((a, b) => b.useCount - a.useCount || b.updatedAt.localeCompare(a.updatedAt));
}

export function aggregateWritingHabits(events: CorrectionEvent[]): WritingHabitInsight[] {
  const groups = new Map<CorrectionEventType, CorrectionEvent[]>();
  for (const event of events) {
    if (!event.before.trim() || !event.after.trim()) {
      continue;
    }
    const group = groups.get(event.type) ?? [];
    group.push(event);
    groups.set(event.type, group);
  }

  return Array.from(groups.entries())
    .map(([type, group]) => {
      const count = group.reduce((sum, event) => sum + Math.max(1, event.useCount), 0);
      const sortedExamples = [...group].sort(
        (a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.useCount - a.useCount,
      );
      const updatedAt = sortedExamples.reduce(
        (latest, event) => (event.updatedAt > latest ? event.updatedAt : latest),
        sortedExamples[0]?.updatedAt ?? new Date().toISOString(),
      );
      const severity: WritingHabitInsight["severity"] = count >= 31 ? "high" : count >= 11 ? "medium" : "low";
      const meta = WRITING_HABIT_META[type];

      return {
        id: `habit-${type}`,
        type,
        titleZh: meta.titleZh,
        summaryZh: meta.summaryZh,
        count,
        severity,
        examples: sortedExamples.slice(0, 3).map((event) => ({
          before: event.before,
          after: event.after,
          reason: event.reason,
          sourceSentence: event.sourceSentence,
        })),
        suggestionZh: meta.suggestionZh,
        updatedAt,
      } satisfies WritingHabitInsight;
    })
    .sort((a, b) =>
      severityRank(b.severity) - severityRank(a.severity) || b.count - a.count || b.updatedAt.localeCompare(a.updatedAt),
    )
    .slice(0, 5);
}

export function loadParagraphHealthCache(storage: StorageLike): ParagraphHealthCacheItem[] {
  return normalizeParagraphHealthCache(parseArray(storage.getItem(PARAGRAPH_HEALTH_CACHE_STORAGE_KEY)));
}

export function saveParagraphHealthCache(
  storage: StorageLike,
  items: ParagraphHealthCacheItem[],
): ParagraphHealthCacheItem[] {
  const normalized = normalizeParagraphHealthCache(items);
  storage.setItem(PARAGRAPH_HEALTH_CACHE_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function exportLearningLibraryJson(items: LearningItem[]): string {
  return JSON.stringify(items, null, 2);
}

export function exportWritingHabitsJson(events: CorrectionEvent[]): string {
  return JSON.stringify(aggregateWritingHabits(events), null, 2);
}

export function learningKey(item: Pick<LearningItemDraft, "type" | "content">): string {
  return `${item.type}:${normalizeText(item.content)}`;
}

export function correctionKey(item: Pick<CorrectionDraft, "before" | "after" | "type">): string {
  return `${item.type}:${normalizeText(item.before)}:${normalizeText(item.after)}`;
}

export function correctionEventKey(item: Pick<CorrectionEventDraft, "before" | "after" | "type">): string {
  return `${item.type}:${normalizeText(item.before)}:${normalizeText(item.after)}`;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

function parseArray(value: string | null): Array<Record<string, unknown>> {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
  } catch {
    return [];
  }
}

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseObject(value: string | null): Record<string, unknown> | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function normalizeTriggerSettings(value?: Record<string, unknown>): TriggerSettings {
  const defaults = defaultTriggerSettings();
  const popoverBehavior = isRecord(value?.popoverBehavior) ? value.popoverBehavior : {};
  return {
    sentenceEnhancementShortcut: isSentenceEnhancementShortcut(value?.sentenceEnhancementShortcut)
      ? value.sentenceEnhancementShortcut
      : defaults.sentenceEnhancementShortcut,
    inlineExpressionMenuTrigger: isInlineExpressionMenuTrigger(value?.inlineExpressionMenuTrigger)
      ? value.inlineExpressionMenuTrigger
      : defaults.inlineExpressionMenuTrigger,
    paragraphHealthTrigger: isParagraphHealthTrigger(value?.paragraphHealthTrigger)
      ? value.paragraphHealthTrigger
      : defaults.paragraphHealthTrigger,
    writingHabitsFeedback: isWritingHabitsFeedback(value?.writingHabitsFeedback)
      ? value.writingHabitsFeedback
      : defaults.writingHabitsFeedback,
    statusFeedbackStyle: isStatusFeedbackStyle(value?.statusFeedbackStyle)
      ? value.statusFeedbackStyle
      : defaults.statusFeedbackStyle,
    popoverBehavior: {
      autoCloseAfterApply: typeof popoverBehavior.autoCloseAfterApply === "boolean"
        ? popoverBehavior.autoCloseAfterApply
        : defaults.popoverBehavior.autoCloseAfterApply,
      escapeCloses: true,
      suppressLargePanelAutoOpen: typeof popoverBehavior.suppressLargePanelAutoOpen === "boolean"
        ? popoverBehavior.suppressLargePanelAutoOpen
        : defaults.popoverBehavior.suppressLargePanelAutoOpen,
    },
  };
}

function normalizeWritingSetup(value: Record<string, unknown>): WritingSetup {
  const defaults = defaultWritingSetup();
  const topicArea = isWritingTopicArea(value.topicArea) ? value.topicArea : defaults.topicArea;
  const customTopicArea = value.topicArea === "custom" ? stringOr(value.customTopicArea, "").trim() : "";
  const outlinePoints = normalizeOutlinePoints(value.outlinePoints, stringOr(value.outline, ""));
  const outline = outlinePoints.join("\n");
  return {
    topicArea,
    customTopicArea: topicArea === "custom" && customTopicArea ? customTopicArea : undefined,
    essayTopic: stringOr(value.essayTopic, "").trim(),
    outlinePoints,
    outline,
    updatedAt: stringOr(value.updatedAt, defaults.updatedAt),
  };
}

function normalizeWritingArchives(value: Record<string, unknown>): WritingArchivesState {
  const items = Array.isArray(value.items)
    ? value.items.filter(isRecord).map(normalizeWritingArchiveItem)
    : [];
  const activeId = typeof value.activeId === "string" && items.some((item) => item.id === value.activeId)
    ? value.activeId
    : items[0]?.id ?? null;
  return { activeId, items };
}

function normalizeWritingArchiveItem(value: Record<string, unknown>): WritingArchiveItem {
  const now = new Date().toISOString();
  const rawSetup = isRecord(value.setup) ? normalizeWritingSetup(value.setup) : null;
  const createdAt = stringOr(value.createdAt, now);
  return {
    id: stringOr(value.id, crypto.randomUUID()),
    title: stringOr(value.title, "").trim() || writingArchiveTitleFromSetup(rawSetup),
    text: stringOr(value.text, ""),
    setup: rawSetup,
    createdAt,
    updatedAt: stringOr(value.updatedAt, createdAt),
    lastOpenedAt: typeof value.lastOpenedAt === "string" ? value.lastOpenedAt : undefined,
    topicAreaSource: isTopicAreaSource(value.topicAreaSource) ? value.topicAreaSource : undefined,
    topicAreaClassifiedAt: typeof value.topicAreaClassifiedAt === "string" ? value.topicAreaClassifiedAt : undefined,
    topicAreaClassifiedText: typeof value.topicAreaClassifiedText === "string" ? value.topicAreaClassifiedText : undefined,
  };
}

function normalizeOutlinePoints(value: unknown, legacyOutline: string): string[] {
  const rawPoints = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : legacyOutline.split(/\r?\n/u);
  const normalized = rawPoints.map((item) => item.trim()).filter(Boolean);
  if (normalized.length === 0) {
    return ["", "", ""];
  }
  return normalized.slice(0, 12);
}

function normalizeThemeSettings(value?: Record<string, unknown>): ThemeSettings {
  const defaults = defaultThemeSettings();
  return {
    preference: isThemePreference(value?.preference) ? value.preference : defaults.preference,
    updatedAt: stringOr(value?.updatedAt, defaults.updatedAt),
  };
}

function normalizeLearningItem(item: Record<string, unknown>, fallbackNow?: string): LearningItem {
  const now = fallbackNow ?? new Date().toISOString();
  const createdAt = stringOr(item.createdAt, now);
  return {
    id: stringOr(item.id, crypto.randomUUID()),
    type: isLearningItemType(item.type) ? item.type : "phrase",
    content: stringOr(item.content, ""),
    chineseMeaning: stringOr(item.chineseMeaning, ""),
    usageNote: stringOr(item.usageNote, ""),
    sourceSentence: stringOr(item.sourceSentence, ""),
    writingMode: isWritingMode(item.writingMode) ? item.writingMode : "natural",
    createdAt,
    updatedAt: stringOr(item.updatedAt, createdAt),
    lastUsedAt: typeof item.lastUsedAt === "string" ? item.lastUsedAt : undefined,
    useCount: typeof item.useCount === "number" && Number.isFinite(item.useCount) ? item.useCount : 1,
    favorite: typeof item.favorite === "boolean" ? item.favorite : false,
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
    topic: typeof item.topic === "string" ? item.topic : undefined,
    difficultyLevel: normalizeDifficulty(item.difficultyLevel),
  };
}

function normalizeCorrectionMemory(item: Record<string, unknown>): CorrectionMemory {
  const now = new Date().toISOString();
  const createdAt = stringOr(item.createdAt, now);
  return {
    id: stringOr(item.id, crypto.randomUUID()),
    before: stringOr(item.before, ""),
    after: stringOr(item.after, ""),
    type: isCorrectionType(item.type) ? item.type : "polishing",
    reason: stringOr(item.reason, ""),
    sourceSentence: stringOr(item.sourceSentence, ""),
    writingMode: isWritingMode(item.writingMode) ? item.writingMode : "natural",
    createdAt,
    updatedAt: stringOr(item.updatedAt, createdAt),
    lastUsedAt: typeof item.lastUsedAt === "string" ? item.lastUsedAt : undefined,
    useCount: typeof item.useCount === "number" && Number.isFinite(item.useCount) ? item.useCount : 1,
  };
}

function normalizeCorrectionEvent(item: Record<string, unknown>): CorrectionEvent {
  const now = new Date().toISOString();
  const createdAt = stringOr(item.createdAt, now);
  return {
    id: stringOr(item.id, crypto.randomUUID()),
    before: stringOr(item.before, ""),
    after: stringOr(item.after, ""),
    type: isCorrectionEventType(item.type) ? item.type : "other",
    reason: stringOr(item.reason, ""),
    sourceSentence: stringOr(item.sourceSentence, ""),
    writingMode: isWritingMode(item.writingMode) ? item.writingMode : "natural",
    createdAt,
    updatedAt: stringOr(item.updatedAt, createdAt),
    lastUsedAt: typeof item.lastUsedAt === "string" ? item.lastUsedAt : undefined,
    useCount: typeof item.useCount === "number" && Number.isFinite(item.useCount) ? item.useCount : 1,
  };
}

function dedupeCorrectionEvents(events: CorrectionEvent[]): CorrectionEvent[] {
  const byKey = new Map<string, CorrectionEvent>();
  for (const event of events) {
    if (!event.before.trim() || !event.after.trim() || normalizeText(event.before) === normalizeText(event.after)) {
      continue;
    }
    const key = correctionEventKey(event);
    const match = byKey.get(key);
    if (!match) {
      byKey.set(key, event);
      continue;
    }
    byKey.set(key, {
      ...match,
      useCount: match.useCount + event.useCount,
      updatedAt: event.updatedAt > match.updatedAt ? event.updatedAt : match.updatedAt,
      lastUsedAt: event.lastUsedAt ?? match.lastUsedAt,
    });
  }
  return Array.from(byKey.values());
}

function normalizeParagraphHealthCache(
  items: Array<Record<string, unknown> | ParagraphHealthCacheItem>,
): ParagraphHealthCacheItem[] {
  const byFingerprint = new Map<string, ParagraphHealthCacheItem>();
  for (const item of items) {
    const fingerprint = stringOr(item.paragraphFingerprint, "");
    const rawResult = isRecord(item.result) ? item.result : undefined;
    if (!fingerprint || !rawResult) {
      continue;
    }
    const result = {
      paragraphFingerprint: stringOr(rawResult.paragraphFingerprint, fingerprint),
      hasIssues: typeof rawResult.hasIssues === "boolean" ? rawResult.hasIssues : false,
      issueCount: typeof rawResult.issueCount === "number" && Number.isFinite(rawResult.issueCount)
        ? Math.max(0, Math.floor(rawResult.issueCount))
        : 0,
      issueTypes: Array.isArray(rawResult.issueTypes)
        ? rawResult.issueTypes.filter(isParagraphIssueType)
        : [],
      shortSummaryZh: stringOr(rawResult.shortSummaryZh, ""),
    };
    const normalized: ParagraphHealthCacheItem = {
      paragraphFingerprint: fingerprint,
      result,
      checkedAt: stringOr(item.checkedAt, new Date().toISOString()),
    };
    const match = byFingerprint.get(fingerprint);
    if (!match || normalized.checkedAt > match.checkedAt) {
      byFingerprint.set(fingerprint, normalized);
    }
  }

  return Array.from(byFingerprint.values())
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
    .slice(0, 20);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function isLearningItemType(value: unknown): value is LearningItemType {
  return value === "phrase" || value === "collocation" || value === "sentence_pattern";
}

function isWritingMode(value: unknown): value is WritingMode {
  return value === "natural" || value === "ielts" || value === "academic" || value === "business" || value === "concise";
}

function isWritingTopicArea(value: unknown): value is WritingTopicArea {
  return (
    value === "technology" ||
    value === "personal_growth" ||
    value === "history" ||
    value === "art" ||
    value === "education" ||
    value === "society" ||
    value === "environment" ||
    value === "business" ||
    value === "custom"
  );
}

function isTopicAreaSource(value: unknown): value is "auto" | "manual" {
  return value === "auto" || value === "manual";
}

function normalizeDifficulty(value: unknown): LearningItemDifficulty {
  if (typeof value === "number" && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    if (normalized >= 1 && normalized <= 5) {
      return normalized as LearningItemDifficulty;
    }
  }
  return 3;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function isCorrectionType(value: unknown): value is CorrectionMemory["type"] {
  return (
    value === "expression_translation" ||
    value === "grammar" ||
    value === "word_order" ||
    value === "collocation" ||
    value === "tone" ||
    value === "coherence" ||
    value === "polishing"
  );
}

function isCorrectionEventType(value: unknown): value is CorrectionEventType {
  return (
    value === "singular_plural" ||
    value === "tense" ||
    value === "article" ||
    value === "word_order" ||
    value === "collocation" ||
    value === "preposition" ||
    value === "repetition" ||
    value === "tone" ||
    value === "chinese_transfer" ||
    value === "coherence" ||
    value === "polishing" ||
    value === "other"
  );
}

function isParagraphIssueType(value: unknown): value is ParagraphIssueType {
  return (
    value === "repetition" ||
    value === "transition" ||
    value === "pronoun_reference" ||
    value === "logic_gap" ||
    value === "sentence_order" ||
    value === "tone_consistency" ||
    value === "weak_development"
  );
}

function isSentenceEnhancementShortcut(value: unknown): value is TriggerSettings["sentenceEnhancementShortcut"] {
  return value === "ctrl_enter" || value === "ctrl_j_legacy" || value === "button_only" || value === "disable_shortcut";
}

function isInlineExpressionMenuTrigger(value: unknown): value is TriggerSettings["inlineExpressionMenuTrigger"] {
  return value === "ctrl_k" || value === "floating_button" || value === "disabled";
}

function isParagraphHealthTrigger(value: unknown): value is TriggerSettings["paragraphHealthTrigger"] {
  return value === "after_every_apply" || value === "after_3_applied_edits" || value === "manual_only" || value === "off";
}

function isWritingHabitsFeedback(value: unknown): value is TriggerSettings["writingHabitsFeedback"] {
  return value === "badge" || value === "manual_only";
}

function isStatusFeedbackStyle(value: unknown): value is TriggerSettings["statusFeedbackStyle"] {
  return value === "popover_footer" || value === "inline" || value === "toast";
}

function mapLegacyCorrectionType(value: unknown): CorrectionEventType {
  if (value === "expression_translation") {
    return "chinese_transfer";
  }
  if (
    value === "word_order" ||
    value === "collocation" ||
    value === "tone" ||
    value === "coherence" ||
    value === "polishing"
  ) {
    return value;
  }
  return "other";
}

function severityRank(severity: WritingHabitInsight["severity"]): number {
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  return 1;
}

const WRITING_HABIT_META: Record<
  CorrectionEventType,
  Pick<WritingHabitInsight, "titleZh" | "summaryZh" | "suggestionZh">
> = {
  singular_plural: {
    titleZh: "Singular/plural issues",
    summaryZh: "You sometimes mix singular and plural forms in countable nouns or general statements.",
    suggestionZh: "Next time, check noun form after words like many, several, and one of.",
  },
  tense: {
    titleZh: "Tense consistency issues",
    summaryZh: "You sometimes mix tenses when describing general facts, past events, or opinions.",
    suggestionZh: "Before revising, decide whether the sentence describes a general fact or a past event.",
  },
  article: {
    titleZh: "Article issues",
    summaryZh: "You sometimes omit a, an, or the, or switch unclearly between general and specific nouns.",
    suggestionZh: "When using a singular countable noun, check whether it needs a, an, or the.",
  },
  word_order: {
    titleZh: "Word order issues",
    summaryZh: "Chinese word order sometimes carries over into your English sentence structure.",
    suggestionZh: "Try locating the subject, verb, and object before adding modifiers or clauses.",
  },
  collocation: {
    titleZh: "搭配问题",
    summaryZh: "You sometimes translate Chinese verbs directly, which makes English collocations less natural.",
    suggestionZh: "When writing a verb + noun pair, check whether it is a common English collocation.",
  },
  preposition: {
    titleZh: "Preposition issues",
    summaryZh: "You sometimes use the wrong preposition in expressions like influence on or reason for.",
    suggestionZh: "Pay attention to the preposition that belongs with the noun, verb, or adjective.",
  },
  repetition: {
    titleZh: "Repetition issues",
    summaryZh: "You sometimes repeat the same connector or expression in nearby sentences.",
    suggestionZh: "After writing a paragraph, scan for repeated connectors or repeated nouns.",
  },
  tone: {
    titleZh: "Tone consistency issues",
    summaryZh: "You sometimes switch between formal, academic, and casual expression styles.",
    suggestionZh: "Choose the writing mode first, then keep vocabulary at a matching level of formality.",
  },
  chinese_transfer: {
    titleZh: "Chinese transfer issues",
    summaryZh: "You sometimes organize English directly from Chinese expression habits.",
    suggestionZh: "After mixed writing, reframe the idea with common English patterns and collocations.",
  },
  coherence: {
    titleZh: "Coherence issues",
    summaryZh: "Your sentence may be correct, but the logical link to nearby sentences can be unclear.",
    suggestionZh: "Check whether the new sentence adds a reason, contrast, example, or result.",
  },
  polishing: {
    titleZh: "Conciseness issues",
    summaryZh: "Your meaning is usually clear, but some sentences can become shorter and more natural.",
    suggestionZh: "After drafting, look for repeated words or literal structures that can be simplified.",
  },
  other: {
    titleZh: "Other expression issues",
    summaryZh: "These applied edits are useful signals but do not yet fit a more specific category.",
    suggestionZh: "Review the before and after examples as personal writing reminders.",
  },
};
