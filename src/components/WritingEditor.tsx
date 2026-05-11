"use client";

import { forwardRef } from "react";

type WritingEditorProps = {
  value: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onEnhance: () => void;
};

export const WritingEditor = forwardRef<HTMLTextAreaElement, WritingEditorProps>(
  function WritingEditor({ value, isLoading, onChange, onEnhance }, ref) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <textarea
          ref={ref}
          value={value}
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
          }}
          placeholder="在这里自然写作。需要时可以中英混写，然后按 Ctrl/Cmd + Enter 润色最新一句。"
          className="min-h-[520px] flex-1 resize-none rounded-md border border-slate-200 bg-white p-6 text-base leading-8 text-slate-900 shadow-sm outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/20"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">只会处理最新的非空句子，不会改写整段。</p>
          <button
            type="button"
            onClick={onEnhance}
            disabled={isLoading}
            className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white transition hover:bg-moss/90 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            润色最新一句
          </button>
        </div>
      </div>
    );
  },
);
