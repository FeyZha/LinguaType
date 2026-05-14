"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Change } from "diff";
import { ApiSettingsModal } from "./ApiSettingsModal";
import { DataControlPanel } from "./DataControlPanel";
import { EnhancementPopover } from "./EnhancementPopover";
import { InlineExpressionMenu } from "./InlineExpressionMenu";
import { LearningLibraryPanel } from "./LearningLibraryPanel";
import { ParagraphFlowPanel } from "./ParagraphFlowPanel";
import { PersonalDictionaryPanel } from "./PersonalDictionaryPanel";
import { SelectionActionsPopover } from "./SelectionActionsPopover";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { ThemePreferenceControl } from "./ThemePreferenceControl";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { WritingEditor } from "./WritingEditor";
import { WritingHabitsPanel } from "./WritingHabitsPanel";
import { TOPIC_OPTIONS, WritingSetupPanel } from "./WritingSetupPanel";
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
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
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
};

type InlineSetupEditState =
  | { kind: "none" }
  | { kind: "topic"; draft: string }
  | { kind: "area"; draftArea: WritingTopicArea; draftCustomArea?: string }
  | { kind: "outline-point"; index: number; draft: string };

type SidebarTab = "review" | "library" | "habits" | "tools" | "data";

const SIDEBAR_TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "review", label: "检查状态" },
  { id: "library", label: "表达库" },
  { id: "habits", label: "写作习惯" },
  { id: "tools", label: "工具与设置" },
  { id: "data", label: "数据管理" },
];

