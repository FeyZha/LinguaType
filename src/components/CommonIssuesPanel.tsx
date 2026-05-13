"use client";

import type { CorrectionMemory, WritingMode } from "@/lib/llm/types";
import { sortCorrectionMemory } from "@/lib/storage";

const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  natural: "Natural",
  ielts: "IELTS",
  academic: "Academic",
  business: "Business",
  concise: "Concise",
};

type CommonIssuesPanelProps = {
  items: CorrectionMemory[];
  onDelete: (id: string) => void;
};

export function CommonIssuesPanel({ items, onDelete }: CommonIssuesPanelProps) {
  const sorted = sortCorrectionMemory(items);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">常见问题 Common Issues</h2>
      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          应用句子建议后，反复出现的修改模式会显示在这里。
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {sorted.map((item) => (
            <li key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">
                {item.before} <span className="text-slate-400">-&gt;</span> {item.after}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{item.type}</span>
                <span>{WRITING_MODE_LABELS[item.writingMode]}</span>
                <span>出现 {item.useCount} 次</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.reason}</p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.sourceSentence}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(item.after)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  复制修改后
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
