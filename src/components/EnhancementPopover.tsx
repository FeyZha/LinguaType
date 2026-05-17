"use client";

import type { Change } from "diff";
import { useEffect, useRef, useState } from "react";
import type { FastEnhanceResult } from "@/lib/llm/types";
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
  activeDiffId?: string | null;
  onDiffHover?: (id: string | null) => void;
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

export type DiffToken = {
  id?: string;
  text: string;
  changed?: boolean;
  kind?: "replace" | "add" | "remove";
};

function compactDiffText(value: string) {
  return value.replace(/\s+/gu, " ").trim();
}

function displayDiffText(value: string) {
  return value.replace(/\s+/gu, " ");
}

export function buildMappedDiffRows(parts: Change[]) {
  const original: DiffToken[] = [];
  const revised: DiffToken[] = [];
  let changeIndex = 0;

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const next = parts[index + 1];

    if (part.removed && next?.added) {
      const before = displayDiffText(part.value);
      const after = displayDiffText(next.value);
      if (compactDiffText(before) || compactDiffText(after)) {
        const id = `diff-${changeIndex}`;
        original.push({ id, text: before, changed: true, kind: "replace" });
        revised.push({ id, text: after, changed: true, kind: "replace" });
        changeIndex += 1;
      }
      index += 1;
      continue;
    }

    if (part.added) {
      const after = displayDiffText(part.value);
      if (compactDiffText(after)) {
        const id = `diff-${changeIndex}`;
        original.push({ id, text: "插入", changed: true, kind: "add" });
        revised.push({ id, text: after, changed: true, kind: "add" });
        changeIndex += 1;
      }
      continue;
    }

    if (part.removed) {
      const before = displayDiffText(part.value);
      if (compactDiffText(before)) {
        const id = `diff-${changeIndex}`;
        original.push({ id, text: before, changed: true, kind: "remove" });
        changeIndex += 1;
      }
      continue;
    }

    if (part.value) {
      original.push({ text: part.value });
      revised.push({ text: part.value });
    }
  }

  return { original, revised };
}

export function renderOriginalDiffTokens(
  tokens: DiffToken[],
  _activeDiffId?: string | null,
  _setActiveDiffId?: (id: string | null) => void,
) {
  return tokens.map((token, index) => {
    if (!token.changed || !token.id) {
      return <span key={`same-${index}`}>{token.text}</span>;
    }

    const isInsertion = token.kind === "add";
    if (isInsertion) {
      return (
        <span
          key={token.id}
          aria-label="新增位置"
          data-original-diff="changed"
          className="mx-0.5 inline-block h-[0.9em] w-[1px] translate-y-[0.12em] bg-[color:color-mix(in_srgb,var(--lt-accent)_24%,transparent)]"
        />
      );
    }

    return (
      <span
        key={token.id}
        aria-label={`原句改动：${token.text}`}
        data-original-diff="changed"
        className="mx-0.5 inline bg-[color:color-mix(in_srgb,var(--lt-accent-soft)_28%,transparent)] px-0.5 text-[color:color-mix(in_srgb,var(--lt-text)_88%,var(--lt-accent)_12%)]"
      >
        {token.text}
      </span>
    );
  });
}

export function renderRevisedDiffTokens(
  tokens: DiffToken[],
  _activeDiffId?: string | null,
  _setActiveDiffId?: (id: string | null) => void,
) {
  return tokens.map((token, index) => {
    if (!token.changed || !token.id) {
      return <span key={`same-${index}`}>{token.text}</span>;
    }

    return (
      <span
        key={token.id}
        data-revised-diff="changed"
        className="px-0.5 text-[color:color-mix(in_srgb,var(--lt-text)_90%,var(--lt-accent)_10%)]"
      >
        {token.text}
      </span>
    );
  });
}

function taskTypeLabel(result: FastEnhanceResult | undefined): string {
  if (!result) {
    return "处理中";
  }
  if (result.hasChinese) {
    return "中英混写转换";
  }
  if (result.taskType === "unchanged") {
    return "轻量英文润色（未改写）";
  }
  return "轻量英文润色";
}

