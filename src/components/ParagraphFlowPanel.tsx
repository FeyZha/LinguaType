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
  onCheck?: () => void;
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
    <section className="rounded-md bg-[var(--lt-surface)] p-5 text-[var(--lt-text)] ring-1 ring-[var(--lt-border)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">段落工具</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">手动检查当前段落的衔接和流畅度。</p>
        </div>
        {onCheck ? (
          <button
            type="button"
            onClick={onCheck}
            disabled={isLoading}
            className="rounded-md bg-[var(--lt-text)] px-3 py-2 text-sm font-medium text-[var(--lt-bg)] transition opacity-95 hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
          >
            检查当前段落
          </button>
        ) : null}
      </div>

      {message ? (
        <div className="mt-4 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-900">{message}</div>
      ) : null}
      {conflictMessage ? (
        <div className="mt-4 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-900">{conflictMessage}</div>
      ) : null}
      {isLoading ? <p className="mt-4 text-sm text-[var(--lt-muted)]">正在检查段落流畅度...</p> : null}

      {result ? (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold">段落流畅度检查</h3>
          <p className="text-sm leading-6 text-[var(--lt-muted)]">{result.summary}</p>
          {result.issues.length > 0 ? (
            <ul className="space-y-2">
              {result.issues.map((issue, index) => (
                <li key={`${issue.type}-${index}`} className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-3 text-sm">
                  <div className="font-medium text-[var(--lt-text)]">{issue.type}</div>
                  <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">{issue.reason}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--lt-faint)]">
                    {issue.original} -&gt; {issue.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-3 text-sm text-[var(--lt-muted)]">
              没有发现明显的段落流畅度问题。
            </p>
          )}
          <DiffViewer parts={diffParts} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApply}
              className="rounded-md bg-[var(--lt-text)] px-3 py-1.5 text-sm font-medium text-[var(--lt-bg)] transition opacity-95 hover:opacity-85"
            >
              应用段落
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-1.5 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
            >
              取消
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
