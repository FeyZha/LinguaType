import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_WRITING_TEXT } from "@/lib/demoArchive";
import {
  DOCUMENT_MAP_CACHE_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  PARAGRAPH_HEALTH_CACHE_STORAGE_KEY,
  PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY,
} from "@/lib/storage";
import { LinguaTypeApp } from "./LinguaTypeApp";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function fetchUrls(fetchMock: ReturnType<typeof vi.fn>) {
  return fetchMock.mock.calls.map((call) => call[0]);
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("LinguaType demo archive experience", () => {
  it("preloads the built-in demo caches before the user opens model-backed features", async () => {
    const fetchMock = vi.fn(async () => response({}));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    expect(editor).toHaveValue(DEMO_WRITING_TEXT);
    expect(localStorage.getItem(PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY)).toContain(
      "put it into practice in their daily actions",
    );
    expect(localStorage.getItem(DOCUMENT_MAP_CACHE_STORAGE_KEY)).toContain("文章主张");
    expect(localStorage.getItem(PARAGRAPH_HEALTH_CACHE_STORAGE_KEY)).toContain("这一段的例子清楚");
    expect(screen.getByRole("button", { name: "文章地图 · 1 个发现" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens demo suggestions, article map, paragraph advice, and paragraph checks without API calls", async () => {
    const fetchMock = vi.fn(async () => response({}));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    const suggestionButton = (await screen.findAllByRole("button", { name: "查看当前 AI 建议" }))[0];
    fireEvent.click(suggestionButton);
    expect((await screen.findAllByText(/put it into practice in their daily actions/u)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "文章地图 · 1 个发现" }));
    expect(
      await screen.findByText(/独立学习不是单靠意志力，而是靠可重复的小习惯/u),
    ).toBeInTheDocument();

    const thirdParagraph = screen.getByRole("group", { name: "第 3 段 工具连接" });
    fireEvent.click(within(thirdParagraph).getByRole("button", { name: "展开第 3 段" }));
    fireEvent.click(within(thirdParagraph).getByRole("button", { name: "查看建议" }));
    expect(
      await within(thirdParagraph).findByText("这一段的例子清楚，但需要再说明技术辅助如何服务于独立学习习惯。"),
    ).toBeInTheDocument();

    fireEvent.click(within(thirdParagraph).getByRole("button", { name: "检查本段" }));
    const paragraphCheckView = await screen.findByLabelText("文章地图二级检查");
    expect(within(paragraphCheckView).getByText("这一段最值得检查：它展示产品能力，但需要把技术辅助和独立学习习惯连接得更紧。")).toBeInTheDocument();

    expect(fetchUrls(fetchMock)).not.toContain("/api/enhance-fast");
    expect(fetchUrls(fetchMock)).not.toContain("/api/check-document-map");
    expect(fetchUrls(fetchMock)).not.toContain("/api/check-paragraph-health");
    expect(fetchUrls(fetchMock)).not.toContain("/api/check-paragraph-flow");
  });

  it("applies a demo sentence suggestion and saves learning data without extraction or health API calls", async () => {
    const fetchMock = vi.fn(async () => response({}));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    const suggestionButton = (await screen.findAllByRole("button", { name: "查看当前 AI 建议" }))[0];
    fireEvent.click(suggestionButton);
    fireEvent.click(await screen.findByRole("button", { name: "应用修改" }));

    await waitFor(() =>
      expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toContain("put it into practice"),
    );
    expect(fetchUrls(fetchMock)).not.toContain("/api/extract-learning");
    expect(fetchUrls(fetchMock)).not.toContain("/api/check-paragraph-health");
  });

  it("explains selected text in the demo archive without requiring API settings", async () => {
    const fetchMock = vi.fn(async () => response({}));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);

    const editor = (await screen.findByLabelText("写作编辑器")) as HTMLTextAreaElement;
    const selectedText = "independent learning";
    const start = editor.value.indexOf(selectedText);
    editor.setSelectionRange(start, start + selectedText.length);
    fireEvent.mouseUp(editor);

    fireEvent.click(screen.getByRole("button", { name: "解释选中内容" }));

    expect(await screen.findByText("自主学习，强调学习者主动安排、复盘和调整学习过程。")).toBeInTheDocument();
    await waitFor(() => expect(fetchUrls(fetchMock)).not.toContain("/api/explain-selection"));
  });
});
