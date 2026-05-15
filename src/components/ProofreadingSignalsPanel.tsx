"use client";

import { useState } from "react";
import type { ProofreadingResult, ProofreadingSignalType } from "@/lib/proofreading";

type ProofreadingSignalsPanelProps = {
  result: ProofreadingResult;
};

const TYPE_LABELS: Record<ProofreadingSignalType, string> = {
  grammar: "语法 Grammar",
  punctuation: "标点 Punctuation",
  style: "风格 Style",
  length: "长度 Length",
};

export function ProofreadingSignalsPanel({ result }: ProofreadingSignalsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { stats, signals } = result;
  const issueLabel = `${signals.length} 个问题`;

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className={`rounded-md px-3 py-2 text-xs font-medium transition ${
          signals.length > 0
            ? "bg-amber-500/[0.1] text-amber-900 hover:bg-amber-500/[0.16]"
            : "bg-emerald-500/[0.1] text-emerald-900 hover:bg-emerald-500/[0.16]"
        }`}
      >
        校对提示：{issueLabel}
      </button>

      {isOpen ? (
        <div className="absolute bottom-full right-0 z-30 mb-2 w-[min(560px,calc(100vw-2rem))] rounded-lg bg-[#f7f4ed] p-3 text-sm text-[#1c1c1c]/70 shadow-[0_16px_48px_rgba(28,28,28,0.14)]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">文本统计 Text Stats</span>
            <span className="rounded bg-black/[0.035] px-2 py-0.5 text-xs">{stats.englishWordCount} words</span>
            <span className="rounded bg-black/[0.035] px-2 py-0.5 text-xs">{stats.sentenceCount} sentences</span>
            <span className="rounded bg-black/[0.035] px-2 py-0.5 text-xs">{stats.paragraphCount} paragraphs</span>
          </div>

          {signals.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {signals.map((signal) => (
                <li key={signal.id} className="rounded-md bg-black/[0.025] px-2 py-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">{TYPE_LABELS[signal.type]}</span>
                    <span className="font-medium text-slate-900">{signal.titleZh}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{signal.messageZh}</p>
                  <p className="mt-1 text-xs">
                    <span className="text-slate-500">片段：</span>
                    <span className="font-medium text-slate-800">{signal.excerpt}</span>
                    {signal.replacement ? (
                      <span className="text-slate-500"> → {signal.replacement}</span>
                    ) : null}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">暂无本地轻量校对提示。不会自动修改文本。</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
