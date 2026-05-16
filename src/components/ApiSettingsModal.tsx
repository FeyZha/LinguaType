"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { ApiConfig } from "@/lib/llm/types";

type ApiSettingsModalProps = {
  open: boolean;
  settings: ApiConfig;
  onClose: () => void;
  onSave: (settings: ApiConfig) => void;
  onClear: () => void;
};

type ApiSettingsPanelProps = {
  settings: ApiConfig;
  onSave: (settings: ApiConfig) => void;
  onClear: () => void;
  className?: string;
};

export function ApiSettingsModal({
  open,
  settings,
  onClose,
  onSave,
  onClear,
}: ApiSettingsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c1c1c]/25 p-4 backdrop-blur-sm">
      <ApiSettingsPanel
        settings={settings}
        onClear={onClear}
        onSave={(nextSettings) => {
          onSave(nextSettings);
          onClose();
        }}
        className="w-full max-w-2xl shadow-[0_24px_80px_rgba(28,28,28,0.16)]"
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭 API 设置"
        className="absolute right-6 top-6 rounded-md bg-white/70 px-3 py-2 text-sm text-[#1c1c1c]/60 shadow-sm transition hover:bg-white"
      >
        关闭
      </button>
    </div>
  );
}

export function ApiSettingsPanel({ settings, onSave, onClear, className = "" }: ApiSettingsPanelProps) {
  const [draft, setDraft] = useState<ApiConfig>(() => ({ ...settings, mockMode: false }));
  const [feedbackType, setFeedbackType] = useState<"idle" | "success" | "error" | "info">("idle");
  const [feedbackText, setFeedbackText] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setDraft({ ...settings, mockMode: false });
    setFeedbackType("idle");
    setFeedbackText("");
  }, [settings]);

  const feedbackBaseClass = "mt-3 rounded-md px-3 py-2 text-sm";
  const feedbackClassByType: Record<typeof feedbackType, string> = {
    idle: "hidden",
    success: "bg-emerald-500/[0.10] text-emerald-900",
    error: "bg-red-500/[0.10] text-red-900 dark:text-red-200",
    info: "bg-[var(--lt-surface-soft)] text-[var(--lt-muted)]",
  };

  function setFeedback(type: typeof feedbackType, text: string) {
    setFeedbackType(type);
    setFeedbackText(text);
  }

  function sanitizeMessage(message: string): string {
    if (!draft.apiKey) {
      return message;
    }
    return message.split(draft.apiKey).join("[REDACTED_API_KEY]");
  }

  async function testConnection() {
    setTesting(true);
    setFeedback("info", "正在测试连接...");
    try {
      const response = await fetch("/api/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiConfig: draft }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "连接测试失败。");
      }
      setFeedback("success", "连接测试通过。");
    } catch (error) {
      const message = sanitizeMessage(error instanceof Error ? error.message : "连接测试失败。");
      setFeedback("error", message);
    } finally {
      setTesting(false);
    }
  }

  function update<K extends keyof ApiConfig>(key: K, value: ApiConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFeedbackType("idle");
    setFeedbackText("");
  }

  return (
    <section className={`rounded-md bg-[var(--lt-surface)] p-5 text-[var(--lt-text)] ring-1 ring-[var(--lt-border)] ${className}`}>
      <div>
        <h2 className="text-lg font-semibold">API 设置</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">
          设置只保存在当前浏览器。API Key 会随请求发送到本地 API route，但不会保存到服务器。
        </p>
      </div>

      <div className="mt-4 grid gap-3">
        <SoftInputLabel label="API Base URL">
          <input
            value={draft.baseUrl}
            onChange={(event) => update("baseUrl", event.target.value)}
            placeholder="https://api.example.com"
            className={inputClassName}
          />
        </SoftInputLabel>
        <SoftInputLabel label="API Key">
          <input
            value={draft.apiKey}
            onChange={(event) => update("apiKey", event.target.value)}
            type="password"
            placeholder="仅保存在浏览器 localStorage"
            className={inputClassName}
          />
        </SoftInputLabel>
        <SoftInputLabel label="模型名称 Model">
          <input
            value={draft.model}
            onChange={(event) => update("model", event.target.value)}
            placeholder="gpt-4o-mini 或兼容模型"
            className={inputClassName}
          />
        </SoftInputLabel>
      </div>

      <details className="mt-4 rounded-md bg-[var(--lt-surface-soft)] px-3 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-[var(--lt-muted)]">高级设置</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <SoftInputLabel label="Endpoint Path">
            <input
              value={draft.endpointPath}
              onChange={(event) => update("endpointPath", event.target.value)}
              className={inputClassName}
            />
          </SoftInputLabel>
          <SoftInputLabel label="温度 Temperature">
            <input
              value={draft.temperature}
              type="number"
              min={0}
              max={2}
              step={0.1}
              onChange={(event) => update("temperature", Number(event.target.value))}
              className={inputClassName}
            />
          </SoftInputLabel>
          <SoftInputLabel label="最大 Tokens">
            <input
              value={draft.maxTokens}
              type="number"
              min={1}
              onChange={(event) => update("maxTokens", Number(event.target.value))}
              className={inputClassName}
            />
          </SoftInputLabel>
          <label className="flex items-center gap-2 text-sm font-medium text-[var(--lt-muted)]">
            <input
              type="checkbox"
              checked={draft.supportsJsonMode}
              onChange={(event) => update("supportsJsonMode", event.target.checked)}
              className="h-4 w-4 accent-[var(--lt-text)] disabled:opacity-40"
            />
            Provider 支持 JSON mode
          </label>
        </div>
      </details>

      {feedbackType !== "idle" ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`${feedbackBaseClass} ${feedbackClassByType[feedbackType]}`}
        >
          {feedbackText}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            onClear();
            setFeedback("success", "API 设置已重置。");
          }}
          className="rounded-md px-3 py-2 text-sm text-red-700/80 transition hover:bg-red-500/[0.08] hover:text-red-800 dark:text-red-300"
        >
          清空设置
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={testConnection}
            disabled={testing}
            className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)] disabled:opacity-50"
          >
            {testing ? "测试中..." : "测试连接"}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave({ ...draft, mockMode: false });
              setFeedback("success", "API 设置已保存。");
            }}
            className="rounded-md bg-[var(--lt-text)] px-4 py-2 text-sm font-medium text-[var(--lt-bg)] transition opacity-95 hover:opacity-85"
          >
            保存设置
          </button>
        </div>
      </div>
    </section>
  );
}

const inputClassName =
  "rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-[var(--lt-text)] outline-none transition placeholder:text-[var(--lt-muted)] focus:bg-[var(--lt-surface)] focus:ring-1 focus:ring-[var(--lt-ring)] disabled:opacity-45";

function SoftInputLabel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium text-[var(--lt-muted)]">
      {label}
      {children}
    </label>
  );
}
