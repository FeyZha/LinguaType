"use client";

import type { EnhancementLevel } from "@/lib/llm/types";

const LEVELS: Array<{ value: EnhancementLevel; label: string }> = [
  { value: "minimal", label: "Minimal" },
  { value: "balanced", label: "Balanced" },
  { value: "polished", label: "Polished" },
];

type EnhancementLevelSelectorProps = {
  value: EnhancementLevel;
  onChange: (level: EnhancementLevel) => void;
};

export function EnhancementLevelSelector({ value, onChange }: EnhancementLevelSelectorProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as EnhancementLevel)}
      className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
      aria-label="Enhancement level"
    >
      {LEVELS.map((level) => (
        <option key={level.value} value={level.value}>
          {level.label}
        </option>
      ))}
    </select>
  );
}
