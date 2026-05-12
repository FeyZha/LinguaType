"use client";

import type { Change } from "diff";
import type { FastEnhanceResult } from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";

type EnhancementPopoverProps = {
  result: FastEnhanceResult;
  diffParts: Change[];
  conflictMessage?: string;
  copyMessage?: string;
  isRegenerating?: boolean;
  onApply: () => void;
  onCancel: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
};

export function EnhancementPopover({
  result,
  diffParts,
  conflictMessage,
  copyMessage,
  isRegenerating,
  onApply,
  onCancel,
  onRegenerate,
  onCopy,
}: EnhancementPopoverProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Suggested revision</h2>
          <p className="mt-1 text-xs text-slate-500">
            {result.hasChinese ? "Mixed Chinese-English latest sentence" : "Light English polish"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCopy}
            aria-label="Copy revised sentence"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Regenerate
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onApply}
            aria-label="Apply revision"
            className="rounded-md bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral/90"
          >
            Apply
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
      <DiffViewer parts={diffParts} />
      <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-800">
        {result.finalSentence}
      </p>
    </section>
  );
}
