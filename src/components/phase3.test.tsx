import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  CORRECTION_MEMORY_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  defaultApiSettings,
} from "@/lib/storage";
import type {
  FastEnhanceResult,
  LearningExtractionResult,
  ParagraphHealthResult,
} from "@/lib/llm/types";

const fastResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.",
  finalSentence: "Many students believe that AI tools can improve learning efficiency.",
  explanationZh: "已快速润色当前句。",
  hasChinese: true,
};

const englishFastResult: FastEnhanceResult = {
  taskType: "english_polish",
  originalSentence: "Many student believe that AI tools are useful.",
  finalSentence: "Many students believe that AI tools are useful.",
  explanationZh: "已轻量润色当前句。",
  hasChinese: false,
};

const extractionResult: LearningExtractionResult = {
  learningItems: [
    {
      type: "phrase",
      content: "improve learning efficiency",
      chineseMeaning: "提高学习效率",
      usageNote: "用于说明学习效率提升。",
    },
  ],
  correctionEvents: [
    {
      before: "Many student",
      after: "Many students",
      type: "other",
      reason: "Many 后面使用复数名词。",
    },
    {
      before: "提高学习效率",
      after: "improve learning efficiency",
      type: "chinese_transfer",
      reason: "中文表达转换为自然英文。",
    },
  ],
};

const paragraphHealthResult: ParagraphHealthResult = {
  paragraphFingerprint: "paragraph-1",
  hasIssues: true,
  issueCount: 1,
  issueTypes: ["repetition"],
  shortSummaryZh: "当前段落可能有重复表达。",
};

const paragraphResult = {
  originalParagraph:
    "AI tools are useful for students because they make daily practice easier. For example, for example, they save time when students review vocabulary and organize short writing tasks.",
  revisedParagraph:
    "AI tools are useful for students because they make daily practice easier. For example, they save time when students review vocabulary and organize short writing tasks.",
  hasIssues: true,
  issues: [
    {
      type: "repetition",
      original: "For example, for example",
      suggestion: "For example",
      reason: "重复使用同一个连接表达。",
    },
  ],
  summary: "段落整体清楚，但有重复表达。",
};

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function setEditorText(editor: HTMLElement, value: string) {
  fireEvent.change(editor, {
    target: { value, selectionStart: value.length, selectionEnd: value.length },
  });
}

function setEditorSelection(editor: HTMLElement, start: number, end = start) {
  (editor as HTMLTextAreaElement).setSelectionRange(start, end);
}

