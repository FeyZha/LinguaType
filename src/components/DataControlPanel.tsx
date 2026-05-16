"use client";

import { useEffect, useRef, useState } from "react";
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

const FEEDBACK_DURATION_MS = 2600;

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
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  function showMessage(nextMessage: string) {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    setMessage(nextMessage);
    messageTimerRef.current = setTimeout(() => {
      setMessage("");
      messageTimerRef.current = null;
    }, FEEDBACK_DURATION_MS);
  }

  async function copyJson(label: string, payload: string) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      showMessage(`当前环境不支持剪贴板，无法复制${label}。`);
      return;
    }

    try {
      await navigator.clipboard.writeText(payload);
      showMessage(`已复制${label}到剪贴板。`);
    } catch {
      showMessage(`${label} 复制失败，请稍后重试。`);
    }
  }

  return (
    <section className="text-[var(--lt-text)]">
      <h2 className="text-base font-semibold">数据管理</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">
        这里管理本地导入导出和重置动作，不会直接修改写作正文。
      </p>

      <div className="mt-5 grid gap-2">
        <button
          type="button"
          onClick={() => void copyJson("表达库 JSON", exportLearningLibraryJson(learningLibrary))}
          className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2.5 text-left text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          导出表达库 JSON
        </button>
        <button
          type="button"
          onClick={() => void copyJson("写作习惯 JSON", exportWritingHabitsJson(correctionEvents))}
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
              showMessage(
                `已清空表达库。仅清空 localStorage key ${LEARNING_LIBRARY_STORAGE_KEY}。` +
                  " 其他本地 key 不会被删除。",
              );
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
              showMessage(
                `已清空写作习惯。仅清空 localStorage key ${CORRECTION_EVENTS_STORAGE_KEY}。` +
                  " 其他本地 key 不会被删除。",
              );
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
            showMessage("已重置 API 设置。");
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
          查看 localStorage keys
        </button>
      </div>

      {message ? (
        <p role="status" className="mt-4 rounded-md bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
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
