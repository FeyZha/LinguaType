"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { TriggerSettings } from "@/lib/storage";
import { DesignSelect } from "./DesignSelect";

type TriggerSettingsPanelProps = {
  settings: TriggerSettings;
  onChange: (settings: TriggerSettings) => void;
};

const FEEDBACK_DURATION_MS = 1400;

export function TriggerSettingsPanel({ settings, onChange }: TriggerSettingsPanelProps) {
  const [message, setMessage] = useState("");
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  function showMessage(nextMessage: string) {
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    setMessage(nextMessage);
    messageTimerRef.current = setTimeout(() => {
      setMessage("");
      messageTimerRef.current = null;
    }, FEEDBACK_DURATION_MS);
  }

  function update(next: Partial<TriggerSettings>, label: string) {
    onChange({ ...settings, ...next });
    showMessage(`设置已更新：${label}`);
  }

  function updatePopoverBehavior(next: Partial<TriggerSettings["popoverBehavior"]>, label: string) {
    onChange({
      ...settings,
      popoverBehavior: { ...settings.popoverBehavior, ...next },
    });
    showMessage(`设置已更新：${label}`);
  }

  return (
    <section className="text-[var(--lt-text)]">
      <h2 className="text-base font-semibold">触发设置</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">
        触发设置仅控制提示时机，不会发起额外模型调用，保存后立即生效。
      </p>

      <div className="mt-5 space-y-4">
        <SoftSelect label="句子增强触发模式" htmlFor="sentence-trigger">
          <DesignSelect
            id="sentence-trigger"
            aria-label="句子增强触发模式"
            value={settings.sentenceEnhancementShortcut}
            onChange={(event) =>
              update(
                {
                  sentenceEnhancementShortcut: event.target.value as TriggerSettings["sentenceEnhancementShortcut"],
                },
                "句子增强触发模式",
              )
            }
            wrapperClassName="w-full"
          >
            <option value="ctrl_enter">Ctrl/Cmd + Enter</option>
            <option value="button_only">按钮触发</option>
          </DesignSelect>
        </SoftSelect>

        <SoftSelect label="段落健康触发模式" htmlFor="paragraph-health-trigger">
          <DesignSelect
            id="paragraph-health-trigger"
            aria-label="段落健康触发模式"
            value={settings.paragraphHealthTrigger}
            onChange={(event) =>
              update(
                {
                  paragraphHealthTrigger: event.target.value as TriggerSettings["paragraphHealthTrigger"],
                },
                "段落健康触发模式",
              )
            }
            wrapperClassName="w-full"
          >
            <option value="after_every_apply">每次应用后</option>
            <option value="after_paragraph_complete">段落完成后</option>
          </DesignSelect>
        </SoftSelect>

        <SoftSelect label="文章地图自动检查" htmlFor="document-map-auto-check">
          <DesignSelect
            id="document-map-auto-check"
            aria-label="文章地图自动检查模式"
            value={settings.documentMapAutoCheck}
            onChange={(event) =>
              update(
                {
                  documentMapAutoCheck: event.target.value as TriggerSettings["documentMapAutoCheck"],
                },
                "文章地图自动检查",
              )
            }
            wrapperClassName="w-full"
          >
            <option value="off">关闭</option>
            <option value="remind_only">仅提醒</option>
            <option value="auto_idle">安静时预检查</option>
            <option value="manual_first">手动优先</option>
          </DesignSelect>
        </SoftSelect>

        <div className="space-y-2 text-sm text-[var(--lt-muted)]">
          <SoftCheckbox
            checked={settings.popoverBehavior.autoCloseAfterApply}
            onChange={(checked) => updatePopoverBehavior({ autoCloseAfterApply: checked }, "应用后自动关闭")}
          >
            应用后自动关闭弹窗
          </SoftCheckbox>
        </div>
      </div>

      {message ? (
        <p role="status" className="mt-4 rounded-md bg-emerald-500/[0.08] px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function SoftSelect({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-xs font-medium text-[var(--lt-muted)]">{label}</span>
      {children}
    </label>
  );
}

function SoftCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md px-0.5 py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 accent-[var(--lt-text)]"
      />
      {children}
    </label>
  );
}
