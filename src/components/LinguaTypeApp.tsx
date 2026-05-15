"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import { waapi } from "animejs/waapi";
import { stagger } from "animejs/utils";
import type { Change } from "diff";
import { ApiSettingsPanel } from "./ApiSettingsModal";
import { DataControlPanel } from "./DataControlPanel";
import { DesignSelect } from "./DesignSelect";
import { EnhancementPopover } from "./EnhancementPopover";
import { InlineExpressionMenu } from "./InlineExpressionMenu";
import { LearningLibraryPanel } from "./LearningLibraryPanel";
import { ParagraphFlowPanel } from "./ParagraphFlowPanel";
import { SelectionActionsPopover } from "./SelectionActionsPopover";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { ThemePreferenceControl } from "./ThemePreferenceControl";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { useDismissableLayer } from "./useDismissableLayer";
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
  EllipsisHorizontalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from "./HeroIcons";
import {
  createWordDiff,
  extractCurrentParagraph,
  extractLatestSentence,
  getCurrentParagraph,
  getPreviousContext,
  replaceLatestSentence,
  replaceRange,
  type ParagraphRange,
  type SentenceRange,
} from "@/lib/sentence";
import { createParagraphFingerprint } from "@/lib/llm/normalize";
import { findParagraphIndexForRange, splitTextIntoParagraphs } from "@/lib/editorDocument";
import { TOPIC_OPTIONS } from "@/lib/topicOptions";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  WRITING_ARCHIVES_STORAGE_KEY,
  defaultWritingSetup,
  defaultApiSettings,
  defaultThemeSettings,
  defaultTriggerSettings,
  loadCorrectionEventsFromStorage,
  loadLearningLibraryFromStorage,
  loadParagraphHealthCache,
  loadPersonalDictionaryFromStorage,
  loadThemeSettingsFromStorage,
  loadTriggerSettingsFromStorage,
  loadWritingArchivesFromStorage,
  loadWritingSetupFromStorage,
  savePersonalDictionary,
  saveWritingArchives,
  saveParagraphHealthCache,
  saveThemeSettings,
  saveTriggerSettings,
  saveWritingSetup,
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
import { analyzeProofreading } from "@/lib/proofreading";

type PendingEnhancement = {
  requestId: string;
  snapshotFullText: string;
  latestSentenceRange: SentenceRange;
  originalSentence: string;
  requestInput: Omit<FastEnhanceInput, "apiConfig">;
  result?: FastEnhanceResult;
};

type CompletedEnhancement = PendingEnhancement & {
  result: FastEnhanceResult;
};

type PendingParagraphCheck = {
  requestId: string;
  snapshotFullText: string;
  paragraphRange: ParagraphRange;
  originalParagraph: string;
  result: ParagraphCheckResult;
};

