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
  TRIGGER_SETTINGS_STORAGE_KEY,
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
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">数据管理</h2>
      <p className="mt-1 text-xs text-slate-500">所有学习数据都保存在本地浏览器，可导出或清空。</p>
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => void copyJson("Learning Library", exportLearningLibraryJson(learningLibrary))}
          className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          导出 Learning Library JSON
        </button>
        <button
          type="button"
          onClick={() => void copyJson("Writing Habits", exportWritingHabitsJson(correctionEvents))}
          className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          导出 Writing Habits JSON
        </button>
        <button
          type="button"
          onClick={() => setConfirmClearLibrary(true)}
          className="rounded-md border border-amber-300 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
        >
          清空 Learning Library
        </button>
        {confirmClearLibrary ? (
          <button
            type="button"
            onClick={() => {
              onClearLearningLibrary();
              setConfirmClearLibrary(false);
              setMessage("Learning Library 已清空。");
            }}
            className="rounded-md bg-amber-600 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-amber-700"
          >
            确认清空 Learning Library
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmClearHabits(true)}
          className="rounded-md border border-amber-300 px-3 py-2 text-left text-sm text-amber-800 hover:bg-amber-50"
        >
          清空 Writing Habits
        </button>
        {confirmClearHabits ? (
          <button
            type="button"
            onClick={() => {
              onClearWritingHabits();
              setConfirmClearHabits(false);
              setMessage("Writing Habits 已清空。");
            }}
            className="rounded-md bg-amber-600 px-3 py-2 text-left text-sm font-semibold text-white hover:bg-amber-700"
          >
            确认清空 Writing Habits
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            onResetApiSettings();
            setMessage("API Settings 已重置。");
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          重置 API Settings
        </button>
        <button
          type="button"
          onClick={() => setShowKeys((current) => !current)}
          className="rounded-md border border-slate-300 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
        >
          查看 localStorage keys
        </button>
      </div>
      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {showKeys ? (
        <ul className="mt-3 space-y-1 rounded-md bg-slate-50 p-3 text-xs text-slate-600">
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
          ].map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
