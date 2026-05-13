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
    <section
      aria-label="当前句行内建议"
      className="rounded-md border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">当前句建议</h2>
          {result ? <span className="sr-only">修改建议已生成</span> : null}
          <p className="mt-1 text-xs text-slate-500">
            {result
              ? `建议类型：${result.hasChinese ? "中英混写转换" : "轻量英文润色"}`
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
            复制
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!result || isRegenerating}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            重新生成
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!result}
            aria-label="应用修改"
            className="rounded-md bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            应用
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
      <div className="grid gap-3 text-sm">
        <div className="rounded-md bg-slate-50/70 p-2">
          <div className="text-xs font-semibold uppercase text-slate-500">原句 Original</div>
          <p className="mt-1 leading-6 text-slate-700">{originalSentence}</p>
        </div>
        <div className="rounded-md bg-emerald-50/80 p-2">
          <div className="text-xs font-semibold uppercase text-emerald-700">建议 Suggested</div>
          <p className="mt-1 leading-6 text-slate-900">{result ? result.finalSentence : "检查中..."}</p>
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