type ParagraphHealthNotice = {
  snapshotFullText: string;
  paragraphRange: ParagraphRange;
  result: ParagraphHealthResult;
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

const WORKSPACE_EXIT_MOTION_DURATION = 420;

export function LinguaTypeApp() {
  const editorRef = useRef<WritingEditorHandle>(null);
  const writingSurfaceRef = useRef<HTMLElement | null>(null);
  const healthCacheRef = useRef<ParagraphHealthCacheItem[]>([]);
  const lastHealthCheckAtRef = useRef(0);
  const isHealthCheckingRef = useRef(false);
  const skipNextArchiveAutoSaveRef = useRef(false);
  const appliedEditsSinceHealthRef = useRef(0);
  const workspaceExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [text, setText] = useState("");
  const [writingMode, setWritingMode] = useState<WritingMode>("natural");
  const [enhancementLevel, setEnhancementLevel] = useState<EnhancementLevel>("balanced");
  const [apiSettings, setApiSettings] = useState<ApiConfig>(() => defaultApiSettings());
  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>(() => defaultTriggerSettings());
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => defaultThemeSettings());
  const [writingArchives, setWritingArchives] = useState<WritingArchivesState>({ activeId: null, items: [] });
  const [writingSetup, setWritingSetup] = useState<WritingSetup | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [learningLibrary, setLearningLibrary] = useState<LearningItem[]>([]);
  const [correctionEvents, setCorrectionEvents] = useState<CorrectionEvent[]>([]);
  const [personalDictionary, setPersonalDictionary] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingEnhancement | null>(null);
  const [pendingParagraph, setPendingParagraph] = useState<PendingParagraphCheck | null>(null);
  const [paragraphHealthNotice, setParagraphHealthNotice] = useState<ParagraphHealthNotice | null>(null);
  const [inlineMenu, setInlineMenu] = useState<{ open: boolean; start: number; end: number }>({
    open: false,
    start: 0,
    end: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isParagraphLoading, setIsParagraphLoading] = useState(false);
  const [outlineCheckResult, setOutlineCheckResult] = useState<OutlineCheckResult | null>(null);
  const [outlineCheckMessage, setOutlineCheckMessage] = useState("");
  const [isOutlineChecking, setIsOutlineChecking] = useState(false);
  const [error, setError] = useState<ErrorMessage | null>(null);
  const [paragraphMessage, setParagraphMessage] = useState("");
  const [learningExtractionMessage, setLearningExtractionMessage] = useState("");
  const [empty, setEmpty] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");
  const [paragraphConflictMessage, setParagraphConflictMessage] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [selectionAction, setSelectionAction] = useState<SelectionActionState | null>(null);
  const [isSelectionLoading, setIsSelectionLoading] = useState(false);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<WorkspaceView>("editor");
  const [pendingWorkspaceView, setPendingWorkspaceView] = useState<WorkspaceView | null>(null);
  const [documentMotionReason, setDocumentMotionReason] = useState<"idle" | "new">("idle");
  const [archiveSidebarCollapsed, setArchiveSidebarCollapsed] = useState(false);
  const [openArchiveMenuId, setOpenArchiveMenuId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [renamingArchiveId, setRenamingArchiveId] = useState<string | null>(null);
  const [inlineSetupEdit, setInlineSetupEdit] = useState<InlineSetupEditState>({ kind: "none" });

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
      if (workspaceExitTimerRef.current) {
        clearTimeout(workspaceExitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (documentMotionReason === "idle") {
      return;
    }
    const surface = writingSurfaceRef.current;
    if (!surface || typeof surface.animate !== "function") {
      return;
    }

    waapi.animate(surface, {
      opacity: [0.28, 1],
      transform: ["translateY(26px)", "translateY(0px)"],
      filter: ["blur(10px)", "blur(0px)"],
      duration: 520,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [documentMotionReason, writingArchives.activeId]);

  useEffect(() => {
    const storedSetup = loadWritingSetupFromStorage(localStorage);
    const rawArchiveStorage = localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY);
    const storedArchives = loadWritingArchivesFromStorage(localStorage);
    const shouldPreserveExistingArchiveStorage = rawArchiveStorage !== null && storedArchives.items.length === 0;
    const ensuredArchives = shouldPreserveExistingArchiveStorage ? storedArchives : ensureWritableArchiveState(storedArchives);
    const activeArchive = ensuredArchives.items.find((item) => item.id === ensuredArchives.activeId);
    if (ensuredArchives !== storedArchives && !shouldPreserveExistingArchiveStorage) {
      saveWritingArchives(localStorage, ensuredArchives);
    }
    setWritingArchives(ensuredArchives);
    setText(activeArchive?.text ?? localStorage.getItem(DRAFT_STORAGE_KEY) ?? "");
    setWritingSetup(activeArchive?.setup ?? storedSetup);
    setThemeSettings(loadThemeSettingsFromStorage(localStorage));
    const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      setApiSettings({ ...defaultApiSettings(), ...(JSON.parse(storedSettings) as Partial<ApiConfig>), mockMode: false });
    }
    setLearningLibrary(loadLearningLibraryFromStorage(localStorage));
    setCorrectionEvents(loadCorrectionEventsFromStorage(localStorage));
    setPersonalDictionary(loadPersonalDictionaryFromStorage(localStorage));
    setTriggerSettings(loadTriggerSettingsFromStorage(localStorage));
    healthCacheRef.current = loadParagraphHealthCache(localStorage);
    skipNextArchiveAutoSaveRef.current = true;
    setIsHydrated(true);
  }, []);

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

  const pendingSuggestionParagraphIndex = useMemo(() => {
    if (!pending) {
      return undefined;
    }

    return findParagraphIndexForRange(
      splitTextIntoParagraphs(pending.snapshotFullText, writingSetup?.outlinePoints?.length ?? 1),
      pending.latestSentenceRange,
    );
  }, [pending, writingSetup?.outlinePoints]);

  const proofreadingResult = useMemo(
    () => analyzeProofreading(text, personalDictionary),
    [text, personalDictionary],
  );

  const activeArchive = useMemo(
    () => writingArchives.items.find((item) => item.id === writingArchives.activeId) ?? null,
    [writingArchives],
  );

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
    const currentArchive = writingArchives.items.find((item) => item.id === writingArchives.activeId) ?? null;
    if (currentArchive && currentArchive.id !== id) {
      void maybeClassifyArchiveDomain(currentArchive);
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
    if (archive.setup) {
      saveWritingSetup(localStorage, archive.setup);
    }
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
    setOpenArchiveMenuId(null);
    setDeleteCandidateId(null);
    setRenamingArchiveId(null);
    if (id === writingArchives.activeId && nextActive) {
      setText(nextActive.text);
      setWritingSetup(nextActive.setup);
      if (nextActive.setup) {
        saveWritingSetup(localStorage, nextActive.setup);
      }
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
      true,
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
    saveInlineSetup({ ...setup, outlinePoints, outline: outlinePoints.join("\n") }, true);
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

  function persistCorrectionEvents(items: CorrectionEvent[]) {
    setCorrectionEvents(items);
    localStorage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(items));
  }

  function persistPersonalDictionary(terms: string[]) {
    const normalized = savePersonalDictionary(localStorage, terms);
    setPersonalDictionary(normalized);
  }

  function handleEditorTextChange(value: string) {
    setText(value);
    if (!pending) {
      return;
    }
    if (value !== pending.snapshotFullText) {
      setConflictMessage("增强后你又修改了编辑器内容。请重新增强最新一句，避免覆盖新内容。");
      return;
    }
    setConflictMessage("");
  }

  function ensureApiSettings(): boolean {
    if (!apiSettings.baseUrl || !apiSettings.apiKey || !apiSettings.model) {
      requestWorkspaceView("api");
      setError({ message: "需要先填写 API Settings 设置。" });
      return false;
    }
    return true;
  }

  async function requestEnhancement(
    requestInput: Omit<FastEnhanceInput, "apiConfig">,
  ): Promise<FastEnhanceResult> {
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

  async function enhanceLatestSentence() {
    setError(null);
    setEmpty(false);
    setConflictMessage("");
    setCopyMessage("");
    setLearningExtractionMessage("");
    setSelectionAction(null);

    const range = extractLatestSentence(text);
    if (!range.sentence.trim()) {
      setEmpty(true);
      setStatusMessage("");
      return;
    }

    if (!ensureApiSettings()) {
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
    setStatusMessage("正在增强...");
    setPending({
      requestId,
      snapshotFullText,
      latestSentenceRange: range,
      originalSentence: range.sentence,
      requestInput,
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
        result,
      });
      setStatusMessage("建议已生成");
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      setError({
        message: payload.error ?? "增强失败。请检查 API Settings 后重试。",
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
    const requestId = crypto.randomUUID();
    const nextPending: PendingEnhancement = { ...pending, requestId, result: undefined };
    setConflictMessage("");
    setCopyMessage("");
    setStatusMessage("正在增强...");
    setPending(nextPending);
    setIsRegenerating(true);

    try {
      const result = await requestEnhancement(pending.requestInput);
      setPending({ ...nextPending, result });
      setStatusMessage("已重新生成");
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
    if (!pending?.result) {
      return;
    }
    const completed: CompletedEnhancement = { ...pending, result: pending.result };

    if (text !== completed.snapshotFullText) {
      setConflictMessage("增强后你又修改了编辑器内容。请重新增强最新一句，避免覆盖新内容。");
      return;
    }

    const nextText = replaceLatestSentence(text, completed.latestSentenceRange, completed.result.finalSentence);
    const paragraphRange = extractCurrentParagraph(
      nextText,
      completed.latestSentenceRange.start + completed.result.finalSentence.length,
    );

    setText(nextText);
    if (triggerSettings.popoverBehavior.autoCloseAfterApply) {
      setPending(null);
    }
    setConflictMessage("");
    setCopyMessage("");
    setLearningExtractionMessage("学习提取 Learning extraction 正在后台进行");
    setStatusMessage("已应用 Applied");
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

      setLearningLibrary((current) => {
        const nextLibrary = upsertLearningItems(current, (payload as LearningExtractionResult).learningItems, {
          sourceSentence: applied.result.finalSentence,
          writingMode: applied.requestInput.writingMode,
        });
        localStorage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(nextLibrary));
        localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(nextLibrary));
        return nextLibrary;
      });
      setCorrectionEvents((current) => {
        const nextEvents = upsertCorrectionEvents(current, (payload as LearningExtractionResult).correctionEvents, {
          sourceSentence: applied.result.finalSentence,
          writingMode: applied.requestInput.writingMode,
        });
        localStorage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(nextEvents));
        return nextEvents;
      });
      setLearningExtractionMessage("学习内容已保存到 Learning Library / Writing Habits");
      setStatusMessage("学习内容已保存");
    } catch {
      setLearningExtractionMessage("学习提取失败，但已应用的文本会保留。");
      setStatusMessage("学习提取失败");
    }
  }

  async function maybeRunParagraphHealthAfterApply(nextText: string, paragraphRange: ParagraphRange) {
    if (triggerSettings.paragraphHealthTrigger === "off" || triggerSettings.paragraphHealthTrigger === "manual_only") {
      return;
    }
    appliedEditsSinceHealthRef.current += 1;
    if (
      triggerSettings.paragraphHealthTrigger === "after_3_applied_edits" &&
      appliedEditsSinceHealthRef.current < 3
    ) {
      return;
    }
    if (!shouldRunParagraphHealth(paragraphRange.paragraph)) {
      return;
    }

    const fingerprint = createParagraphFingerprint(paragraphRange.paragraph);
    const cached = healthCacheRef.current.find((item) => item.paragraphFingerprint === fingerprint);
    if (cached) {
      if (cached.result.hasIssues) {
        setParagraphHealthNotice({ snapshotFullText: nextText, paragraphRange, result: cached.result });
      }
      appliedEditsSinceHealthRef.current = 0;
      return;
    }

    isHealthCheckingRef.current = true;
    lastHealthCheckAtRef.current = Date.now();
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
        return;
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
      if (result.hasIssues) {
        setParagraphHealthNotice({ snapshotFullText: nextText, paragraphRange, result });
      }
      appliedEditsSinceHealthRef.current = 0;
      setStatusMessage("段落健康 已检查");
    } finally {
      isHealthCheckingRef.current = false;
    }
  }

  function shouldRunParagraphHealth(paragraph: string): boolean {
    if (isHealthCheckingRef.current || isParagraphLoading) {
      return false;
    }
    if (Date.now() - lastHealthCheckAtRef.current < 30_000) {
      return false;
    }
    if (countSentences(paragraph) < 2) {
      return false;
    }
    if (countEnglishWords(paragraph) < 40) {
      return false;
    }
    return true;
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
    await runParagraphFlowCheck(text, range);
  }

  async function viewParagraphHealthSuggestions() {
    if (!paragraphHealthNotice) {
      return;
    }
    await runParagraphFlowCheck(paragraphHealthNotice.snapshotFullText, paragraphHealthNotice.paragraphRange);
  }

  async function runParagraphFlowCheck(snapshotFullText: string, range: ParagraphRange) {
    setParagraphMessage("");
    setParagraphConflictMessage("");
    setPendingParagraph(null);
    setInlineMenu((current) => ({ ...current, open: false }));

    if (!range.paragraph.trim()) {
      setParagraphMessage("请先写一段内容，再检查段落流畅度 Paragraph Flow。");
      requestWorkspaceView("editor");
      return;
    }

    if (!ensureApiSettings()) {
      return;
    }

    const requestId = crypto.randomUUID();
    setIsParagraphLoading(true);
    requestWorkspaceView("editor");

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
      setParagraphMessage(payload.error ?? "段落流畅度 Paragraph Flow 检查失败。");
    } finally {
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
    setInlineMenu((current) => ({ ...current, open: false }));
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

  async function maybeClassifyArchiveDomain(archive: WritingArchiveItem) {
    if (archive.topicAreaSource === "manual" || !archive.setup) {
      return;
    }
    if (!apiSettings.baseUrl || !apiSettings.apiKey || !apiSettings.model) {
      return;
    }
    const wordCount = countEnglishWords(archive.text);
    if (wordCount < 120) {
      return;
    }
    if (archive.topicAreaClassifiedAt && Date.now() - Date.parse(archive.topicAreaClassifiedAt) < 12 * 60 * 60 * 1000) {
      return;
    }
    if (contentChangeRatio(archive.topicAreaClassifiedText ?? "", archive.text) < 0.4) {
      return;
    }

    try {
      const response = await fetch("/api/classify-writing-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: archive.setup.essayTopic || archive.title,
          fullText: archive.text,
          outlinePoints: archive.setup.outlinePoints,
          allowedDomains: DOMAIN_OPTIONS.map((option) => option.value),
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as { topicArea?: WritingTopicArea; error?: string };
      if (!response.ok || payload.error || !payload.topicArea) {
        return;
      }
      assignArchiveDomain(archive.id, payload.topicArea, "auto");
    } catch {
      // Domain classification is intentionally low-priority and must never interrupt writing.
    }
  }

  function openInlineMenu(selection: { start: number; end: number }) {
    setInlineMenu({ open: true, start: selection.start, end: selection.end });
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function closeInlineMenu() {
    setInlineMenu((current) => ({ ...current, open: false }));
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function handleSelectionChange(selection: {
    start: number;
    end: number;
    text: string;
    paragraphIndex: number;
    anchorRect: DOMRect;
    containerRect: DOMRect;
  }) {
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
    if (!selectionAction || !ensureApiSettings()) {
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
  }

  function clearWritingHabits() {
    persistCorrectionEvents([]);
  }

  function closeCurrentSuggestion() {
    setPending(null);
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

  const workspaceMotionState = pendingWorkspaceView && activeWorkspaceView !== "editor" ? "exiting" : "entering";

  return (
    <main className="h-screen overflow-hidden bg-[var(--lt-bg)] text-[var(--lt-text)]">
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
          openMenuArchiveId={openArchiveMenuId}
          deleteCandidateId={deleteCandidateId}
          renamingArchiveId={renamingArchiveId}
          onViewChange={requestWorkspaceView}
          onCollapse={() => setArchiveSidebarCollapsed(true)}
          onExpand={() => setArchiveSidebarCollapsed(false)}
          onCreate={() => {
            createNewArchive();
            requestWorkspaceView("editor");
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

        <section className="lt-scrollbar-hidden relative min-h-0 overflow-y-auto">
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
              className={`mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-[920px] flex-col gap-8 px-8 pb-0 transition-[max-width] ${
                archiveSidebarCollapsed ? "xl:max-w-[1020px]" : ""
              }`}
            >
              <section className="px-1">
                <InlineSetupControls
                  activeArchive={activeArchive}
                  setup={writingSetup}
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

              <div className="relative flex min-h-0 flex-1 flex-col">
                <WritingEditor
                  ref={editorRef}
                  value={text}
                  outlinePoints={writingSetup?.outlinePoints}
                  isLoading={isLoading}
                  isExpressionMenuOpen={inlineMenu.open}
                  writingMode={writingMode}
                  enhancementLevel={enhancementLevel}
                  proofreadingResult={proofreadingResult}
                  triggerSettings={triggerSettings}
                  topicAreaLabel={topicAreaDisplayLabel(writingSetup)}
                  onChange={handleEditorTextChange}
                  onWritingModeChange={setWritingMode}
                  onEnhancementLevelChange={setEnhancementLevel}
                  onEnhance={enhanceLatestSentence}
                  onOpenExpressionMenu={openInlineMenu}
                  onCloseExpressionMenu={closeInlineMenu}
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
                  inlineSuggestionParagraphIndex={pendingSuggestionParagraphIndex}
                  inlineSuggestion={
                    pending ? (
                      <EnhancementPopover
                        originalSentence={pending.originalSentence}
                        result={pending.result}
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
                <InlineExpressionMenu
                  open={inlineMenu.open}
                  library={learningLibrary}
                  onClose={closeInlineMenu}
                  onInsert={(content) => insertIntoEditor(content, inlineMenu)}
                  onCheckParagraph={() => void checkCurrentParagraph(inlineMenu.start)}
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

              {statusMessage || learningExtractionMessage ? (
                <section className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-muted)]">
                  {statusMessage ? <p>{statusMessage}</p> : null}
                  {learningExtractionMessage ? <p>{learningExtractionMessage}</p> : null}
                </section>
              ) : null}

              {paragraphHealthNotice ? (
                <section className="rounded-md bg-sky-500/[0.08] px-3 py-2 text-sm text-sky-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span>段落健康：可能有 {paragraphHealthNotice.result.issueCount} 个问题</span>
                    <button
                      type="button"
                      onClick={() => void viewParagraphHealthSuggestions()}
                      className="rounded-md bg-sky-500/[0.12] px-2 py-1 text-xs font-medium text-sky-900 transition hover:bg-sky-500/[0.18]"
                    >
                      查看建议
                    </button>
                  </div>
                </section>
              ) : null}

              {pendingParagraph || paragraphMessage || paragraphConflictMessage || isParagraphLoading ? (
                <ParagraphFlowPanel
                  result={pendingParagraph?.result}
                  diffParts={paragraphDiffParts}
                  isLoading={isParagraphLoading}
                  message={paragraphMessage}
                  conflictMessage={paragraphConflictMessage}
                  onApply={applyParagraphCheck}
                  onCancel={() => {
                    setPendingParagraph(null);
                    setParagraphConflictMessage("");
                  }}
                />
              ) : null}

              {empty ? <EmptyState /> : null}
              {isLoading ? <LoadingState /> : null}
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
  const motionDuration = 820;
  const exitMotionDuration = WORKSPACE_EXIT_MOTION_DURATION;
  const motionDistance = 72;

  useEffect(() => {
    const page = pageRef.current;
    if (!page || typeof page.animate !== "function") {
      return;
    }

    if (motionState === "exiting") {
      waapi.animate(page, {
        opacity: [1, 0.08],
        transform: ["translateY(0px) scale(1)", "translateY(-32px) scale(0.985)"],
        filter: ["blur(0px)", "blur(9px)"],
        duration: exitMotionDuration,
        ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      });

      const exitingItems = Array.from(
        page.querySelectorAll<HTMLElement>("h1, h2, button, label, li, [data-motion-item]"),
      ).slice(0, 16);
      if (exitingItems.length > 0 && typeof exitingItems[0].animate === "function") {
        waapi.animate(exitingItems, {
          opacity: [1, 0],
          transform: ["translateY(0px)", "translateY(-14px)"],
          duration: exitMotionDuration - 60,
          delay: stagger(14),
          ease: "cubic-bezier(0.4, 0, 0.2, 1)",
        });
      }
      return;
    }

    waapi.animate(page, {
      opacity: [0.06, 1],
      transform: [`translateY(${motionDistance}px) scale(0.96)`, "translateY(0px) scale(1)"],
      filter: ["blur(16px)", "blur(0px)"],
      duration: motionDuration,
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });

    const sweep = page.querySelector<HTMLElement>("[data-motion-sweep]");
    if (sweep && typeof sweep.animate === "function") {
      waapi.animate(sweep, {
        opacity: [0, 0.58, 0],
        transform: ["scaleX(0)", "scaleX(1)", "scaleX(1)"],
        duration: 920,
        ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      });
    }

    const motionItems = Array.from(
      page.querySelectorAll<HTMLElement>("h1, h2, button, label, li, [data-motion-item]"),
    ).slice(0, 18);
    if (motionItems.length === 0 || typeof motionItems[0].animate !== "function") {
      return;
    }

    waapi.animate(motionItems, {
      opacity: [0, 1],
      transform: ["translateY(34px)", "translateY(0px)"],
      duration: 720,
      delay: stagger(70),
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [exitMotionDuration, motionDistance, motionDuration, motionState, view]);

  return (
    <section
      ref={pageRef}
      aria-label={ariaLabel}
      data-workspace-motion={view}
      data-motion-intensity="noticeable"
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
        className="pointer-events-none absolute left-8 right-8 top-0 h-px origin-left bg-[var(--lt-text)]/35"
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
        <ShortcutRow label="增强最新一句" value="Ctrl/Cmd + Enter" />
        <ShortcutRow label="打开表达菜单" value="Ctrl/Cmd + K" />
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

function ArchiveSidebar({
  archives,
  collapsed,
  activeView,
  openMenuArchiveId,
  deleteCandidateId,
  renamingArchiveId,
  onViewChange,
  onCollapse,
  onExpand,
  onCreate,
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
  openMenuArchiveId: string | null;
  deleteCandidateId: string | null;
  renamingArchiveId: string | null;
  onViewChange: (view: WorkspaceView) => void;
  onCollapse: () => void;
  onExpand: () => void;
  onCreate: () => void;
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
            className="lt-brand-wordmark-serif grid h-10 w-9 place-items-center text-[var(--lt-text)]"
          >
            <span className="lt-brand-wordmark-serif text-2xl leading-none" data-brand-font="system-serif-italic">
              L
            </span>
          </div>
          <button
            type="button"
            onClick={onExpand}
            aria-label="展开写作存档"
            className="rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onCreate}
            aria-label="新建写作"
            className="rounded-md px-2 py-1.5 text-lg transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-auto grid gap-2">
          {WORKSPACE_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleWorkspaceView(item.id)}
              aria-label={`打开${item.label}`}
              className={`grid h-9 w-9 place-items-center rounded-md text-sm transition ${
                activeView === item.id
                  ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                  : "hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
              }`}
            >
              <item.icon className="h-5 w-5" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => toggleWorkspaceView("triggers")}
            aria-label="打开触发设置"
            className={`grid h-9 w-9 place-items-center rounded-md text-sm transition ${
              activeView === "triggers"
                ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                : "hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
            }`}
          >
            <AdjustmentsHorizontalIcon className="h-5 w-5" />
          </button>
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
        <button type="button" onClick={() => onViewChange("editor")} className="text-left">
          <h1
            className="lt-brand-wordmark-serif text-[36px] leading-none text-[var(--lt-text)]"
            data-brand-font="system-serif-italic"
          >
            LinguaType
          </h1>
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
        className="lt-scrollbar-hidden mt-4 grid min-h-0 flex-1 content-start gap-1 overflow-y-auto pr-1"
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
            className={`relative rounded-md transition-[background-color,box-shadow,opacity,transform,border-radius] duration-300 ${
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
            <div className="flex items-center gap-1">
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
                  className={`min-w-0 flex-1 px-3 text-left text-sm transition-[padding] duration-300 ${
                    draggingArchiveId === item.id ? "py-1.5" : "py-2.5"
                  }`}
                >
                  <span className="block truncate font-serif text-[15px] font-medium">{archiveDisplayTitle(item)}</span>
                  <span
                    className={`mt-1 truncate text-xs font-normal text-[var(--lt-faint)] ${
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
                className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-[var(--lt-faint)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
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
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition ${
              activeView === item.id
                ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                : "text-[var(--lt-text)] hover:bg-[var(--lt-surface-hover)]"
            }`}
          >
            <item.icon className="h-[18px] w-[18px] text-[var(--lt-muted)]" />
            {item.label}
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
  onTitleCommit,
}: {
  activeArchive: WritingArchiveItem | null;
  setup: WritingSetup | null;
  onTitleCommit: (title: string) => void;
}) {
  const title = setup?.essayTopic || activeArchive?.title || "未命名写作";

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
    <div className="grid gap-3">
      <h1
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onBlur={commitTitle}
        onKeyDown={handleTitleKeyDown}
        className="max-w-[860px] whitespace-pre-wrap break-words font-serif text-[38px] font-normal leading-[1.18] text-[var(--lt-text)] outline-none empty:before:text-[var(--lt-faint)] empty:before:content-[attr(data-placeholder)]"
        data-placeholder="未命名写作"
      >
        {title}
      </h1>
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
  return wordCount > 0 ? `${updated} · ${wordCount} 词` : updated;
}

function archiveDomain(item: WritingArchiveItem): WritingTopicArea {
  return item.setup?.topicArea ?? "custom";
}

function normalizeClassificationText(text: string): string {
  return text.trim().replace(/\s+/gu, " ").slice(0, 6000);
}

function contentChangeRatio(previous: string, current: string): number {
  const previousTokens = tokenSet(previous);
  const currentTokens = tokenSet(current);
  if (previousTokens.size === 0) {
    return currentTokens.size > 0 ? 1 : 0;
  }
  const union = new Set([...previousTokens, ...currentTokens]);
  let intersection = 0;
  for (const token of previousTokens) {
    if (currentTokens.has(token)) {
      intersection += 1;
    }
  }
  return union.size === 0 ? 0 : 1 - intersection / union.size;
}

function tokenSet(text: string): Set<string> {
  return new Set(normalizeClassificationText(text).toLowerCase().match(/[a-z]+(?:'[a-z]+)?|[\u3400-\u9fff]/gu) ?? []);
}

function formatArchiveTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
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
    setup.outlinePoints.length > 0 ? `用户大纲: ${setup.outlinePoints.join(" / ")}` : "",
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

function countSentences(paragraph: string): number {
  return paragraph.split(/[.!?。？！；;\n]+/u).filter((part) => part.trim().length > 0).length;
}

function countEnglishWords(paragraph: string): number {
  return paragraph.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)?.length ?? 0;
}

function isEnglishSelection(text: string): boolean {
  return /[A-Za-z]/u.test(text) && !/[\u3400-\u9fff]/u.test(text);
}

function calculateSelectionPopoverPosition(anchorRect: DOMRect, containerRect: DOMRect): { left: number; top: number } {
  const width = 40;
  const gap = 12;
  const preferredTop = anchorRect.top - containerRect.top - 44 - gap;
  const fallbackTop = anchorRect.bottom - containerRect.top + gap;
  const top = preferredTop >= 0 ? preferredTop : fallbackTop;
  const centeredLeft = anchorRect.left - containerRect.left + anchorRect.width / 2 - width / 2;
  const maxLeft = Math.max(0, containerRect.width - width - 16);
  return {
    left: Math.max(8, Math.min(centeredLeft, maxLeft)),
    top: Math.max(8, top),
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
