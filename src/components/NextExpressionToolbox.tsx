"use client";

import { useState } from "react";
import type { LearningHistoryItem } from "@/lib/llm/types";

const TEMPLATES = {
  解释原因: ["This may be because...", "One possible reason is that...", "This is partly due to..."],
  说明结果: ["As a result, ...", "This can lead to...", "Therefore, ..."],
  举例说明: ["For example, ...", "A clear example is...", "This can be seen when..."],
  添加转折: ["However, ...", "By contrast, ...", "On the other hand, ..."],
  让步表达: [
    "This does not necessarily mean that...",
    "Although this may be true, ...",
    "Admittedly, ...",
  ],
  总结观点: ["Overall, ...", "In short, ...", "Therefore, it is important to..."],
} as const;

type Intention = keyof typeof TEMPLATES;

type NextExpressionToolboxProps = {
  history: LearningHistoryItem[];
  onInsert: (content: string) => void;
};

export function NextExpressionToolbox({ history, onInsert }: NextExpressionToolboxProps) {
  const [selected, setSelected] = useState<Intention>("解释原因");
  const recalled = history.slice(0, 3);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">下一句表达工具箱</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {(Object.keys(TEMPLATES) as Intention[]).map((intention) => (
          <button
            type="button"
            key={intention}
            onClick={() => setSelected(intention)}
            className={`rounded-md border px-2.5 py-1.5 text-xs ${
              selected === intention
                ? "border-moss bg-moss text-white"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {intention}
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
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">条件式回顾</h3>
          <div className="mt-2 space-y-2">
            {recalled.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => onInsert(item.content)}
                className="block w-full rounded-md bg-slate-50 px-3 py-2 text-left text-xs text-slate-700 hover:bg-skysoft/60"
              >
                如果你想复用已保存的表达，可以使用 “{item.content}”。
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
