"use client";

import type { ReactNode } from "react";
import type { TriggerSettings } from "@/lib/storage";
import { DesignSelect } from "./DesignSelect";

type TriggerSettingsPanelProps = {
  settings: TriggerSettings;
  onChange: (settings: TriggerSettings) => void;
};

export function TriggerSettingsPanel({ settings, onChange }: TriggerSettingsPanelProps) {
  function update(next: Partial<TriggerSettings>) {
    onChange({ ...settings, ...next });
  }

  function updatePopoverBehavior(next: Partial<TriggerSettings["popoverBehavior"]>) {
    onChange({
      ...settings,
      popoverBehavior: { ...settings.popoverBehavior, ...next },
    });
  }

  return (
    <section className="text-[var(--lt-text)]">
      <h2 className="text-base font-semibold">触发与打扰设置</h2>
      <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">控制快捷键、自动提示和低打扰反馈方式。</p>

      <div className="mt-5 space-y-4">
        <SoftSelect label="句子增强触发" htmlFor="sentence-trigger">
          <DesignSelect
            id="sentence-trigger"
            aria-label="句子增强触发"
            value={settings.sentenceEnhancementShortcut}
            onChange={(event) =>
              update({
                sentenceEnhancementShortcut: event.target.value as TriggerSettings["sentenceEnhancementShortcut"],
              })
            }
            wrapperClassName="w-full"
          >
            <option value="ctrl_enter">Ctrl/Cmd + Enter</option>
            <option value="ctrl_j_legacy">Ctrl/Cmd + J legacy 旧快捷键</option>
            <option value="button_only">仅按钮 Button only</option>
            <option value="disable_shortcut">关闭快捷键 Disable shortcut</option>
          </DesignSelect>
        </SoftSelect>

        <SoftSelect label="表达菜单触发" htmlFor="expression-trigger">
          <DesignSelect
            id="expression-trigger"
            aria-label="表达菜单触发"
            value={settings.inlineExpressionMenuTrigger}
            onChange={(event) =>
              update({
                inlineExpressionMenuTrigger: event.target.value as TriggerSettings["inlineExpressionMenuTrigger"],
              })
            }
            wrapperClassName="w-full"
          >
            <option value="ctrl_k">Ctrl/Cmd + K</option>
            <option value="floating_button">浮动按钮 Floating button</option>
            <option value="disabled">关闭 Disabled</option>
          </DesignSelect>
        </SoftSelect>

        <SoftSelect label="段落健康触发" htmlFor="paragraph-health-trigger">
          <DesignSelect
            id="paragraph-health-trigger"
            aria-label="段落健康触发"
            value={settings.paragraphHealthTrigger}
            onChange={(event) =>
              update({
                paragraphHealthTrigger: event.target.value as TriggerSettings["paragraphHealthTrigger"],
              })
            }
            wrapperClassName="w-full"
          >
            <option value="after_every_apply">每次 Apply 后</option>
            <option value="after_3_applied_edits">每 3 次应用后</option>
            <option value="manual_only">仅手动 Manual only</option>
            <option value="off">关闭 Off</option>
          </DesignSelect>
        </SoftSelect>

        <div className="space-y-2 text-sm text-[var(--lt-muted)]">
          <SoftCheckbox
            checked={settings.popoverBehavior.autoCloseAfterApply}
            onChange={(checked) => updatePopoverBehavior({ autoCloseAfterApply: checked })}
          >
            Apply 后自动关闭当前句弹层
          </SoftCheckbox>
          <SoftCheckbox
            checked={settings.popoverBehavior.suppressLargePanelAutoOpen}
            onChange={(checked) => updatePopoverBehavior({ suppressLargePanelAutoOpen: checked })}
          >
            不自动打开大面板
          </SoftCheckbox>
        </div>

        <SoftSelect label="写作习惯反馈 Writing Habits" htmlFor="writing-habits-feedback">
          <DesignSelect
            id="writing-habits-feedback"
            aria-label="写作习惯反馈"
            value={settings.writingHabitsFeedback}
            onChange={(event) =>
              update({
                writingHabitsFeedback: event.target.value as TriggerSettings["writingHabitsFeedback"],
              })
            }
            wrapperClassName="w-full"
          >
            <option value="badge">有新习惯时显示轻量 badge</option>
            <option value="manual_only">仅手动查看 Manual only</option>
          </DesignSelect>
        </SoftSelect>
      </div>
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
