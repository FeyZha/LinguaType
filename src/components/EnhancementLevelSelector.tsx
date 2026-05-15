"use client";

import type { EnhancementLevel } from "@/lib/llm/types";
import { DesignSelect } from "./DesignSelect";

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
    <DesignSelect
      value={value}
      onChange={(event) => onChange(event.target.value as EnhancementLevel)}
      aria-label="增强强度"
      wrapperClassName="w-full"
      compact
    >
      {LEVELS.map((level) => (
        <option key={level.value} value={level.value}>
          {level.label}
        </option>
      ))}
    </DesignSelect>
  );
}
