"use client";

import { forwardRef } from "react";

type WritingEditorProps = {
  value: string;
  isLoading: boolean;
  isExpressionMenuOpen?: boolean;
  onChange: (value: string) => void;
  onEnhance: () => void;
  onOpenExpressionMenu: (selection: { start: number; end: number }) => void;
  onCloseExpressionMenu: () => void;
};

export const WritingEditor = forwardRef<HTMLTextAreaElement, WritingEditorProps>(
  function WritingEditor({
    value,
    isLoading,
    isExpressionMenuOpen,
    onChange,
    onEnhance,
    onOpenExpressionMenu,
    onCloseExpressionMenu,
  }, ref) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <textarea
          ref={ref}
          value={value}
          aria-label="Writing editor"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            const isCommand = event.ctrlKey || event.metaKey;
            if (isCommand && event.key === "Enter") {
              event.preventDefault();
              onEnhance();
            }
            if (isCommand && event.key.toLowerCase() === "j") {
              event.preventDefault();
              onEnhance();
            }
            if (isCommand && event.key.toLowerCase() === "k") {
              event.preventDefault();
              onOpenExpressionMenu({
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              });
            }
            if (event.altKey && event.key === "/") {
              event.preventDefault();
              onOpenExpressionMenu({
                start: event.currentTarget.selectionStart,
                end: event.currentTarget.selectionEnd,
              });
            }
            if (event.key === "Escape" && isExpressionMenuOpen) {
              event.preventDefault();
              onCloseExpressionMenu();
            }
          }}
          placeholder="Write naturally here. Mixed Chinese-English is okay, then press Ctrl/Cmd + Enter to enhance the latest sentence."
          className="min-h-[520px] flex-1 resize-none rounded-md border border-slate-200 bg-white p-6 text-base leading-8 text-slate-900 shadow-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/20"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Only the latest non-empty sentence is enhanced.</p>
          <div className="flex flex-wrap gap-2">
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
              Expression menu
            </button>
            <button
              type="button"
              onClick={onEnhance}
              disabled={isLoading}
              aria-label="Enhance latest sentence"
              className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Enhance latest sentence
            </button>
          </div>
        </div>
      </div>
    );
  },
);
