"use client";

import type { SelectionExplainResult } from "@/lib/llm/types";

type SelectionActionsPopoverProps = {
  selectedText: string;
  position?: { left: number; top: number };
  explanation?: SelectionExplainResult;
  isLoading: boolean;
  message?: string;
  onExplain: () => void;
  onSave: () => void;
  onClose: () => void;
};

export function SelectionActionsPopover({
  selectedText,
  position,
  explanation,
  isLoading,
  message,
  onExplain,
  onSave,
  onClose,
}: SelectionActionsPopoverProps) {
  return (
    <section
      className="absolute z-30 w-[min(360px,calc(100%-2rem))] rounded-md border border-slate-200 bg-white p-3 shadow-lg"
      style={{ left: position?.left ?? 16, top: position?.top ?? 16 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">选中文本操作</h2>
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
          保存到表达库
        </button>
      </div>
      {isLoading ? <p className="mt-3 text-sm text-slate-500">正在解释选中文本...</p> : null}
      {explanation ? (
        <div className="mt-3 grid gap-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          <ExplainBlock title="含义" body={explanation.meaningZh} />
          <ExplainBlock title="用法" body={explanation.usageNoteZh} />
          <ExplainBlock title="语境作用" body={explanation.contextRoleZh || "结合当前上下文理解这个表达的作用。"} />
          <ExplainBlock title="表达类型" body={expressionTypeLabel(explanation.expressionType)} />
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

function ExplainBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-0.5 leading-6 text-slate-800">{body}</p>
    </div>
  );
}

function expressionTypeLabel(type: SelectionExplainResult["expressionType"]): string {
  if (type === "collocation") {
    return "搭配";
  }
  if (type === "sentence_pattern") {
    return "句型";
  }
  if (type === "sentence") {
    return "句子";
  }
  if (type === "word") {
    return "单词";
  }
  return "短语";
}
