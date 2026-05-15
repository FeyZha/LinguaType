"use client";

import { useState } from "react";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  CORRECTION_MEMORY_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  PARAGRAPH_HEALTH_CACHE_STORAGE_KEY,
  PERSONAL_DICTIONARY_STORAGE_KEY,
  THEME_SETTINGS_STORAGE_KEY,
  TRIGGER_SETTINGS_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  exportLearningLibraryJson,
  exportWritingHabitsJson,
} from "@/lib/storage";
import type { CorrectionEvent, LearningItem } from "@/lib/llm/types";

type DataControlPanelProps = {
  learningLibrary: LearningItem[];
  correctionEvents: CorrectionEvent[];
  onClearLearningLibrary: () => void;
  onClearWritingHabits: () => void;
  onResetApiSettings: () => void;
};

export function DataControlPanel({
  learningLibrary,
  correctionEvents,
  onClearLearningLibrary,
  onClearWritingHabits,
  onResetApiSettings,
}: DataControlPanelProps) {
  const [confirmClearLibrary, setConfirmClearLibrary] = useState(false);
  const [confirmClearHabits, setConfirmClearHabits] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [message, setMessage] = useState("");

  async function copyJson(label: string, payload: string) {
    await navigator.clipboard?.writeText(payload);
    setMessage(`${label} 已导出到剪贴板。`);
  }

  return (
    <section className="text-[var(--lt-text)]">
      <h2 className="text-base font-semibold">数据管理</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">所有学习数据都保存在本地浏览器，可导出或清空。</p>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={() => void copyJson("表达库", exportLearningLibraryJson(learningLibrary))}
          className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2.5 text-left text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          导出表达库 JSON
        </button>
        <button
          type="button"
          onClick={() => void copyJson("写作习惯", exportWritingHabitsJson(correctionEvents))}
          className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2.5 text-left text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          导出写作习惯 JSON
        </button>
        <button
          type="button"
          onClick={() => setConfirmClearLibrary(true)}
          className="rounded-md bg-amber-500/[0.08] px-3 py-2.5 text-left text-sm text-amber-800 transition hover:bg-amber-500/[0.14]"
        >
          清空表达库
        </button>
        {confirmClearLibrary ? (
          <button
            type="button"
            onClick={() => {
              onClearLearningLibrary();
              setConfirmClearLibrary(false);
              setMessage("表达库已清空。");
            }}
            className="rounded-md bg-[var(--lt-text)] px-3 py-2.5 text-left text-sm font-medium text-[var(--lt-bg)] transition opacity-95 hover:opacity-85"
          >
            确认清空表达库
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmClearHabits(true)}
          className="rounded-md bg-amber-500/[0.08] px-3 py-2.5 text-left text-sm text-amber-800 transition hover:bg-amber-500/[0.14]"
        >
          清空写作习惯
        </button>
        {confirmClearHabits ? (
          <button
            type="button"
            onClick={() => {
              onClearWritingHabits();
              setConfirmClearHabits(false);
              setMessage("写作习惯已清空。");
            }}
            className="rounded-md bg-[var(--lt-text)] px-3 py-2.5 text-left text-sm font-medium text-[var(--lt-bg)] transition opacity-95 hover:opacity-85"
          >
            确认清空写作习惯
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onResetApiSettings();
            setMessage("API 设置已重置。");
          }}
          className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2.5 text-left text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          重置 API 设置
        </button>
        <button
          type="button"
          onClick={() => setShowKeys((current) => !current)}
          className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2.5 text-left text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          查看本地存储键
        </button>
      </div>

      {message ? (
        <p className="mt-4 rounded-md bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}

      {showKeys ? (
        <ul className="mt-4 space-y-1 rounded-md bg-[var(--lt-surface-soft)] px-3 py-3 text-xs leading-5 text-[var(--lt-muted)]">
          {[
            API_SETTINGS_STORAGE_KEY,
            DRAFT_STORAGE_KEY,
            LEARNING_HISTORY_STORAGE_KEY,
            LEARNING_LIBRARY_STORAGE_KEY,
            CORRECTION_MEMORY_STORAGE_KEY,
            CORRECTION_EVENTS_STORAGE_KEY,
            PARAGRAPH_HEALTH_CACHE_STORAGE_KEY,
            TRIGGER_SETTINGS_STORAGE_KEY,
            PERSONAL_DICTIONARY_STORAGE_KEY,
            WRITING_SETUP_STORAGE_KEY,
            THEME_SETTINGS_STORAGE_KEY,
          ].map((key) => (
            <li key={key} className="break-all">
              {key}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
