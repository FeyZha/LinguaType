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
  { value: "explain_reason", label: "Explain reason", condition: "If you want to explain a reason, you can use:" },
  { value: "show_result", label: "Show result", condition: "If you want to show a result, you can use:" },
  { value: "give_example", label: "Give example", condition: "If you want to give an example, you can use:" },
  { value: "add_contrast", label: "Add contrast", condition: "If you want to add contrast, you can use:" },
  { value: "make_concession", label: "Make concession", condition: "If you want to make a concession, you can use:" },
  { value: "summarize_point", label: "Summarize", condition: "If you want to summarize a point, you can use:" },
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
          <h2 className="text-sm font-semibold text-slate-900">Next Expression Toolbox</h2>
          <p className="mt-1 text-xs text-slate-500">Choose an intention, then insert an expression tool.</p>
        </div>
        <span className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500">LLM off</span>
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conditional recall</h3>
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
