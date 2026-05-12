"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Change } from "diff";
import { ApiSettingsModal } from "./ApiSettingsModal";
import { DataControlPanel } from "./DataControlPanel";
import { EnhancementPopover } from "./EnhancementPopover";
import { InlineExpressionMenu } from "./InlineExpressionMenu";
import { LearningLibraryPanel } from "./LearningLibraryPanel";
import { ParagraphFlowPanel } from "./ParagraphFlowPanel";
import { SelectionActionsPopover } from "./SelectionActionsPopover";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { WritingEditor } from "./WritingEditor";
import { WritingHabitsPanel } from "./WritingHabitsPanel";
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
  defaultApiSettings,
  defaultTriggerSettings,
  loadCorrectionEventsFromStorage,
  loadLearningLibraryFromStorage,
  loadParagraphHealthCache,
  loadTriggerSettingsFromStorage,
  saveParagraphHealthCache,
  saveTriggerSettings,
  upsertCorrectionEvents,
  upsertLearningItems,
  type TriggerSettings,
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
  explanation?: SelectionExplainResult;
  message?: string;
};

type SidebarTab = "review" | "library" | "habits" | "tools" | "data";

const SIDEBAR_TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "review", label: "检查状态 Review" },
  { id: "library", label: "表达库 Learning Library" },
  { id: "habits", label: "写作习惯 Writing Habits" },
  { id: "tools", label: "工具与设置" },
  { id: "data", label: "数据管理 Data Control" },
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
  const [learningLibrary, setLearningLibrary] = useState<LearningItem[]>([]);
  const [correctionEvents, setCorrectionEvents] = useState<CorrectionEvent[]>([]);
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

  useEffect(() => {
    setText(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "");
    const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      setApiSettings({ ...defaultApiSettings(), ...(JSON.parse(storedSettings) as Partial<ApiConfig>) });
    }
    setLearningLibrary(loadLearningLibraryFromStorage(localStorage));
    setCorrectionEvents(loadCorrectionEventsFromStorage(localStorage));
    setTriggerSettings(loadTriggerSettingsFromStorage(localStorage));
    healthCacheRef.current = loadParagraphHealthCache(localStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, text);
  }, [text]);

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

  function persistLearningLibrary(items: LearningItem[]) {
    setLearningLibrary(items);
    localStorage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(items));
  }

  function persistCorrectionEvents(items: CorrectionEvent[]) {
    setCorrectionEvents(items);
    localStorage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(items));
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
      previousContext: getPreviousContext(snapshotFullText, range.start),
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
      setStatusMessage("段落健康 Paragraph Health 已检查");
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

  function handleSelectionChange(selection: { start: number; end: number; text: string }) {
    const selectedText = selection.text.trim();
    if (!selectedText || selection.start === selection.end || !isEnglishSelection(selectedText)) {
      setSelectionAction(null);
      return;
    }
    setSelectionAction({
      start: selection.start,
      end: selection.end,
      selectedText,
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
      message: "已保存到 Learning Library",
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

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-950">LinguaType</h1>
            <p className="text-xs text-slate-500">输入法式英文表达助手</p>
          </div>
          {apiSettings.mockMode ? (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
              Mock Mode 演示模式
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            API Settings 设置
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="flex min-h-0 flex-col gap-4">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <WritingEditor
              ref={editorRef}
              value={text}
              isLoading={isLoading}
              isExpressionMenuOpen={inlineMenu.open}
              writingMode={writingMode}
              enhancementLevel={enhancementLevel}
              triggerSettings={triggerSettings}
              onChange={handleEditorTextChange}
              onWritingModeChange={setWritingMode}
              onEnhancementLevelChange={setEnhancementLevel}
              onEnhance={enhanceLatestSentence}
              onOpenExpressionMenu={openInlineMenu}
              onCloseExpressionMenu={closeInlineMenu}
              onSelectionChange={handleSelectionChange}
              onEscape={() => {
                if (selectionAction) {
                  closeSelectionActions();
                  return;
                }
                closeCurrentSuggestion();
              }}
            />
            {pending ? (
              <div className="absolute inset-x-4 bottom-20 z-20 md:left-auto md:w-[min(640px,calc(100%-2rem))]">
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
                  段落健康 Paragraph Health：可能有 {paragraphHealthNotice.result.issueCount} 个问题
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

        <aside className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-2">
            {SIDEBAR_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded px-2 py-1.5 text-sm ${
                  activeTab === tab.id ? "bg-moss text-white" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "review" ? (
            <div className="flex flex-col gap-4">
              <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <h2 className="text-sm font-semibold text-slate-900">检查状态 Review</h2>
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
              <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">
                需要检查当前段落时，请在编辑器内打开 Inline Expression Menu，然后选择 Check this paragraph。
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

function countSentences(paragraph: string): number {
  return paragraph.split(/[.!?。？！；;\n]+/u).filter((part) => part.trim().length > 0).length;
}

function countEnglishWords(paragraph: string): number {
  return paragraph.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)?.length ?? 0;
}

function isEnglishSelection(text: string): boolean {
  return /[A-Za-z]/u.test(text) && !/[\u3400-\u9fff]/u.test(text);
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
