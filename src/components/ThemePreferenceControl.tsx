"use client";

import { useRef, useState } from "react";
import { ChevronDownIcon, ComputerDesktopIcon, MoonIcon, SunIcon } from "./HeroIcons";
import { useDismissableLayer } from "./useDismissableLayer";
import type { ThemeSettings } from "@/lib/storage";

type ThemePreferenceControlProps = {
  settings: ThemeSettings;
  onChange: (settings: ThemeSettings) => void;
  compact?: boolean;
};

const OPTIONS: Array<{ value: ThemeSettings["preference"]; label: string; icon: typeof SunIcon }> = [
  { value: "light", label: "浅色", icon: SunIcon },
  { value: "dark", label: "深色", icon: MoonIcon },
  { value: "system", label: "跟随系统", icon: ComputerDesktopIcon },
];

export function ThemePreferenceControl({ settings, onChange, compact }: ThemePreferenceControlProps) {
  const [open, setOpen] = useState(false);
  const active = OPTIONS.find((option) => option.value === settings.preference) ?? OPTIONS[2];
  const ActiveIcon = active.icon;
  const layerRef = useRef<HTMLDivElement | null>(null);
  useDismissableLayer(layerRef, () => setOpen(false), open);

  function choose(preference: ThemeSettings["preference"]) {
    onChange({ preference, updatedAt: new Date().toISOString() });
    setOpen(false);
  }

  return (
    <div ref={layerRef} className="relative">
      <button
        type="button"
        aria-label="界面主题"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center justify-center rounded-md bg-[var(--lt-surface-soft)] text-[var(--lt-text)] shadow-[0_1px_8px_var(--lt-shadow)] transition hover:bg-[var(--lt-surface-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--lt-ring)] ${
          compact ? "h-9 px-3 text-sm" : "h-10 px-3.5 text-sm"
        }`}
      >
        <ActiveIcon className="h-4 w-4 text-[var(--lt-muted)]" />
        <ChevronDownIcon className="ml-1 h-3.5 w-3.5 text-[var(--lt-muted)]" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 grid min-w-40 gap-1 rounded-md bg-[var(--lt-menu-bg)] p-2 text-sm text-[var(--lt-text)] shadow-[0_18px_60px_var(--lt-shadow-strong)] ring-1 ring-[var(--lt-border)]"
        >
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={settings.preference === option.value}
              onClick={() => choose(option.value)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                settings.preference === option.value
                  ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                  : "text-[var(--lt-text)] hover:bg-[var(--lt-surface-hover)]"
              }`}
            >
              <option.icon className="h-4 w-4 text-[var(--lt-muted)]" />
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
