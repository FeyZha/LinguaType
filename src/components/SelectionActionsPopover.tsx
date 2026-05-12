"use client";

import type { SelectionExplainResult } from "@/lib/llm/types";

type SelectionActionsPopoverProps = {
  selectedText: string;
  explanation?: SelectionExplainResult;
  isLoading: boolean;
  message?: string;
  onExplain: () => void;
  onSave: () => void;
  onClose: () => void;
};

export function SelectionActionsPopover({
  selectedText,
  explanation,
  isLoading,
  message,
  onExplain,
  onSave,
  onClose,
}: SelectionActionsPopoverProps) {
  return (
    <section className="absolute left-4 top-4 z-30 w-[min(360px,calc(100%-2rem))] rounded-md border border-slate-200 bg-white p-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">选中文本操作 Selection Actions</h2>
          <p className="mt-1 break-words text-xs text-slate-500">{selectedText}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭选中文本操作"
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Esc
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExplain}
          disabled={isLoading}
          className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          解释选中内容
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          保存到 Learning Library
        </button>
      </div>
      {isLoading ? <p className="mt-3 text-sm text-slate-500">正在解释选中文本...</p> : null}
      {explanation ? (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-slate-900">{explanation.meaningZh}</p>
          <p className="mt-1 leading-6">{explanation.usageNoteZh}</p>
        </div>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
    </section>
  );
}
