"use client";

import { useMemo, useState } from "react";
import type { CorrectionEvent, CorrectionEventType } from "@/lib/llm/types";
import { aggregateWritingHabits } from "@/lib/storage";

type WritingHabitsPanelProps = {
  events: CorrectionEvent[];
  onDeleteType: (type: CorrectionEventType) => void;
};

export function WritingHabitsPanel({ events, onDeleteType }: WritingHabitsPanelProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const insights = useMemo(() => aggregateWritingHabits(events), [events]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">写作习惯</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          基于你已 Apply 的修改，LinguaType 会在这里总结反复出现的写作习惯。
        </p>
      </div>

      {insights.length === 0 ? (
        <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-500">
          先应用几次句子建议。LinguaType 会把你认可过的修改总结成写作习惯。
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {insights.map((insight) => {
            const isExpanded = Boolean(expanded[insight.id]);
            return (
              <li key={insight.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{insight.titleZh}</h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-600">
                        出现 {insight.count} 次
                      </span>
                      <span className={severityClassName(insight.severity)}>
                        {insight.severity}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteType(insight.type)}
                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  >
                    删除此类
                  </button>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-600">{insight.summaryZh}</p>
                <p className="mt-2 rounded bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                  {insight.suggestionZh}
                </p>

                <button
                  type="button"
                  onClick={() => setExpanded((current) => ({ ...current, [insight.id]: !isExpanded }))}
                  className="mt-3 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  {isExpanded ? "收起例子" : "查看例子"}
                </button>

                {isExpanded ? (
                  <ul className="mt-3 space-y-2">
                    {insight.examples.map((example, index) => (
                      <li key={`${example.before}-${index}`} className="rounded bg-white p-2 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">
                          {example.before} <span className="text-slate-400">-&gt;</span> {example.after}
                        </div>
                        <p className="mt-1">{example.reason}</p>
                        <p className="mt-1 line-clamp-2 text-slate-400">{example.sourceSentence}</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function severityClassName(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "rounded border border-red-200 bg-red-50 px-2 py-1 font-medium text-red-700";
  }
  if (severity === "medium") {
    return "rounded border border-amber-200 bg-amber-50 px-2 py-1 font-medium text-amber-700";
  }
  return "rounded border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700";
}
