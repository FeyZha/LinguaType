"use client";

import type { Change } from "diff";
import { useRef } from "react";
import type { FastEnhanceResult } from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";
import { useDismissableLayer } from "./useDismissableLayer";

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
  const layerRef = useRef<HTMLElement | null>(null);
  useDismissableLayer(layerRef, onCancel, true);

  return (
    <section
      ref={layerRef}
      aria-label="当前句行内建议"
      className="relative border-l-2 border-[var(--lt-accent)] bg-transparent py-2 pl-4"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-[var(--lt-accent)]">当前句建议</h2>
          {result ? <span className="sr-only">修改建议已生成</span> : null}
          <p className="mt-1 text-xs text-[var(--lt-muted)]">
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
            className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            复制
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!result || isRegenerating}
            className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            重新生成
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={!result}
            aria-label="应用修改"
            className="rounded-md bg-[var(--lt-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--lt-accent)] hover:bg-[var(--lt-accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            应用
          </button>
        </div>
      </div>
      {conflictMessage ? (
        <div className="mb-3 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-900">
          {conflictMessage}
        </div>
      ) : null}
      {copyMessage ? (
        <div className="mb-3 rounded-md bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-900">
          {copyMessage}
        </div>
      ) : null}
      <div className="grid gap-2 text-sm">
        <div>
          <div className="text-xs font-medium uppercase text-[var(--lt-muted)]">原句 Original</div>
          <p className="mt-1 leading-7 text-[var(--lt-muted)] line-through decoration-[var(--lt-muted)]">{originalSentence}</p>
        </div>
        <div>
          <div className="text-xs font-medium uppercase text-[var(--lt-accent)]">建议 Suggested</div>
          <p className="mt-1 leading-7 text-[var(--lt-accent)]">{result ? result.finalSentence : "检查中..."}</p>
        </div>
      </div>
      {result ? (
        <div className="mt-3">
          <DiffViewer parts={diffParts} />
        </div>
      ) : null}
      {result?.explanationZh ? (
        <p className="mt-3 text-sm leading-6 text-[var(--lt-muted)]">
          {result.explanationZh}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="mt-2 text-xs font-medium text-[var(--lt-muted)]">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
