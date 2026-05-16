import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiSettingsPanel } from "./ApiSettingsModal";
import { defaultApiSettings } from "@/lib/storage";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

describe("ApiSettingsPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a consistent save feedback message after 保存设置", () => {
    const settings = { ...defaultApiSettings(), apiKey: "demo-key" };
    const onSave = vi.fn();
    const onClear = vi.fn();

    render(<ApiSettingsPanel settings={settings} onSave={onSave} onClear={onClear} />);

    fireEvent.change(screen.getByLabelText("API Base URL"), { target: { value: "https://api.example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "保存设置" }));

    expect(screen.getByRole("status")).toHaveTextContent("API 设置已保存。");
    expect(onSave).toHaveBeenCalledWith({ ...settings, baseUrl: "https://api.example.com", mockMode: false });
  });

  it("shows clear settings feedback", () => {
    const settings = { ...defaultApiSettings(), apiKey: "demo-key" };
    const onSave = vi.fn();
    const onClear = vi.fn();

    render(<ApiSettingsPanel settings={settings} onSave={onSave} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "清空设置" }));

    expect(screen.getByRole("status")).toHaveTextContent("API 设置已重置。");
    expect(onClear).toHaveBeenCalled();
  });

  it("shows testing success and failure feedback with stable key redaction", async () => {
    const settings = { ...defaultApiSettings(), apiKey: "sk-secret-123456" };
    const onSave = vi.fn();
    const onClear = vi.fn();
    const fetchMock = vi.fn((url: string) => {
      if (url !== "/api/test-connection") {
        return Promise.resolve(response({}));
      }
      return Promise.resolve(response({ ok: false, error: `provider rejected ${settings.apiKey}` }, 400));
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ApiSettingsPanel settings={settings} onSave={onSave} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));
    expect(screen.getByRole("status")).toHaveTextContent("正在测试连接...");

    expect(await screen.findByRole("status")).toHaveTextContent("provider rejected [REDACTED_API_KEY]");
    expect(screen.queryByText(settings.apiKey)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveClass("bg-red-500/[0.10]");
  });

  it("shows test success feedback on ok response", async () => {
    const settings = defaultApiSettings();
    const onSave = vi.fn();
    const onClear = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ ok: true })));

    render(<ApiSettingsPanel settings={settings} onSave={onSave} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));

    expect(await screen.findByRole("status")).toHaveTextContent("连接测试通过。");
    expect(screen.getByRole("status")).toHaveClass("bg-emerald-500/[0.10]");
  });
});
