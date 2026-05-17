"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { waapi } from "animejs/waapi";
import { stagger } from "animejs/utils";
import type { Change } from "diff";
import { ApiSettingsPanel } from "./ApiSettingsModal";
import { DataControlPanel } from "./DataControlPanel";
import { DesignSelect } from "./DesignSelect";
import {
  DocumentMapPanel,
  type DocumentMapParagraphCheckView,
  type DocumentMapParagraphHealthViewState,
} from "./DocumentMapPanel";
import { EnhancementPopover } from "./EnhancementPopover";
import { LearningLibraryPanel } from "./LearningLibraryPanel";
import { SelectionActionsPopover } from "./SelectionActionsPopover";
import { EmptyState, ErrorState } from "./StateViews";
import { ThemePreferenceControl } from "./ThemePreferenceControl";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { useDismissableLayer } from "./useDismissableLayer";
import { WelcomeScreen } from "./WelcomeScreen";
import { WritingEditor, type WritingEditorHandle } from "./WritingEditor";
import { WritingHabitsPanel } from "./WritingHabitsPanel";
import {
  AdjustmentsHorizontalIcon,
  Bars3Icon,
  BookOpenIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  CommandLineIcon,
  DocumentCheckIcon,
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  TrashIcon,
} from "./HeroIcons";
import {
  createWordDiff,
  endsWithSentenceBoundary,
  extractChinesePlaceholderSentence,
  extractChinesePlaceholderSentences,
  extractCurrentParagraph,
  extractCurrentSentence,
  getCurrentParagraph,
  getPreviousContext,
  replaceLatestSentence,
  replaceRange,
  type ParagraphRange,
  type SentenceRange,
  type ChinesePlaceholderSentenceRange,
} from "@/lib/sentence";
import {
  createDemoDocumentMapCache,
  createDemoParagraphHealthCache,
  createDemoPlaceholderSuggestionCache,
  getDemoEnhancementResult,
  getDemoLearningExtractionResult,
  getDemoParagraphHealthResult,
  getDemoParagraphFlowResult,
  getDemoSelectionExplainResult,
  isDemoArchiveContext,
  isDemoWritingArchive,
} from "@/lib/demoArchive";
import { findExpressionReappearanceCues } from "@/lib/expressionReappearance";
import {
  createDocumentMapCacheKey,
  createDocumentMapOutlineHash,
  createDocumentMapTextHash,
  createDocumentMapParagraphFingerprints,
  DOCUMENT_MAP_AUTO_CHECK_RULES,
  documentMapModelKey,
  evaluateDocumentMapFreshness,
  splitDocumentIntoParagraphs,
  shouldQueueDocumentMapAutoCheck,
} from "@/lib/documentMap";
import { createParagraphFingerprint } from "@/lib/llm/normalize";
import { TOPIC_OPTIONS } from "@/lib/topicOptions";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  DOCUMENT_MAP_CACHE_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  loadPlaceholderSuggestionCache,
  removePlaceholderSuggestionCacheForArchive,
  upsertPlaceholderSuggestionCache,
  WRITING_ARCHIVES_STORAGE_KEY,
  defaultWritingSetup,
  defaultApiSettings,
  defaultThemeSettings,
  defaultTriggerSettings,
  loadCorrectionEventsFromStorage,
  loadDocumentMapCache,
  loadLearningLibraryFromStorage,
  loadParagraphHealthCache,
  loadPersonalDictionaryFromStorage,
  loadThemeSettingsFromStorage,
  loadTriggerSettingsFromStorage,
  loadWritingArchivesFromStorage,
  loadWritingSetupFromStorage,
  savePersonalDictionary,
  upsertDocumentMapCache,
  saveWritingArchives,
  saveParagraphHealthCache,
  saveThemeSettings,
  saveTriggerSettings,
  saveWritingSetup,
  type PlaceholderSuggestionCacheRecord,
  type ThemeSettings,
  upsertCorrectionEvents,
  upsertLearningItems,
  type TriggerSettings,
  type WritingArchivesState,
  type WritingArchiveItem,
  type WritingSetup,
  type WritingTopicArea,
  writingArchiveTitleFromSetup,
} from "@/lib/storage";
import type {
  ApiConfig,
  CorrectionEvent,
  CorrectionEventType,
  DocumentMapCacheRecord,
  DocumentMapParagraph,
  DocumentMapParagraphInput,
  DocumentMapFreshness,
  DocumentMapResult,
  EnhancementLevel,
  FastEnhanceInput,
  FastEnhanceResult,
  LearningExtractionResult,
  LearningItemDraft,
  LearningItem,
  OutlineCheckResult,
  ParagraphCheckResult,
  ParagraphHealthCacheItem,
  ParagraphHealthResult,
  SelectionExplainResult,
  WritingMode,
} from "@/lib/llm/types";

type PendingEnhancement = {
  requestId: string;
  snapshotFullText: string;
  latestSentenceRange: SentenceRange;
  originalSentence: string;
  requestInput: Omit<FastEnhanceInput, "apiConfig">;
  source?: "manual" | "placeholder";
  placeholderRequestKey?: string;
  placeholderRange?: ChinesePlaceholderSentenceRange;
  placeholderHint?: PlaceholderLearningHint;
  applied?: boolean;
  result?: FastEnhanceResult;
};

type CompletedEnhancement = PendingEnhancement & {
  result: FastEnhanceResult;
};

type SuggestionDisplayMode = "hidden" | "expanded";

type ReviewedSuggestion = CompletedEnhancement & {
  reviewedRange: SentenceRange;
  displaySentence: string;
  applied: boolean;
};

type PlaceholderSuggestionRecord = CompletedEnhancement & {
  id: string;
  archiveId: string | null;
  requestKey: string;
  markerState: "available" | "reviewed";
  reviewedRange: SentenceRange;
  displaySentence: string;
  applied: boolean;
};

type PlaceholderLearningHint = {
  sourceText: string;
  targetText: string;
  structure: string;
};

type PendingParagraphCheck = {
  requestId: string;
  snapshotFullText: string;
  paragraphRange: ParagraphRange;
  originalParagraph: string;
  result: ParagraphCheckResult;
};

type ParagraphCheckContext = {
  title: string;
  subtitle: string;
};

type DocumentMapTrigger = "manual" | "auto_idle" | "after_apply" | "after_outline_change";

type DocumentMapState =
  | { status: "idle"; message?: string }
  | { status: "loading"; message?: string }
  | { status: "empty" | "error"; message: string }
  | {
      status: "ready";
      result: DocumentMapResult;
      snapshotFullText: string;
      paragraphs: DocumentMapParagraphInput[];
      cacheKey: string;
      textHash: string;
      message?: string;
    };

type ErrorMessage = {
  message: string;
  rawResponse?: string;
};

type SelectionActionState = {
  start: number;
  end: number;
  selectedText: string;
  position?: { left: number; top: number };
  explanation?: SelectionExplainResult;
  message?: string;
  requested?: boolean;
};

type InlineSetupEditState =
  | { kind: "none" }
  | { kind: "topic"; draft: string }
  | { kind: "area"; draftArea: WritingTopicArea; draftCustomArea?: string }
  | { kind: "outline-point"; index: number; draft: string };

type WorkspaceView = "editor" | "library" | "habits" | "data" | "triggers" | "shortcuts" | "api";
type ResolvedTheme = "light" | "dark";

const WORKSPACE_NAV_ITEMS: Array<{ id: "library" | "habits" | "data"; label: string; icon: typeof BookOpenIcon }> = [
  { id: "library", label: "表达库", icon: BookOpenIcon },
  { id: "habits", label: "写作习惯", icon: ChartBarIcon },
  { id: "data", label: "数据管理", icon: CircleStackIcon },
];

const DOMAIN_OPTIONS: Array<{ value: WritingTopicArea; label: string }> = [
  { value: "technology", label: "科技" },
  { value: "personal_growth", label: "个人成长" },
  { value: "history", label: "历史" },
  { value: "art", label: "艺术" },
  { value: "education", label: "教育" },
  { value: "society", label: "社会" },
  { value: "environment", label: "环境" },
  { value: "business", label: "商业" },
  { value: "custom", label: "自定义" },
];

const WORKSPACE_EXIT_MOTION_DURATION = 520;

export function shouldShowWelcomeOnOpen({
  nodeEnv,
}: {
  nodeEnv: string | undefined;
  hasStoredArchives?: boolean;
  hasLegacyDraftText?: boolean;
  hasStoredSetup?: boolean;
}) {
  return nodeEnv !== "test";
}

