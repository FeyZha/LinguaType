"use client";

import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon } from "./HeroIcons";

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type DesignSelectProps = {
  value: string | number;
  onChange: (event: { target: { value: string } }) => void;
  children: ReactNode;
  "aria-label": string;
  id?: string;
  wrapperClassName?: string;
  compact?: boolean;
  className?: string;
  disabled?: boolean;
};

export function DesignSelect({
  value,
  onChange,
  id,
  "aria-label": ariaLabel,
  wrapperClassName = "",
  compact = false,
  className = "",
  disabled = false,
  children,
}: DesignSelectProps) {
  const reactId = useId();
  const listboxId = `design-select-${reactId}`;
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const listboxRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [menuRect, setMenuRect] = useState({ left: 0, top: 0, width: 160 });
  const sizeClass = compact ? "h-9 pl-3 pr-8 text-xs" : "h-10 pl-3.5 pr-9 text-sm";
  const options = useMemo(() => extractOptions(children), [children]);
  const selectedValue = String(value);
  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function updateMenuRect() {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      setMenuRect({
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 160),
      });
    }

    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listboxRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    updateMenuRect();
    document.addEventListener("mousedown", closeOnOutside);
    window.addEventListener("resize", updateMenuRect);
    window.addEventListener("scroll", updateMenuRect, true);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      window.removeEventListener("resize", updateMenuRect);
      window.removeEventListener("scroll", updateMenuRect, true);
    };
  }, [open]);

  function openMenu() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuRect({
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, 160),
      });
    }
    setOpen(true);
  }

  function selectOption(option: SelectOption) {
    if (option.disabled) {
      return;
    }
    onChange({ target: { value: option.value } });
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu();
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <span ref={rootRef} className={`relative inline-flex min-w-0 ${wrapperClassName}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleKeyDown}
        className={`peer w-full rounded-md border border-[var(--lt-border)] bg-[var(--lt-surface)] ${sizeClass} text-left text-[var(--lt-text)] outline-none transition hover:bg-[var(--lt-surface-soft)] focus:border-[var(--lt-accent)] focus:ring-4 focus:ring-[var(--lt-ring)] disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      >
        <span className="block truncate">{selectedOption?.label ?? ""}</span>
      </button>
      <ChevronDownIcon
        className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 ${
          compact ? "h-3.5 w-3.5" : "h-4 w-4"
        } text-[var(--lt-muted)] transition ${open ? "rotate-180 text-[var(--lt-accent)]" : "peer-focus:text-[var(--lt-accent)]"}`}
      />
      {open && isClient
        ? createPortal(
        <div
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            left: menuRect.left,
            top: menuRect.top,
            width: menuRect.width,
          }}
          className="lt-scrollbar-hidden fixed z-[100] grid max-h-72 min-w-[10rem] overflow-y-auto rounded-md border border-[var(--lt-border)] bg-[var(--lt-menu-bg)] p-1 text-sm shadow-[0_12px_32px_var(--lt-shadow-strong)] backdrop-blur"
        >
          {options.map((option) => {
            const selected = option.value === selectedValue;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onClick={() => selectOption(option)}
                className={`rounded-sm px-3 py-2 text-left transition ${
                  selected
                    ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                    : "text-[var(--lt-text)] hover:bg-[var(--lt-surface-hover)]"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                {option.label}
              </button>
            );
          })}
        </div>,
          document.body,
        )
        : null}
    </span>
  );
}

function extractOptions(children: ReactNode): SelectOption[] {
  const result: SelectOption[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }
    const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    if (props.value === undefined) {
      return;
    }
    result.push({
      value: String(props.value),
      label: optionLabel(props.children),
      disabled: props.disabled,
    });
  });

  return result;
}

function optionLabel(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(optionLabel).join("");
  }
  return "";
}
