"use client";

import type { LearningHistoryItem } from "@/lib/llm/types";

const TYPE_LABELS: Record<LearningHistoryItem["type"], string> = {
  phrase: "短语 Phrase",
  collocation: "搭配 Collocation",
  sentence_pattern: "句型 Sentence pattern",
};

type LearningHistoryPanelProps = {
  items: LearningHistoryItem[];
  onDelete: (id: string) => void;
  onInsert: (content: string) => void;
};

export function LearningHistoryPanel({ items, onDelete, onInsert }: LearningHistoryPanelProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">学习记录 Learning History</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          应用修改后，有用表达会保存到这里。
        </p>
      ) : (
        <div className="mt-3 space-y-4">
          {(["phrase", "collocation", "sentence_pattern"] as const).map((type) => {
            const group = items.filter((item) => item.type === type);
            if (group.length === 0) {
              return null;
            }
            return (
              <div key={type}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {TYPE_LABELS[type]}
                </h3>
                <ul className="mt-2 space-y-2">
                  {group.map((item) => (
                    <li key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
                      <div className="font-medium text-slate-900">{item.content}</div>
                      <div className="mt-1 text-slate-600">{item.chineseMeaning}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        已保存，复用 {item.useCount} 次
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onInsert(item.content)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                        >
                          插入
                        </button>
                        <button
                          type="button"
                          onClick={() => navigator.clipboard?.writeText(item.content)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                        >
                          复制
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
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
