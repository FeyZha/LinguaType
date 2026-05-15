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
        aria-label="关闭 API Settings 设置"
        className="absolute right-6 top-6 rounded-md bg-white/70 px-3 py-2 text-sm text-[#1c1c1c]/60 shadow-sm transition hover:bg-white"
      >
        关闭
      </button>
    </div>
  );
}

export function ApiSettingsPanel({ settings, onSave, onClear, className = "" }: ApiSettingsPanelProps) {
  const [draft, setDraft] = useState<ApiConfig>(() => ({ ...settings, mockMode: false }));
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    setDraft({ ...settings, mockMode: false });
    setTestMessage("");
  }, [settings]);

  async function testConnection() {
    setTesting(true);
    setTestMessage("");
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
      setTestMessage("连接测试通过。");
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : "连接测试失败。");
    } finally {
      setTesting(false);
    }
  }

  function update<K extends keyof ApiConfig>(key: K, value: ApiConfig[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className={`rounded-md bg-[var(--lt-surface)] p-5 text-[var(--lt-text)] ring-1 ring-[var(--lt-border)] ${className}`}>
      <div>
        <h2 className="text-lg font-semibold">API Settings 设置</h2>
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

      {testMessage ? (
        <div className="mt-3 rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-muted)]">
          {testMessage}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            onClear();
            setTestMessage("API 设置已重置。");
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
            onClick={() => onSave({ ...draft, mockMode: false })}
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
