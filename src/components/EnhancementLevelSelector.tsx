"use client";

import type { EnhancementLevel } from "@/lib/llm/types";

const LEVELS: Array<{ value: EnhancementLevel; label: string }> = [
  { value: "minimal", label: "minimal" },
  { value: "balanced", label: "balanced" },
  { value: "polished", label: "polished" },
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
      aria-label="增强强度"
    >
      {LEVELS.map((level) => (
        <option key={level.value} value={level.value}>
          {level.label}
        </option>
      ))}
    </select>
  );
}
