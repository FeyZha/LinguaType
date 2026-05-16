"use client";

import type { ProofreadingResult } from "@/lib/proofreading";

type ProofreadingSignalsPanelProps = {
  result: ProofreadingResult;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  triggerLabel?: string;
};

export function ProofreadingSignalsPanel({
  result,
  triggerAriaLabel,
  triggerClassName,
  triggerLabel,
}: ProofreadingSignalsPanelProps) {
  const count = result.signals.length;

  return (
    <span
      aria-label={triggerAriaLabel}
      className={
        triggerClassName ??
        `rounded-md px-3 py-2 text-xs font-medium transition ${
          count > 0
            ? "bg-amber-500/[0.1] text-amber-900 hover:bg-amber-500/[0.16]"
            : "bg-emerald-500/[0.1] text-emerald-900 hover:bg-emerald-500/[0.16]"
        }`
      }
    >
      {triggerLabel ?? `文本校对：${count} 条提示`}
    </span>
  );
}