function summarizeOriginalChanges(tokens: DiffToken[]) {
  const seen = new Set<string>();
  const parts: string[] = [];

  for (const token of tokens) {
    if (!token.changed || token.kind === "add") {
      continue;
    }
    const text = compactDiffText(token.text);
    if (!text || seen.has(text)) {
      continue;
    }
    seen.add(text);
    parts.push(text);
    if (parts.length >= 5) {
      break;
    }
  }

  return parts.join(" / ");
}

function summarizeExplanation(explanation: string | undefined) {
  const text = compactDiffText(explanation ?? "");
  if (!text) {
    return "";
  }
  return text.length > 150 ? `${text.slice(0, 147).trimEnd()}...` : text;
}

export function EnhancementPopover({
  result,
  isPlaceholderSuggestion,
  isReviewOnly = false,
  activeDiffId,
  onDiffHover,
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
  const [isVisible, setIsVisible] = useState(false);
  const [localActiveDiffId, setLocalActiveDiffId] = useState<string | null>(null);
  const mode = isReviewOnly ? "review" : isPlaceholderSuggestion ? "placeholder" : "standard";
  const diffRows = buildMappedDiffRows(diffParts);
  const originalChangeSummary = summarizeOriginalChanges(diffRows.original);
  const explanationSummary = summarizeExplanation(result?.explanationZh);
  const currentActiveDiffId = activeDiffId ?? localActiveDiffId;
  const setCurrentActiveDiffId = (id: string | null) => {
    setLocalActiveDiffId(id);
    onDiffHover?.(id);
  };

  useDismissableLayer(layerRef, onCancel, true);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      ref={layerRef}
      aria-label="当前句行内建议"
      data-suggestion-mode={mode}
      data-suggestion-enter="soft-rise"
      className={`relative max-w-[760px] border-l-2 border-[var(--lt-accent)] bg-transparent py-2 pl-4 transition-[opacity,transform] duration-150 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      } ${isReviewOnly ? "opacity-95" : ""}`}
    >
      <div className="mb-2">
        <h2 className="text-sm font-medium text-[var(--lt-accent)]">当前句建议</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">
          {isReviewOnly ? "已采纳建议，可再次回顾。" : `改写类型：${taskTypeLabel(result)}`}
        </p>
      </div>

      {conflictMessage ? <div className="mb-3 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-amber-900">{conflictMessage}</div> : null}

      {copyMessage ? <div className="mb-3 rounded-md bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-900">{copyMessage}</div> : null}

      <div className="mb-3 space-y-2" data-suggestion-diff="mapped">
        {result ? (
          <>
            <div className="px-3 py-1">
              <p className="text-sm leading-7 text-[var(--lt-text)]">
                {originalChangeSummary ? (
                  <span
                    aria-label="原文关键修改片段"
                    className="mr-2 text-[var(--lt-muted)]"
                  >
                    {originalChangeSummary}
                    <span className="px-2 text-[var(--lt-faint)]">-&gt;</span>
                  </span>
                ) : null}
                <span aria-label="修改后句子">
                  {diffRows.revised.length > 0
                    ? renderRevisedDiffTokens(
                        diffRows.revised,
                        currentActiveDiffId,
                        setCurrentActiveDiffId,
                      )
                    : result.finalSentence}
                </span>
              </p>
              {explanationSummary ? (
                <p className="mt-2 text-sm leading-7 text-[var(--lt-muted)]">
                  结构：{explanationSummary}
                </p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="rounded-[6px] bg-[var(--lt-surface-soft)] px-3 py-2">
            <p className="text-sm leading-7 text-[var(--lt-muted)]">正在处理当前句...</p>
          </div>
        )}
      </div>

      {statusMessage ? <p className="mt-2 text-xs font-medium text-[var(--lt-muted)]">{statusMessage}</p> : null}

      <div
        aria-label="当前句操作区"
        data-suggestion-actions-position="bottom"
        className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--lt-border)] pt-2"
      >
        <p className="text-xs text-[var(--lt-faint)]">
          {result && !isReviewOnly
            ? "Tab 应用 · Esc 取消 · Ctrl/Cmd + R 换一种表达"
            : result
              ? "Ctrl/Cmd + R 换一种表达"
              : ""}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!result || isRegenerating}
            className="rounded-md px-2 py-1 text-sm text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            换一种表达
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
              应用修改
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
