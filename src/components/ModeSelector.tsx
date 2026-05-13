"use client";

import type { WritingMode } from "@/lib/llm/types";

const MODES: Array<{ value: WritingMode; label: string }> = [
  { value: "natural", label: "Natural" },
  { value: "ielts", label: "IELTS" },
  { value: "academic", label: "Academic" },
  { value: "business", label: "Business" },
  { value: "concise", label: "Concise" },
];

type ModeSelectorProps = {
  value: WritingMode;
  onChange: (mode: WritingMode) => void;
};

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as WritingMode)}
      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
      aria-label="写作模式"
    >
      {MODES.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </select>
  );
}