export function LinguaTypeApp() {
  const editorRef = useRef<WritingEditorHandle>(null);
  const writingSurfaceRef = useRef<HTMLElement | null>(null);
  const healthCacheRef = useRef<ParagraphHealthCacheItem[]>([]);
  const documentMapCacheRef = useRef<DocumentMapCacheRecord[]>([]);
  const skipNextArchiveAutoSaveRef = useRef(false);
  const paragraphHealthStateRef = useRef(new Map<string, { isChecking: boolean; lastCheckedAt: number }>());
  const paragraphFlowCheckingFingerprintsRef = useRef(new Set<string>());
  const completedParagraphHealthFingerprintsRef = useRef(new Set<string>());
  const pendingCompletedParagraphHealthFingerprintsRef = useRef(new Set<string>());
  const completedParagraphModeInitializedRef = useRef(false);
  const workspaceExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeholderTriggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentMapHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentMapAutoCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const documentMapLastInputAtRef = useRef(0);
  const documentMotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expressionCueAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoredPlaceholderRequestKeyRef = useRef("");
  const placeholderRequestKeysRef = useRef<Set<string>>(new Set());
  const seenExpressionCueKeysRef = useRef<Set<string>>(new Set());
  const hasUserEditedForExpressionCuesRef = useRef(false);
  const [text, setText] = useState("");
  const [editorSelection, setEditorSelection] = useState({ start: 0, end: 0 });
  const [writingMode, setWritingMode] = useState<WritingMode>("natural");
  const [enhancementLevel, setEnhancementLevel] = useState<EnhancementLevel>("balanced");
  const [apiSettings, setApiSettings] = useState<ApiConfig>(() => defaultApiSettings());
  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>(() => defaultTriggerSettings());
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => defaultThemeSettings());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [writingArchives, setWritingArchives] = useState<WritingArchivesState>({ activeId: null, items: [] });
  const [writingSetup, setWritingSetup] = useState<WritingSetup | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [learningLibrary, setLearningLibrary] = useState<LearningItem[]>([]);
  const [correctionEvents, setCorrectionEvents] = useState<CorrectionEvent[]>([]);
  const [personalDictionary, setPersonalDictionary] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingEnhancement | null>(null);
  const [pendingParagraph, setPendingParagraph] = useState<PendingParagraphCheck | null>(null);
  const [paragraphCheckContext, setParagraphCheckContext] = useState<ParagraphCheckContext | null>(null);
  const [documentMapParagraphHealthById, setDocumentMapParagraphHealthById] = useState<
    Record<string, DocumentMapParagraphHealthViewState>
  >({});
  const [documentMapState, setDocumentMapState] = useState<DocumentMapState>({ status: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isParagraphLoading, setIsParagraphLoading] = useState(false);
  const [outlineCheckResult, setOutlineCheckResult] = useState<OutlineCheckResult | null>(null);
  const [outlineCheckMessage, setOutlineCheckMessage] = useState("");
  const [isOutlineChecking, setIsOutlineChecking] = useState(false);
  const [error, setError] = useState<ErrorMessage | null>(null);
  const [paragraphMessage, setParagraphMessage] = useState("");
  const [, setLearningExtractionMessage] = useState("");
  const [empty, setEmpty] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [paragraphConflictMessage, setParagraphConflictMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [suggestionDisplayMode, setSuggestionDisplayMode] = useState<SuggestionDisplayMode>("hidden");
  const [reviewedSuggestion, setReviewedSuggestion] = useState<ReviewedSuggestion | null>(null);
  const [placeholderSuggestions, setPlaceholderSuggestions] = useState<PlaceholderSuggestionRecord[]>([]);
  const [placeholderSuggestionCache, setPlaceholderSuggestionCache] = useState<PlaceholderSuggestionCacheRecord[]>([]);
  const [activePlaceholderInsight, setActivePlaceholderInsight] = useState(false);
  const [activeSuggestionDiffId, setActiveSuggestionDiffId] = useState<string | null>(null);
  const [freshExpressionCueIds, setFreshExpressionCueIds] = useState<Set<string>>(() => new Set());
  const [selectionAction, setSelectionAction] = useState<SelectionActionState | null>(null);
  const [isSelectionLoading, setIsSelectionLoading] = useState(false);
  const [isDocumentMapPanelOpen, setIsDocumentMapPanelOpen] = useState(false);
  const [isDocumentMapAutoChecking, setIsDocumentMapAutoChecking] = useState(false);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<WorkspaceView>("editor");
  const [pendingWorkspaceView, setPendingWorkspaceView] = useState<WorkspaceView | null>(null);
  const [documentMotionReason, setDocumentMotionReason] = useState<"idle" | "new" | "switch">("idle");
  const [archiveSidebarCollapsed, setArchiveSidebarCollapsed] = useState(false);
  const [openArchiveMenuId, setOpenArchiveMenuId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [renamingArchiveId, setRenamingArchiveId] = useState<string | null>(null);
  const [inlineSetupEdit, setInlineSetupEdit] = useState<InlineSetupEditState>({ kind: "none" });
  const [hasUnseenLearningUpdates, setHasUnseenLearningUpdates] = useState(false);

  function ensureWritableArchiveState(state: WritingArchivesState): WritingArchivesState {
    if (state.items.length === 0) {
      const item = createBlankArchive();
      return { activeId: item.id, items: [item] };
    }

    if (state.activeId && state.items.some((item) => item.id === state.activeId)) {
      return state;
    }

    return { ...state, activeId: state.items[0].id };
  }

  function requestWorkspaceView(nextView: WorkspaceView) {
    if (workspaceExitTimerRef.current) {
      clearTimeout(workspaceExitTimerRef.current);
      workspaceExitTimerRef.current = null;
    }

    if (nextView === activeWorkspaceView && !pendingWorkspaceView) {
      return;
    }

    if (activeWorkspaceView !== "editor") {
      setPendingWorkspaceView(nextView);
      workspaceExitTimerRef.current = setTimeout(() => {
        setActiveWorkspaceView(nextView);
        setPendingWorkspaceView(null);
        workspaceExitTimerRef.current = null;
      }, WORKSPACE_EXIT_MOTION_DURATION);
      return;
    }

    setPendingWorkspaceView(null);
    setActiveWorkspaceView(nextView);
  }

  useEffect(() => {
    return () => {
      if (documentMotionTimerRef.current) {
        clearTimeout(documentMotionTimerRef.current);
        documentMotionTimerRef.current = null;
      }
      if (expressionCueAnimationTimerRef.current) {
        clearTimeout(expressionCueAnimationTimerRef.current);
        expressionCueAnimationTimerRef.current = null;
      }
      if (documentMapAutoCheckTimerRef.current) {
        clearTimeout(documentMapAutoCheckTimerRef.current);
        documentMapAutoCheckTimerRef.current = null;
      }
      if (workspaceExitTimerRef.current) {
        clearTimeout(workspaceExitTimerRef.current);
      }
      if (placeholderTriggerTimerRef.current) {
        clearTimeout(placeholderTriggerTimerRef.current);
      }
      if (documentMapHighlightTimerRef.current) {
        clearTimeout(documentMapHighlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (documentMotionTimerRef.current) {
      clearTimeout(documentMotionTimerRef.current);
      documentMotionTimerRef.current = null;
    }

    if (documentMotionReason === "idle") {
      return;
    }
    const surface = writingSurfaceRef.current;
    if (!surface || typeof surface.animate !== "function") {
      return;
    }

    waapi.animate(surface, {
      opacity: [0.22, 1],
      transform: ["translateX(-12px) rotateY(2deg)", "translateX(0px) rotateY(0deg)"],
      transformOrigin: ["left center", "left center"],
      filter: ["blur(8px)", "blur(0px)"],
      duration: 520,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });

    documentMotionTimerRef.current = setTimeout(() => {
      setDocumentMotionReason("idle");
      documentMotionTimerRef.current = null;
    }, 560);
  }, [documentMotionReason, writingArchives.activeId]);

  useEffect(() => {
    const storedSetup = loadWritingSetupFromStorage(localStorage);
    const rawArchiveStorage = localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY);
    const legacyDraftText = localStorage.getItem(DRAFT_STORAGE_KEY) ?? "";
    const shouldShowWelcome = shouldShowWelcomeOnOpen({
      nodeEnv: process.env.NODE_ENV,
      hasStoredArchives: rawArchiveStorage !== null,
      hasLegacyDraftText: Boolean(legacyDraftText.trim()),
      hasStoredSetup: Boolean(storedSetup),
    });
    const storedArchives = loadWritingArchivesFromStorage(localStorage);
    const shouldPreserveExistingArchiveStorage = rawArchiveStorage !== null && storedArchives.items.length === 0;
    const ensuredArchives = shouldPreserveExistingArchiveStorage ? storedArchives : ensureWritableArchiveState(storedArchives);
    const activeArchive = ensuredArchives.items.find((item) => item.id === ensuredArchives.activeId);
    if (ensuredArchives !== storedArchives && !shouldPreserveExistingArchiveStorage) {
      saveWritingArchives(localStorage, ensuredArchives);
    }
    const activeText = activeArchive?.text ?? legacyDraftText;
    const activeSetup = activeArchive?.setup ?? storedSetup;
    setWritingArchives(ensuredArchives);
    setText(activeText);
    setWritingSetup(activeSetup);
    setThemeSettings(loadThemeSettingsFromStorage(localStorage));
    const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    const hydratedApiSettings = storedSettings
      ? { ...defaultApiSettings(), ...(JSON.parse(storedSettings) as Partial<ApiConfig>), mockMode: false }
      : defaultApiSettings();
    setApiSettings(hydratedApiSettings);
    if (activeArchive && isDemoWritingArchive(activeArchive)) {
      seedDemoExperienceCaches(activeArchive, hydratedApiSettings);
    }
    setLearningLibrary(loadLearningLibraryFromStorage(localStorage));
    setCorrectionEvents(loadCorrectionEventsFromStorage(localStorage));
    setPersonalDictionary(loadPersonalDictionaryFromStorage(localStorage));
    setTriggerSettings(loadTriggerSettingsFromStorage(localStorage));
    healthCacheRef.current = loadParagraphHealthCache(localStorage);
    documentMapCacheRef.current = loadDocumentMapCache(localStorage);
    const placeholderCache = loadPlaceholderSuggestionCache(localStorage);
    setPlaceholderSuggestionCache(placeholderCache);
    setPlaceholderSuggestions(
      derivePlaceholderSuggestionStateFromCache(
        placeholderCache,
        activeText,
        ensuredArchives.activeId,
        activeSetup,
        writingMode,
        enhancementLevel,
      ),
    );
    skipNextArchiveAutoSaveRef.current = true;
    setShowWelcome(shouldShowWelcome);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    hydratePlaceholderSuggestionsFromCache();
  }, [isHydrated, placeholderSuggestionCache, text, writingArchives.activeId, writingMode, enhancementLevel, writingSetup?.topicArea, writingSetup?.customTopicArea]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    localStorage.setItem(DRAFT_STORAGE_KEY, text);
    if (!writingArchives.activeId) {
      return;
    }
    if (skipNextArchiveAutoSaveRef.current) {
      skipNextArchiveAutoSaveRef.current = false;
      return;
    }
    setWritingArchives((current) => {
      const next = {
        activeId: current.activeId,
        items: current.items.map((item) =>
          item.id === current.activeId
            ? {
                ...item,
                text,
                setup: writingSetup,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      };
      saveWritingArchives(localStorage, next);
      return next;
    });
  }, [isHydrated, text, writingSetup, writingArchives.activeId]);

  function seedDemoExperienceCaches(archive: WritingArchiveItem, demoApiSettings: ApiConfig) {
    let nextPlaceholderCache = loadPlaceholderSuggestionCache(localStorage);
    for (const record of createDemoPlaceholderSuggestionCache(archive.id)) {
      nextPlaceholderCache = upsertPlaceholderSuggestionCache(localStorage, nextPlaceholderCache, record);
    }

    upsertDocumentMapCache(
      localStorage,
      loadDocumentMapCache(localStorage),
      createDemoDocumentMapCache(demoApiSettings, archive.id),
    );

    saveParagraphHealthCache(localStorage, [
      ...loadParagraphHealthCache(localStorage),
      ...createDemoParagraphHealthCache(),
    ]);
  }

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    const root = document.documentElement;
    root.dataset.themePreference = themeSettings.preference;
    function applyResolvedTheme() {
      const resolved = themeSettings.preference === "system"
        ? typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
        : themeSettings.preference;
      root.dataset.theme = resolved;
      setResolvedTheme(resolved);
    }

    applyResolvedTheme();
    if (themeSettings.preference !== "system" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyResolvedTheme);
    return () => media.removeEventListener("change", applyResolvedTheme);
  }, [isHydrated, themeSettings.preference]);

  const diffParts: Change[] = useMemo(() => {
    if (!pending?.result) {
      return [];
    }
    return createWordDiff(pending.originalSentence, pending.result.finalSentence);
  }, [pending]);

  const paragraphDiffParts: Change[] = useMemo(() => {
    if (!pendingParagraph) {
      return [];
    }
    return createWordDiff(pendingParagraph.originalParagraph, pendingParagraph.result.revisedParagraph);
  }, [pendingParagraph]);

  const paragraphCheckView: DocumentMapParagraphCheckView | null = paragraphCheckContext
    ? {
        ...paragraphCheckContext,
        isLoading: isParagraphLoading,
        result: pendingParagraph?.result,
        diffParts: paragraphDiffParts,
        message: paragraphMessage,
        conflictMessage: paragraphConflictMessage,
      }
    : null;

  useEffect(() => {
    setActiveSuggestionDiffId(null);
  }, [pending?.requestId, pending?.originalSentence, suggestionDisplayMode]);

  const expressionReappearanceMatches = useMemo(
    () => findExpressionReappearanceCues(text, learningLibrary),
    [learningLibrary, text],
  );

  useEffect(() => {
    hasUserEditedForExpressionCuesRef.current = false;
    setFreshExpressionCueIds(new Set());
  }, [writingArchives.activeId]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const archiveKey = writingArchives.activeId ?? "draft";
    if (!hasUserEditedForExpressionCuesRef.current) {
      for (const match of expressionReappearanceMatches) {
        seenExpressionCueKeysRef.current.add(`${archiveKey}:${match.itemId}`);
      }
      setFreshExpressionCueIds((current) => (current.size === 0 ? current : new Set()));
      return;
    }

    const freshIds: string[] = [];
    const animatedItems = new Set<string>();
    for (const match of expressionReappearanceMatches) {
      const cueKey = `${archiveKey}:${match.itemId}`;
      if (seenExpressionCueKeysRef.current.has(cueKey) || animatedItems.has(match.itemId)) {
        continue;
      }
      seenExpressionCueKeysRef.current.add(cueKey);
      animatedItems.add(match.itemId);
      freshIds.push(match.id);
    }

    if (freshIds.length === 0) {
      return;
    }

    if (expressionCueAnimationTimerRef.current) {
      clearTimeout(expressionCueAnimationTimerRef.current);
    }
    setFreshExpressionCueIds(new Set(freshIds));
    expressionCueAnimationTimerRef.current = setTimeout(() => {
      setFreshExpressionCueIds(new Set());
      expressionCueAnimationTimerRef.current = null;
    }, 900);
  }, [expressionReappearanceMatches, isHydrated, writingArchives.activeId]);

  useEffect(() => {
    if (placeholderTriggerTimerRef.current) {
      clearTimeout(placeholderTriggerTimerRef.current);
      placeholderTriggerTimerRef.current = null;
    }

    if (
      !isHydrated
      || showWelcome
      || isRegenerating
      || !hasApiCredentials()
    ) {
      return;
    }

    const snapshotFullText = text;
    const archiveId = writingArchives.activeId;
    const pendingRanges = extractChinesePlaceholderSentences(snapshotFullText).filter((range) => {
      const requestKey = createPlaceholderRequestKey(range, archiveId);
      if (
        requestKey === ignoredPlaceholderRequestKeyRef.current
        || requestKey === pending?.placeholderRequestKey
        || placeholderRequestKeysRef.current.has(requestKey)
      ) {
        return false;
      }
      return !hasPlaceholderSuggestionRequestKey(requestKey, archiveId);
    });

    if (pendingRanges.length === 0) {
      return;
    }

    placeholderTriggerTimerRef.current = setTimeout(() => {
      for (const range of pendingRanges) {
        void enhanceChinesePlaceholderRange("pause", snapshotFullText, range, false);
      }
    }, 800);

    return () => {
      if (placeholderTriggerTimerRef.current) {
        clearTimeout(placeholderTriggerTimerRef.current);
        placeholderTriggerTimerRef.current = null;
      }
    };
  }, [
    apiSettings.apiKey,
    apiSettings.baseUrl,
    apiSettings.mockMode,
    apiSettings.model,
    apiSettings.useServerApiKey,
    isHydrated,
    isRegenerating,
    showWelcome,
    pending?.placeholderRequestKey,
    placeholderSuggestions,
    text,
    writingArchives.activeId,
    writingMode,
    enhancementLevel,
    writingSetup?.topicArea,
    writingSetup?.customTopicArea,
    placeholderSuggestionCache,
  ]);

  useEffect(() => {
    if (activeWorkspaceView === "library") {
      setHasUnseenLearningUpdates(false);
    }
  }, [activeWorkspaceView]);

  useEffect(() => {
    completedParagraphModeInitializedRef.current = false;
    completedParagraphHealthFingerprintsRef.current = new Set();
    pendingCompletedParagraphHealthFingerprintsRef.current = new Set();
  }, [writingArchives.activeId]);

  useEffect(() => {
    if (!isHydrated || triggerSettings.paragraphHealthTrigger !== "after_paragraph_complete") {
      completedParagraphModeInitializedRef.current = false;
      completedParagraphHealthFingerprintsRef.current = new Set();
      pendingCompletedParagraphHealthFingerprintsRef.current = new Set();
      return;
    }

    const completedParagraphs = extractCompletedParagraphRanges(text);
    const completedFingerprints = new Set(
      completedParagraphs.map((range) => createParagraphFingerprint(range.paragraph)),
    );

    if (!completedParagraphModeInitializedRef.current) {
      completedParagraphHealthFingerprintsRef.current = completedFingerprints;
      completedParagraphModeInitializedRef.current = true;
      return;
    }

    for (const paragraphRange of completedParagraphs) {
      const fingerprint = createParagraphFingerprint(paragraphRange.paragraph);
      if (
        completedParagraphHealthFingerprintsRef.current.has(fingerprint) ||
        pendingCompletedParagraphHealthFingerprintsRef.current.has(fingerprint)
      ) {
        continue;
      }

      pendingCompletedParagraphHealthFingerprintsRef.current.add(fingerprint);
      void runParagraphHealthCheck(text, paragraphRange).then((result) => {
        pendingCompletedParagraphHealthFingerprintsRef.current.delete(fingerprint);
        if (result) {
          completedParagraphHealthFingerprintsRef.current.add(fingerprint);
        }
      });
    }
  }, [isHydrated, text, triggerSettings.paragraphHealthTrigger, writingArchives.activeId, writingMode, apiSettings]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const autoMode = getDocumentMapAutoCheckMode();
    if (autoMode !== "auto_idle" || isDocumentMapPanelOpen || paragraphCheckContext || !documentMapLastInputAtRef.current) {
      if (documentMapAutoCheckTimerRef.current) {
        clearTimeout(documentMapAutoCheckTimerRef.current);
        documentMapAutoCheckTimerRef.current = null;
      }
      return;
    }

    if (!hasApiCredentials() || isAnyAiRequestActive()) {
      return;
    }

    const autoCheckContext = getDocumentMapAutoCheckContext();
    const { freshness } = autoCheckContext;

    if (freshness !== "needs_check") {
      if (documentMapAutoCheckTimerRef.current) {
        clearTimeout(documentMapAutoCheckTimerRef.current);
        documentMapAutoCheckTimerRef.current = null;
      }
      return;
    }

    if (documentMapAutoCheckTimerRef.current) {
      clearTimeout(documentMapAutoCheckTimerRef.current);
      documentMapAutoCheckTimerRef.current = null;
    }
    documentMapAutoCheckTimerRef.current = setTimeout(() => {
      if (isAnyAiRequestActive()) {
        return;
      }
      const queuedContext = getDocumentMapAutoCheckContext();
      if (
        shouldQueueDocumentMapAutoCheck(queuedContext.freshness, queuedContext.latestCache, {
          now: Date.now(),
          lastInputAt: documentMapLastInputAtRef.current,
        })
      ) {
        void checkDocumentMap(false, "auto_idle");
      }
    }, DOCUMENT_MAP_AUTO_CHECK_RULES.idleMs);

    return () => {
      if (documentMapAutoCheckTimerRef.current) {
        clearTimeout(documentMapAutoCheckTimerRef.current);
        documentMapAutoCheckTimerRef.current = null;
      }
    };
  }, [
    isHydrated,
    text,
    triggerSettings,
    writingArchives.activeId,
    writingSetup?.topicArea,
    writingSetup?.customTopicArea,
    writingSetup?.outlinePoints,
    writingSetup?.essayTopic,
    apiSettings.apiKey,
    apiSettings.baseUrl,
    apiSettings.model,
    apiSettings.mockMode,
    apiSettings.provider,
    apiSettings.useServerApiKey,
    writingMode,
    isLoading,
    isRegenerating,
    isParagraphLoading,
    isSelectionLoading,
    documentMapState.status,
    isDocumentMapPanelOpen,
    paragraphCheckContext,
  ]);

  const activeArchive = useMemo(
    () => writingArchives.items.find((item) => item.id === writingArchives.activeId) ?? null,
    [writingArchives],
  );
  const activeArchiveIsDemo = isDemoArchiveContext({ archive: activeArchive, text });

  function getPlaceholderDomain(setup: WritingSetup | null): string {
    if (setup?.topicArea === "custom") {
      return setup.customTopicArea?.trim() || "custom";
    }
    return setup?.topicArea || "custom";
  }

  function buildPendingRequestInputFromSnapshot(
    snapshotFullText: string,
    range: SentenceRange,
    mode: WritingMode,
    level: EnhancementLevel,
    setup: WritingSetup | null,
  ): Omit<FastEnhanceInput, "apiConfig"> {
    return {
      fullText: snapshotFullText,
      latestSentence: range.sentence,
      previousContext: withWritingSetupContext(getPreviousContext(snapshotFullText, range.start), setup),
      currentParagraph: getCurrentParagraph(snapshotFullText, range.start),
      writingMode: mode,
      enhancementLevel: level,
    };
  }

  type PlaceholderRequestParsedContext = {
    writingMode: WritingMode;
    enhancementLevel: EnhancementLevel;
    domain: string;
  };

  function parsePlaceholderRequestContext(
    requestKey: string,
    fallbackMode: WritingMode,
    fallbackLevel: EnhancementLevel,
    fallbackDomain: string,
  ): PlaceholderRequestParsedContext {
    const [, mode, level, domain] = requestKey.split("|");
    return {
      writingMode: mode === "natural" || mode === "ielts" || mode === "academic" || mode === "business" || mode === "concise" ? mode : fallbackMode,
      enhancementLevel:
        level === "minimal" || level === "balanced" || level === "polished" ? level : fallbackLevel,
      domain: domain || fallbackDomain,
    };
  }

  function hydratePlaceholderSuggestionsFromCache(): void {
    const next = derivePlaceholderSuggestionStateFromCache(
      placeholderSuggestionCache,
      text,
      writingArchives.activeId,
      writingSetup,
      writingMode,
      enhancementLevel,
    );
    setPlaceholderSuggestions(next);
  }

  function buildPlaceholderSuggestionFromCache(
    item: PlaceholderSuggestionCacheRecord,
    snapshotText: string,
    activeArchiveId: string | null,
  ): PlaceholderSuggestionRecord | null {
    const context = parsePlaceholderRequestContext(
      item.requestKey,
      writingMode,
      enhancementLevel,
      getPlaceholderDomain(writingSetup),
    );
    const match = resolveCachedPlaceholderSuggestionRange(item, snapshotText, activeArchiveId, context);
    if (!match) {
      return null;
    }
    return buildPlaceholderSuggestionRecordFromCache(
      item,
      snapshotText,
      writingSetup,
      match.sentenceRange,
      match.placeholderRange,
    );
  }

  function getPlaceholderSuggestionByRequestKey(
    requestKey: string,
    snapshotText: string,
    archiveId: string | null,
  ): PlaceholderSuggestionRecord | null {
    const inMemory = placeholderSuggestions.find(
      (item) => item.archiveId === archiveId && item.requestKey === requestKey,
    );
    if (inMemory) {
      return inMemory;
    }

    const cached = placeholderSuggestionCache.find((item) => item.archiveId === archiveId && item.requestKey === requestKey);
    if (!cached) {
      return null;
    }
    return buildPlaceholderSuggestionFromCache(cached, snapshotText, archiveId);
  }

  function hasPlaceholderSuggestionRequestKey(requestKey: string, archiveId: string | null): boolean {
    return (
      placeholderSuggestions.some((item) => item.archiveId === archiveId && item.requestKey === requestKey)
      || placeholderSuggestionCache.some((item) => item.archiveId === archiveId && item.requestKey === requestKey)
    );
  }

  function buildPlaceholderSuggestionRecordFromCache(
    item: PlaceholderSuggestionCacheRecord,
    snapshotFullText: string,
    setup: WritingSetup | null,
    sentenceRange: SentenceRange,
    placeholderRange?: ChinesePlaceholderSentenceRange,
  ): PlaceholderSuggestionRecord {
    const displaySentence = item.reviewed ? item.finalSentence : item.originalSentence;
    const placeholderHint = item.placeholderHint
      ? {
          sourceText: item.placeholderHint.sourceText,
          targetText: item.placeholderHint.targetText,
          structure: item.placeholderHint.structure ?? "",
        }
      : undefined;
    return {
      requestId: item.id,
      source: "placeholder",
      snapshotFullText,
      latestSentenceRange: sentenceRange,
      originalSentence: item.originalSentence,
      requestInput: buildPendingRequestInputFromSnapshot(
        snapshotFullText,
        sentenceRange,
        item.requestInputSnapshot.writingMode,
        item.requestInputSnapshot.enhancementLevel,
        setup,
      ),
      result: {
        taskType: item.taskType,
        originalSentence: item.originalSentence,
        finalSentence: item.finalSentence,
        explanationZh: item.explanationZh,
        hasChinese: item.hasChinese,
      },
      id: item.id,
      archiveId: item.archiveId,
      requestKey: item.requestKey,
      markerState: item.reviewed ? "reviewed" : item.markerState,
      reviewedRange: sentenceRange,
      displaySentence,
      applied: item.reviewed,
      placeholderRequestKey: item.requestKey,
      placeholderRange: placeholderRange ?? item.placeholderRange,
      placeholderHint,
    };
  }

  function resolveCachedPlaceholderSuggestionRange(
    item: PlaceholderSuggestionCacheRecord,
    snapshotText: string,
    activeArchiveId: string | null,
    context: PlaceholderRequestParsedContext,
  ): { sentenceRange: SentenceRange; placeholderRange?: ChinesePlaceholderSentenceRange } | null {
    const placeholderRange = extractChinesePlaceholderSentences(snapshotText).find((range) => {
      const key = createPlaceholderRequestKey(range, activeArchiveId, context);
      return key === item.requestKey || range.sentence.trim() === item.originalSentence.trim();
    });
    if (placeholderRange) {
      return { sentenceRange: placeholderRange, placeholderRange };
    }

    const candidates = item.reviewed
      ? [item.finalSentence, item.originalSentence]
      : [item.originalSentence, item.finalSentence];
    for (const candidate of candidates) {
      const normalized = candidate.trim();
      if (!normalized) {
        continue;
      }
      const index = snapshotText.indexOf(normalized);
      if (index >= 0) {
        return {
          sentenceRange: {
            sentence: normalized,
            start: index,
            end: index + normalized.length,
          },
          placeholderRange: item.placeholderRange,
        };
      }
    }

    return null;
  }

  function derivePlaceholderSuggestionStateFromCache(
    cache: PlaceholderSuggestionCacheRecord[],
    snapshotText: string,
    activeArchiveId: string | null,
    setup: WritingSetup | null,
    mode: WritingMode,
    level: EnhancementLevel,
  ): PlaceholderSuggestionRecord[] {
    const domain = getPlaceholderDomain(setup);
    return cache
      .filter(
        (item) =>
          item.archiveId === activeArchiveId &&
          item.requestInputSnapshot.writingMode === mode &&
          item.requestInputSnapshot.enhancementLevel === level &&
          item.requestInputSnapshot.domain === domain,
      )
      .map((item) => {
        const match = resolveCachedPlaceholderSuggestionRange(item, snapshotText, activeArchiveId, {
          writingMode: mode,
          enhancementLevel: level,
          domain,
        });
        return match
          ? buildPlaceholderSuggestionRecordFromCache(item, snapshotText, setup, match.sentenceRange, match.placeholderRange)
          : null;
      })
      .filter((suggestion): suggestion is PlaceholderSuggestionRecord => Boolean(suggestion))
      .sort((a, b) => b.reviewedRange.start - a.reviewedRange.start);
  }

  function saveSettings(settings: ApiConfig) {
    const normalized = {
      ...settings,
      supportsJsonMode: Boolean(settings.supportsJsonMode),
      mockMode: false,
    };
    setApiSettings(normalized);
    localStorage.setItem(API_SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
  }

  function clearSettings() {
    const defaults = defaultApiSettings();
    setApiSettings(defaults);
    localStorage.setItem(API_SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
  }

  function persistTriggerSettings(settings: TriggerSettings) {
    const normalized = saveTriggerSettings(localStorage, settings);
    setTriggerSettings(normalized);
  }

  function persistThemeSettings(settings: ThemeSettings) {
    const normalized = saveThemeSettings(localStorage, settings);
    setThemeSettings(normalized);
  }

  function persistWritingSetup(setup: WritingSetup) {
    const normalized = saveWritingSetup(localStorage, setup);
    setWritingSetup(normalized);
    upsertActiveArchive({ setup: normalized });
  }

  function upsertActiveArchive(patch: Partial<WritingArchiveItem>) {
    const now = new Date().toISOString();
    setWritingArchives((current) => {
      const activeId = current.activeId ?? patch.id ?? crypto.randomUUID();
      const hasActive = current.items.some((item) => item.id === activeId);
      const base: WritingArchiveItem = {
        id: activeId,
        title: writingArchiveTitleFromSetup(patch.setup ?? writingSetup),
        text,
        setup: writingSetup,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      };
      const next = {
        activeId,
        items: hasActive
          ? current.items.map((item) =>
              item.id === activeId
                ? { ...item, ...patch, updatedAt: now, lastOpenedAt: now }
                : item,
            )
          : [{ ...base, ...patch }, ...current.items],
      };
      saveWritingArchives(localStorage, next);
      return next;
    });
  }

  function resetEditorSuggestionState() {
    if (placeholderTriggerTimerRef.current) {
      clearTimeout(placeholderTriggerTimerRef.current);
      placeholderTriggerTimerRef.current = null;
    }
    setPending(null);
    setReviewedSuggestion(null);
    setSuggestionDisplayMode("hidden");
    setActivePlaceholderInsight(false);
    setConflictMessage("");
    setCopyMessage("");
    setStatusMessage("");
    setError(null);
    setEmpty(false);
    setDocumentMapState({ status: "idle" });
    setIsDocumentMapPanelOpen(false);
    ignoredPlaceholderRequestKeyRef.current = "";
  }

  function createNewArchive() {
    const now = new Date().toISOString();
    const item = createBlankArchive(now);
    setWritingArchives((current) => {
      const next = { activeId: item.id, items: [item, ...current.items] };
      saveWritingArchives(localStorage, next);
      return next;
    });
    setText("");
    setWritingSetup(item.setup);
    setDocumentMotionReason("new");
    if (item.setup) {
      saveWritingSetup(localStorage, item.setup);
    }
    setPlaceholderSuggestions([]);
    resetEditorSuggestionState();
    setOutlineCheckResult(null);
    setOutlineCheckMessage("");
  }

  function createBlankArchive(now = new Date().toISOString()): WritingArchiveItem {
    return {
      id: crypto.randomUUID(),
      title: "未命名写作",
      text: "",
      setup: defaultWritingSetup(now),
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };
  }

  function switchArchive(id: string) {
    const archive = writingArchives.items.find((item) => item.id === id);
    if (!archive) {
      return;
    }
    if (archive.id === writingArchives.activeId) {
      return;
    }
    const now = new Date().toISOString();
    const nextArchive = { ...archive, lastOpenedAt: now };
    skipNextArchiveAutoSaveRef.current = true;
    setWritingArchives((current) => {
      const next = {
        activeId: id,
        items: current.items.map((item) => (item.id === id ? nextArchive : item)),
      };
      saveWritingArchives(localStorage, next);
      return next;
    });
    setText(archive.text);
    setWritingSetup(archive.setup);
    setDocumentMotionReason("switch");
    if (archive.setup) {
      saveWritingSetup(localStorage, archive.setup);
    }
    setPlaceholderSuggestions([]);
    resetEditorSuggestionState();
    setOutlineCheckResult(null);
    setOutlineCheckMessage("");
  }

  function persistDocumentTitle(title: string) {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }
    const setup = {
      ...(writingSetup ?? defaultWritingSetup()),
      essayTopic: trimmedTitle,
      updatedAt: new Date().toISOString(),
    };
    const normalized = saveWritingSetup(localStorage, setup);
    setWritingSetup(normalized);
    upsertActiveArchive({ title: trimmedTitle, setup: normalized });
  }

  function renameArchive(id: string, title: string) {
    const now = new Date().toISOString();
    const next = {
      activeId: writingArchives.activeId,
      items: writingArchives.items.map((item) =>
        item.id === id ? { ...item, title, updatedAt: now } : item,
      ),
    };
    setWritingArchives(next);
    saveWritingArchives(localStorage, next);
  }

  function deleteArchive(id: string) {
    const now = new Date().toISOString();
    const remaining = writingArchives.items.filter((item) => item.id !== id);
    let nextActive = remaining.find((item) => item.id === writingArchives.activeId) ?? null;
    let nextItems = remaining;

    if (id === writingArchives.activeId) {
      nextActive =
        [...remaining].sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))[0] ??
        null;
      if (!nextActive) {
        nextActive = createBlankArchive(now);
        nextItems = [nextActive];
      }
    }

    const nextState = {
      activeId: nextActive?.id ?? null,
      items: nextItems.map((item) => (item.id === nextActive?.id ? { ...item, lastOpenedAt: now } : item)),
    };
    setWritingArchives(nextState);
    saveWritingArchives(localStorage, nextState);
    setPlaceholderSuggestionCache((current) => removePlaceholderSuggestionCacheForArchive(localStorage, current, id));
    if (writingArchives.activeId !== id) {
      setPlaceholderSuggestions((current) => current.filter((item) => item.archiveId !== id));
    }
    setOpenArchiveMenuId(null);
    setDeleteCandidateId(null);
    setRenamingArchiveId(null);
    if (id === writingArchives.activeId && nextActive) {
      setText(nextActive.text);
      setWritingSetup(nextActive.setup);
      if (nextActive.setup) {
        saveWritingSetup(localStorage, nextActive.setup);
      }
      resetEditorSuggestionState();
      setOutlineCheckResult(null);
      setOutlineCheckMessage("");
    }
  }

  function saveInlineSetup(nextSetup: WritingSetup, shouldCheckOutline: boolean) {
    const normalized = saveWritingSetup(localStorage, {
      ...nextSetup,
      outline: nextSetup.outlinePoints.join("\n"),
      updatedAt: new Date().toISOString(),
    });
    setWritingSetup(normalized);
    upsertActiveArchive({ setup: normalized });
    setInlineSetupEdit({ kind: "none" });

    if (!shouldCheckOutline) {
      return;
    }
    const outlinePoints = normalized.outlinePoints.map((point) => point.trim()).filter(Boolean);
    if (!normalized.essayTopic.trim() || outlinePoints.length === 0) {
      setOutlineCheckResult(null);
      setOutlineCheckMessage("");
      return;
    }
    const controller = new AbortController();
    void checkOutlineConsistency(normalized, outlinePoints, controller.signal);
  }

  function startTopicEdit() {
    setInlineSetupEdit({ kind: "topic", draft: writingSetup?.essayTopic ?? "" });
  }

  function startAreaEdit() {
    const setup = writingSetup ?? defaultWritingSetup();
    setInlineSetupEdit({
      kind: "area",
      draftArea: setup.topicArea,
      draftCustomArea: setup.customTopicArea,
    });
  }

  function startOutlineEdit(index: number) {
    setInlineSetupEdit({
      kind: "outline-point",
      index,
      draft: writingSetup?.outlinePoints[index] ?? "",
    });
    setOutlineCheckMessage("");
  }

  function saveTopicEdit() {
    if (inlineSetupEdit.kind !== "topic") {
      return;
    }
    saveInlineSetup({ ...(writingSetup ?? defaultWritingSetup()), essayTopic: inlineSetupEdit.draft }, true);
  }

  function saveAreaEdit() {
    if (inlineSetupEdit.kind !== "area") {
      return;
    }
    saveInlineSetup(
      {
        ...(writingSetup ?? defaultWritingSetup()),
        topicArea: inlineSetupEdit.draftArea,
        customTopicArea: inlineSetupEdit.draftArea === "custom" ? inlineSetupEdit.draftCustomArea : undefined,
      },
      false,
    );
  }

  function saveOutlinePointEdit() {
    if (inlineSetupEdit.kind !== "outline-point") {
      return;
    }
    const setup = writingSetup ?? defaultWritingSetup();
    const outlinePoints = [...setup.outlinePoints];
    outlinePoints[inlineSetupEdit.index] = inlineSetupEdit.draft;
    saveInlineSetup({ ...setup, outlinePoints, outline: outlinePoints.join("\n") }, true);
  }

  function addOutlinePoint() {
    const setup = writingSetup ?? defaultWritingSetup();
    const outlinePoints = [...setup.outlinePoints, ""];
    saveInlineSetup({ ...setup, outlinePoints, outline: outlinePoints.join("\n") }, false);
    setInlineSetupEdit({ kind: "outline-point", index: outlinePoints.length - 1, draft: "" });
  }

  function deleteOutlinePoint(index: number) {
    const setup = writingSetup ?? defaultWritingSetup();
    if (setup.outlinePoints.length <= 1) {
      return;
    }
    const paragraphs = text.split(/\n{2,}/u);
    if ((paragraphs[index] ?? "").trim()) {
      setOutlineCheckMessage("请先清空对应段落正文，再删除大纲点。");
      return;
    }
    const outlinePoints = setup.outlinePoints.filter((_, pointIndex) => pointIndex !== index);
    saveInlineSetup({ ...setup, outlinePoints, outline: outlinePoints.join("\n") }, false);
  }

  async function checkOutlineConsistency(setup: WritingSetup, outlinePoints: string[], signal: AbortSignal) {
    if (!ensureApiSettings()) {
      return;
    }
    setIsOutlineChecking(true);
    setOutlineCheckMessage("");
    try {
      const topicArea = setup.topicArea === "custom" ? setup.customTopicArea ?? "自定义" : setup.topicArea;
      const response = await fetch("/api/check-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          essayTopic: setup.essayTopic,
          topicArea,
          outlinePoints,
          writingMode,
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as OutlineCheckResult | { error?: string };
      if (!response.ok || "error" in payload) {
        throw payload;
      }
      setOutlineCheckResult(payload as OutlineCheckResult);
    } catch (caught) {
      if (signal.aborted) {
        return;
      }
      const payload = caught as { error?: string };
      setOutlineCheckMessage(payload.error ?? "大纲检查暂时不可用。");
    } finally {
      if (!signal.aborted) {
        setIsOutlineChecking(false);
      }
    }
  }

  function persistLearningLibrary(items: LearningItem[]) {
    setLearningLibrary(items);
    localStorage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(items));
  }

  function markLearningLibraryUpdated() {
    if (activeWorkspaceView !== "library") {
      setHasUnseenLearningUpdates(true);
    }
  }

  function handleWorkspaceViewChange(view: WorkspaceView) {
    if (view === "library") {
      setHasUnseenLearningUpdates(false);
    }
    requestWorkspaceView(view);
  }

  function persistCorrectionEvents(items: CorrectionEvent[]) {
    setCorrectionEvents(items);
    localStorage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(items));
  }

  function persistPersonalDictionary(terms: string[]) {
    const normalized = savePersonalDictionary(localStorage, terms);
    setPersonalDictionary(normalized);
  }

  function rememberReviewedSuggestion(
    completed: CompletedEnhancement,
    reviewedRange: SentenceRange,
    displaySentence: string,
    applied: boolean,
    snapshotFullText: string,
  ) {
    setReviewedSuggestion({
      ...completed,
      reviewedRange,
      displaySentence,
      applied,
      latestSentenceRange: reviewedRange,
      snapshotFullText,
    });
  }

  function openReviewedSuggestion() {
    if (!reviewedSuggestion) {
      return;
    }
    setActivePlaceholderInsight(false);
    setPending({
      ...reviewedSuggestion,
      latestSentenceRange: reviewedSuggestion.reviewedRange,
      snapshotFullText: text,
    });
    setSuggestionDisplayMode("expanded");
    requestWorkspaceView("editor");
  }

  function resolvePlaceholderSuggestionRange(
    suggestion: PlaceholderSuggestionRecord,
    currentText = text,
  ): SentenceRange | null {
    const candidates = [
      suggestion.displaySentence,
      suggestion.result.finalSentence,
      suggestion.originalSentence,
    ].filter((candidate, index, list) => candidate.trim() && list.indexOf(candidate) === index);

    for (const range of [suggestion.reviewedRange, suggestion.latestSentenceRange]) {
      const currentSlice = currentText.slice(range.start, range.end);
      if (candidates.includes(currentSlice)) {
        return {
          sentence: currentSlice,
          start: range.start,
          end: range.end,
        };
      }
    }

    for (const candidate of candidates) {
      const index = currentText.indexOf(candidate);
      if (index >= 0) {
        return {
          sentence: candidate,
          start: index,
          end: index + candidate.length,
        };
      }
    }

    return null;
  }

  function resolvePlaceholderMarkerRange(
    suggestion: PlaceholderSuggestionRecord,
    sentenceRange: SentenceRange,
    currentText = text,
  ): SentenceRange {
    const sentence = currentText.slice(sentenceRange.start, sentenceRange.end);
    const targetText = suggestion.applied ? suggestion.placeholderHint?.targetText : "";
    const targetIndex = targetText ? sentence.indexOf(targetText) : -1;
    if (targetIndex >= 0 && targetText) {
      return {
        sentence: targetText,
        start: sentenceRange.start + targetIndex,
        end: sentenceRange.start + targetIndex + targetText.length,
      };
    }

    const placeholderRange = suggestion.placeholderRange;
    const placeholders = placeholderRange?.placeholders ?? [];
    if (!suggestion.applied && placeholderRange && placeholders.length > 0) {
      const first = placeholders[0];
      const last = placeholders[placeholders.length - 1];
      const sourceStart = first.start - placeholderRange.start;
      const sourceEnd = last.end - placeholderRange.start;
      const sourceText = placeholderRange.sentence.slice(sourceStart, sourceEnd);
      const sourceIndex = sourceText ? sentence.indexOf(sourceText) : -1;
      if (sourceIndex >= 0 && sourceText) {
        return {
          sentence: sourceText,
          start: sentenceRange.start + sourceIndex,
          end: sentenceRange.start + sourceIndex + sourceText.length,
        };
      }
    }

    return sentenceRange;
  }

  function upsertPlaceholderSuggestion(record: PlaceholderSuggestionRecord) {
    setPlaceholderSuggestions((current) => {
      const existingIndex = current.findIndex(
        (item) => item.archiveId === record.archiveId && item.requestKey === record.requestKey,
      );
      if (existingIndex < 0) {
        return [...current, record];
      }
      return current.map((item, index) => (index === existingIndex ? record : item));
    });
    setPlaceholderSuggestionCache((current) => {
      const context = parsePlaceholderRequestContext(
        record.requestKey,
        record.requestInput.writingMode,
        record.requestInput.enhancementLevel,
        getPlaceholderDomain(writingSetup),
      );
      const cacheRecord: PlaceholderSuggestionCacheRecord = {
        id: record.id,
        requestKey: record.requestKey,
        requestInputSnapshot: {
          writingMode: context.writingMode,
          enhancementLevel: context.enhancementLevel,
          domain: context.domain,
        },
        archiveId: record.archiveId,
        originalSentence: record.originalSentence,
        finalSentence: record.result.finalSentence,
        explanationZh: record.result.explanationZh,
        taskType: record.result.taskType,
        hasChinese: record.result.hasChinese,
        markerState: record.markerState,
        reviewed: record.applied,
        latestSentenceRange: record.latestSentenceRange,
        reviewedRange: record.reviewedRange,
        placeholderRange: record.placeholderRange,
        placeholderHint: record.placeholderHint,
        updatedAt: new Date().toISOString(),
      };
      return upsertPlaceholderSuggestionCache(localStorage, current, cacheRecord);
    });
  }

  function markPlaceholderSuggestionReviewed(
    completed: CompletedEnhancement,
    reviewedRange: SentenceRange,
    displaySentence: string,
    applied: boolean,
    snapshotFullText: string,
  ) {
    if (!completed.placeholderRequestKey || !completed.result) {
      return;
    }
    upsertPlaceholderSuggestion({
      ...completed,
      id: completed.requestId,
      archiveId: writingArchives.activeId,
      requestKey: completed.placeholderRequestKey,
      markerState: "reviewed",
      reviewedRange,
      displaySentence,
      applied,
      latestSentenceRange: reviewedRange,
      snapshotFullText,
    });
  }

  function openPlaceholderSuggestion(id: string) {
    const inMemorySuggestion = placeholderSuggestions.find(
      (item) => item.id === id && item.archiveId === writingArchives.activeId,
    );
    const cachedSuggestion = placeholderSuggestionCache.find(
      (item) => item.id === id && item.archiveId === writingArchives.activeId,
    );
    const suggestion =
      inMemorySuggestion
      ?? (cachedSuggestion ? buildPlaceholderSuggestionFromCache(cachedSuggestion, text, writingArchives.activeId) : null);
    if (!suggestion) {
      return;
    }
    const resolvedRange = resolvePlaceholderSuggestionRange(suggestion);
    if (!resolvedRange) {
      return;
    }

    setActivePlaceholderInsight(false);
    setPending({
      ...suggestion,
      latestSentenceRange: resolvedRange,
      originalSentence: suggestion.displaySentence,
      snapshotFullText: text,
    });
    setSuggestionDisplayMode("expanded");
    requestWorkspaceView("editor");
  }

  function createPlaceholderRequestKey(
    range: ChinesePlaceholderSentenceRange,
    archiveId = writingArchives.activeId,
    context: {
      writingMode: WritingMode;
      enhancementLevel: EnhancementLevel;
      domain: string;
    } = {
      writingMode,
      enhancementLevel,
      domain: getPlaceholderDomain(writingSetup),
    },
  ): string {
    return `${archiveId ?? "draft"}|${context.writingMode}|${context.enhancementLevel}|${context.domain}|${range.sentence.trim()}`;
  }

  function createPlaceholderHint(
    range: ChinesePlaceholderSentenceRange,
    result: FastEnhanceResult,
  ): PlaceholderLearningHint | undefined {
    const rawSourceText = range.placeholders.map((placeholder) => placeholder.text.trim()).filter(Boolean).join(" / ");
    if (!rawSourceText) {
      return undefined;
    }

    const rawTargetText = extractPlaceholderReplacement(range, result.finalSentence).trim();
    if (!rawTargetText) {
      return undefined;
    }

    const insight = refinePlaceholderInsight(rawSourceText, rawTargetText, result.finalSentence);

    return {
      sourceText: insight.sourceText,
      targetText: insight.targetText,
      structure: insight.structure ?? inferPlaceholderStructure(range, insight.targetText, result.explanationZh),
    };
  }

  function refinePlaceholderInsight(
    sourceText: string,
    targetText: string,
    finalSentence: string,
  ): { sourceText: string; targetText: string; structure?: string } {
    const compactSource = sourceText.replace(/[，。！？；、\s]/gu, "");
    if (compactSource.includes("会火") && /\bgo viral\b/iu.test(finalSentence)) {
      return {
        sourceText: "会火",
        targetText: "go viral",
        structure: "结构：go viral 表示迅速走红、广受关注",
      };
    }

    return { sourceText, targetText };
  }

  function extractPlaceholderReplacement(range: ChinesePlaceholderSentenceRange, finalSentence: string): string {
    if (range.placeholders.length !== 1) {
      return finalSentence;
    }

    const placeholder = range.placeholders[0];
    const relativeStart = placeholder.start - range.start;
    const relativeEnd = placeholder.end - range.start;
    const prefix = range.sentence.slice(0, relativeStart);
    const suffix = range.sentence.slice(relativeEnd);
    let candidateStart = 0;
    let candidateEnd = finalSentence.length;

    if (prefix.trim()) {
      const prefixIndex = finalSentence.indexOf(prefix);
      if (prefixIndex >= 0) {
        candidateStart = prefixIndex + prefix.length;
      }
    }

    if (suffix.trim()) {
      const suffixIndex = finalSentence.indexOf(suffix, candidateStart);
      if (suffixIndex >= 0) {
        candidateEnd = suffixIndex;
      }
    }

    const candidate = finalSentence.slice(candidateStart, candidateEnd).trim();
    return candidate || finalSentence;
  }

  function inferPlaceholderStructure(
    range: ChinesePlaceholderSentenceRange,
    targetText: string,
    explanationZh?: string,
  ): string {
    const firstPlaceholder = range.placeholders[0];
    const prefix = range.sentence.slice(0, firstPlaceholder.start - range.start).trimEnd().toLowerCase();
    const target = targetText.toLowerCase();

    if (/\black$/u.test(prefix) && target.includes("ability to")) {
      return "结构：lack + the ability to + verb";
    }
    if (target.includes("effectively")) {
      return "结构：doing something effectively";
    }

    const firstExplanation = explanationZh?.split(/[。.!?\n]/u)[0]?.trim();
    if (firstExplanation) {
      return firstExplanation.startsWith("结构：") ? firstExplanation : `结构：${firstExplanation}`;
    }

    return "结构：把中文占位转成英文表达单元，保留原句逻辑";
  }

  function handleEditorTextChange(value: string) {
    hasUserEditedForExpressionCuesRef.current = true;
    documentMapLastInputAtRef.current = Date.now();
    setText(value);
    const cursorPosition = editorRef.current?.getSelectionRange().end ?? value.length;
    setEditorSelection((current) => (
      current.end === cursorPosition && current.start === cursorPosition
        ? current
        : { start: cursorPosition, end: cursorPosition }
    ));
    if (!pending) {
      return;
    }
    if (value !== pending.snapshotFullText) {
      setConflictMessage("建议生成后你又修改了编辑器内容。请重新处理当前句，避免覆盖新内容。");
      return;
    }
    setConflictMessage("");
  }

  function ensureApiSettings(): boolean {
    if (!hasApiCredentials()) {
      requestWorkspaceView("api");
      setError({ message: "需要先填写 API 设置。" });
      return false;
    }
    return true;
  }

  async function requestEnhancement(
    requestInput: Omit<FastEnhanceInput, "apiConfig">,
  ): Promise<FastEnhanceResult> {
    if (activeArchiveIsDemo) {
      const demoResult = getDemoEnhancementResult(requestInput.latestSentence);
      if (demoResult) {
        return demoResult;
      }
    }

    const response = await fetch("/api/enhance-fast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...requestInput,
        apiConfig: apiSettings,
      }),
    });
    const payload = (await response.json()) as FastEnhanceResult | { error?: string; rawResponse?: string };
    if (!response.ok || "error" in payload) {
      throw payload;
    }
    return payload as FastEnhanceResult;
  }

  async function enhanceChinesePlaceholderRange(
    trigger: "pause" | "boundary" | "manual",
    snapshotFullText: string,
    range: ChinesePlaceholderSentenceRange,
    expandAfterResult: boolean,
    force = false,
  ): Promise<boolean> {
    if (isRegenerating || !range.sentence.trim() || !endsWithSentenceBoundary(range.sentence)) {
      return false;
    }

    const archiveId = writingArchives.activeId;
    const requestKey = createPlaceholderRequestKey(range, archiveId);
    if (
      requestKey === ignoredPlaceholderRequestKeyRef.current
      || requestKey === pending?.placeholderRequestKey
      || placeholderRequestKeysRef.current.has(requestKey)
    ) {
      return false;
    }

    const cachedSuggestion = getPlaceholderSuggestionByRequestKey(requestKey, snapshotFullText, archiveId);
    if (cachedSuggestion) {
      if (expandAfterResult) {
        const resolvedRange = resolvePlaceholderSuggestionRange(cachedSuggestion, snapshotFullText) ?? range;
        setSuggestionDisplayMode("expanded");
        setPending({
          ...cachedSuggestion,
          snapshotFullText,
          latestSentenceRange: resolvedRange,
          originalSentence: resolvedRange.sentence,
        });
      }
      setStatusMessage("");
      return true;
    }

    if (!force && hasPlaceholderSuggestionRequestKey(requestKey, archiveId)) {
      return true;
    }

    if (!hasApiCredentials()) {
      if (trigger === "manual") {
        ensureApiSettings();
      }
      return false;
    }

    const requestId = crypto.randomUUID();
    const requestInput: Omit<FastEnhanceInput, "apiConfig"> = {
      fullText: snapshotFullText,
      latestSentence: range.sentence,
      previousContext: withWritingSetupContext(getPreviousContext(snapshotFullText, range.start), writingSetup),
      currentParagraph: getCurrentParagraph(snapshotFullText, range.start),
      writingMode,
      enhancementLevel,
    };

    placeholderRequestKeysRef.current.add(requestKey);
    if (force && ignoredPlaceholderRequestKeyRef.current === requestKey) {
      ignoredPlaceholderRequestKeyRef.current = "";
    }
    setError(null);
    setEmpty(false);
    setConflictMessage("");
    setCopyMessage("");
    setLearningExtractionMessage("");
    setSelectionAction(null);
    setStatusMessage("");
    if (expandAfterResult) {
      setSuggestionDisplayMode("hidden");
      setIsLoading(true);
    }

    try {
      const result = await requestEnhancement(requestInput);
      const record: PlaceholderSuggestionRecord = {
        requestId,
        id: requestId,
        archiveId,
        requestKey,
        markerState: "available",
        snapshotFullText,
        latestSentenceRange: range,
        reviewedRange: range,
        displaySentence: range.sentence,
        applied: false,
        originalSentence: range.sentence,
        requestInput,
        source: "placeholder",
        placeholderRequestKey: requestKey,
        placeholderRange: range,
        placeholderHint: createPlaceholderHint(range, result),
        result,
      };
      upsertPlaceholderSuggestion(record);
      if (expandAfterResult) {
        setPending(record);
        setSuggestionDisplayMode("expanded");
      }
      setStatusMessage("");
      return true;
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      if (trigger === "manual") {
        setError({
          message: payload.error ?? "当前句建议生成失败。请检查 API 设置后重试。",
          rawResponse: payload.rawResponse,
        });
      }
      setStatusMessage("");
      return false;
    } finally {
      placeholderRequestKeysRef.current.delete(requestKey);
      if (expandAfterResult) {
        setIsLoading(false);
      }
    }
  }

  async function enhanceChinesePlaceholderSentence(
    trigger: "pause" | "boundary" | "manual",
    snapshotFullText = text,
    cursorPosition = editorSelection.end || snapshotFullText.length,
    force = false,
  ): Promise<boolean> {
    const range = extractChinesePlaceholderSentence(snapshotFullText, cursorPosition);
    if (!range) {
      return false;
    }
    return enhanceChinesePlaceholderRange(trigger, snapshotFullText, range, trigger === "manual", force);
  }

  async function enhanceLatestSentence() {
    setError(null);
    setEmpty(false);
    setConflictMessage("");
    setCopyMessage("");
    setLearningExtractionMessage("");
    setSelectionAction(null);

    const cursorPosition = editorRef.current?.getSelectionRange().end ?? editorSelection.end ?? text.length;
    const placeholderRange = extractChinesePlaceholderSentence(text, cursorPosition);
    if (placeholderRange) {
      if (!endsWithSentenceBoundary(placeholderRange.sentence)) {
        setStatusMessage("");
        return;
      }
      await enhanceChinesePlaceholderSentence("manual", text, cursorPosition, true);
      return;
    }

    const range = extractCurrentSentence(text, cursorPosition);
    if (!range.sentence.trim()) {
      setEmpty(true);
      setStatusMessage("");
      return;
    }
    if (!endsWithSentenceBoundary(range.sentence)) {
      setEmpty(true);
      setStatusMessage("");
      return;
    }

    const canUseDemoEnhancement = activeArchiveIsDemo && Boolean(getDemoEnhancementResult(range.sentence));
    if (!canUseDemoEnhancement && !ensureApiSettings()) {
      setStatusMessage("");
      return;
    }

    const requestId = crypto.randomUUID();
    const snapshotFullText = text;
    const requestInput: Omit<FastEnhanceInput, "apiConfig"> = {
      fullText: snapshotFullText,
      latestSentence: range.sentence,
      previousContext: withWritingSetupContext(getPreviousContext(snapshotFullText, range.start), writingSetup),
      currentParagraph: getCurrentParagraph(snapshotFullText, range.start),
      writingMode,
      enhancementLevel,
    };
    setStatusMessage("");
    setSuggestionDisplayMode("hidden");
    setPending({
      requestId,
      snapshotFullText,
      latestSentenceRange: range,
      originalSentence: range.sentence,
      requestInput,
      source: "manual",
    });
    setIsLoading(true);

    try {
      const result = await requestEnhancement(requestInput);
      setPending({
        requestId,
        snapshotFullText,
        latestSentenceRange: range,
        originalSentence: range.sentence,
        requestInput,
        source: "manual",
        result,
      });
      setStatusMessage("");
      setSuggestionDisplayMode("expanded");
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      setError({
        message: payload.error ?? "增强失败。请检查 API 设置后重试。",
        rawResponse: payload.rawResponse,
      });
      setStatusMessage("");
    } finally {
      setIsLoading(false);
    }
  }

  async function regenerateEnhancement() {
    if (!pending?.result || isLoading || isRegenerating) {
      return;
    }
    const keepReviewOnly = Boolean(pending.applied);
    const requestId = crypto.randomUUID();
    const nextPending: PendingEnhancement = { ...pending, requestId, placeholderHint: undefined, result: undefined };
    setConflictMessage("");
    setCopyMessage("");
    setStatusMessage("");
    setActivePlaceholderInsight(false);
    setSuggestionDisplayMode("expanded");
    setPending(nextPending);
    setIsRegenerating(true);

    try {
      const result = await requestEnhancement(pending.requestInput);
      const regenerated = {
        ...nextPending,
        placeholderHint: nextPending.placeholderRange ? createPlaceholderHint(nextPending.placeholderRange, result) : undefined,
        result,
      };
      setPending(regenerated);
      if (regenerated.placeholderRequestKey && regenerated.placeholderRange) {
        const resolvedRange = resolvePlaceholderSuggestionRange(
          {
            ...regenerated,
            id: regenerated.requestId,
            archiveId: writingArchives.activeId,
            requestKey: regenerated.placeholderRequestKey,
              markerState: "reviewed",
              reviewedRange: regenerated.latestSentenceRange,
              displaySentence: regenerated.originalSentence,
              applied: keepReviewOnly,
              result,
            },
            text,
        ) ?? regenerated.latestSentenceRange;
        upsertPlaceholderSuggestion({
          ...regenerated,
          id: regenerated.requestId,
          archiveId: writingArchives.activeId,
          requestKey: regenerated.placeholderRequestKey,
            markerState: "reviewed",
            reviewedRange: resolvedRange,
            displaySentence: regenerated.originalSentence,
            applied: keepReviewOnly,
            latestSentenceRange: resolvedRange,
            result,
          });
      }
      setStatusMessage("");
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      setError({
        message: payload.error ?? "重新生成失败，请再试一次。",
        rawResponse: payload.rawResponse,
      });
    } finally {
      setIsRegenerating(false);
    }
  }

  function applyEnhancement() {
    if (!pending?.result || pending.applied) {
      return;
    }
    const completed: CompletedEnhancement = { ...pending, result: pending.result };

    if (text !== completed.snapshotFullText) {
      setConflictMessage("建议生成后你又修改了编辑器内容。请重新处理当前句，避免覆盖新内容。");
      return;
    }

    const nextText = replaceLatestSentence(text, completed.latestSentenceRange, completed.result.finalSentence);
    const reviewedRange: SentenceRange = {
      sentence: completed.result.finalSentence,
      start: completed.latestSentenceRange.start,
      end: completed.latestSentenceRange.start + completed.result.finalSentence.length,
    };
    const paragraphRange = extractCurrentParagraph(
      nextText,
      completed.latestSentenceRange.start + completed.result.finalSentence.length,
    );

    setText(nextText);
    setPending(null);
    setActivePlaceholderInsight(false);
    rememberReviewedSuggestion(completed, reviewedRange, completed.result.finalSentence, true, nextText);
    markPlaceholderSuggestionReviewed(completed, reviewedRange, completed.result.finalSentence, true, nextText);
    setSuggestionDisplayMode("hidden");
    setConflictMessage("");
    setCopyMessage("");
    setStatusMessage("");
    requestAnimationFrame(() => editorRef.current?.focus());

    void runLearningExtraction(completed, nextText, paragraphRange.paragraph);
    void maybeRunParagraphHealthAfterApply(nextText, paragraphRange);
  }

  async function runLearningExtraction(
    applied: CompletedEnhancement,
    nextText: string,
    currentParagraph: string,
  ) {
    try {
      const demoExtraction = activeArchiveIsDemo
        ? getDemoLearningExtractionResult(applied.originalSentence, applied.result.finalSentence)
        : null;
      if (demoExtraction) {
        persistLearningExtraction(demoExtraction, applied);
        setLearningExtractionMessage("");
        setStatusMessage("");
        return;
      }

      const response = await fetch("/api/extract-learning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalSentence: applied.originalSentence,
          finalSentence: applied.result.finalSentence,
          explanationZh: applied.result.explanationZh,
          writingMode: applied.requestInput.writingMode,
          enhancementLevel: applied.requestInput.enhancementLevel,
          fullText: nextText,
          currentParagraph,
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as LearningExtractionResult | { error?: string };
      if (!response.ok || "error" in payload) {
        throw payload;
      }

      const extraction = payload as LearningExtractionResult;
      persistLearningExtraction(extraction, applied);
      setLearningExtractionMessage("");
      setStatusMessage("");
    } catch {
      setLearningExtractionMessage("");
      setStatusMessage("");
    }
  }

  function persistLearningExtraction(extraction: LearningExtractionResult, applied: CompletedEnhancement) {
    setLearningLibrary((current) => {
      const nextLibrary = upsertLearningItems(current, extraction.learningItems, {
        sourceSentence: applied.result.finalSentence,
        writingMode: applied.requestInput.writingMode,
      });
      localStorage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(nextLibrary));
      localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(nextLibrary));
      return nextLibrary;
    });
    setCorrectionEvents((current) => {
      const nextEvents = upsertCorrectionEvents(current, extraction.correctionEvents, {
        sourceSentence: applied.result.finalSentence,
        writingMode: applied.requestInput.writingMode,
      });
      localStorage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(nextEvents));
      return nextEvents;
    });
    if (extraction.learningItems.length > 0) {
      markLearningLibraryUpdated();
    }
  }

  async function maybeRunParagraphHealthAfterApply(nextText: string, paragraphRange: ParagraphRange) {
    if (triggerSettings.paragraphHealthTrigger !== "after_every_apply") {
      return;
    }
    await runParagraphHealthCheck(nextText, paragraphRange);
  }

  async function runParagraphHealthCheck(nextText: string, paragraphRange: ParagraphRange): Promise<ParagraphHealthResult | null> {
    const fingerprint = createParagraphFingerprint(paragraphRange.paragraph);
    const cached = healthCacheRef.current.find((item) => item.paragraphFingerprint === fingerprint);
    if (cached) {
      return cached.result;
    }

    if (activeArchiveIsDemo) {
      const demoResult = getDemoParagraphHealthResult(paragraphRange.paragraph);
      if (demoResult) {
        healthCacheRef.current = saveParagraphHealthCache(localStorage, [
          ...healthCacheRef.current,
          {
            paragraphFingerprint: demoResult.paragraphFingerprint,
            result: demoResult,
            checkedAt: new Date().toISOString(),
          },
        ]);
        return demoResult;
      }
      return null;
    }

    if (!shouldRunParagraphHealth(paragraphRange.paragraph, fingerprint)) {
      return null;
    }

    const healthState = paragraphHealthStateRef.current.get(fingerprint) ?? { isChecking: false, lastCheckedAt: 0 };
    paragraphHealthStateRef.current.set(fingerprint, {
      ...healthState,
      isChecking: true,
      lastCheckedAt: Date.now(),
    });
    try {
      const response = await fetch("/api/check-paragraph-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: nextText,
          currentParagraph: paragraphRange.paragraph,
          writingMode,
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as ParagraphHealthResult | { error?: string };
      if (!response.ok || "error" in payload) {
        return null;
      }

      const result = payload as ParagraphHealthResult;
      healthCacheRef.current = saveParagraphHealthCache(localStorage, [
        ...healthCacheRef.current,
        {
          paragraphFingerprint: result.paragraphFingerprint,
          result,
          checkedAt: new Date().toISOString(),
        },
      ]);
      setStatusMessage("段落健康 已检查");
      return result;
    } finally {
      const current = paragraphHealthStateRef.current.get(fingerprint);
      paragraphHealthStateRef.current.set(fingerprint, {
        isChecking: false,
        lastCheckedAt: current?.lastCheckedAt ?? Date.now(),
      });
    }
  }

  function shouldRunParagraphHealth(paragraph: string, fingerprint: string): boolean {
    const healthState = paragraphHealthStateRef.current.get(fingerprint);
    if (healthState?.isChecking) {
      return false;
    }
    if (paragraphFlowCheckingFingerprintsRef.current.has(fingerprint)) {
      return false;
    }
    if (Date.now() - (healthState?.lastCheckedAt ?? 0) < 30_000) {
      return false;
    }
    if (countSentences(paragraph) < 2) {
      return false;
    }
    return true;
  }

  function hasApiCredentials(): boolean {
    return Boolean(
      apiSettings.mockMode ||
      apiSettings.useServerApiKey ||
      (apiSettings.baseUrl && apiSettings.apiKey && apiSettings.model),
    );
  }

  function getDocumentMapAutoCheckMode(): TriggerSettings["documentMapAutoCheck"] {
    return triggerSettings.documentMapAutoCheck;
  }

  function isAnyAiRequestActive(): boolean {
    return (
      isLoading ||
      isRegenerating ||
      isParagraphLoading ||
      isSelectionLoading ||
      isDocumentMapAutoChecking ||
      documentMapState.status === "loading"
    );
  }

  function getLatestDocumentMapCacheForContext(context: { cacheKey: string; model: string; domain: string; outlinePointsHash: string }) {
    const outlinePointsHash = context.outlinePointsHash;
    const archiveId = writingArchives.activeId;
    const essayTopic = writingSetup?.essayTopic ?? "";
    return documentMapCacheRef.current
      .filter((item) =>
        item.archiveId === archiveId &&
        item.model === context.model &&
        item.domain === context.domain &&
        item.essayTopic === essayTopic &&
        (item.outlinePointsHash === outlinePointsHash || item.outlineHash === outlinePointsHash || (!outlinePointsHash && item.outlinePointsHash === ""))
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  }

  function getDocumentMapDomain(): string {
    return getPlaceholderDomain(writingSetup);
  }

  function buildDocumentMapCacheContext(paragraphs: DocumentMapParagraphInput[]) {
    const outlinePoints = writingSetup?.outlinePoints ?? [];
    const textHash = createDocumentMapTextHash(text);
    const outlinePointsHash = createDocumentMapOutlineHash(outlinePoints);
    const domain = getDocumentMapDomain();
    const model = documentMapModelKey(apiSettings);
    const cacheKey = createDocumentMapCacheKey({
      archiveId: writingArchives.activeId,
      textHash,
      essayTopic: writingSetup?.essayTopic ?? "",
      outlinePoints,
      domain,
      model,
    });
    return { cacheKey, textHash, outlinePointsHash, domain, model, outlinePoints };
  }

  function getDocumentMapAutoCheckContext() {
    const paragraphs = splitDocumentIntoParagraphs(text);
    const context = buildDocumentMapCacheContext(paragraphs);
    const latestCache = getLatestDocumentMapCacheForContext(context);
    const freshness = evaluateDocumentMapFreshness({
      text,
      paragraphs,
      essayTopic: writingSetup?.essayTopic ?? "",
      outlinePoints: context.outlinePoints,
      cache: latestCache
        ? {
          cacheKey: latestCache.cacheKey,
          textHash: latestCache.textHash,
          essayTopicHash: latestCache.essayTopicHash,
          outlinePointsHash: latestCache.outlinePointsHash,
          outlineHash: latestCache.outlineHash,
          paragraphFingerprints: latestCache.paragraphFingerprints,
          generatedAt: latestCache.generatedAt,
          freshness: latestCache.freshness,
          lastAutoCheckedAt: latestCache.lastAutoCheckedAt,
          autoCheckCountInSession: latestCache.autoCheckCountInSession,
        }
        : null,
    });
    return { paragraphs, context, latestCache, freshness };
  }

  function documentMapIssueCount(result: DocumentMapResult | undefined): number {
    return result?.globalIssues.length ?? 0;
  }

  function documentMapButtonLabel(): string {
    if (documentMapState.status === "loading" || isDocumentMapAutoChecking) {
      return "文章地图 · 整理中";
    }
    if (documentMapState.status === "error") {
      return "文章地图 · 检查失败";
    }
    if (documentMapState.status === "ready") {
      if (createDocumentMapTextHash(text) !== documentMapState.textHash) {
        return "文章地图 · 可能已过期";
      }
      const issueCount = documentMapIssueCount(documentMapState.result);
      return issueCount > 0 ? `文章地图 · ${issueCount} 个发现` : "文章地图 · 已更新";
    }

    if (getDocumentMapAutoCheckMode() === "off") {
      return "检查文章地图";
    }

    const { latestCache, freshness } = getDocumentMapAutoCheckContext();
    if (freshness === "needs_check") {
      return "文章地图 · 可检查";
    }
    if (freshness === "stale") {
      return "文章地图 · 可能已过期";
    }
    if (latestCache?.result && (freshness === "ready" || freshness === "fresh")) {
      const issueCount = documentMapIssueCount(latestCache.result);
      return issueCount > 0 ? `文章地图 · ${issueCount} 个发现` : "文章地图 · 已更新";
    }
    return "检查文章地图";
  }

  async function checkDocumentMap(force = false, trigger: DocumentMapTrigger = "manual") {
    const isAutoTrigger = trigger === "auto_idle";
    if (!isAutoTrigger) {
      setIsDocumentMapPanelOpen(true);
    }
    const paragraphs = splitDocumentIntoParagraphs(text);
    const requestText = text;
    const requestSnapshotHash = createDocumentMapTextHash(requestText);
    setParagraphCheckContext(null);
    setPendingParagraph(null);
    if (paragraphs.length < 2) {
      setDocumentMapParagraphHealthById({});
      setDocumentMapState({
        status: "empty",
        message: "文章内容较少，写到至少 2 个段落后可以生成文章地图。",
      });
      return;
    }

    const context = buildDocumentMapCacheContext(paragraphs);
    const cached = documentMapCacheRef.current.find((item) => item.cacheKey === context.cacheKey);
    const existingAutoCount = cached?.autoCheckCountInSession ?? 0;
    if (activeArchiveIsDemo) {
      const demoCache = createDemoDocumentMapCache(apiSettings, writingArchives.activeId ?? undefined);
      documentMapCacheRef.current = upsertDocumentMapCache(localStorage, documentMapCacheRef.current, demoCache);
      setDocumentMapParagraphHealthById({});
      setDocumentMapState({
        status: "ready",
        result: demoCache.result,
        snapshotFullText: text,
        paragraphs,
        cacheKey: context.cacheKey,
        textHash: context.textHash,
      });
      return;
    }
    if (cached && !force) {
      setDocumentMapParagraphHealthById({});
      setDocumentMapState({
        status: "ready",
        result: cached.result,
        snapshotFullText: text,
        paragraphs,
        cacheKey: context.cacheKey,
        textHash: context.textHash,
      });
      return;
    }

    if (isAutoTrigger ? !hasApiCredentials() : !ensureApiSettings()) {
      return;
    }

    setIsDocumentMapAutoChecking(trigger === "auto_idle");
    setDocumentMapState({ status: "loading", message: "正在整理文章结构……" });
    setDocumentMapParagraphHealthById({});
    try {
      const requestBody = {
        text: requestText,
        essayTopic: writingSetup?.essayTopic ?? "",
        outlinePoints: context.outlinePoints,
        domain: context.domain,
        writingMode,
        paragraphs,
        trigger,
        apiConfig: apiSettings,
      };
      const response = await fetch("/api/check-document-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const payload = (await response.json()) as DocumentMapResult | { error?: string; rawResponse?: string };
      if (!response.ok || "error" in payload) {
        throw payload;
      }

      const result = payload as DocumentMapResult;
      const now = new Date().toISOString();
      const freshContext = createDocumentMapParagraphFingerprints(paragraphs);
      const autoCheckCountInSession = trigger === "auto_idle"
        ? Math.min(DOCUMENT_MAP_AUTO_CHECK_RULES.maxAutoChecksPerSession, existingAutoCount + 1)
        : existingAutoCount;
      documentMapCacheRef.current = upsertDocumentMapCache(localStorage, documentMapCacheRef.current, {
        cacheKey: context.cacheKey,
        archiveId: writingArchives.activeId,
        textHash: requestSnapshotHash,
        essayTopic: writingSetup?.essayTopic ?? "",
        outlinePointsHash: context.outlinePointsHash,
        domain: context.domain,
        model: context.model,
        paragraphFingerprints: freshContext,
        generatedAt: now,
        freshness: "ready",
        autoCheckCountInSession,
        lastAutoCheckedAt: trigger === "auto_idle" ? now : cached?.lastAutoCheckedAt,
        createdAt: now,
        result,
      });
      const isCurrent = requestSnapshotHash === createDocumentMapTextHash(text);
      setDocumentMapState({
        status: "ready",
        result,
        snapshotFullText: requestText,
        paragraphs,
        cacheKey: context.cacheKey,
        textHash: requestSnapshotHash,
        message: isCurrent ? undefined : "正文已修改，当前文章地图结果可能已过期。",
      });
    } catch (caught) {
      const payload = caught as { error?: string };
      setDocumentMapState({
        status: "error",
        message: payload.error ?? "文章地图生成失败，请检查 API 设置后重试。",
      });
    } finally {
      setIsDocumentMapAutoChecking(false);
    }
  }

  function resolveDocumentMapParagraphRange(paragraph: DocumentMapParagraph): ParagraphRange | null {
    if (documentMapState.status !== "ready") {
      return null;
    }
    const source = documentMapState.paragraphs.find((item) => item.paragraphId === paragraph.paragraphId);
    if (!source) {
      return null;
    }
    const currentSlice = text.slice(source.range.start, source.range.end);
    if (currentSlice === source.text) {
      return { paragraph: source.text, start: source.range.start, end: source.range.end };
    }
    const currentParagraph = splitDocumentIntoParagraphs(text).find(
      (item) => item.text.trim() === source.text.trim(),
    );
    return currentParagraph
      ? { paragraph: currentParagraph.text, start: currentParagraph.range.start, end: currentParagraph.range.end }
      : null;
  }

  function locateDocumentMapParagraph(paragraph: DocumentMapParagraph) {
    const range = resolveDocumentMapParagraphRange(paragraph);
    if (!range) {
      setDocumentMapState((current) => ({
        ...current,
        message: "正文已修改，当前段落位置可能不是最新结果。请重新检查文章地图。",
      }));
      return;
    }
    editorRef.current?.selectRange(range.start, range.end);
    if (documentMapHighlightTimerRef.current) {
      clearTimeout(documentMapHighlightTimerRef.current);
    }
    documentMapHighlightTimerRef.current = setTimeout(() => {
      editorRef.current?.setCursor(range.end);
      documentMapHighlightTimerRef.current = null;
    }, 1200);
  }

  async function viewDocumentMapParagraphHealth(paragraph: DocumentMapParagraph) {
    const range = resolveDocumentMapParagraphRange(paragraph);
    if (!range) {
      setDocumentMapParagraphHealthById((current) => ({
        ...current,
        [paragraph.paragraphId]: {
          status: "error",
          message: "正文已修改，当前段落位置可能不是最新结果。请重新检查文章地图。",
        },
      }));
      setDocumentMapState((current) => ({
        ...current,
        message: "正文已修改，当前段落位置可能不是最新结果。请重新检查文章地图。",
      }));
      return;
    }

    setDocumentMapParagraphHealthById((current) => ({
      ...current,
      [paragraph.paragraphId]: { status: "loading" },
    }));
    const result = await runParagraphHealthCheck(text, range);
    setDocumentMapParagraphHealthById((current) => ({
      ...current,
      [paragraph.paragraphId]: result
        ? result.hasIssues
          ? { status: "ready", result }
          : { status: "empty", message: "这一段暂未发现明显轻量健康问题。" }
        : { status: "error", message: "当前段落暂不满足段落健康检查条件，或刚刚检查过。" },
    }));
    if (!result) {
      setDocumentMapState((current) => ({
        ...current,
        message: "当前段落暂不满足段落健康检查条件，或刚刚检查过。",
      }));
    }
  }

  async function checkDocumentMapParagraph(paragraph: DocumentMapParagraph) {
    const range = resolveDocumentMapParagraphRange(paragraph);
    if (!range) {
      setDocumentMapState((current) => ({
        ...current,
        message: "正文已修改，当前段落位置可能不是最新结果。请重新检查文章地图。",
      }));
      return;
    }
    await runParagraphFlowCheck(text, range, {
      title: `第 ${paragraph.index} 段｜${paragraph.roleZh}`,
      subtitle: paragraph.mainPointZh,
    });
  }

  async function copyRevisedSentence() {
    if (!pending?.result) {
      return;
    }
    await navigator.clipboard?.writeText(pending.result.finalSentence);
    setCopyMessage("修改后的句子已复制。");
    setStatusMessage("已复制 Copied");
  }

  async function checkCurrentParagraph(cursorPosition?: number) {
    const range = extractCurrentParagraph(text, cursorPosition ?? editorRef.current?.getSelectionRange().start);
    await runParagraphFlowCheck(text, range, {
      title: "当前段落",
      subtitle: "来自当前光标位置的段落检查。",
    });
  }

  async function runParagraphFlowCheck(
    snapshotFullText: string,
    range: ParagraphRange,
    context: ParagraphCheckContext,
  ) {
    setParagraphMessage("");
    setParagraphConflictMessage("");
    setPendingParagraph(null);
    setParagraphCheckContext(context);
    requestWorkspaceView("editor");

    if (!range.paragraph.trim()) {
      setParagraphMessage("请先写一段内容，再检查段落流畅度。");
      return;
    }

    if (activeArchiveIsDemo) {
      const demoResult = getDemoParagraphFlowResult(range.paragraph);
      if (demoResult) {
        setPendingParagraph({
          requestId: `demo-flow-${createParagraphFingerprint(range.paragraph)}`,
          snapshotFullText,
          paragraphRange: range,
          originalParagraph: range.paragraph,
          result: demoResult,
        });
        return;
      }
    }

    if (!ensureApiSettings()) {
      return;
    }

    const requestId = crypto.randomUUID();
    const flowFingerprint = createParagraphFingerprint(range.paragraph);
    paragraphFlowCheckingFingerprintsRef.current.add(flowFingerprint);
    setIsParagraphLoading(true);

    try {
      const response = await fetch("/api/check-paragraph-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: snapshotFullText,
          currentParagraph: range.paragraph,
          writingMode,
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as ParagraphCheckResult | { error?: string; rawResponse?: string };
      if (!response.ok || "error" in payload) {
        throw payload;
      }
      setPendingParagraph({
        requestId,
        snapshotFullText,
        paragraphRange: range,
        originalParagraph: range.paragraph,
        result: payload as ParagraphCheckResult,
      });
    } catch (caught) {
      const payload = caught as { error?: string };
      setParagraphMessage(payload.error ?? "段落流畅度检查失败。");
    } finally {
      paragraphFlowCheckingFingerprintsRef.current.delete(flowFingerprint);
      setIsParagraphLoading(false);
    }
  }

  function applyParagraphCheck() {
    if (!pendingParagraph) {
      return;
    }
    if (text !== pendingParagraph.snapshotFullText) {
      setParagraphConflictMessage("检查后段落内容已变化。请重新检查，避免覆盖新内容。");
      return;
    }

    setText(replaceRange(text, pendingParagraph.paragraphRange, pendingParagraph.result.revisedParagraph));
    setPendingParagraph(null);
    setParagraphCheckContext(null);
    setParagraphConflictMessage("");
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function insertIntoEditor(content: string, selection?: { start: number; end: number }) {
    const editor = editorRef.current;
    const editorSelection = editor?.getSelectionRange();
    const start = selection?.start ?? editorSelection?.start ?? text.length;
    const end = selection?.end ?? editorSelection?.end ?? text.length;
    const nextText = `${text.slice(0, start)}${content}${text.slice(end)}`;
    setText(nextText);
    requestAnimationFrame(() => {
      editor?.focus();
      editor?.setCursor(start + content.length);
    });
  }

  function assignArchiveDomain(id: string, topicArea: WritingTopicArea, source: "auto" | "manual") {
    const now = new Date().toISOString();
    setWritingArchives((current) => {
      const next = {
        activeId: current.activeId,
        items: current.items.map((item) => {
          if (item.id !== id) {
            return item;
          }
          const setup = {
            ...(item.setup ?? defaultWritingSetup(now)),
            topicArea,
            customTopicArea: topicArea === "custom" ? item.setup?.customTopicArea : undefined,
            updatedAt: now,
          };
          if (item.id === current.activeId) {
            setWritingSetup(setup);
            saveWritingSetup(localStorage, setup);
          }
          return {
            ...item,
            setup,
            topicAreaSource: source,
            topicAreaClassifiedAt: source === "auto" ? now : item.topicAreaClassifiedAt,
            topicAreaClassifiedText: source === "auto" ? normalizeClassificationText(item.text) : item.topicAreaClassifiedText,
            updatedAt: source === "manual" ? now : item.updatedAt,
          };
        }),
      };
      saveWritingArchives(localStorage, next);
      return next;
    });
  }

  function handleSelectionChange(selection: {
    start: number;
    end: number;
    text: string;
    paragraphIndex: number;
    anchorRect: DOMRect;
    containerRect: DOMRect;
  }) {
    setEditorSelection((current) => (
      current.start === selection.start && current.end === selection.end
        ? current
        : { start: selection.start, end: selection.end }
    ));
    const selectedText = selection.text.trim();
    if (!selectedText || selection.start === selection.end || !isEnglishSelection(selectedText)) {
      setSelectionAction(null);
      return;
    }
    const position = calculateSelectionPopoverPosition(selection.anchorRect, selection.containerRect);
    setSelectionAction({
      start: selection.start,
      end: selection.end,
      selectedText,
      position,
    });
  }

  function closeSelectionActions() {
    setSelectionAction(null);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  async function explainSelectedText() {
    if (!selectionAction) {
      return;
    }
    const demoExplanation = activeArchiveIsDemo
      ? getDemoSelectionExplainResult(selectionAction.selectedText, text)
      : null;
    if (demoExplanation) {
      setSelectionAction((current) =>
        current
          ? {
              ...current,
              requested: true,
              explanation: demoExplanation,
              message: "",
            }
          : current,
      );
      return;
    }
    if (!ensureApiSettings()) {
      return;
    }
    setIsSelectionLoading(true);
    setSelectionAction((current) => current ? { ...current, requested: true, message: "" } : current);

    try {
      const response = await fetch("/api/explain-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText: selectionAction.selectedText,
          fullText: text,
          currentParagraph: getCurrentParagraph(text, selectionAction.start),
          writingMode,
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as SelectionExplainResult | { error?: string };
      if (!response.ok || "error" in payload) {
        throw payload;
      }
      setSelectionAction((current) =>
        current
          ? {
              ...current,
              explanation: payload as SelectionExplainResult,
              message: "",
            }
          : current,
      );
    } catch {
      setSelectionAction((current) =>
        current ? { ...current, message: "选中文本解释失败。" } : current,
      );
    } finally {
      setIsSelectionLoading(false);
    }
  }

  function saveSelectedTextToLibrary() {
    if (!selectionAction) {
      return;
    }
    const explanation = selectionAction.explanation;
    const draft: LearningItemDraft = {
      type: mapSelectionExpressionType(explanation?.expressionType),
      content: selectionAction.selectedText,
      chineseMeaning: explanation?.meaningZh || "手动保存的选中表达。",
      usageNote: explanation?.usageNoteZh || "从选中文本手动保存。",
    };
    const nextLibrary = upsertLearningItems(learningLibrary, [draft], {
      sourceSentence: getCurrentParagraph(text, selectionAction.start) || selectionAction.selectedText,
      writingMode,
    });
    persistLearningLibrary(nextLibrary);
    markLearningLibraryUpdated();
    setSelectionAction({
      ...selectionAction,
      message: "已保存到表达库",
    });
  }

  function deleteHabitType(type: CorrectionEventType) {
    persistCorrectionEvents(correctionEvents.filter((event) => event.type !== type));
  }

  function clearLearningLibrary() {
    persistLearningLibrary([]);
    setHasUnseenLearningUpdates(false);
  }

  function clearWritingHabits() {
    persistCorrectionEvents([]);
  }

  function closeCurrentSuggestion() {
    const isAppliedReview = Boolean(pending?.applied);
    if (pending?.result && !isAppliedReview) {
      const completed: CompletedEnhancement = { ...pending, result: pending.result };
      rememberReviewedSuggestion(completed, pending.latestSentenceRange, pending.originalSentence, false, text);
      markPlaceholderSuggestionReviewed(completed, pending.latestSentenceRange, pending.originalSentence, false, text);
    }
    if (pending?.placeholderRequestKey && !isAppliedReview) {
      ignoredPlaceholderRequestKeyRef.current = pending.placeholderRequestKey;
    }
    setPending(null);
    setActivePlaceholderInsight(false);
    setSuggestionDisplayMode("hidden");
    setConflictMessage("");
    setCopyMessage("");
    setStatusMessage("");
  }

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--lt-bg)] text-[var(--lt-text)]">
        <div className="rounded-md bg-[var(--lt-surface-soft)] px-4 py-3 text-sm text-[var(--lt-muted)]">
          正在加载 LinguaType...
        </div>
      </main>
    );
  }

  if (showWelcome) {
    return (
      <WelcomeScreen
        theme={resolvedTheme}
        onStart={() => {
          setShowWelcome(false);
          setDocumentMotionReason("switch");
        }}
      />
    );
  }

  const workspaceMotionState = pendingWorkspaceView && activeWorkspaceView !== "editor" ? "exiting" : "entering";
  const pendingIsAppliedReview = Boolean(pending?.placeholderRequestKey && pending.applied);
  const suggestionMarkers = [
    ...(pending && isLoading && !pending.result
      ? [{
          id: `${pending.requestId}-loading`,
          range: pending.latestSentenceRange,
          state: "loading" as const,
          onOpen: () => undefined,
        }]
      : []),
    ...placeholderSuggestions.flatMap((suggestion) => {
      if (suggestion.archiveId !== writingArchives.activeId) {
        return [];
      }
      const range = resolvePlaceholderSuggestionRange(suggestion);
      if (!range) {
        return [];
      }
      const markerRange = resolvePlaceholderMarkerRange(suggestion, range);
      return [{
        id: suggestion.id,
        range: markerRange,
        state: suggestion.markerState,
        onOpen: () => openPlaceholderSuggestion(suggestion.id),
      }];
    }),
    ...(!pending && reviewedSuggestion && !reviewedSuggestion.placeholderRequestKey
      ? [{
          id: reviewedSuggestion.requestId,
          range: reviewedSuggestion.reviewedRange,
          state: "reviewed" as const,
          onOpen: openReviewedSuggestion,
        }]
      : []),
  ];
  const documentMapIsStale =
    documentMapState.status === "ready" &&
    createDocumentMapTextHash(text) !== documentMapState.textHash;
  const documentMapOpen = (isDocumentMapPanelOpen && documentMapState.status !== "idle") || paragraphCheckView !== null;
  const documentMapButtonText = documentMapButtonLabel();

  return (
    <main
      className="h-screen overflow-hidden bg-[var(--lt-bg)] text-[var(--lt-text)]"
      style={{ "--lt-sidebar-width": archiveSidebarCollapsed ? "72px" : "320px" } as CSSProperties}
    >
      <div
        aria-label="LinguaType 工作区布局"
        className={`grid h-full min-h-0 ${
          archiveSidebarCollapsed ? "xl:grid-cols-[72px_minmax(0,1fr)]" : "xl:grid-cols-[320px_minmax(0,1fr)]"
        } transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}
      >
        <ArchiveSidebar
          archives={writingArchives}
          collapsed={archiveSidebarCollapsed}
          activeView={activeWorkspaceView}
          resolvedTheme={resolvedTheme}
          hasLearningUpdate={hasUnseenLearningUpdates}
          openMenuArchiveId={openArchiveMenuId}
          deleteCandidateId={deleteCandidateId}
          renamingArchiveId={renamingArchiveId}
          onViewChange={handleWorkspaceViewChange}
          onCollapse={() => setArchiveSidebarCollapsed(true)}
          onExpand={() => setArchiveSidebarCollapsed(false)}
          onCreate={() => {
            createNewArchive();
            requestWorkspaceView("editor");
          }}
          onEnhanceCurrentSentence={() => {
            requestWorkspaceView("editor");
            void enhanceLatestSentence();
          }}
          onCheckCurrentParagraph={() => {
            requestWorkspaceView("editor");
            void checkCurrentParagraph();
          }}
          onSwitch={(id) => {
            switchArchive(id);
            requestWorkspaceView("editor");
          }}
          onRenameArchive={renameArchive}
          onOpenMenu={(id) => {
            setOpenArchiveMenuId(openArchiveMenuId === id ? null : id);
            setDeleteCandidateId(null);
          }}
          onStartRename={(id) => {
            setRenamingArchiveId(id || null);
            setOpenArchiveMenuId(null);
          }}
          onRequestDelete={(id) => {
            setOpenArchiveMenuId(null);
            setDeleteCandidateId(id);
          }}
          onCancelDelete={() => setDeleteCandidateId(null)}
          onConfirmDelete={deleteArchive}
          onAssignArchiveDomain={(id, topicArea) => assignArchiveDomain(id, topicArea, "manual")}
        />

        <section
          className={
            documentMapOpen
              ? "lt-scrollbar-hidden relative min-h-0 overflow-hidden"
              : "lt-scrollbar-hidden relative min-h-0 overflow-y-auto"
          }
        >
          <div className="sticky top-0 z-30 flex justify-end gap-3 px-8 py-6 pointer-events-none">
            <div className="pointer-events-auto">
              <ThemePreferenceControl settings={themeSettings} onChange={persistThemeSettings} compact />
            </div>
            <button
              type="button"
              onClick={() => requestWorkspaceView(activeWorkspaceView === "api" ? "editor" : "api")}
              className="pointer-events-auto rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-text)] shadow-[0_1px_8px_var(--lt-shadow)] transition hover:bg-[var(--lt-surface-hover)]"
            >
              API 设置
            </button>
          </div>

          {activeWorkspaceView === "editor" ? (
            <section
              ref={writingSurfaceRef}
              aria-label="沉浸式写作区"
              data-document-motion-reason={documentMotionReason}
              data-page-turn-motion="soft-page-turn"
              className={
                documentMapOpen
                  ? "flex h-[calc(100vh-88px)] min-h-0 w-full flex-col gap-5 overflow-hidden px-8 pb-0"
                  : "flex min-h-[calc(100vh-88px)] w-full flex-col gap-8 px-8 pb-0"
              }
            >
              <section
                data-writing-column="true"
                className={`mx-auto flex w-full px-4 transition-[max-width] sm:px-8 md:px-10 ${
                  archiveSidebarCollapsed ? "max-w-[1120px]" : "max-w-[980px]"
                }`}
              >
                <InlineSetupControls
                  activeArchive={activeArchive}
                  setup={writingSetup}
                  text={text}
                  onTitleCommit={persistDocumentTitle}
                />
                {isOutlineChecking ? (
                  <p className="mt-3 text-xs text-[var(--lt-muted)]">正在检查大纲与主题是否一致...</p>
                ) : null}
                {outlineCheckResult?.hasIssues ? (
                  <div className="mt-3 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-900">
                    {outlineCheckResult.suggestionsZh.map((suggestion) => (
                      <p key={suggestion}>{suggestion}</p>
                    ))}
                  </div>
                ) : null}
                {outlineCheckMessage ? (
                  <p className="mt-3 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-900">
                    {outlineCheckMessage}
                  </p>
                ) : null}
              </section>

              <section
                aria-label={documentMapOpen ? "文章地图对照区" : "正文写作区"}
                data-scroll-mode={documentMapOpen ? "independent-panes" : undefined}
                className={
                  documentMapOpen
                    ? "mx-auto grid min-h-0 w-full max-w-[1560px] flex-1 grid-cols-1 items-stretch gap-5 overflow-hidden px-4 sm:px-8 md:px-10 xl:grid-cols-[minmax(340px,0.76fr)_minmax(0,1fr)]"
                    : "relative flex min-h-0 flex-1 flex-col"
                }
              >
                {documentMapOpen ? (
                  <div
                    aria-label="文章地图栏"
                    className="lt-scrollbar-hidden min-h-0 overflow-y-auto xl:h-full"
                  >
                    <DocumentMapPanel
                      result={documentMapState.status === "ready" ? documentMapState.result : null}
                      paragraphHealthById={documentMapParagraphHealthById}
                      paragraphCheckView={paragraphCheckView}
                      isLoading={documentMapState.status === "loading"}
                      isStale={documentMapIsStale}
                      message={documentMapState.message}
                      onCheck={(force) => void checkDocumentMap(Boolean(force))}
                      onClose={() => {
                        setIsDocumentMapPanelOpen(false);
                        setDocumentMapState({ status: "idle" });
                      }}
                      onBackToMap={() => {
                        setParagraphCheckContext(null);
                        setPendingParagraph(null);
                        setParagraphMessage("");
                        setParagraphConflictMessage("");
                      }}
                      onViewHealth={(paragraph) => void viewDocumentMapParagraphHealth(paragraph)}
                      onCheckParagraph={(paragraph) => void checkDocumentMapParagraph(paragraph)}
                      onLocateParagraph={locateDocumentMapParagraph}
                      onApplyParagraph={applyParagraphCheck}
                      onCancelParagraph={() => {
                        setPendingParagraph(null);
                        setParagraphCheckContext(null);
                        setParagraphMessage("");
                        setParagraphConflictMessage("");
                      }}
                    />
                  </div>
                ) : null}

                <div
                  aria-label={documentMapOpen ? "原文对照栏" : undefined}
                  className={
                    documentMapOpen
                      ? "lt-scrollbar-hidden relative flex min-h-0 flex-1 flex-col overflow-y-auto xl:h-full"
                      : "relative flex min-h-0 flex-1 flex-col"
                  }
                >
                  <WritingEditor
                    ref={editorRef}
                    value={text}
                    outlinePoints={writingSetup?.outlinePoints}
                    isLoading={isLoading}
                    writingMode={writingMode}
                    enhancementLevel={enhancementLevel}
                    triggerSettings={triggerSettings}
                    topicAreaLabel={topicAreaDisplayLabel(writingSetup)}
                    documentMapStatusLabel={documentMapButtonText}
                    onOpenDocumentMap={() => void checkDocumentMap(false)}
                    wideLayout={archiveSidebarCollapsed && !documentMapOpen}
                    suggestionMarkers={suggestionMarkers}
                    expressionReappearanceCues={expressionReappearanceMatches.map((match) => ({
                      ...match,
                      state: freshExpressionCueIds.has(match.id) ? "fresh" : "seen",
                    }))}
                    focusedSuggestionSentence={
                      pending?.result && suggestionDisplayMode === "expanded"
                        ? pending.originalSentence
                        : ""
                    }
                    focusedSuggestionRange={
                      pending?.result && suggestionDisplayMode === "expanded"
                        ? pending.latestSentenceRange
                        : null
                    }
                    focusedSuggestionSourceText={pending?.placeholderHint?.sourceText ?? ""}
                    activeSuggestionSource={activePlaceholderInsight}
                    focusedSuggestionDiffParts={
                      pending?.result &&
                      suggestionDisplayMode === "expanded"
                        ? diffParts
                        : []
                    }
                    activeSuggestionDiffId={activeSuggestionDiffId}
                    onFocusedSuggestionDiffHover={setActiveSuggestionDiffId}
                    onFocusedSuggestionSourceClick={() => setActivePlaceholderInsight(true)}
                    onChange={handleEditorTextChange}
                    onWritingModeChange={setWritingMode}
                    onEnhancementLevelChange={setEnhancementLevel}
                    onEnhance={enhanceLatestSentence}
                    onCheckCurrentParagraph={(cursorPosition) => void checkCurrentParagraph(cursorPosition)}
                    onSelectionChange={handleSelectionChange}
                    outlineEditState={inlineSetupEdit.kind === "outline-point" ? inlineSetupEdit : null}
                    onStartOutlineEdit={startOutlineEdit}
                    onOutlineDraftChange={(draft) =>
                      setInlineSetupEdit((current) =>
                        current.kind === "outline-point" ? { ...current, draft } : current,
                      )
                    }
                    onSaveOutlineEdit={saveOutlinePointEdit}
                    onCancelOutlineEdit={() => setInlineSetupEdit({ kind: "none" })}
                    onAddOutlinePoint={addOutlinePoint}
                    onDeleteOutlinePoint={deleteOutlinePoint}
                    onEscape={() => {
                      if (selectionAction) {
                        closeSelectionActions();
                        return;
                      }
                      closeCurrentSuggestion();
                    }}
                    onApplySuggestionShortcut={applyEnhancement}
                    onRegenerateSuggestionShortcut={regenerateEnhancement}
                    inlineSuggestionReviewOnly={pendingIsAppliedReview}
                    inlineSuggestion={
                      pending?.result && suggestionDisplayMode === "expanded" ? (
                        <EnhancementPopover
                          originalSentence={pending.originalSentence}
                          result={pending.result}
                          placeholderHint={pending.placeholderHint}
                          isPlaceholderSuggestion={pending.source === "placeholder"}
                          isReviewOnly={pendingIsAppliedReview}
                          activePlaceholderFocus={activePlaceholderInsight}
                          activeDiffId={activeSuggestionDiffId}
                          onDiffHover={setActiveSuggestionDiffId}
                          diffParts={diffParts}
                          conflictMessage={conflictMessage}
                          copyMessage={copyMessage}
                          statusMessage={statusMessage}
                          isRegenerating={isRegenerating}
                          onApply={applyEnhancement}
                          onCancel={closeCurrentSuggestion}
                          onRegenerate={regenerateEnhancement}
                          onCopy={copyRevisedSentence}
                        />
                      ) : null
                    }
                  />
                  {selectionAction ? (
                    <SelectionActionsPopover
                      selectedText={selectionAction.selectedText}
                      position={selectionAction.position}
                      explanation={selectionAction.explanation}
                      isLoading={isSelectionLoading}
                      message={selectionAction.message}
                      requested={selectionAction.requested}
                      onExplain={() => void explainSelectedText()}
                      onSave={saveSelectedTextToLibrary}
                      onClose={closeSelectionActions}
                    />
                  ) : null}
                </div>
              </section>

              {empty ? <EmptyState /> : null}
              {error ? <ErrorState message={error.message} rawResponse={error.rawResponse} /> : null}
            </section>
          ) : null}

          {activeWorkspaceView === "library" ? (
            <AnimatedWorkspacePage
              view="library"
              ariaLabel="表达库页面"
              motionState={workspaceMotionState}
              className="mx-auto w-full max-w-[1180px] px-8 pb-16"
            >
              <LearningLibraryPanel
                items={learningLibrary}
                personalDictionary={personalDictionary}
                onPersonalDictionaryChange={persistPersonalDictionary}
                onDelete={(id) => persistLearningLibrary(learningLibrary.filter((item) => item.id !== id))}
                onToggleFavorite={(id) =>
                  persistLearningLibrary(
                    learningLibrary.map((item) =>
                      item.id === id
                        ? { ...item, favorite: !item.favorite, updatedAt: new Date().toISOString() }
                        : item,
                    ),
                  )
                }
                onInsert={(content) => {
                  insertIntoEditor(content);
                  requestWorkspaceView("editor");
                }}
              />
            </AnimatedWorkspacePage>
          ) : null}

          {activeWorkspaceView === "habits" ? (
            <AnimatedWorkspacePage
              view="habits"
              ariaLabel="写作习惯页面"
              motionState={workspaceMotionState}
              className="mx-auto w-full max-w-[1180px] px-8 pb-16"
            >
              <WritingHabitsPanel events={correctionEvents} onDeleteType={deleteHabitType} />
            </AnimatedWorkspacePage>
          ) : null}

          {activeWorkspaceView === "api" ? (
            <AnimatedWorkspacePage
              view="api"
              ariaLabel="API 设置页面"
              motionState={workspaceMotionState}
              className="mx-auto w-full max-w-[980px] px-8 pb-16"
            >
              <ApiSettingsWorkspacePage
                apiSettings={apiSettings}
                onSaveSettings={(settings) => {
                  saveSettings(settings);
                  requestWorkspaceView("editor");
                }}
                onClearSettings={clearSettings}
              />
            </AnimatedWorkspacePage>
          ) : null}

          {activeWorkspaceView === "triggers" ? (
            <AnimatedWorkspacePage
              view="triggers"
              ariaLabel="触发设置页面"
              motionState={workspaceMotionState}
              className="mx-auto w-full max-w-[980px] px-8 pb-16"
            >
              <TriggerSettingsWorkspacePage
                triggerSettings={triggerSettings}
                onTriggerSettingsChange={persistTriggerSettings}
              />
            </AnimatedWorkspacePage>
          ) : null}

          {activeWorkspaceView === "data" ? (
            <AnimatedWorkspacePage
              view="data"
              ariaLabel="数据管理页面"
              motionState={workspaceMotionState}
              className="mx-auto w-full max-w-[980px] px-8 pb-16"
            >
              <DataManagementWorkspacePage
                learningLibrary={learningLibrary}
                correctionEvents={correctionEvents}
                onClearLearningLibrary={clearLearningLibrary}
                onClearWritingHabits={clearWritingHabits}
                onClearSettings={clearSettings}
              />
            </AnimatedWorkspacePage>
          ) : null}

          {activeWorkspaceView === "shortcuts" ? (
            <AnimatedWorkspacePage
              view="shortcuts"
              ariaLabel="快捷键帮助页面"
              motionState={workspaceMotionState}
              className="mx-auto w-full max-w-[820px] px-8 pb-16"
            >
              <ShortcutHelpPage />
            </AnimatedWorkspacePage>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function AnimatedWorkspacePage({
  view,
  ariaLabel,
  motionState,
  className,
  children,
}: {
  view: Exclude<WorkspaceView, "editor">;
  ariaLabel: string;
  motionState: "entering" | "exiting";
  className: string;
  children: ReactNode;
}) {
  const pageRef = useRef<HTMLElement | null>(null);
  const isLibraryPage = view === "library";
  const motionDuration = isLibraryPage ? 560 : 620;
  const exitMotionDuration = WORKSPACE_EXIT_MOTION_DURATION;
  const motionDistance = isLibraryPage ? 16 : 20;
  const motionProfile = isLibraryPage ? "library-unified-rise" : "workspace-settled-rise";

  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof page.animate !== "function") {
      return;
    }

    if (motionState === "exiting") {
      waapi.animate(page, {
        opacity: [1, 0],
        transform: ["translateY(0px) scale(1)", "translateY(-14px) scale(0.995)"],
        duration: exitMotionDuration,
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      });

      const exitingItems = Array.from(
        page.querySelectorAll<HTMLElement>("h1, h2, button, label, li, [data-motion-item]"),
      ).slice(0, 16);
      if (exitingItems.length > 0 && typeof exitingItems[0].animate === "function") {
        waapi.animate(exitingItems, {
          opacity: [1, 0],
          transform: ["translateY(0px)", "translateY(-8px)"],
          duration: exitMotionDuration - 80,
          delay: stagger(10),
          ease: "cubic-bezier(0.4, 0, 0.2, 1)",
        });
      }
      return;
    }

    waapi.animate(page, {
      opacity: [0.86, 1],
      transform: [
        `translateY(${motionDistance}px) scale(0.995)`,
        "translateY(0px) scale(1)",
      ],
      duration: motionDuration,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });

    const sweep = page.querySelector<HTMLElement>("[data-motion-sweep]");
    if (sweep && !isLibraryPage && typeof sweep.animate === "function") {
      waapi.animate(sweep, {
        opacity: [0, 0.16, 0],
        transform: ["scaleX(0)", "scaleX(1)", "scaleX(1)"],
        duration: 680,
        ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }

    const motionItems = Array.from(
      page.querySelectorAll<HTMLElement>("[data-library-motion-item], h1, h2, button, label, li, [data-motion-item]"),
    ).slice(0, 18);
    if (motionItems.length === 0 || typeof motionItems[0].animate !== "function") {
      return;
    }

    waapi.animate(motionItems, {
      opacity: [0.82, 1],
      transform: [isLibraryPage ? "translateY(10px)" : "translateY(12px)", "translateY(0px)"],
      duration: isLibraryPage ? 420 : 480,
      delay: stagger(isLibraryPage ? 22 : 26),
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [exitMotionDuration, isLibraryPage, motionDistance, motionDuration, motionState, view]);

  return (
    <section
      ref={pageRef}
      aria-label={ariaLabel}
      data-workspace-motion={view}
      data-motion-intensity={isLibraryPage ? "subtle" : "noticeable"}
      data-motion-profile={motionProfile}
      data-motion-state={motionState}
      data-motion-duration={String(motionDuration)}
      data-motion-exit-duration={String(exitMotionDuration)}
      data-motion-exit-pattern="soft-rise-fade"
      data-motion-distance={String(motionDistance)}
      className={`relative ${className}`}
    >
      <span
        aria-hidden
        data-motion-sweep
        className="pointer-events-none absolute left-8 right-8 top-0 h-px origin-left bg-[var(--lt-text)]/20 opacity-0"
      />
      {children}
    </section>
  );
}

function ApiSettingsWorkspacePage({
  apiSettings,
  onSaveSettings,
  onClearSettings,
}: {
  apiSettings: ApiConfig;
  onSaveSettings: (settings: ApiConfig) => void;
  onClearSettings: () => void;
}) {
  return (
    <section className="text-[var(--lt-text)]">
      <div>
        <h1 className="font-serif text-[38px] font-normal leading-tight">API 设置</h1>
        <p className="mt-2 text-base leading-7 text-[var(--lt-muted)]">配置模型连接。</p>
      </div>
      <div className="mt-7">
        <ApiSettingsPanel settings={apiSettings} onSave={onSaveSettings} onClear={onClearSettings} />
      </div>
    </section>
  );
}

function TriggerSettingsWorkspacePage({
  triggerSettings,
  onTriggerSettingsChange,
}: {
  triggerSettings: TriggerSettings;
  onTriggerSettingsChange: (settings: TriggerSettings) => void;
}) {
  return (
    <section className="text-[var(--lt-text)]">
      <div>
        <h1 className="font-serif text-[38px] font-normal leading-tight">触发设置</h1>
        <p className="mt-2 text-base leading-7 text-[var(--lt-muted)]">控制快捷键、低打扰反馈和弹层行为。</p>
      </div>
      <div className="mt-7 border-t border-[var(--lt-border)] pt-6">
        <TriggerSettingsPanel settings={triggerSettings} onChange={onTriggerSettingsChange} />
      </div>
    </section>
  );
}

function DataManagementWorkspacePage({
  learningLibrary,
  correctionEvents,
  onClearLearningLibrary,
  onClearWritingHabits,
  onClearSettings,
}: {
  learningLibrary: LearningItem[];
  correctionEvents: CorrectionEvent[];
  onClearLearningLibrary: () => void;
  onClearWritingHabits: () => void;
  onClearSettings: () => void;
}) {
  return (
    <section className="text-[var(--lt-text)]">
      <div>
        <h1 className="font-serif text-[38px] font-normal leading-tight">数据管理</h1>
        <p className="mt-2 text-base leading-7 text-[var(--lt-muted)]">本地导出、清理和本地存储查看。</p>
      </div>
      <div className="mt-7 border-t border-[var(--lt-border)] pt-6">
        <DataControlPanel
          learningLibrary={learningLibrary}
          correctionEvents={correctionEvents}
          onClearLearningLibrary={onClearLearningLibrary}
          onClearWritingHabits={onClearWritingHabits}
          onResetApiSettings={onClearSettings}
        />
      </div>
    </section>
  );
}

function ShortcutHelpPage() {
  return (
    <section className="text-[var(--lt-text)]">
      <h1 className="font-serif text-[38px] font-normal leading-tight">快捷键帮助</h1>
      <dl className="mt-8 divide-y divide-[var(--lt-border)] border-y border-[var(--lt-border)] text-sm">
        <ShortcutRow label="增强当前句" value="Ctrl/Cmd + Enter" />
        <ShortcutRow label="换一种表达（建议卡展开时）" value="Ctrl/Cmd + R" />
        <ShortcutRow label="检查本段" value="Ctrl/Cmd + K" />
      </dl>
    </section>
  );
}

function ShortcutRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <dt className="text-[var(--lt-muted)]">{label}</dt>
      <dd className="font-medium text-[var(--lt-text)]">{value}</dd>
    </div>
  );
}

function LinguaTypeWordmark({ className = "", theme }: { className?: string; theme: ResolvedTheme }) {
  return (
    <img
      src={`/brand/linguatype-wordmark-${theme}.png`}
      alt=""
      aria-hidden="true"
      data-brand-logo="wordmark"
      data-brand-theme={theme}
      draggable={false}
      className={`select-none object-contain ${className}`}
    />
  );
}

function LinguaTypeBrandMark({ className = "", theme }: { className?: string; theme: ResolvedTheme }) {
  return (
    <img
      src={`/brand/linguatype-mark-${theme}.png`}
      alt=""
      aria-hidden="true"
      data-brand-logo="mark"
      data-brand-theme={theme}
      draggable={false}
      className={`select-none object-contain ${className}`}
    />
  );
}

function CollapsedSidebarIconButton({
  label,
  active = false,
  accent = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  accent?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group relative grid h-9 w-9 place-items-center rounded-md text-sm transition ${
        active
          ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
          : accent
            ? "text-[var(--lt-accent)] hover:bg-[var(--lt-accent-soft)] hover:text-[var(--lt-accent)]"
            : "hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 rounded-md border border-[var(--lt-border)] bg-[var(--lt-bg)] px-2 py-1 text-xs font-medium text-[var(--lt-text)] opacity-0 shadow-[0_8px_22px_var(--lt-shadow)] transition group-hover:opacity-100 group-focus-visible:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ArchiveSidebar({
  archives,
  collapsed,
  activeView,
  resolvedTheme,
  hasLearningUpdate,
  openMenuArchiveId,
  deleteCandidateId,
  renamingArchiveId,
  onViewChange,
  onCollapse,
  onExpand,
  onCreate,
  onEnhanceCurrentSentence,
  onCheckCurrentParagraph,
  onSwitch,
  onRenameArchive,
  onOpenMenu,
  onStartRename,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onAssignArchiveDomain,
}: {
  archives: WritingArchivesState;
  collapsed: boolean;
  activeView: WorkspaceView;
  resolvedTheme: ResolvedTheme;
  hasLearningUpdate: boolean;
  openMenuArchiveId: string | null;
  deleteCandidateId: string | null;
  renamingArchiveId: string | null;
  onViewChange: (view: WorkspaceView) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onCreate: () => void;
  onEnhanceCurrentSentence: () => void;
  onCheckCurrentParagraph: () => void;
  onSwitch: (id: string) => void;
  onRenameArchive: (id: string, title: string) => void;
  onOpenMenu: (id: string) => void;
  onStartRename: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
  onAssignArchiveDomain: (id: string, topicArea: WritingTopicArea) => void;
}) {
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<WritingTopicArea | "all">("all");
  const [draggingArchiveId, setDraggingArchiveId] = useState<string | null>(null);
  const [dragOverDomain, setDragOverDomain] = useState<WritingTopicArea | null>(null);
  const [dropFeedback, setDropFeedback] = useState<{ archiveId: string; topicArea: WritingTopicArea } | null>(null);
  const [archiveMotionReason, setArchiveMotionReason] = useState<"initial" | "search" | "filter" | "create" | "reorder">(
    "initial",
  );
  const sidebarRef = useRef<HTMLElement | null>(null);
  const openArchiveMenuLayerRef = useRef<HTMLDivElement | null>(null);
  const archiveActionMenuRef = useRef<HTMLDivElement | null>(null);
  const archiveListRef = useRef<HTMLDivElement | null>(null);
  const domainDropRef = useRef<HTMLDivElement | null>(null);
  const dropFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousArchiveMotionRef = useRef<{
    key: string;
    query: string;
    domainFilter: WritingTopicArea | "all";
    total: number;
  } | null>(null);
  const previousCollapsedRef = useRef<boolean | null>(null);
  const sidebarMotionDuration = collapsed ? 360 : 460;
  const isDomainDropVisible = Boolean(draggingArchiveId || dropFeedback);
  const dropFeedbackDomainLabel = dropFeedback ? DOMAIN_OPTIONS.find((domain) => domain.value === dropFeedback.topicArea)?.label : "";

  useDismissableLayer(
    openArchiveMenuLayerRef,
    () => {
      if (openMenuArchiveId) {
        onOpenMenu(openMenuArchiveId);
      }
    },
    Boolean(openMenuArchiveId),
  );

  useEffect(() => {
    if (!openMenuArchiveId) {
      return;
    }
    const menu = archiveActionMenuRef.current;
    if (!menu || typeof menu.animate !== "function") {
      return;
    }

    waapi.animate(menu, {
      opacity: [0, 1],
      transform: ["translateY(-4px) scale(0.98)", "translateY(0px) scale(1)"],
      filter: ["blur(6px)", "blur(0px)"],
      duration: 180,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [openMenuArchiveId]);

  const visibleArchives = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...archives.items]
      .filter((item) => {
        const itemDomain = archiveDomain(item);
        if (domainFilter !== "all" && itemDomain !== domainFilter) {
          return false;
        }
        if (!normalizedQuery) {
          return true;
        }
        return `${archiveDisplayTitle(item)} ${item.setup?.essayTopic ?? ""} ${item.text.slice(0, 320)}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [archives.items, domainFilter, query]);
  const visibleArchiveOrder = visibleArchives.map((item) => item.id).join("|");

  useEffect(() => {
    const snapshot = {
      key: visibleArchiveOrder,
      query: query.trim().toLowerCase(),
      domainFilter,
      total: archives.items.length,
    };
    const previous = previousArchiveMotionRef.current;
    previousArchiveMotionRef.current = snapshot;
    if (!previous) {
      return;
    }

    const reason =
      snapshot.total > previous.total
        ? "create"
        : snapshot.query !== previous.query
          ? "search"
          : snapshot.domainFilter !== previous.domainFilter
            ? "filter"
            : "reorder";
    setArchiveMotionReason(reason);

    const rows = Array.from(archiveListRef.current?.querySelectorAll<HTMLElement>("[data-archive-row]") ?? []);
    if (rows.length === 0 || typeof rows[0].animate !== "function") {
      return;
    }

    waapi.animate(rows, {
      opacity: [0.72, 1],
      transform: ["translateY(8px)", "translateY(0px)"],
      duration: 320,
      delay: stagger(28),
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [archives.items.length, domainFilter, query, visibleArchiveOrder]);

  useEffect(() => {
    const previousCollapsed = previousCollapsedRef.current;
    previousCollapsedRef.current = collapsed;
    if (previousCollapsed === null || previousCollapsed === collapsed) {
      return;
    }

    const sidebar = sidebarRef.current;
    if (!sidebar || typeof sidebar.animate !== "function") {
      return;
    }

    waapi.animate(sidebar, {
      opacity: [0.72, 1],
      transform: [collapsed ? "translateX(-20px)" : "translateX(-44px)", "translateX(0px)"],
      duration: sidebarMotionDuration,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });

    const sidebarItems = Array.from(sidebar.querySelectorAll<HTMLElement>("button, input, [data-sidebar-motion-item]")).slice(
      0,
      14,
    );
    if (sidebarItems.length === 0 || typeof sidebarItems[0].animate !== "function") {
      return;
    }

    waapi.animate(sidebarItems, {
      opacity: [0, 1],
      transform: [collapsed ? "translateX(-10px)" : "translateX(-24px)", "translateX(0px)"],
      duration: collapsed ? 260 : 380,
      delay: stagger(collapsed ? 18 : 26),
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [collapsed, sidebarMotionDuration]);

  useEffect(() => {
    return () => {
      if (dropFeedbackTimerRef.current) {
        clearTimeout(dropFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const dropZone = domainDropRef.current;
    if (!isDomainDropVisible || !dropZone || typeof dropZone.animate !== "function") {
      return;
    }

    waapi.animate(dropZone, {
      opacity: [0, 1],
      transform: ["translateY(-8px) scale(0.98)", "translateY(0px) scale(1)"],
      filter: ["blur(8px)", "blur(0px)"],
      duration: 420,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [isDomainDropVisible]);

  useEffect(() => {
    const dropZone = domainDropRef.current;
    if (!dropFeedback || !dropZone || typeof dropZone.animate !== "function") {
      return;
    }

    waapi.animate(dropZone, {
      opacity: [0.78, 1],
      transform: ["translateY(0px) scale(0.985)", "translateY(0px) scale(1)"],
      duration: 520,
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
    });

    const feedback = dropZone.querySelector<HTMLElement>("[data-domain-feedback-motion='pop']");
    if (feedback && typeof feedback.animate === "function") {
      waapi.animate(feedback, {
        opacity: [0, 1],
        transform: ["translateY(10px) scale(0.88)", "translateY(0px) scale(1)"],
        filter: ["blur(6px)", "blur(0px)"],
        duration: 360,
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }
  }, [dropFeedback]);

  function toggleWorkspaceView(view: WorkspaceView) {
    onViewChange(activeView === view ? "editor" : view);
  }

  function startArchiveDrag(event: DragEvent<HTMLElement>, id: string) {
    if (dropFeedbackTimerRef.current) {
      clearTimeout(dropFeedbackTimerRef.current);
      dropFeedbackTimerRef.current = null;
    }
    setDropFeedback(null);
    setDraggingArchiveId(id);
    setDragOverDomain(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function stopArchiveDrag() {
    setDraggingArchiveId(null);
    setDragOverDomain(null);
  }

  function allowDomainDrop(event: DragEvent<HTMLElement>, topicArea: WritingTopicArea) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverDomain(topicArea);
  }

  function dropArchiveOnDomain(event: DragEvent<HTMLElement>, topicArea: WritingTopicArea) {
    event.preventDefault();
    const archiveId = event.dataTransfer.getData("text/plain") || draggingArchiveId;
    if (archiveId) {
      onAssignArchiveDomain(archiveId, topicArea);
      setDropFeedback({ archiveId, topicArea });
      if (dropFeedbackTimerRef.current) {
        clearTimeout(dropFeedbackTimerRef.current);
      }
      dropFeedbackTimerRef.current = setTimeout(() => {
        setDropFeedback(null);
        dropFeedbackTimerRef.current = null;
      }, 900);
    }
    stopArchiveDrag();
  }

  if (collapsed) {
    return (
      <aside
        ref={sidebarRef}
        aria-label="写作存档侧边栏"
        data-sidebar-motion-state="collapsed"
        data-sidebar-motion-pattern="slide-x"
        data-sidebar-motion-duration={String(sidebarMotionDuration)}
        className="flex h-full min-h-0 flex-col items-center gap-4 border-r border-[var(--lt-border)] bg-[var(--lt-bg)] py-7 text-[var(--lt-muted)] will-change-transform"
      >
        <div aria-label="折叠侧边栏快捷区" className="grid justify-items-center gap-4">
          <div
            aria-label="LinguaType 标识"
            data-sidebar-motion-item
            className="group relative grid h-12 w-12 place-items-center text-[var(--lt-text)]"
          >
            <LinguaTypeBrandMark theme={resolvedTheme} className="block h-11 w-11" />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-[var(--lt-border)] bg-[var(--lt-surface)] px-2 py-1 text-xs text-[var(--lt-text)] opacity-0 shadow-[0_12px_32px_var(--lt-shadow)] transition group-hover:opacity-100"
            >
              LinguaType
            </span>
          </div>
          <CollapsedSidebarIconButton label="展开写作存档" onClick={onExpand}>
            <Bars3Icon className="h-5 w-5" />
          </CollapsedSidebarIconButton>
          <CollapsedSidebarIconButton label="增强当前句" onClick={onEnhanceCurrentSentence} accent>
            <SparklesIcon className="h-5 w-5" />
          </CollapsedSidebarIconButton>
          <CollapsedSidebarIconButton label="检查本段" onClick={onCheckCurrentParagraph}>
            <DocumentCheckIcon className="h-5 w-5" />
          </CollapsedSidebarIconButton>
        </div>
        <div className="mt-auto grid gap-2">
          {WORKSPACE_NAV_ITEMS.map((item) => (
            <CollapsedSidebarIconButton
              key={item.id}
              onClick={() => toggleWorkspaceView(item.id)}
              label={item.label}
              active={activeView === item.id}
            >
              <item.icon className="h-5 w-5" />
              {item.id === "library" && hasLearningUpdate ? (
                <span
                  aria-label="表达库有新内容"
                  className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--lt-accent)]"
                />
              ) : null}
            </CollapsedSidebarIconButton>
          ))}
          <CollapsedSidebarIconButton
            label="触发设置"
            onClick={() => toggleWorkspaceView("triggers")}
            active={activeView === "triggers"}
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </CollapsedSidebarIconButton>
        </div>
      </aside>
    );
  }

  return (
    <aside
      ref={sidebarRef}
      aria-label="写作存档侧边栏"
      data-sidebar-motion-state="expanded"
      data-sidebar-motion-pattern="slide-x"
      data-sidebar-motion-duration={String(sidebarMotionDuration)}
      className="flex h-full min-h-0 flex-col overflow-hidden border-r border-[var(--lt-border)] bg-[var(--lt-bg)] px-7 py-8 text-[var(--lt-muted)] will-change-transform"
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onViewChange("editor")}
          aria-label="LinguaType"
          className="text-left"
        >
          <LinguaTypeWordmark theme={resolvedTheme} className="block h-[84px] w-[252px] text-[var(--lt-text)]" />
          <p className="sr-only">输入法式英文表达助手</p>
        </button>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="收起写作存档"
          className="rounded-md px-2 py-1.5 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-10 flex shrink-0 items-center justify-between gap-2">
        <h2 className="text-xl font-semibold text-[var(--lt-text)]">写作存档</h2>
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-1.5 rounded-md bg-[var(--lt-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)]"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          新建
        </button>
      </div>

      <div className="mt-5 shrink-0 space-y-3">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--lt-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="搜索写作存档"
            placeholder="搜索文章"
            className="h-9 w-full rounded-md bg-[var(--lt-surface-soft)] pl-9 pr-3 text-sm text-[var(--lt-text)] outline-none placeholder:text-[var(--lt-muted)] focus:ring-1 focus:ring-[var(--lt-ring)]"
          />
        </label>
        <DesignSelect
          value={domainFilter}
          onChange={(event) => setDomainFilter(event.target.value as WritingTopicArea | "all")}
          aria-label="按领域筛选"
          wrapperClassName="w-full"
          compact
        >
          <option value="all">全部领域</option>
          {DOMAIN_OPTIONS.map((domain) => (
            <option key={domain.value} value={domain.value}>
              {domain.label}
            </option>
          ))}
        </DesignSelect>
        <div
          ref={domainDropRef}
          aria-label="领域投放区"
          data-domain-drop-visible={isDomainDropVisible ? "true" : "false"}
          data-domain-drop-motion="slow-soft-reveal"
          data-domain-drop-duration="420"
          data-domain-drop-feedback={dropFeedback ? "success" : "idle"}
          data-domain-drop-feedback-domain={dropFeedback?.topicArea ?? ""}
          className={`grid grid-cols-3 gap-1 overflow-hidden rounded-2xl transition-[max-height,opacity,transform,background-color] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isDomainDropVisible
              ? "max-h-36 translate-y-0 bg-[var(--lt-surface-soft)]/70 p-1 opacity-100"
              : "pointer-events-none max-h-0 -translate-y-2 p-0 opacity-0"
          }`}
        >
          {dropFeedback ? (
            <div
              aria-live="polite"
              data-domain-feedback-motion="pop"
              data-motion-library="animejs"
              className="col-span-3 rounded-full bg-[var(--lt-accent-soft-strong)] px-3 py-2 text-center text-[11px] font-medium text-[var(--lt-accent)]"
            >
              已归入{dropFeedbackDomainLabel}领域
            </div>
          ) : null}
          {DOMAIN_OPTIONS.map((domain) => (
            <button
              key={domain.value}
              type="button"
              aria-label={`归入${domain.label}领域`}
              aria-hidden={draggingArchiveId ? undefined : true}
              tabIndex={draggingArchiveId ? 0 : -1}
              data-domain-drop-target={domain.value}
              onDragEnter={() => setDragOverDomain(domain.value)}
              onDragOver={(event) => allowDomainDrop(event, domain.value)}
              onDragLeave={() => setDragOverDomain((current) => (current === domain.value ? null : current))}
              onDrop={(event) => dropArchiveOnDomain(event, domain.value)}
              className={`rounded-full px-2 py-1.5 text-[11px] transition ${
                dragOverDomain === domain.value
                  ? "bg-[var(--lt-accent-soft-strong)] text-[var(--lt-accent)]"
                  : "bg-[var(--lt-surface-soft)] text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={archiveListRef}
        aria-label="写作存档列表"
        data-archive-appear-animation="soft-list-rise"
        data-archive-motion-duration="320"
        data-archive-motion-reason={archiveMotionReason}
        className="lt-scrollbar-hidden mt-4 grid min-h-0 flex-1 content-start gap-1 overflow-x-hidden overflow-y-auto pr-1"
      >
        {visibleArchives.map((item) => (
          <div
            key={item.id}
            data-archive-row
            draggable={renamingArchiveId !== item.id}
            onDragStart={(event) => startArchiveDrag(event, item.id)}
            onDragEnd={stopArchiveDrag}
            ref={(element) => {
              if (item.id === openMenuArchiveId) {
                openArchiveMenuLayerRef.current = element;
              }
            }}
            data-archive-drag-state={draggingArchiveId === item.id ? "dragging" : "idle"}
            data-archive-drag-preview={draggingArchiveId === item.id ? "compact-strip" : "full-row"}
            className={`relative w-full min-w-0 rounded-md transition-[background-color,box-shadow,opacity,transform,border-radius] duration-300 ${
              item.id === openMenuArchiveId ? "z-50" : "z-0"
            } ${
              draggingArchiveId === item.id
                ? "scale-[0.94] rounded-full bg-[var(--lt-surface)] text-[var(--lt-text)] opacity-80 shadow-[0_12px_28px_var(--lt-shadow)]"
                : ""
            } ${
              item.id === archives.activeId
                ? "bg-[var(--lt-surface-soft)] text-[var(--lt-text)] shadow-[inset_2px_0_0_var(--lt-text)]"
                : "text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
            }`}
          >
            <div className="flex w-full min-w-0 items-center gap-1">
              {renamingArchiveId === item.id ? (
                <input
                  value={item.title}
                  onChange={(event) => onRenameArchive(item.id, event.target.value)}
                  onBlur={() => onStartRename("")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onStartRename("");
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      onStartRename("");
                    }
                  }}
                  aria-label={`重命名存档：${item.title || "未命名写作"}`}
                  className="m-2 min-w-0 flex-1 rounded-md bg-[var(--lt-surface)] px-2 py-1 text-sm text-[var(--lt-text)] outline-none focus:ring-1 focus:ring-[var(--lt-ring)]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSwitch(item.id)}
                  aria-current={item.id === archives.activeId ? "true" : undefined}
                  className={`min-w-0 flex-1 overflow-hidden px-3 text-left text-sm transition-[padding] duration-300 ${
                    draggingArchiveId === item.id ? "py-1.5" : "py-2.5"
                  }`}
                >
                  <span className="block max-w-full truncate font-serif text-[15px] font-medium">{archiveDisplayTitle(item)}</span>
                  <span
                    className={`mt-1 max-w-full truncate text-xs font-normal text-[var(--lt-faint)] ${
                      draggingArchiveId === item.id ? "hidden" : "block"
                    }`}
                  >
                    {archiveSubtitle(item)}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenMenu(item.id);
                }}
                aria-label={`打开存档操作：${item.title || "未命名写作"}`}
                className="ml-auto mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--lt-faint)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
              >
                <EllipsisHorizontalIcon className="h-4 w-4" />
              </button>
            </div>
            {openMenuArchiveId === item.id ? (
              <div
                ref={archiveActionMenuRef}
                aria-label={`存档操作菜单：${item.title || "未命名写作"}`}
                data-archive-menu-design="editorial-soft"
                data-archive-menu-motion="soft-popover"
                className="pointer-events-auto absolute right-2 top-9 z-[60] grid min-w-36 gap-1 rounded-2xl bg-[var(--lt-menu-bg)] p-1.5 text-sm shadow-[0_18px_44px_var(--lt-shadow-strong)] ring-1 ring-[var(--lt-border)] backdrop-blur-xl"
                onMouseDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  aria-label="重命名"
                  onClick={(event) => {
                    event.stopPropagation();
                    onStartRename(item.id);
                  }}
                  className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-soft)]"
                >
                  <span>重命名</span>
                  <span className="text-[11px] text-[var(--lt-faint)]">编辑</span>
                </button>
                <span className="mx-3 h-px bg-[var(--lt-border)] opacity-70" />
                <button
                  type="button"
                  aria-label="删除存档"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestDelete(item.id);
                  }}
                  className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-red-700/90 transition hover:bg-red-500/[0.08] hover:text-red-700 dark:text-red-300"
                >
                  <span>删除存档</span>
                  <span className="text-[11px] text-red-700/45 dark:text-red-300/50">本地</span>
                </button>
              </div>
            ) : null}
            {deleteCandidateId === item.id ? (
              <div aria-label="删除存档确认" className="mx-3 mb-2 bg-transparent py-1 text-xs text-[var(--lt-muted)]">
                <p className="leading-5">只删除这个本地写作存档，不会影响表达库或写作习惯。</p>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(item.id)}
                    className="font-medium text-red-700/80 underline-offset-4 transition hover:text-red-700 hover:underline"
                  >
                    确认删除存档
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="text-[var(--lt-muted)] underline-offset-4 transition hover:text-[var(--lt-text)] hover:underline"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <nav
        className="mt-4 grid shrink-0 gap-1 border-t border-[var(--lt-border)] pt-4"
        aria-label="左侧功能导航"
        data-sidebar-nav-density="compact"
      >
        {WORKSPACE_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => toggleWorkspaceView(item.id)}
            className={`relative flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition ${
              activeView === item.id
                ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                : "text-[var(--lt-text)] hover:bg-[var(--lt-surface-hover)]"
            }`}
          >
            <item.icon className="h-[18px] w-[18px] text-[var(--lt-muted)]" />
            {item.label}
            {item.id === "library" && hasLearningUpdate ? (
              <span
                aria-label="表达库有新内容"
                className="ml-auto h-2 w-2 rounded-full bg-[var(--lt-accent)]"
              />
            ) : null}
          </button>
        ))}
      </nav>

      <div
        className="mt-4 grid shrink-0 grid-cols-2 gap-2 border-t border-[var(--lt-border)] pt-4"
        aria-label="侧边栏辅助入口"
        data-sidebar-utility-layout="balanced"
      >
        <button
          type="button"
          onClick={() => toggleWorkspaceView("triggers")}
          className={`flex items-center justify-center gap-2 rounded-md px-2.5 py-3 text-sm font-medium transition ${
            activeView === "triggers"
              ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
              : "text-[var(--lt-text)] hover:bg-[var(--lt-surface-hover)]"
          }`}
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5 text-[var(--lt-muted)]" />
          触发设置
        </button>
        <button
          type="button"
          onClick={() => toggleWorkspaceView("shortcuts")}
          className={`flex items-center justify-center gap-2 rounded-md px-2.5 py-3 text-sm font-medium transition ${
            activeView === "shortcuts"
              ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
              : "text-[var(--lt-text)] hover:bg-[var(--lt-surface-hover)]"
          }`}
        >
          <QuestionMarkCircleIcon className="h-5 w-5 text-[var(--lt-muted)]" />
          快捷键帮助
        </button>
      </div>
    </aside>
  );
}

function InlineSetupControls({
  activeArchive,
  setup,
  text,
  onTitleCommit,
}: {
  activeArchive: WritingArchiveItem | null;
  setup: WritingSetup | null;
  text: string;
  onTitleCommit: (title: string) => void;
}) {
  const title = setup?.essayTopic || activeArchive?.title || "未命名写作";

  const domainLabel = topicAreaDisplayLabel(setup);
  const wordCount = countMetadataWords(text);
  const sentenceCount = countSentences(text);
  const paragraphCount = countParagraphs(text);
  const lastModified = formatArchiveTime(activeArchive?.updatedAt ?? setup?.updatedAt ?? new Date().toISOString());

  function commitTitle(event: FocusEvent<HTMLHeadingElement>) {
    const nextTitle = event.currentTarget.textContent?.trim() ?? "";
    if (!nextTitle || nextTitle === title) {
      event.currentTarget.textContent = title;
      return;
    }
    onTitleCommit(nextTitle);
  }

  function handleTitleKeyDown(event: KeyboardEvent<HTMLHeadingElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.textContent = title;
      event.currentTarget.blur();
    }
  }

  return (
    <div className="grid w-full gap-2">
      <h1
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={commitTitle}
        onKeyDown={handleTitleKeyDown}
        className="max-w-[860px] whitespace-pre-wrap break-words font-serif text-[38px] font-semibold leading-[1.18] text-[var(--lt-text)] outline-none empty:before:text-[var(--lt-faint)] empty:before:content-[attr(data-placeholder)]"
        data-writing-title="true"
        data-placeholder="未命名写作"
      >
        {title}
      </h1>
      <p
        data-document-metadata="true"
        className="text-[11px] leading-6 text-[var(--lt-faint)]"
      >
        <span>最后修改：{lastModified}</span>
        <span> / {wordCount} 词</span>
        <span> / {sentenceCount} 句</span>
        <span> / {paragraphCount} 段</span>
        <span> / {domainLabel}</span>
      </p>
    </div>
  );
}

function topicAreaDisplayLabel(setup: WritingSetup | null): string {
  if (!setup) {
    return "未填写";
  }
  if (setup.topicArea === "custom") {
    return setup.customTopicArea?.trim() || "自定义";
  }
  return TOPIC_OPTIONS.find((option) => option.value === setup.topicArea)?.label ?? setup.topicArea;
}

function archiveDisplayTitle(item: WritingArchiveItem): string {
  const topicTitle = item.setup?.essayTopic.trim() ?? "";
  const archiveTitle = item.title.trim();
  if (archiveTitle && archiveTitle !== topicTitle) {
    return archiveTitle;
  }
  return topicTitle || archiveTitle || "未命名写作";
}

function archiveSubtitle(item: WritingArchiveItem): string {
  const wordCount = countEnglishWords(item.text);
  const updated = formatArchiveTime(item.updatedAt);
  const domain = archiveDomainLabel(item);
  return [domain, updated, wordCount > 0 ? `${wordCount} 词` : ""].filter(Boolean).join(" · ");
}

function archiveDomain(item: WritingArchiveItem): WritingTopicArea {
  return item.setup?.topicArea ?? "custom";
}

function archiveDomainLabel(item: WritingArchiveItem): string {
  const domain = archiveDomain(item);
  if (domain === "custom") {
    return item.setup?.customTopicArea?.trim() || DOMAIN_OPTIONS.find((option) => option.value === "custom")?.label || "自定义";
  }
  return DOMAIN_OPTIONS.find((option) => option.value === domain)?.label ?? domain;
}

function normalizeClassificationText(text: string): string {
  return text.trim().replace(/\s+/gu, " ").slice(0, 6000);
}

function formatArchiveTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return `今天 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  }
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function withWritingSetupContext(previousContext: string, setup: WritingSetup | null): string {
  if (!setup) {
    return previousContext;
  }
  const topicArea = setup.topicArea === "custom" ? setup.customTopicArea : setup.topicArea;
  const contextLines = [
    topicArea ? `写作领域: ${topicArea}` : "",
    setup.essayTopic ? `文章主题: ${setup.essayTopic}` : "",
  ].filter(Boolean);
  if (contextLines.length === 0) {
    return previousContext;
  }
  return [
    previousContext,
    "Writing Setup context，仅用于 tone、meaning、coherence reference，不要生成新论点或正文:",
    ...contextLines,
  ].filter(Boolean).join("\n");
}

function extractCompletedParagraphRanges(fullText: string): ParagraphRange[] {
  const ranges: ParagraphRange[] = [];
  const separatorPattern = /\n\s*\n/gu;
  let rawStart = 0;
  let match: RegExpExecArray | null;

  while ((match = separatorPattern.exec(fullText)) !== null) {
    const range = trimParagraphRange(fullText, rawStart, match.index);
    if (range) {
      ranges.push(range);
    }
    rawStart = match.index + match[0].length;
  }

  return ranges;
}

function trimParagraphRange(fullText: string, start: number, end: number): ParagraphRange | null {
  let paragraphStart = start;
  let paragraphEnd = end;

  while (paragraphStart < paragraphEnd && /\s/u.test(fullText[paragraphStart])) {
    paragraphStart += 1;
  }
  while (paragraphEnd > paragraphStart && /\s/u.test(fullText[paragraphEnd - 1])) {
    paragraphEnd -= 1;
  }

  const paragraph = fullText.slice(paragraphStart, paragraphEnd);
  return paragraph.trim() ? { paragraph, start: paragraphStart, end: paragraphEnd } : null;
}

function countSentences(paragraph: string): number {
  return paragraph.split(/[.!?。？！；;\n]+/u).filter((part) => part.trim().length > 0).length;
}

function countEnglishWords(paragraph: string): number {
  return paragraph.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)?.length ?? 0;
}

function countMetadataWords(paragraph: string): number {
  const latinWords = countEnglishWords(paragraph);
  const cjkWords = paragraph.match(/[\u4e00-\u9fff]/gu)?.length ?? 0;
  return latinWords + cjkWords;
}

function countParagraphs(paragraph: string): number {
  return splitDocumentIntoParagraphs(paragraph).length;
}

function isEnglishSelection(text: string): boolean {
  return /[A-Za-z]/u.test(text) && !/[\u3400-\u9fff]/u.test(text);
}

export function calculateSelectionPopoverPosition(
  anchorRect: DOMRect,
  _containerRect: DOMRect,
): { left: number; top: number } {
  const toolbarWidth = 380;
  const viewportWidth =
    typeof window === "undefined" ? 1200 : window.innerWidth;
  const focusLeft = anchorRect.left + Math.max(1, anchorRect.width);
  const minLeft = toolbarWidth;
  const maxLeft = Math.max(minLeft, viewportWidth - 12);
  return {
    left: Math.max(minLeft, Math.min(focusLeft, maxLeft)),
    top: anchorRect.top,
  };
}

function mapSelectionExpressionType(
  expressionType?: SelectionExplainResult["expressionType"],
): LearningItemDraft["type"] {
  if (expressionType === "collocation") {
    return "collocation";
  }
  if (expressionType === "sentence_pattern" || expressionType === "sentence") {
    return "sentence_pattern";
  }
  return "phrase";
}
