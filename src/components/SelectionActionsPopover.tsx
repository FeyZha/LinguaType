"use client";

import { useRef, useState } from "react";
import { BookOpenIcon, ClipboardDocumentIcon, SparklesIcon } from "./HeroIcons";
import { useDismissableLayer } from "./useDismissableLayer";
import type { SelectionExplainResult } from "@/lib/llm/types";

type SelectionActionsPopoverProps = {
  selectedText: string;
  position?: { left: number; top: number };
  explanation?: SelectionExplainResult;
  isLoading: boolean;
  message?: string;
  requested?: boolean;
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
  requested,
  onExplain,
  onSave,
  onClose,
}: SelectionActionsPopoverProps) {
  const layerRef = useRef<HTMLElement | null>(null);
  const [copyMessage, setCopyMessage] = useState("");
  useDismissableLayer(layerRef, onClose, true);

  const showPanel = requested || isLoading || Boolean(explanation) || Boolean(message) || Boolean(copyMessage);

  async function copySelectedText() {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage("当前浏览器不支持直接复制");
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedText);
      setCopyMessage("已复制选中文本");
    } catch {
      setCopyMessage("复制失败");
    }
  }

  return (
    <section
      ref={(element) => {
        layerRef.current = element;
      }}
      aria-label="选中文本功能条"
      data-selection-placement="above"
      data-selection-toolbar="true"
      className={`fixed z-50 text-[var(--lt-text)] shadow-[0_10px_34px_var(--lt-shadow)] ring-1 ring-[var(--lt-border)] ${
        showPanel
          ? "w-[min(380px,calc(100%-2rem))] rounded-lg bg-[var(--lt-menu-bg)] p-4"
          : "inline-flex rounded-[7px] bg-[var(--lt-menu-bg)] p-1"
      }`}
      style={{
        left: position?.left ?? 16,
        top: position?.top ?? 16,
        transform: "translate(calc(-100% + 12px), calc(-100% - 8px))",
      }}
    >
      <div className={showPanel ? "flex items-start justify-between gap-3" : "flex items-center gap-1"}>
        {showPanel ? (
          <div>
            <h2 className="text-sm font-semibold">解释选中内容</h2>
            <p className="mt-1 break-words text-xs text-[var(--lt-muted)]">{selectedText}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onExplain}
            disabled={isLoading}
            aria-label="解释选中内容"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <SparklesIcon className="h-4 w-4" />
            <span>{isLoading ? "解释中" : "解释"}</span>
          </button>
          <button
            type="button"
            onClick={onSave}
            aria-label="保存到表达库"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)]"
          >
            <BookOpenIcon className="h-4 w-4" />
            <span>保存</span>
          </button>
          <button
            type="button"
            onClick={() => void copySelectedText()}
            aria-label="复制选中文本"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)]"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            <span>复制</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭选中文本操作"
            className="rounded-md px-2 py-1.5 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
          >
            Esc
          </button>
        </div>
      </div>

      {showPanel ? (
        <>
          {isLoading ? <p className="mt-3 text-sm text-[var(--lt-muted)]">正在解释选中文本...</p> : null}
          {explanation ? (
            <div className="mt-3 grid gap-3 text-sm text-[var(--lt-muted)]">
              <ExplainBlock title="含义" body={explanation.meaningZh} />
              <ExplainBlock title="用法" body={explanation.usageNoteZh} />
              <ExplainBlock title="语境作用" body={explanation.contextRoleZh || "结合当前上下文理解这个表达的作用。"} />
              <ExplainBlock title="表达类型" body={expressionTypeLabel(explanation.expressionType)} />
            </div>
          ) : null}
        </>
      ) : null}

      {message || copyMessage ? (
        <p className="mt-3 rounded-md bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">
          {message || copyMessage}
        </p>
      ) : null}
    </section>
  );
}

function ExplainBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--lt-muted)]">{title}</p>
      <p className="mt-0.5 leading-6 text-[var(--lt-text)]">{body}</p>
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
