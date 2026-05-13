"use client";

import type { ThemeSettings } from "@/lib/storage";

type ThemePreferenceControlProps = {
  settings: ThemeSettings;
  onChange: (settings: ThemeSettings) => void;
  compact?: boolean;
};

const OPTIONS: Array<{ value: ThemeSettings["preference"]; label: string }> = [
  { value: "system", label: "跟随系统 System" },
  { value: "light", label: "浅色 Light" },
  { value: "dark", label: "深色 Dark" },
];

export function ThemePreferenceControl({ settings, onChange, compact }: ThemePreferenceControlProps) {
  return (
    <label className={compact ? "text-xs font-medium text-slate-600" : "grid gap-1 text-sm font-medium text-slate-700"}>
      <span className={compact ? "sr-only" : "text-xs font-semibold text-slate-500"}>界面主题 Theme</span>
      <select
        aria-label="界面主题"
        value={settings.preference}
        onChange={(event) =>
          onChange({
            preference: event.target.value as ThemeSettings["preference"],
            updatedAt: new Date().toISOString(),
          })
        }
        className={
          compact
            ? "h-9 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-moss"
            : "h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-moss"
        }
      >
        {OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
