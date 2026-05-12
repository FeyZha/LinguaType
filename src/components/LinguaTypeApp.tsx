"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Change } from "diff";
import { ApiSettingsModal } from "./ApiSettingsModal";
import { EnhancementLevelSelector } from "./EnhancementLevelSelector";
import { EnhancementPopover } from "./EnhancementPopover";
import { InlineExpressionMenu } from "./InlineExpressionMenu";
import { LearningLibraryPanel } from "./LearningLibraryPanel";
import { ModeSelector } from "./ModeSelector";
import { ParagraphFlowPanel } from "./ParagraphFlowPanel";
import { ShortcutHint } from "./ShortcutHint";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
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
  loadCorrectionEventsFromStorage,
  loadLearningLibraryFromStorage,
  loadParagraphHealthCache,
  saveParagraphHealthCache,
  upsertCorrectionEvents,
  upsertLearningItems,
} from "@/lib/storage";
import type {
  ApiConfig,
  CorrectionEvent,
  CorrectionEventType,
  EnhancementLevel,
  FastEnhanceInput,
  FastEnhanceResult,
  LearningExtractionResult,
  LearningItem,
  ParagraphCheckResult,
  ParagraphHealthCacheItem,
  ParagraphHealthResult,
  WritingMode,
} from "@/lib/llm/types";

