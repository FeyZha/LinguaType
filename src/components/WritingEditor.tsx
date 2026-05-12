"use client";

import { forwardRef } from "react";
import type { EnhancementLevel, WritingMode } from "@/lib/llm/types";
import type { TriggerSettings } from "@/lib/storage";

const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  natural: "Natural 自然",
  ielts: "IELTS",
  academic: "Academic 学术",
  business: "Business 商务",
  concise: "Concise 简洁",
};

const ENHANCEMENT_LEVELS: EnhancementLevel[] = ["minimal", "balanced", "polished"];

const ENHANCEMENT_LEVEL_LABELS: Record<EnhancementLevel, string> = {
  minimal: "minimal 最小修改",
  balanced: "balanced 平衡",
  polished: "polished 更顺更正式",
};

type WritingEditorProps = {
  value: string;
  isLoading: boolean;
  isExpressionMenuOpen?: boolean;
  writingMode: WritingMode;
  enhancementLevel: EnhancementLevel;
  triggerSettings: TriggerSettings;
  onChange: (value: string) => void;
  onWritingModeChange: (mode: WritingMode) => void;
  onEnhancementLevelChange: (level: EnhancementLevel) => void;
  onEnhance: () => void;
  onOpenExpressionMenu: (selection: { start: number; end: number }) => void;
  onCloseExpressionMenu: () => void;
  onSelectionChange: (selection: { start: number; end: number; text: string }) => void;
  onEscape: () => void;
};

export const WritingEditor = forwardRef<HTMLTextAreaElement, WritingEditorProps>(
  function WritingEditor({
    value,
    isLoading,
    isExpressionMenuOpen,
    writingMode,
    enhancementLevel,
    triggerSettings,
    onChange,
    onWritingModeChange,
    onEnhancementLevelChange,
    onEnhance,
    onOpenExpressionMenu,
    onCloseExpressionMenu,
    onSelectionChange,
    onEscape,
  }, ref) {
    function reportSelection(target: HTMLTextAreaElement) {
      onSelectionChange({
        start: target.selectionStart,
        end: target.selectionEnd,
        text: target.value.slice(target.selectionStart, target.selectionEnd),
      });
    }

    function openExpressionMenu(target: HTMLTextAreaElement) {
      onOpenExpressionMenu({
        start: target.selectionStart,
        end: target.selectionEnd,
      });
    }

    const triggerLabel = sentenceTriggerLabel(triggerSettings.sentenceEnhancementShortcut);

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <textarea
          ref={ref}
          value={value}
          aria-label="写作编辑器"
          onChange={(event) => {
            onChange(event.target.value);
            reportSelection(event.target);
          }}
          onMouseUp={(event) => reportSelection(event.currentTarget)}
          onKeyUp={(event) => reportSelection(event.currentTarget)}
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
              openExpressionMenu(event.currentTarget);
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
            "请直接写英文，卡住时可以夹中文。",
            "例：This may 影响 young people's values.",
            "按 Ctrl/Cmd + Enter 增强最新一句。",
          ].join("\n")}
          className="min-h-[520px] flex-1 resize-none rounded-md border border-slate-200 bg-white p-6 text-base leading-8 text-slate-900 shadow-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/20"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
          <details className="group">
            <summary className="cursor-pointer list-none text-xs font-medium text-slate-600">
              模式 Mode：{WRITING_MODE_LABELS[writingMode]} | 强度 Level：{ENHANCEMENT_LEVEL_LABELS[enhancementLevel]} | 触发 Trigger：{triggerLabel}
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-medium text-slate-600">
                写作模式 Writing Mode
                <select
                  value={writingMode}
                  onChange={(event) => onWritingModeChange(event.target.value as WritingMode)}
                  aria-label="写作模式 Writing Mode"
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
                增强强度 Enhancement Level
                <select
                  value={enhancementLevel}
                  onChange={(event) => onEnhancementLevelChange(event.target.value as EnhancementLevel)}
                  aria-label="增强强度 Enhancement Level"
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

function sentenceTriggerLabel(value: TriggerSettings["sentenceEnhancementShortcut"]): string {
  if (value === "ctrl_j_legacy") {
    return "Ctrl/Cmd + J";
  }
  if (value === "button_only") {
    return "仅按钮";
  }
  if (value === "disable_shortcut") {
    return "快捷键已关闭";
  }
  return "Ctrl/Cmd + Enter";
}
