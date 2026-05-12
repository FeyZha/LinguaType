"use client";

import type { Change } from "diff";
import type { ParagraphCheckResult } from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";

type ParagraphFlowPanelProps = {
  result?: ParagraphCheckResult;
  diffParts: Change[];
  isLoading: boolean;
  message?: string;
  conflictMessage?: string;
  onCheck: () => void;
  onApply: () => void;
  onCancel: () => void;
};

export function ParagraphFlowPanel({
  result,
  diffParts,
  isLoading,
  message,
  conflictMessage,
  onCheck,
  onApply,
  onCancel,
}: ParagraphFlowPanelProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Paragraph tools</h2>
          <p className="mt-1 text-xs text-slate-500">Manual flow check for the current paragraph.</p>
        </div>
        <button
          type="button"
          onClick={onCheck}
          disabled={isLoading}
          className="rounded-md bg-moss px-3 py-2 text-sm font-semibold text-white hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Check current paragraph
        </button>
      </div>
      {message ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {message}
        </div>
      ) : null}
      {conflictMessage ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {conflictMessage}
        </div>
      ) : null}
      {isLoading ? <p className="mt-3 text-sm text-slate-500">Checking paragraph flow...</p> : null}
      {result ? (
        <div className="mt-4 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Paragraph flow check</h3>
          <p className="text-sm text-slate-600">{result.summary}</p>
          {result.issues.length > 0 ? (
            <ul className="space-y-2">
              {result.issues.map((issue, index) => (
                <li key={`${issue.type}-${index}`} className="rounded-md bg-slate-50 p-3 text-sm">
                  <div className="font-medium text-slate-800">{issue.type}</div>
                  <p className="mt-1 text-xs text-slate-600">{issue.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {issue.original} → {issue.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
              No paragraph flow issue found.
            </p>
          )}
          <DiffViewer parts={diffParts} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApply}
              className="rounded-md bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral/90"
            >
              Apply paragraph
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
