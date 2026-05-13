"use client";

import { forwardRef } from "react";
import { ProofreadingSignalsPanel } from "./ProofreadingSignalsPanel";
import type { EnhancementLevel, WritingMode } from "@/lib/llm/types";
import type { ProofreadingResult } from "@/lib/proofreading";
import type { TriggerSettings } from "@/lib/storage";

const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  natural: "自然",
  ielts: "雅思",
  academic: "学术",
  business: "商务",
  concise: "简洁",
};

const ENHANCEMENT_LEVELS: EnhancementLevel[] = ["minimal", "balanced", "polished"];

const ENHANCEMENT_LEVEL_LABELS: Record<EnhancementLevel, string> = {
  minimal: "轻度",
  balanced: "平衡",
  polished: "润色",
};

type WritingEditorProps = {
  value: string;
  outlinePoints?: string[];
  isLoading: boolean;
  isExpressionMenuOpen?: boolean;
  writingMode: WritingMode;
  enhancementLevel: EnhancementLevel;
  proofreadingResult: ProofreadingResult;
  triggerSettings: TriggerSettings;
  onChange: (value: string) => void;
  onWritingModeChange: (mode: WritingMode) => void;
  onEnhancementLevelChange: (level: EnhancementLevel) => void;
  onEnhance: () => void;
  onOpenExpressionMenu: (selection: { start: number; end: number }) => void;
  onCloseExpressionMenu: () => void;
  onSelectionChange: (selection: {
    start: number;
    end: number;
    text: string;
    paragraphIndex: number;
    anchorRect: DOMRect;
    containerRect: DOMRect;
  }) => void;
  outlineEditState: { index: number; draft: string } | null;
  onStartOutlineEdit: (index: number) => void;
  onOutlineDraftChange: (draft: string) => void;
  onSaveOutlineEdit: () => void;
  onCancelOutlineEdit: () => void;
  onAddOutlinePoint: () => void;
  onDeleteOutlinePoint: (index: number) => void;
  onEscape: () => void;
};

