"use client";

import type { Change } from "diff";
import type { FastEnhanceResult } from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";

type EnhancementPopoverProps = {
  originalSentence: string;
  result?: FastEnhanceResult;
  diffParts: Change[];
  conflictMessage?: string;
  copyMessage?: string;
  statusMessage?: string;
  isRegenerating?: boolean;
  onApply: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
};

export function EnhancementPopover({
  originalSentence,
  result,
  diffParts,
  conflictMessage,
  copyMessage,
  statusMessage,
  isRegenerating,
  onApply,
  onCancel,
  onRegenerate,
  onCopy,
}: EnhancementPopoverProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">当前句建议 Current Sentence</h2>
          {result ? <span className="sr-only">修改建议已生成</span> : null}
          <p className="mt-1 text-xs text-slate-500">
            {result
              ? `建议类型：${result.hasChinese ? "中英混写转换 Mixed Chinese-English" : "轻量英文润色 Light Polish"}`
              : "正在检查最新一句"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={!result}
            aria-label="复制修改后的句子"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            复制 Copy
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!result || isRegenerating}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            重新生成 Regenerate
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            取消 Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!result}
            aria-label="应用修改"
            className="rounded-md bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            应用 Apply
          </button>
        </div>
      </div>
      {conflictMessage ? (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {conflictMessage}
        </div>
      ) : null}
      {copyMessage ? (
        <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {copyMessage}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">原句 Original</div>
          <p className="mt-2 text-sm leading-6 text-slate-800">{originalSentence}</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <div className="text-xs font-semibold uppercase text-emerald-700">建议 Suggested</div>
          <p className="mt-2 text-sm leading-6 text-slate-900">{result ? result.finalSentence : "检查中..."}</p>
        </div>
      </div>
      {result ? (
        <div className="mt-3">
          <DiffViewer parts={diffParts} />
        </div>
      ) : null}
      {result?.explanationZh ? (
        <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {result.explanationZh}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
