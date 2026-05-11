"use client";

import type { Change } from "diff";
import type { EnhanceLatestSentenceResult } from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";

type EnhancementPopoverProps = {
  result: EnhanceLatestSentenceResult;
  diffParts: Change[];
  conflictMessage?: string;
  onApply: () => void;
  onCancel: () => void;
};

export function EnhancementPopover({
  result,
  diffParts,
  conflictMessage,
  onApply,
  onCancel,
}: EnhancementPopoverProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">建议修改</h2>
          <p className="mt-1 text-xs text-slate-500">
            {result.hasChinese ? "中英混写句子增强" : "英文句子轻润色"}
          </p>
        </div>
        <div className="flex gap-2">
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
            className="rounded-md bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral/90"
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
      <DiffViewer parts={diffParts} />
      <p className="mt-3 rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-800">
        {result.finalSentence}
      </p>
    </section>
  );
}
