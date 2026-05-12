"use client";

import { useMemo, useState } from "react";
import type { LearningItem, WritingMode } from "@/lib/llm/types";

export type WritingIntention =
  | "explain_reason"
  | "show_result"
  | "give_example"
  | "add_contrast"
  | "make_concession"
  | "summarize_point";

const INTENTIONS: Array<{ value: WritingIntention; label: string; condition: string }> = [
  { value: "explain_reason", label: "解释原因 Explain reason", condition: "想解释原因时，可以使用：" },
  { value: "show_result", label: "说明结果 Show result", condition: "想说明结果时，可以使用：" },
  { value: "give_example", label: "举例 Give example", condition: "想举例时，可以使用：" },
  { value: "add_contrast", label: "转折对比 Add contrast", condition: "想转折或对比时，可以使用：" },
  { value: "make_concession", label: "让步 Make concession", condition: "想表达让步时，可以使用：" },
  { value: "summarize_point", label: "总结 Summarize", condition: "想总结观点时，可以使用：" },
];

const TEMPLATES: Record<WritingIntention, string[]> = {
  explain_reason: ["This may be because...", "One possible reason is that...", "This can be explained by..."],
  show_result: ["As a result, ...", "This may lead to...", "Over time, this can..."],
  give_example: ["For example, ...", "A typical example is...", "This can be seen in..."],
  add_contrast: ["However, ...", "In contrast, ...", "This does not necessarily mean that..."],
  make_concession: ["Admittedly, ...", "It is true that...", "This does not mean that..."],
  summarize_point: ["Therefore, ...", "In this sense, ...", "Overall, this suggests that..."],
};

type NextExpressionToolboxProps = {
  history: LearningItem[];
  writingMode: WritingMode;
  onInsert: (content: string) => void;
};

export function NextExpressionToolbox({ history, writingMode, onInsert }: NextExpressionToolboxProps) {
  const [selected, setSelected] = useState<WritingIntention>("explain_reason");
  const selectedMeta = INTENTIONS.find((item) => item.value === selected) ?? INTENTIONS[0];
  const recalled = useMemo(() => recallLearningItems(history, writingMode).slice(0, 4), [history, writingMode]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">表达工具箱 Expression Toolbox</h2>
          <p className="mt-1 text-xs text-slate-500">先选择写作意图，再插入合适的表达。</p>
        </div>
        <span className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500">LLM 未调用</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {INTENTIONS.map((intention) => (
          <button
            type="button"
            key={intention.value}
            onClick={() => setSelected(intention.value)}
            className={`rounded-md border px-2.5 py-1.5 text-xs ${
              selected === intention.value
                ? "border-moss bg-moss text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {intention.label}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {TEMPLATES[selected].map((template) => (
          <button
            type="button"
            key={template}
            onClick={() => onInsert(template)}
            className="block w-full rounded-md bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:bg-skysoft/60"
          >
            {template}
          </button>
        ))}
      </div>
      {recalled.length > 0 ? (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">条件召回 Conditional recall</h3>
          <p className="mt-2 text-xs text-slate-500">{selectedMeta.condition}</p>
          <div className="mt-2 space-y-2">
            {recalled.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onInsert(item.content)}
                className="block w-full rounded-md bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:bg-skysoft/60"
              >
                {item.content}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function recallLearningItems(items: LearningItem[], writingMode: WritingMode): LearningItem[] {
  return [...items].sort((a, b) => {
    const favoriteScore = Number(b.favorite) - Number(a.favorite);
    if (favoriteScore !== 0) {
      return favoriteScore;
    }

    const modeScore = Number(b.writingMode === writingMode) - Number(a.writingMode === writingMode);
    if (modeScore !== 0) {
      return modeScore;
    }

    return b.useCount - a.useCount || b.updatedAt.localeCompare(a.updatedAt);
  });
}
