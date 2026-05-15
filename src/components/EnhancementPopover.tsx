"use client";

import type { Change } from "diff";
import { useRef } from "react";
import type { FastEnhanceResult } from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";
import { useDismissableLayer } from "./useDismissableLayer";

type PlaceholderHint = {
  sourceText: string;
  targetText: string;
  structure: string;
};

type EnhancementPopoverProps = {
  originalSentence: string;
  result?: FastEnhanceResult;
  placeholderHint?: PlaceholderHint;
  isPlaceholderSuggestion?: boolean;
  isReviewOnly?: boolean;
  activePlaceholderFocus?: boolean;
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

function renderHighlightedSentence(sentence: string, target: string, active: boolean) {
  const normalizedTarget = target.trim();
  const index = normalizedTarget ? sentence.indexOf(normalizedTarget) : -1;
  if (index < 0) {
    return sentence;
  }

  return (
    <>
      {sentence.slice(0, index)}
      <span
        className={`rounded-[3px] px-0.5 transition ${
          active ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]" : ""
        }`}
      >
        {normalizedTarget}
      </span>
      {sentence.slice(index + normalizedTarget.length)}
    </>
  );
}

export function EnhancementPopover({
  originalSentence,
  result,
  placeholderHint,
  isPlaceholderSuggestion,
  isReviewOnly = false,
  activePlaceholderFocus = false,
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
  const title = "当前句建议";
  const mode = isReviewOnly ? "review" : isPlaceholderSuggestion ? "placeholder" : "standard";

  return (
    <section
      ref={layerRef}
      aria-label="当前句行内建议"
      data-suggestion-mode={mode}
      className={`relative max-w-[760px] border-l-2 border-[var(--lt-accent)] bg-transparent py-2 pl-4 ${
        isReviewOnly ? "opacity-95" : ""
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        {isReviewOnly ? (
          <p className="text-xs leading-5 text-[var(--lt-muted)]">已采纳的表达建议，可随时换一种说法复习。</p>
        ) : !isPlaceholderSuggestion ? (
          <div>
            <h2 className="text-sm font-medium text-[var(--lt-accent)]">{title}</h2>
            {result ? <span className="sr-only">修改建议已生成</span> : null}
            <p className="mt-1 text-xs text-[var(--lt-muted)]">
              {result
                ? `建议类型：${result.hasChinese ? "中英混写转换" : "轻量英文润色"}`
                : "正在处理当前句"}
            </p>
          </div>
        ) : (
          <span className="sr-only">{result ? "修改建议已生成" : "正在处理当前句"}</span>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!result || isRegenerating}
            className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            换一种说法
          </button>
          {!isReviewOnly ? (
            <button
              type="button"
              onClick={onCancel}
              aria-label={isPlaceholderSuggestion ? "忽略" : "取消"}
              className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)]"
            >
              忽略
            </button>
          ) : null}
          {!isPlaceholderSuggestion && !isReviewOnly ? (
            <button
              type="button"
              onClick={onCopy}
              disabled={!result}
              aria-label="复制修改后的句子"
              className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              复制
            </button>
          ) : null}
          {!isReviewOnly ? (
            <button
              type="button"
              onClick={onApply}
              disabled={!result}
              aria-label="应用修改"
              className="rounded-md bg-[var(--lt-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--lt-accent)] hover:bg-[var(--lt-accent-soft-strong)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              采纳
            </button>
          ) : null}
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
      {!isReviewOnly ? (
        <div className="grid gap-2 text-sm">
          <div>
            {!isPlaceholderSuggestion ? (
              <div className="text-xs font-medium uppercase text-[var(--lt-accent)]">建议 Suggested</div>
            ) : null}
            <p className="mt-1 leading-7 text-[var(--lt-accent)]">
              {result
                ? placeholderHint
                  ? renderHighlightedSentence(result.finalSentence, placeholderHint.targetText, activePlaceholderFocus)
                  : result.finalSentence
                : "检查中..."}
            </p>
          </div>
        </div>
      ) : null}
      {placeholderHint ? (
        <div className="mt-3 grid gap-1 text-sm leading-6">
          <p className="text-[var(--lt-text)]">
            <span className="text-[var(--lt-muted)]">{placeholderHint.sourceText}</span>
            <span className="px-2 text-[var(--lt-faint)]">→</span>
            <span
              aria-label="对应英文表达"
              data-active={activePlaceholderFocus ? "true" : "false"}
              className={`rounded-[3px] px-1 transition ${
                activePlaceholderFocus ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]" : ""
              }`}
            >
              {placeholderHint.targetText}
            </span>
          </p>
          <p className="text-[var(--lt-muted)]">{placeholderHint.structure}</p>
        </div>
      ) : null}
      {!isPlaceholderSuggestion ? (
        <div className="mt-3">
          <div className="mb-1 text-xs font-medium uppercase text-[var(--lt-muted)]">原句 Original</div>
          <p className="leading-7 text-[var(--lt-muted)] line-through decoration-[var(--lt-muted)]">{originalSentence}</p>
        </div>
      ) : null}
      {result && !isPlaceholderSuggestion ? (
        <div className="mt-3">
          <DiffViewer parts={diffParts} />
        </div>
      ) : null}
      {result?.explanationZh && !placeholderHint ? (
        <p className="mt-3 text-sm leading-6 text-[var(--lt-muted)]">
          {result.explanationZh}
        </p>
      ) : null}
      {result && !isReviewOnly ? (
        <p className="mt-3 text-xs text-[var(--lt-faint)]">Tab 采纳 · Esc 忽略 · ⌘R 换一种说法</p>
      ) : result ? (
        <p className="mt-3 text-xs text-[var(--lt-faint)]">⌘R 换一种说法</p>
      ) : null}
      {statusMessage ? (
        <p className="mt-2 text-xs font-medium text-[var(--lt-muted)]">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
