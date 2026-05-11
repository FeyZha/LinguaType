"use client";

import { useEffect, useState } from "react";
import type { ApiConfig } from "@/lib/llm/types";

type ApiSettingsModalProps = {
  open: boolean;
  settings: ApiConfig;
  onClose: () => void;
  onSave: (settings: ApiConfig) => void;
  onClear: () => void;
};

export function ApiSettingsModal({
  open,
  settings,
  onClose,
  onSave,
  onClear,
}: ApiSettingsModalProps) {
  const [draft, setDraft] = useState<ApiConfig>(settings);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(settings);
      setTestMessage("");
    }
  }, [open, settings]);

  if (!open) {
    return null;
  }

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
      setTestMessage(draft.mockMode ? "Mock 模式已可用。" : "连接测试通过。");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4">
      <div className="w-full max-w-2xl rounded-md bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">API 设置</h2>
            <p className="mt-1 text-sm text-slate-600">
              设置只保存在当前浏览器。API Key 会随请求发送到接口，但不会保存在服务器。
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">
            关闭
          </button>
        </div>

        <label className="mt-5 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <span>
            <span className="block text-sm font-semibold text-emerald-950">Mock 模式</span>
            <span className="block text-xs text-emerald-800">
              使用本地固定演示结果，无需填写真实 API 设置。
            </span>
          </span>
          <input
            type="checkbox"
            checked={draft.mockMode}
            onChange={(event) => update("mockMode", event.target.checked)}
            className="h-5 w-5 accent-moss"
          />
        </label>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            API Base URL
            <input
              value={draft.baseUrl}
              disabled={draft.mockMode}
              onChange={(event) => update("baseUrl", event.target.value)}
              placeholder="https://api.example.com"
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-moss disabled:bg-slate-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            API Key
            <input
              value={draft.apiKey}
              disabled={draft.mockMode}
              onChange={(event) => update("apiKey", event.target.value)}
              type="password"
              placeholder="仅保存在浏览器 localStorage"
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-moss disabled:bg-slate-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-700">
            模型名称
            <input
              value={draft.model}
              disabled={draft.mockMode}
              onChange={(event) => update("model", event.target.value)}
              placeholder="gpt-4o-mini 或兼容模型"
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-moss disabled:bg-slate-100"
            />
          </label>
        </div>

        <details className="mt-4 rounded-md border border-slate-200 p-3">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">高级设置</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Endpoint Path
              <input
                value={draft.endpointPath}
                disabled={draft.mockMode}
                onChange={(event) => update("endpointPath", event.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-moss disabled:bg-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              温度
              <input
                value={draft.temperature}
                disabled={draft.mockMode}
                type="number"
                min={0}
                max={2}
                step={0.1}
                onChange={(event) => update("temperature", Number(event.target.value))}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-moss disabled:bg-slate-100"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              最大 Tokens
              <input
                value={draft.maxTokens}
                disabled={draft.mockMode}
                type="number"
                min={1}
                onChange={(event) => update("maxTokens", Number(event.target.value))}
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-moss disabled:bg-slate-100"
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={draft.supportsJsonMode}
                disabled={draft.mockMode}
                onChange={(event) => update("supportsJsonMode", event.target.checked)}
                className="h-4 w-4 accent-moss"
              />
              Provider 支持 JSON mode
            </label>
          </div>
        </details>

        {testMessage ? (
          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">{testMessage}</div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-between gap-3">
          <button
            type="button"
            onClick={onClear}
            className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            清空设置
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={testConnection}
              disabled={testing}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {testing ? "测试中..." : "测试连接"}
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                onClose();
              }}
              className="rounded-md bg-moss px-4 py-2 text-sm font-semibold text-white hover:bg-moss/90"
            >
              保存设置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