export const WritingEditor = forwardRef<HTMLTextAreaElement, WritingEditorProps>(
  function WritingEditor({
    value,
    outlinePoints,
    isLoading,
    isExpressionMenuOpen,
    writingMode,
    enhancementLevel,
    proofreadingResult,
    triggerSettings,
    onChange,
    onWritingModeChange,
    onEnhancementLevelChange,
    onEnhance,
    onOpenExpressionMenu,
    onCloseExpressionMenu,
    onSelectionChange,
    outlineEditState,
    onStartOutlineEdit,
    onOutlineDraftChange,
    onSaveOutlineEdit,
    onCancelOutlineEdit,
    onAddOutlinePoint,
    onDeleteOutlinePoint,
    onEscape,
  }, ref) {
    const paragraphs = splitIntoParagraphInputs(value, outlinePoints?.length ?? 1);

    function paragraphOffset(index: number): number {
      return paragraphs.slice(0, index).reduce((sum, paragraph) => sum + paragraph.length + 2, 0);
    }

    function reportSelection(target: HTMLTextAreaElement, paragraphIndex: number) {
      const offset = paragraphOffset(paragraphIndex);
      onSelectionChange({
        start: offset + target.selectionStart,
        end: offset + target.selectionEnd,
        text: target.value.slice(target.selectionStart, target.selectionEnd),
        paragraphIndex,
        anchorRect: estimateSelectionRect(target),
        containerRect: target.closest("[data-editor-container]")?.getBoundingClientRect() ?? target.getBoundingClientRect(),
      });
    }

    function openExpressionMenu(target: HTMLTextAreaElement, paragraphIndex: number) {
      const offset = paragraphOffset(paragraphIndex);
      onOpenExpressionMenu({
        start: offset + target.selectionStart,
        end: offset + target.selectionEnd,
      });
    }

    function updateParagraph(index: number, nextValue: string) {
      const nextParagraphs = [...paragraphs];
      nextParagraphs[index] = nextValue;
      onChange(nextParagraphs.join("\n\n"));
    }

    const triggerLabel = sentenceTriggerLabel(triggerSettings.sentenceEnhancementShortcut);

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid min-h-[520px] flex-1 gap-3 overflow-auto" data-editor-container>
          {paragraphs.map((paragraph, index) => (
            <label key={index} className="grid min-h-[180px] gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm">
              <span className="grid gap-2 text-xs font-semibold text-slate-600">
                <span className="flex items-center justify-between gap-3">
                  <span>第 {index + 1} 段：{outlinePoints?.[index]?.trim() || "自由写作"}</span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onStartOutlineEdit(index)}
                      aria-label={`编辑第 ${index + 1} 个大纲点`}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteOutlinePoint(index)}
                      aria-label={`删除第 ${index + 1} 个大纲点`}
                      className="rounded px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-100 hover:text-red-700"
                    >
                      删除
                    </button>
                  </span>
                </span>
                {outlineEditState?.index === index ? (
                  <span className="flex flex-wrap gap-2">
                    <input
                      value={outlineEditState.draft}
                      onChange={(event) => onOutlineDraftChange(event.target.value)}
                      aria-label={`内联第 ${index + 1} 个大纲点`}
                      className="h-8 min-w-64 rounded-md border border-slate-300 px-2 text-xs text-slate-800 outline-none focus:border-moss"
                    />
                    <button
                      type="button"
                      onClick={onSaveOutlineEdit}
                      className="rounded-md bg-moss px-2 py-1 text-xs font-semibold text-white"
                    >
                      保存大纲点
                    </button>
                    <button
                      type="button"
                      onClick={onCancelOutlineEdit}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
                    >
                      取消
                    </button>
                  </span>
                ) : null}
                {index === paragraphs.length - 1 ? (
                  <button
                    type="button"
                    onClick={onAddOutlinePoint}
                    className="w-fit rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    + 大纲点
                  </button>
                ) : null}
              </span>
              <textarea
                ref={index === 0 ? ref : undefined}
                value={paragraph}
                aria-label={index === 0 ? "写作编辑器" : `第 ${index + 1} 段正文`}
                onChange={(event) => {
                  updateParagraph(index, event.target.value);
                  reportSelection(event.target, index);
                }}
                onMouseUp={(event) => reportSelection(event.currentTarget, index)}
                onKeyUp={(event) => reportSelection(event.currentTarget, index)}
                onKeyDown={(event) => {
                  const isCommand = event.ctrlKey || event.metaKey;
                  if (isCommand && event.key === "Enter" && triggerSettings.sentenceEnhancementShortcut === "ctrl_enter") {
                    event.preventDefault();
                    onEnhance();
                  }
                  if (isCommand && event.key.toLowerCase() === "j" && triggerSettings.sentenceEnhancementShortcut === "ctrl_j_legacy") {
                    event.preventDefault();
                    onEnhance();
                  }
                  if (isCommand && event.key.toLowerCase() === "k" && triggerSettings.inlineExpressionMenuTrigger === "ctrl_k") {
                    event.preventDefault();
                    openExpressionMenu(event.currentTarget, index);
                  }
                  if (event.key === "Escape" && isExpressionMenuOpen) {
                    event.preventDefault();
                    onCloseExpressionMenu();
                  }
                  if (event.key === "Escape" && !isExpressionMenuOpen && triggerSettings.popoverBehavior.escapeCloses) {
                    event.preventDefault();
                    onEscape();
                  }
                }}
                placeholder={[
                  "直接写英文，卡住时可以夹中文。",
                  "例如：This may 影响 young people's values.",
                  "按 Ctrl/Cmd + Enter 增强最新一句。",
                ].join("\n")}
                className="min-h-0 flex-1 resize-none bg-transparent text-base leading-8 text-slate-900 outline-none"
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-medium text-slate-600">
              模式：{WRITING_MODE_LABELS[writingMode]} | 强度：{ENHANCEMENT_LEVEL_LABELS[enhancementLevel]} | 触发：{triggerLabel}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                写作模式
                <select
                  value={writingMode}
                  onChange={(event) => onWritingModeChange(event.target.value as WritingMode)}
                  aria-label="写作模式"
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
                >
                  {(Object.keys(WRITING_MODE_LABELS) as WritingMode[]).map((mode) => (
                    <option key={mode} value={mode}>
                      {WRITING_MODE_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                增强强度
                <select
                  value={enhancementLevel}
                  onChange={(event) => onEnhancementLevelChange(event.target.value as EnhancementLevel)}
                  aria-label="增强强度"
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
                >
                  {ENHANCEMENT_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {ENHANCEMENT_LEVEL_LABELS[level]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            <ProofreadingSignalsPanel result={proofreadingResult} />
            {triggerSettings.inlineExpressionMenuTrigger === "floating_button" ? (
              <button
                type="button"
                onClick={() => {
                  const textarea = typeof ref === "object" && ref?.current ? ref.current : undefined;
                  onOpenExpressionMenu({
                    start: textarea?.selectionStart ?? value.length,
                    end: textarea?.selectionEnd ?? value.length,
                  });
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                表达菜单
              </button>
            ) : null}
            <button
              type="button"
              onClick={onEnhance}
              disabled={isLoading}
              aria-label="增强最新一句"
              className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              增强最新一句
            </button>
          </div>
        </div>
      </div>
    );
  },
);

function splitIntoParagraphInputs(value: string, count: number): string[] {
  const targetCount = Math.max(1, count);
  if (targetCount === 1) {
    return [value];
  }
  const parts = value.split(/\n{2,}/u);
  while (parts.length < targetCount) {
    parts.push("");
  }
  if (parts.length > targetCount) {
    const head = parts.slice(0, targetCount - 1);
    const tail = parts.slice(targetCount - 1).join("\n\n");
    return [...head, tail];
  }
  return parts;
}

function estimateSelectionRect(target: HTMLTextAreaElement): DOMRect {
  const rect = target.getBoundingClientRect();
  const lineHeight = 32;
  const textBeforeSelection = target.value.slice(0, target.selectionStart);
  const lineIndex = textBeforeSelection.split(/\n/u).length - 1;
  const top = rect.top + 12 + Math.min(lineIndex, 8) * lineHeight - target.scrollTop;
  const left = rect.left + 24;
  return new DOMRect(left, top, Math.min(240, Math.max(80, rect.width * 0.45)), lineHeight);
}

function sentenceTriggerLabel(value: TriggerSettings["sentenceEnhancementShortcut"]): string {
  if (value === "ctrl_j_legacy") {
    return "Ctrl/Cmd + J";
  }
  if (value === "button_only") {
    return "仅按钮";
  }
  if (value === "disable_shortcut") {
    return "已关闭";
  }
  return "Ctrl/Cmd + Enter";
}
