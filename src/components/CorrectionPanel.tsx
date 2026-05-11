"use client";

import type { EnhanceLatestSentenceResult } from "@/lib/llm/types";

type CorrectionPanelProps = {
  result?: EnhanceLatestSentenceResult;
};

export function CorrectionPanel({ result }: CorrectionPanelProps) {
  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">修改说明</h2>
      {!result ? (
        <p className="mt-3 text-sm text-slate-500">润色后会在这里显示修改说明。</p>
      ) : result.corrections.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">最新一句已经自然，无需修改。</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {result.corrections.map((correction, index) => (
            <li key={`${correction.before}-${index}`} className="text-sm">
              <div className="font-medium text-slate-800">
                {correction.before} <span className="text-slate-400">→</span> {correction.after}
              </div>
              <p className="mt-1 text-slate-600">{correction.reason}</p>
            </li>
          ))}
        </ul>
      )}
      {result?.coherenceRisk.hasRisk ? (
        <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {result.coherenceRisk.message}
        </div>
      ) : null}
    </section>
  );
}
