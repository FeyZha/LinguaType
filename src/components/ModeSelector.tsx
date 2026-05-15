"use client";

import type { WritingMode } from "@/lib/llm/types";
import { DesignSelect } from "./DesignSelect";

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
    <DesignSelect
      value={value}
      onChange={(event) => onChange(event.target.value as WritingMode)}
      aria-label="写作模式"
      wrapperClassName="w-full"
      compact
    >
      {MODES.map((mode) => (
        <option key={mode.value} value={mode.value}>
          {mode.label}
        </option>
      ))}
    </DesignSelect>
  );
}
