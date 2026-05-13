"use client";

import type { TriggerSettings } from "@/lib/storage";

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
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">触发与打扰设置 </h2>
      <p className="mt-1 text-xs text-slate-500">控制快捷键、自动提示和低打扰反馈方式。</p>
      <div className="mt-4 space-y-3">
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold text-slate-500">句子增强触发</span>
          <select
            aria-label="句子增强触发"
            value={settings.sentenceEnhancementShortcut}
            onChange={(event) =>
              update({
                sentenceEnhancementShortcut: event.target.value as TriggerSettings["sentenceEnhancementShortcut"],
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          >
            <option value="ctrl_enter">Ctrl/Cmd + Enter</option>
            <option value="ctrl_j_legacy">Ctrl/Cmd + J legacy 旧快捷键</option>
            <option value="button_only">仅按钮 Button only</option>
            <option value="disable_shortcut">关闭快捷键 Disable shortcut</option>
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold text-slate-500">表达菜单触发</span>
          <select
            aria-label="表达菜单触发"
            value={settings.inlineExpressionMenuTrigger}
            onChange={(event) =>
              update({
                inlineExpressionMenuTrigger: event.target.value as TriggerSettings["inlineExpressionMenuTrigger"],
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          >
            <option value="ctrl_k">Ctrl/Cmd + K</option>
            <option value="floating_button">浮动按钮 Floating button</option>
            <option value="disabled">关闭 Disabled</option>
          </select>
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold text-slate-500">段落健康触发</span>
          <select
            aria-label="段落健康触发"
            value={settings.paragraphHealthTrigger}
            onChange={(event) =>
              update({
                paragraphHealthTrigger: event.target.value as TriggerSettings["paragraphHealthTrigger"],
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          >
            <option value="after_every_apply">每次 Apply 后</option>
            <option value="after_3_applied_edits">每 3 次应用后</option>
            <option value="manual_only">仅手动 Manual only</option>
            <option value="off">关闭 Off</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={settings.popoverBehavior.autoCloseAfterApply}
            onChange={(event) => updatePopoverBehavior({ autoCloseAfterApply: event.target.checked })}
          />
          Apply 后自动关闭当前句弹层
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={settings.popoverBehavior.escapeCloses}
            onChange={(event) => updatePopoverBehavior({ escapeCloses: event.target.checked })}
          />
          按 Escape 关闭弹层
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={settings.popoverBehavior.suppressLargePanelAutoOpen}
            onChange={(event) => updatePopoverBehavior({ suppressLargePanelAutoOpen: event.target.checked })}
          />
          不自动打开大面板
        </label>
        <label className="block text-sm text-slate-700">
          <span className="mb-1 block text-xs font-semibold text-slate-500">写作习惯反馈 Writing Habits</span>
          <select
            aria-label="写作习惯反馈"
            value={settings.writingHabitsFeedback}
            onChange={(event) =>
              update({
                writingHabitsFeedback: event.target.value as TriggerSettings["writingHabitsFeedback"],
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          >
            <option value="badge">有新习惯时显示轻量 badge</option>
            <option value="manual_only">仅手动查看 Manual only</option>
          </select>
        </label>
      </div>
    </section>
  );
}
