"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Change } from "diff";
import { ApiSettingsModal } from "./ApiSettingsModal";
import { CorrectionPanel } from "./CorrectionPanel";
import { EnhancementPopover } from "./EnhancementPopover";
import { LearningHistoryPanel } from "./LearningHistoryPanel";
import { ModeSelector } from "./ModeSelector";
import { NextExpressionToolbox } from "./NextExpressionToolbox";
import { ShortcutHint } from "./ShortcutHint";
import { EmptyState, ErrorState, LoadingState } from "./StateViews";
import { WritingEditor } from "./WritingEditor";
import {
  createWordDiff,
  extractLatestSentence,
  getCurrentParagraph,
  getPreviousContext,
  replaceLatestSentence,
  type SentenceRange,
} from "@/lib/sentence";
import {
  API_SETTINGS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  defaultApiSettings,
  upsertLearningItems,
} from "@/lib/storage";
import type {
  ApiConfig,
  EnhanceLatestSentenceResult,
  LearningHistoryItem,
  WritingMode,
} from "@/lib/llm/types";

type PendingEnhancement = {
  requestId: string;
  snapshotFullText: string;
  latestSentenceRange: SentenceRange;
  originalSentence: string;
  result: EnhanceLatestSentenceResult;
};

type ErrorMessage = {
  message: string;
  rawResponse?: string;
};

export function LinguaTypeApp() {
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [writingMode, setWritingMode] = useState<WritingMode>("natural");
  const [apiSettings, setApiSettings] = useState<ApiConfig>(() => defaultApiSettings());
  const [learningHistory, setLearningHistory] = useState<LearningHistoryItem[]>([]);
  const [pending, setPending] = useState<PendingEnhancement | null>(null);
  const [lastResult, setLastResult] = useState<EnhanceLatestSentenceResult | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<ErrorMessage | null>(null);
  const [empty, setEmpty] = useState(false);
  const [conflictMessage, setConflictMessage] = useState("");

  useEffect(() => {
    setText(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "");
    const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      setApiSettings({ ...defaultApiSettings(), ...(JSON.parse(storedSettings) as Partial<ApiConfig>) });
    }
    const storedHistory = localStorage.getItem(LEARNING_HISTORY_STORAGE_KEY);
    if (storedHistory) {
      setLearningHistory(JSON.parse(storedHistory) as LearningHistoryItem[]);
    }
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

  function persistLearningHistory(items: LearningHistoryItem[]) {
    setLearningHistory(items);
    localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(items));
  }

  async function enhanceLatestSentence() {
    setError(null);
    setEmpty(false);
    setConflictMessage("");

    const range = extractLatestSentence(text);
    if (!range.sentence.trim()) {
      setEmpty(true);
      return;
    }

    if (!apiSettings.mockMode && (!apiSettings.baseUrl || !apiSettings.apiKey || !apiSettings.model)) {
      setSettingsOpen(true);
      setError({ message: "除非启用 Mock 模式，否则需要填写 API 设置。" });
      return;
    }

    const requestId = crypto.randomUUID();
    const snapshotFullText = text;
    setIsLoading(true);

    try {
      const response = await fetch("/api/enhance-latest-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullText: snapshotFullText,
          latestSentence: range.sentence,
          previousContext: getPreviousContext(snapshotFullText, range.start),
          currentParagraph: getCurrentParagraph(snapshotFullText, range.start),
          writingMode,
          apiConfig: apiSettings,
        }),
      });
      const payload = (await response.json()) as
        | EnhanceLatestSentenceResult
        | { error?: string; rawResponse?: string };
      if (!response.ok || "error" in payload) {
        throw payload;
      }

      const nextPending = {
        requestId,
        snapshotFullText,
        latestSentenceRange: range,
        originalSentence: range.sentence,
        result: payload as EnhanceLatestSentenceResult,
      };
      setPending(nextPending);
      setLastResult(payload as EnhanceLatestSentenceResult);
    } catch (caught) {
      const payload = caught as { error?: string; rawResponse?: string };
      setError({
        message: payload.error ?? "润色失败。请检查 API 设置后重试。",
        rawResponse: payload.rawResponse,
      });
    } finally {
      setIsLoading(false);
    }
  }

  function applyEnhancement() {
    if (!pending) {
      return;
    }

    if (text !== pending.snapshotFullText) {
      setConflictMessage("生成结果期间编辑器内容发生了变化。请重新润色最新一句。");
      return;
    }

    const nextText = replaceLatestSentence(
      text,
      pending.latestSentenceRange,
      pending.result.finalSentence,
    );
    setText(nextText);
    const nextHistory = upsertLearningItems(learningHistory, pending.result.learningItems, {
      sourceSentence: pending.result.finalSentence,
      writingMode,
    });
    persistLearningHistory(nextHistory);
    setPending(null);
    setConflictMessage("");
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function insertIntoEditor(content: string) {
    const editor = editorRef.current;
    if (!editor) {
      setText((current) => `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${content}`);
      return;
    }

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const nextText = `${text.slice(0, start)}${content}${text.slice(end)}`;
    setText(nextText);
    requestAnimationFrame(() => {
      editor.focus();
      editor.selectionStart = start + content.length;
      editor.selectionEnd = start + content.length;
    });
  }

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/70 bg-white/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-950">LinguaType</h1>
            <p className="text-xs text-slate-500">只润色最新一句的英文表达助手</p>
          </div>
          {apiSettings.mockMode ? (
            <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">
              Mock 模式
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <ModeSelector value={writingMode} onChange={setWritingMode} />
          <ShortcutHint />
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            API 设置
          </button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex min-h-0 flex-col gap-4">
          <WritingEditor
            ref={editorRef}
            value={text}
            isLoading={isLoading}
            onChange={setText}
            onEnhance={enhanceLatestSentence}
          />
          {empty ? <EmptyState /> : null}
          {isLoading ? <LoadingState /> : null}
          {error ? <ErrorState message={error.message} rawResponse={error.rawResponse} /> : null}
          {pending ? (
            <EnhancementPopover
              result={pending.result}
              diffParts={diffParts}
              conflictMessage={conflictMessage}
              onApply={applyEnhancement}
              onCancel={() => {
                setPending(null);
                setConflictMessage("");
              }}
            />
          ) : null}
        </section>

        <aside className="flex flex-col gap-4">
          <CorrectionPanel result={lastResult} />
          <LearningHistoryPanel
            items={learningHistory}
            onDelete={(id) => persistLearningHistory(learningHistory.filter((item) => item.id !== id))}
            onInsert={insertIntoEditor}
          />
          <NextExpressionToolbox history={learningHistory} onInsert={insertIntoEditor} />
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