export function LinguaTypeApp() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const healthCacheRef = useRef<ParagraphHealthCacheItem[]>([]);
  const lastHealthCheckAtRef = useRef(0);
  const isHealthCheckingRef = useRef(false);
  const appliedEditsSinceHealthRef = useRef(0);
  const [text, setText] = useState("");
  const [writingMode, setWritingMode] = useState<WritingMode>("natural");
  const [enhancementLevel, setEnhancementLevel] = useState<EnhancementLevel>("balanced");
  const [apiSettings, setApiSettings] = useState<ApiConfig>(() => defaultApiSettings());
  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>(() => defaultTriggerSettings());
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => defaultThemeSettings());
  const [writingArchives, setWritingArchives] = useState<WritingArchivesState>({ activeId: null, items: [] });
  const [writingSetup, setWritingSetup] = useState<WritingSetup | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
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
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [activeTab, setActiveTab] = useState<SidebarTab>("review");
  const [archiveSidebarCollapsed, setArchiveSidebarCollapsed] = useState(false);
  const [openArchiveMenuId, setOpenArchiveMenuId] = useState<string | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);
  const [renamingArchiveId, setRenamingArchiveId] = useState<string | null>(null);
  const [inlineSetupEdit, setInlineSetupEdit] = useState<InlineSetupEditState>({ kind: "none" });

  useEffect(() => {
    const storedSetup = loadWritingSetupFromStorage(localStorage);
    const storedArchives = loadWritingArchivesFromStorage(localStorage);
    const activeArchive = storedArchives.items.find((item) => item.id === storedArchives.activeId);
    setWritingArchives(storedArchives);
    setText(activeArchive?.text ?? localStorage.getItem(DRAFT_STORAGE_KEY) ?? "");
    setWritingSetup(activeArchive?.setup ?? storedSetup);
    setSetupComplete(Boolean(activeArchive?.setup ?? storedSetup));
    setThemeSettings(loadThemeSettingsFromStorage(localStorage));
    const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      setApiSettings({ ...defaultApiSettings(), ...(JSON.parse(storedSettings) as Partial<ApiConfig>) });
    }
    setLearningLibrary(loadLearningLibraryFromStorage(localStorage));
    setCorrectionEvents(loadCorrectionEventsFromStorage(localStorage));
    setPersonalDictionary(loadPersonalDictionaryFromStorage(localStorage));
    setTriggerSettings(loadTriggerSettingsFromStorage(localStorage));
    healthCacheRef.current = loadParagraphHealthCache(localStorage);
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
      mockMode: Boolean(settings.mockMode),
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

  function completeWritingSetup(setup: WritingSetup) {
    const normalized = saveWritingSetup(localStorage, setup);
    setWritingSetup(normalized);
    upsertActiveArchive({
      setup: normalized,
      title: writingArchiveTitleFromSetup(normalized),
    });
    setSetupComplete(true);
    requestAnimationFrame(() => editorRef.current?.focus());
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
    if (item.setup) {
      saveWritingSetup(localStorage, item.setup);
    }
    setSetupComplete(true);
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
    const now = new Date().toISOString();
    const nextArchive = { ...archive, lastOpenedAt: now };
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
    setSetupComplete(Boolean(archive.setup));
    setOutlineCheckResult(null);
    setOutlineCheckMessage("");
  }

  function renameActiveArchive(title: string) {
    if (!writingArchives.activeId) {
      return;
    }
    upsertActiveArchive({ title });
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
      setSetupComplete(Boolean(nextActive.setup));
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
    setSetupComplete(true);
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
    if (!apiSettings.mockMode && (!apiSettings.baseUrl || !apiSettings.apiKey || !apiSettings.model)) {
      setSettingsOpen(true);
      setError({ message: "除非开启 Mock Mode，否则需要先填写 API Settings。" });
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
    const range = extractCurrentParagraph(text, cursorPosition ?? editorRef.current?.selectionStart);
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
      setActiveTab("tools");
      return;
    }

    if (!ensureApiSettings()) {
      return;
    }

    const requestId = crypto.randomUUID();
    setIsParagraphLoading(true);
    setActiveTab("tools");

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
    const start = selection?.start ?? editor?.selectionStart ?? text.length;
    const end = selection?.end ?? editor?.selectionEnd ?? text.length;
    const nextText = `${text.slice(0, start)}${content}${text.slice(end)}`;
    setText(nextText);
    setInlineMenu((current) => ({ ...current, open: false }));
    requestAnimationFrame(() => {
      editor?.focus();
      if (editor) {
        editor.selectionStart = start + content.length;
        editor.selectionEnd = start + content.length;
      }
    });
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
    setSelectionAction((current) => current ? { ...current, message: "" } : current);

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
      <main className="flex min-h-screen items-center justify-center">
        <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          正在加载 LinguaType...
        </div>
      </main>
    );
  }

  if (!setupComplete) {
    return (
      <WritingSetupPanel
        initialSetup={writingSetup}
        hasDraft={Boolean(text.trim())}
        onSubmit={completeWritingSetup}
        onContinue={() => setSetupComplete(true)}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 bg-white/60 px-5 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-base font-semibold text-slate-950">LinguaType</h1>
            <p className="text-xs text-slate-500">输入法式英文表达助手</p>
          </div>
          {apiSettings.mockMode ? (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
              演示模式
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ThemePreferenceControl settings={themeSettings} onChange={persistThemeSettings} compact />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            API 设置
          </button>
        </div>
      </header>

      <div
        className={`grid flex-1 gap-5 px-4 py-3 ${
          archiveSidebarCollapsed
            ? "xl:grid-cols-[56px_minmax(0,1fr)_320px]"
            : "xl:grid-cols-[248px_minmax(0,1fr)_320px]"
        }`}
      >
        <ArchiveSidebar
          archives={writingArchives}
          activeArchive={activeArchive}
          collapsed={archiveSidebarCollapsed}
          openMenuArchiveId={openArchiveMenuId}
          deleteCandidateId={deleteCandidateId}
          renamingArchiveId={renamingArchiveId}
          onCollapse={() => setArchiveSidebarCollapsed(true)}
          onExpand={() => setArchiveSidebarCollapsed(false)}
          onCreate={createNewArchive}
          onSwitch={switchArchive}
          onRenameActive={renameActiveArchive}
          onRenameArchive={renameArchive}
          onOpenMenu={(id) => {
            setOpenArchiveMenuId(openArchiveMenuId === id ? null : id);
            setDeleteCandidateId(null);
          }}
          onStartRename={(id) => {
            setRenamingArchiveId(id);
            setOpenArchiveMenuId(null);
          }}
          onRequestDelete={(id) => setDeleteCandidateId(id)}
          onCancelDelete={() => setDeleteCandidateId(null)}
          onConfirmDelete={deleteArchive}
        />
        <section
          aria-label="沉浸式写作区"
          className={`mx-auto flex min-h-0 w-full max-w-5xl flex-col gap-4 px-2 py-3 transition-[max-width] ${
            archiveSidebarCollapsed ? "xl:max-w-6xl" : ""
          }`}
        >
          <section className="px-1">
            <InlineSetupControls
              activeArchive={activeArchive}
              setup={writingSetup}
              editState={inlineSetupEdit}
              onStartTopicEdit={startTopicEdit}
              onStartAreaEdit={startAreaEdit}
              onEditStateChange={setInlineSetupEdit}
              onSaveTopic={saveTopicEdit}
              onSaveArea={saveAreaEdit}
              onCancel={() => setInlineSetupEdit({ kind: "none" })}
            />
              {isOutlineChecking ? (
                <p className="mt-3 text-xs text-slate-500">正在检查大纲与主题是否一致...</p>
              ) : null}
              {outlineCheckResult?.hasIssues ? (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {outlineCheckResult.suggestionsZh.map((suggestion) => (
                    <p key={suggestion}>{suggestion}</p>
                  ))}
                </div>
              ) : null}
              {outlineCheckMessage ? (
                <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
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
            />
            {pending ? (
              <div className="mt-4">
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
              </div>
            ) : null}
            <InlineExpressionMenu
              open={inlineMenu.open}
              library={learningLibrary}
              writingMode={writingMode}
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
                onExplain={() => void explainSelectedText()}
                onSave={saveSelectedTextToLibrary}
                onClose={closeSelectionActions}
              />
            ) : null}
          </div>
          {paragraphHealthNotice ? (
            <section className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  段落健康：可能有 {paragraphHealthNotice.result.issueCount} 个问题
                </span>
                <button
                  type="button"
                  onClick={() => void viewParagraphHealthSuggestions()}
                  className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                >
                  查看建议
                </button>
              </div>
            </section>
          ) : null}
          {empty ? <EmptyState /> : null}
          {isLoading ? <LoadingState /> : null}
          {error ? <ErrorState message={error.message} rawResponse={error.rawResponse} /> : null}
        </section>

        <aside className="flex flex-col gap-3 border-l border-slate-200/70 pl-3">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-white/55 p-1">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded px-2 py-1.5 text-sm ${
                  activeTab === tab.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "review" ? (
            <div className="flex flex-col gap-4">
              <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <h2 className="text-sm font-semibold text-slate-900">检查状态</h2>
                <p className="mt-2">
                  当前句建议会优先出现在编辑器附近。这里保留低频状态和后台任务反馈。
                </p>
                {statusMessage ? <p className="mt-3 rounded-md bg-slate-50 p-3">{statusMessage}</p> : null}
              </section>
              {learningExtractionMessage ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {learningExtractionMessage}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "library" ? (
            <LearningLibraryPanel
              items={learningLibrary}
              writingMode={writingMode}
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
              onInsert={(content) => insertIntoEditor(content)}
            />
          ) : null}

          {activeTab === "habits" ? (
            <WritingHabitsPanel events={correctionEvents} onDeleteType={deleteHabitType} />
          ) : null}

          {activeTab === "tools" ? (
            <div className="flex flex-col gap-4">
              <TriggerSettingsPanel settings={triggerSettings} onChange={persistTriggerSettings} />
              <PersonalDictionaryPanel terms={personalDictionary} onChange={persistPersonalDictionary} />
              <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
                需要检查当前段落时，请在编辑器内打开，然后选择 Check this paragraph。
              </section>
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
            </div>
          ) : null}

          {activeTab === "data" ? (
            <DataControlPanel
              learningLibrary={learningLibrary}
              correctionEvents={correctionEvents}
              onClearLearningLibrary={clearLearningLibrary}
              onClearWritingHabits={clearWritingHabits}
              onResetApiSettings={clearSettings}
            />
          ) : null}
        </aside>
      </div>

      <ApiSettingsModal
        open={settingsOpen}
        settings={apiSettings}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        onClear={clearSettings}
      />
    </main>
  );
}

function ArchiveSidebar({
  archives,
  activeArchive,
  collapsed,
  openMenuArchiveId,
  deleteCandidateId,
  renamingArchiveId,
  onCollapse,
  onExpand,
  onCreate,
  onSwitch,
  onRenameActive,
  onRenameArchive,
  onOpenMenu,
  onStartRename,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  archives: WritingArchivesState;
  activeArchive: WritingArchiveItem | null;
  collapsed: boolean;
  openMenuArchiveId: string | null;
  deleteCandidateId: string | null;
  renamingArchiveId: string | null;
  onCollapse: () => void;
  onExpand: () => void;
  onCreate: () => void;
  onSwitch: (id: string) => void;
  onRenameActive: (title: string) => void;
  onRenameArchive: (id: string, title: string) => void;
  onOpenMenu: (id: string) => void;
  onStartRename: (id: string) => void;
  onRequestDelete: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
}) {
  if (collapsed) {
    return (
      <aside className="flex min-h-0 flex-col items-center gap-2 border-r border-slate-200/70 py-2 pr-2">
        <button
          type="button"
          onClick={onExpand}
          aria-label="展开写作存档"
          className="rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-white"
        >
          ☰
        </button>
        <button
          type="button"
          onClick={onCreate}
          aria-label="新建写作"
          className="rounded-md bg-slate-900 px-2 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          +
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col gap-3 border-r border-slate-200/70 py-2 pr-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">写作存档</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCreate}
            className="rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            新建
          </button>
          <button
            type="button"
            onClick={onCollapse}
            aria-label="收起写作存档"
            className="rounded-md px-2 py-1.5 text-xs text-slate-600 hover:bg-white"
          >
            ←
          </button>
        </div>
      </div>
      {activeArchive ? (
        <label className="grid gap-1 text-xs font-medium text-slate-500">
          当前存档标题
          <input
            value={activeArchive.title}
            onChange={(event) => onRenameActive(event.target.value)}
            aria-label="当前存档标题"
            className="h-9 rounded-md border border-slate-200 bg-white/65 px-3 text-sm text-slate-800 outline-none focus:border-moss"
          />
        </label>
      ) : null}
      <div className="grid gap-1 overflow-auto">
        {archives.items.map((item) => (
          <div
            key={item.id}
            className={`relative rounded-md transition ${
              item.id === archives.activeId ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-white"
            }`}
          >
            <div className="flex items-start gap-1">
              {renamingArchiveId === item.id ? (
                <input
                  value={item.title}
                  onChange={(event) => onRenameArchive(item.id, event.target.value)}
                  onBlur={() => onStartRename("")}
                  aria-label={`重命名存档：${item.title || "未命名写作"}`}
                  className="m-2 min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800 outline-none focus:border-moss"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onSwitch(item.id)}
                  aria-current={item.id === archives.activeId ? "true" : undefined}
                  className="min-w-0 flex-1 px-3 py-2 text-left text-sm"
                >
                  <span className="block truncate font-medium">{item.title || "未命名写作"}</span>
                  <span className={`mt-1 block truncate text-xs font-normal ${
                    item.id === archives.activeId ? "text-slate-300" : "text-slate-500"
                  }`}>
                    {item.setup?.essayTopic || "未填写主题"}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenMenu(item.id)}
                aria-label={`打开存档操作：${item.title || "未命名写作"}`}
                className={`m-1 rounded px-2 py-1 text-sm ${
                  item.id === archives.activeId ? "text-slate-200 hover:bg-white/10" : "text-slate-500 hover:bg-white"
                }`}
              >
                ...
              </button>
            </div>
            {openMenuArchiveId === item.id ? (
              <div className="absolute right-2 top-9 z-20 grid min-w-28 gap-1 rounded-md border border-slate-200 bg-white p-1 text-sm shadow-lg">
                <button
                  type="button"
                  onClick={() => onStartRename(item.id)}
                  className="rounded px-2 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                >
                  重命名
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(item.id)}
                  className="rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50"
                >
                  删除存档
                </button>
              </div>
            ) : null}
            {deleteCandidateId === item.id ? (
              <div className="mx-2 mb-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-900">
                <p>只删除这个本地写作存档，不会删除表达库或写作习惯。</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onConfirmDelete(item.id)}
                    className="rounded bg-red-700 px-2 py-1 font-semibold text-white"
                  >
                    确认删除存档
                  </button>
                  <button
                    type="button"
                    onClick={onCancelDelete}
                    className="rounded border border-red-200 bg-white px-2 py-1 text-red-700"
                  >
                    取消
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </aside>
  );
}

function InlineSetupControls({
  activeArchive,
  setup,
  editState,
  onStartTopicEdit,
  onStartAreaEdit,
  onEditStateChange,
  onSaveTopic,
  onSaveArea,
  onCancel,
}: {
  activeArchive: WritingArchiveItem | null;
  setup: WritingSetup | null;
  editState: InlineSetupEditState;
  onStartTopicEdit: () => void;
  onStartAreaEdit: () => void;
  onEditStateChange: (state: InlineSetupEditState) => void;
  onSaveTopic: () => void;
  onSaveArea: () => void;
  onCancel: () => void;
}) {
  const topicAreaLabel = topicAreaDisplayLabel(setup);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-4xl font-semibold leading-tight text-slate-950">
            {setup?.essayTopic || activeArchive?.title || "未命名写作"}
          </h1>
          {editState.kind === "topic" ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={editState.draft}
                onChange={(event) => onEditStateChange({ ...editState, draft: event.target.value })}
                aria-label="内联文章主题"
                className="h-9 min-w-72 rounded-md border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-moss"
              />
              <button
                type="button"
                onClick={onSaveTopic}
                className="rounded-md bg-moss px-3 py-1.5 text-xs font-semibold text-white"
              >
                保存主题
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600"
              >
                取消
              </button>
            </div>
          ) : (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{setup?.essayTopic || "未填写主题"}</span>
              <button
                type="button"
                onClick={onStartTopicEdit}
                aria-label="编辑文章主题"
              className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                编辑
              </button>
            </p>
          )}
        </div>
        <div className="pt-2 text-xs text-slate-500">
          {editState.kind === "area" ? (
            <div className="grid gap-2">
              <div className="flex flex-wrap gap-1" aria-label="内联写作领域">
                {TOPIC_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onEditStateChange({
                        ...editState,
                        draftArea: option.value,
                        draftCustomArea: option.value === "custom" ? editState.draftCustomArea ?? "" : undefined,
                      })
                    }
                    className={`rounded border px-2 py-1 ${
                      editState.draftArea === option.value
                        ? "border-moss bg-moss text-white"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {editState.draftArea === "custom" ? (
                <input
                  value={editState.draftCustomArea ?? ""}
                  onChange={(event) => onEditStateChange({ ...editState, draftCustomArea: event.target.value })}
                  aria-label="内联自定义领域"
                  className="h-8 rounded-md border border-slate-300 px-2 text-xs text-slate-800 outline-none focus:border-moss"
                />
              ) : null}
              <div className="flex gap-2">
                <button type="button" onClick={onSaveArea} className="rounded bg-moss px-2 py-1 text-white">
                  保存领域
                </button>
                <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-2 py-1">
                  取消
                </button>
              </div>
            </div>
          ) : (
            <p className="flex flex-wrap items-center gap-2">
              <span>领域：{topicAreaLabel}</span>
              <button
                type="button"
                onClick={onStartAreaEdit}
                aria-label="编辑写作领域"
                className="rounded px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
              >
                编辑
              </button>
            </p>
          )}
        </div>
      </div>
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
  const width = 360;
  const gap = 10;
  const preferredTop = anchorRect.top - containerRect.top - 190 - gap;
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