type PendingEnhancement = {
  requestId: string;
  snapshotFullText: string;
  latestSentenceRange: SentenceRange;
  originalSentence: string;
  requestInput: Omit<FastEnhanceInput, "apiConfig">;
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

type SidebarTab = "review" | "library" | "habits" | "tools";

const SIDEBAR_TABS: Array<{ id: SidebarTab; label: string }> = [
  { id: "review", label: "Review" },
  { id: "library", label: "Library" },
  { id: "habits", label: "Writing Habits" },
  { id: "tools", label: "Tools" },
];

export function LinguaTypeApp() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const healthCacheRef = useRef<ParagraphHealthCacheItem[]>([]);
  const lastHealthCheckAtRef = useRef(0);
  const isHealthCheckingRef = useRef(false);
  const [text, setText] = useState("");
  const [writingMode, setWritingMode] = useState<WritingMode>("natural");
  const [enhancementLevel, setEnhancementLevel] = useState<EnhancementLevel>("balanced");
  const [apiSettings, setApiSettings] = useState<ApiConfig>(() => defaultApiSettings());
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
  const [activeTab, setActiveTab] = useState<SidebarTab>("review");

  useEffect(() => {
    setText(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "");
    const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      setApiSettings({ ...defaultApiSettings(), ...(JSON.parse(storedSettings) as Partial<ApiConfig>) });
    }
    setLearningLibrary(loadLearningLibraryFromStorage(localStorage));
    setCorrectionEvents(loadCorrectionEventsFromStorage(localStorage));
    healthCacheRef.current = loadParagraphHealthCache(localStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, text);
  }, [text]);

  const diffParts: Change[] = useMemo(() => {
    if (!pending) {
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

  function persistLearningLibrary(items: LearningItem[]) {
    setLearningLibrary(items);
    localStorage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(items));
    localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(items));
  }

  function persistCorrectionEvents(items: CorrectionEvent[]) {
    setCorrectionEvents(items);
    localStorage.setItem(CORRECTION_EVENTS_STORAGE_KEY, JSON.stringify(items));
  }

  function ensureApiSettings(): boolean {
    if (!apiSettings.mockMode && (!apiSettings.baseUrl || !apiSettings.apiKey || !apiSettings.model)) {
      setSettingsOpen(true);
      setError({ message: "API settings are required unless Mock Mode is enabled." });
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

    const range = extractLatestSentence(text);
    if (!range.sentence.trim()) {
      setEmpty(true);
      return;
    }

    if (!ensureApiSettings()) {
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
    setIsLoading(true);
    setActiveTab("review");

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
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      setError({
        message: payload.error ?? "Enhancement failed. Please check API settings and try again.",
        rawResponse: payload.rawResponse,
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function regenerateEnhancement() {
    if (!pending) {
      return;
    }
    setConflictMessage("");
    setCopyMessage("");
    setIsRegenerating(true);

    try {
      const result = await requestEnhancement(pending.requestInput);
      setPending({ ...pending, requestId: crypto.randomUUID(), result });
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      setError({
        message: payload.error ?? "Regenerate failed. Please try again.",
        rawResponse: payload.rawResponse,
      });
    } finally {
      setIsRegenerating(false);
    }
  }

  function applyEnhancement() {
    if (!pending) {
      return;
    }

    if (text !== pending.snapshotFullText) {
      setConflictMessage("The editor changed after enhancement. Please enhance the latest sentence again.");
      return;
    }

    const nextText = replaceLatestSentence(text, pending.latestSentenceRange, pending.result.finalSentence);
    const paragraphRange = extractCurrentParagraph(
      nextText,
      pending.latestSentenceRange.start + pending.result.finalSentence.length,
    );

    setText(nextText);
    setPending(null);
    setConflictMessage("");
    setCopyMessage("");
    setLearningExtractionMessage("");
    requestAnimationFrame(() => editorRef.current?.focus());

    void runLearningExtraction(pending, nextText, paragraphRange.paragraph);
    void maybeRunParagraphHealthAfterApply(nextText, paragraphRange);
  }

  async function runLearningExtraction(
    applied: PendingEnhancement,
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
    } catch {
      setLearningExtractionMessage("Learning extraction failed. Your applied text was kept.");
    }
  }

  async function maybeRunParagraphHealthAfterApply(nextText: string, paragraphRange: ParagraphRange) {
    if (!shouldRunParagraphHealth(paragraphRange.paragraph)) {
      return;
    }

    const fingerprint = createParagraphFingerprint(paragraphRange.paragraph);
    const cached = healthCacheRef.current.find((item) => item.paragraphFingerprint === fingerprint);
    if (cached) {
      if (cached.result.hasIssues) {
        setParagraphHealthNotice({ snapshotFullText: nextText, paragraphRange, result: cached.result });
      }
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
    if (countEnglishWords(paragraph) < 40 && paragraph.length < 120) {
      return false;
    }
    return true;
  }

  async function copyRevisedSentence() {
    if (!pending) {
      return;
    }
    await navigator.clipboard?.writeText(pending.result.finalSentence);
    setCopyMessage("Revised sentence copied.");
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
      setParagraphMessage("Please write a paragraph before checking flow.");
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
      setParagraphMessage(payload.error ?? "Paragraph flow check failed.");
    } finally {
      setIsParagraphLoading(false);
    }
  }

  function applyParagraphCheck() {
    if (!pendingParagraph) {
      return;
    }
    if (text !== pendingParagraph.snapshotFullText) {
      setParagraphConflictMessage("The paragraph changed after checking. Please check it again.");
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

  function deleteHabitType(type: CorrectionEventType) {
    persistCorrectionEvents(correctionEvents.filter((event) => event.type !== type));
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-950">LinguaType</h1>
            <p className="text-xs text-slate-500">Input-like expression learning assistant</p>
          </div>
          {apiSettings.mockMode ? (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
              Mock Mode
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModeSelector value={writingMode} onChange={setWritingMode} />
          <EnhancementLevelSelector value={enhancementLevel} onChange={setEnhancementLevel} />
          <ShortcutHint />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            API Settings
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
              onChange={setText}
              onEnhance={enhanceLatestSentence}
              onOpenExpressionMenu={openInlineMenu}
              onCloseExpressionMenu={closeInlineMenu}
            />
            <InlineExpressionMenu
              open={inlineMenu.open}
              library={learningLibrary}
              writingMode={writingMode}
              onClose={closeInlineMenu}
              onInsert={(content) => insertIntoEditor(content, inlineMenu)}
              onCheckParagraph={() => void checkCurrentParagraph(inlineMenu.start)}
            />
          </div>
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
              {pending ? (
                <EnhancementPopover
                  result={pending.result}
                  diffParts={diffParts}
                  conflictMessage={conflictMessage}
                  copyMessage={copyMessage}
                  isRegenerating={isRegenerating}
                  onApply={applyEnhancement}
                  onCancel={() => {
                    setPending(null);
                    setConflictMessage("");
                    setCopyMessage("");
                  }}
                  onRegenerate={regenerateEnhancement}
                  onCopy={copyRevisedSentence}
                />
              ) : (
                <section className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Enhance the latest sentence to review a code-generated diff here.
                </section>
              )}
              {learningExtractionMessage ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {learningExtractionMessage}
                </div>
              ) : null}
              {paragraphHealthNotice ? (
                <section className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      Paragraph health: {paragraphHealthNotice.result.issueCount} possible{" "}
                      {paragraphHealthNotice.result.issueCount === 1 ? "issue" : "issues"}
                    </span>
                    <button
                      type="button"
                      onClick={() => void viewParagraphHealthSuggestions()}
                      className="rounded border border-sky-300 bg-white px-2 py-1 text-xs font-semibold text-sky-800 hover:bg-sky-100"
                    >
                      View suggestions
                    </button>
                  </div>
                </section>
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
            <ParagraphFlowPanel
              result={pendingParagraph?.result}
              diffParts={paragraphDiffParts}
              isLoading={isParagraphLoading}
              message={paragraphMessage}
              conflictMessage={paragraphConflictMessage}
              onCheck={() => void checkCurrentParagraph()}
              onApply={applyParagraphCheck}
              onCancel={() => {
                setPendingParagraph(null);
                setParagraphConflictMessage("");
              }}
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