function expectEditorText(editor: HTMLElement, value: string) {
  expect(editor).toHaveValue(value);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    WRITING_SETUP_STORAGE_KEY,
    JSON.stringify({
      topicArea: "technology",
      essayTopic: "AI tools and learning",
      outline: "1. Benefits\n2. Limits",
      updatedAt: "2026-05-14T00:00:00.000Z",
    }),
  );
  localStorage.setItem(
    API_SETTINGS_STORAGE_KEY,
    JSON.stringify({
      ...defaultApiSettings(),
      baseUrl: "https://api.example.test",
      apiKey: "test-key",
      model: "test-model",
    }),
  );
  let id = 0;
  vi.stubGlobal("crypto", { randomUUID: () => `id-${++id}` });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("LinguaType v0.2.1 fast enhancement flow", () => {
  it("uses Fast Enhancement for Ctrl/Cmd + Enter and does not save learning data before Apply", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(fastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(screen.getByRole("button", { name: "强度：平衡" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "轻度" }));
    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.");
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(await screen.findByLabelText("当前句行内建议")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/enhance-fast");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { enhancementLevel: string };
    expect(body.enhancementLevel).toBe("minimal");
    expect(screen.getByLabelText("当前句行内建议")).toHaveTextContent(fastResult.finalSentence);
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY)).toBeNull();
  });

  it("applies immediately, then extracts learning data in the background", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/enhance-fast") return Promise.resolve(response(fastResult));
      if (url === "/api/extract-learning") return Promise.resolve(response(extractionResult));
      return Promise.resolve(response({ ...paragraphHealthResult, hasIssues: false, issueCount: 0, issueTypes: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.");
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    await screen.findByRole("button", { name: "应用修改" });
    fireEvent.click(screen.getByRole("button", { name: "应用修改" }));

    expectEditorText(editor, fastResult.finalSentence);
    await waitFor(() => {
      expect(fetchMock.mock.calls.map((call) => call[0])).toContain("/api/extract-learning");
      expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]").length).toBeGreaterThanOrEqual(1);
      expect(JSON.parse(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY) ?? "[]")).toHaveLength(2);
    });
  });

  it("does not roll back applied text when background extraction fails", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/enhance-fast") return Promise.resolve(response(fastResult));
      if (url === "/api/extract-learning") return Promise.resolve(response({ error: "extract failed" }, 500));
      return Promise.resolve(response({ ...paragraphHealthResult, hasIssues: false, issueCount: 0, issueTypes: [] }));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.");
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    await screen.findByRole("button", { name: "应用修改" });
    fireEvent.click(screen.getByRole("button", { name: "应用修改" }));

    expectEditorText(editor, fastResult.finalSentence);
    await waitFor(() => expect(fetchMock.mock.calls.map((call) => call[0])).toContain("/api/extract-learning"));
    expect(screen.queryByText("学习提取失败，但已应用的文本会保留。")).not.toBeInTheDocument();
  });

  it("regenerate and copy use fast results without saving learning data", async () => {
    const regenerated = { ...englishFastResult, finalSentence: "Many learners believe that AI tools are useful." };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(englishFastResult))
      .mockResolvedValueOnce(response(regenerated));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, englishFastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    await screen.findByRole("button", { name: "应用修改" });
    fireEvent.click(screen.getByRole("button", { name: "换一种表达" }));
    await waitFor(() => {
      expect(screen.getByLabelText("当前句行内建议")).toHaveTextContent(regenerated.finalSentence);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制修改后的句子" }));
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(regenerated.finalSentence);
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/enhance-fast", "/api/enhance-fast"]);
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY)).toBeNull();
  });
});

describe("LinguaType v0.2.1", () => {
  it("runs health check after Apply only when paragraph is long enough without showing the old floating notice", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/enhance-fast") return Promise.resolve(response(fastResult));
      if (url === "/api/extract-learning") return Promise.resolve(response(extractionResult));
      if (url === "/api/check-paragraph-health") return Promise.resolve(response(paragraphHealthResult));
      if (url === "/api/check-paragraph-flow") return Promise.resolve(response(paragraphResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const paragraph =
      "AI tools are useful for students because they make daily practice easier and support regular independent language practice. For example, for example, they save time when students review vocabulary and organize short writing tasks before class. Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.";
    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, paragraph);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    await screen.findByRole("button", { name: "应用修改" });
    fireEvent.click(screen.getByRole("button", { name: "应用修改" }));

    await waitFor(() =>
      expect(fetchMock.mock.calls.map((call) => call[0]).filter((url) => url === "/api/check-paragraph-health")).toHaveLength(1),
    );
    expect(screen.queryByText("段落健康：可能有 1 个问题")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => call[0])).not.toContain("/api/check-paragraph-flow");
  });

  it("does not run for short paragraphs, cancel, or copy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(englishFastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, englishFastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    await screen.findByRole("button", { name: "应用修改" });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "复制修改后的句子" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "取消" }));

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/enhance-fast"]);
  });
});

describe("LinguaType v0.2.1", () => {
  it("uses Ctrl/Cmd + K to check the current paragraph without opening the expression menu", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(paragraphResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, paragraphResult.originalParagraph);
    setEditorSelection(editor, 0);
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/check-paragraph-flow", expect.anything()));
    expect(screen.queryByText("表达菜单")).not.toBeInTheDocument();
    expect(await screen.findByLabelText("文章地图二级检查")).toBeInTheDocument();
    expect(screen.getByText("本段检查")).toBeInTheDocument();
  });

  it("keeps paragraph flow separate from correction memory when triggered directly", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(paragraphResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, paragraphResult.originalParagraph);
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });

    expect(await screen.findByLabelText("文章地图二级检查")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/check-paragraph-flow");
    expect(localStorage.getItem(CORRECTION_MEMORY_STORAGE_KEY)).toBeNull();
  });
});
