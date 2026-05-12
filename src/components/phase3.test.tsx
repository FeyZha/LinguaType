import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import {
  CORRECTION_EVENTS_STORAGE_KEY,
  CORRECTION_MEMORY_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
} from "@/lib/storage";
import type {
  FastEnhanceResult,
  LearningExtractionResult,
  LearningItem,
  ParagraphHealthResult,
} from "@/lib/llm/types";

const fastResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼.",
  finalSentence: "Many students believe that AI tools can improve learning efficiency.",
  explanationZh: "已快速润色最新一句。",
  hasChinese: true,
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

beforeEach(() => {
  localStorage.clear();
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

    const editor = await screen.findByLabelText("Writing editor");
    fireEvent.change(editor, {
      target: { value: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼." },
    });
    fireEvent.change(screen.getByLabelText("Enhancement level"), { target: { value: "minimal" } });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(await screen.findByText("Suggested revision")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/enhance-fast");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { enhancementLevel: string };
    expect(body.enhancementLevel).toBe("minimal");
    expect(screen.getByText(fastResult.finalSentence)).toBeInTheDocument();
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

    const editor = await screen.findByLabelText("Writing editor");
    fireEvent.change(editor, {
      target: { value: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enhance latest sentence" }));
    await screen.findByText("Suggested revision");
    fireEvent.click(screen.getByRole("button", { name: "Apply revision" }));

    expect(editor).toHaveValue(fastResult.finalSentence);
    await waitFor(() => {
      expect(fetchMock.mock.calls.map((call) => call[0])).toContain("/api/extract-learning");
      expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")).toHaveLength(1);
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

    const editor = await screen.findByLabelText("Writing editor");
    fireEvent.change(editor, {
      target: { value: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enhance latest sentence" }));
    await screen.findByText("Suggested revision");
    fireEvent.click(screen.getByRole("button", { name: "Apply revision" }));

    expect(editor).toHaveValue(fastResult.finalSentence);
    expect(await screen.findByText("Learning extraction failed. Your applied text was kept.")).toBeInTheDocument();
  });

  it("regenerate and copy use fast results without saving learning data", async () => {
    const regenerated = { ...fastResult, finalSentence: "Many students think AI tools can improve learning efficiency." };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(fastResult))
      .mockResolvedValueOnce(response(regenerated));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("Writing editor");
    fireEvent.change(editor, {
      target: { value: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Enhance latest sentence" }));
    await screen.findByText("Suggested revision");
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(await screen.findByText(regenerated.finalSentence)).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy revised sentence" }));
    });

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/enhance-fast", "/api/enhance-fast"]);
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY)).toBeNull();
  });
});

describe("LinguaType v0.2.1 paragraph health", () => {
  it("runs health check after Apply only when paragraph is long enough, then expands full suggestions on demand", async () => {
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
      "AI tools are useful for students because they make daily practice easier. Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼. For example, for example, they save time when students review vocabulary and organize short writing tasks.";
    const editor = await screen.findByLabelText("Writing editor");
    fireEvent.change(editor, { target: { value: paragraph } });
    fireEvent.click(screen.getByRole("button", { name: "Enhance latest sentence" }));
    await screen.findByText("Suggested revision");
    fireEvent.click(screen.getByRole("button", { name: "Apply revision" }));

    expect(await screen.findByText("Paragraph health: 1 possible issue")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => call[0])).not.toContain("/api/check-paragraph-flow");
    fireEvent.click(screen.getByRole("button", { name: "View suggestions" }));
    expect(await screen.findByText("Paragraph flow check")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => call[0])).toContain("/api/check-paragraph-flow");
  });

  it("does not run paragraph health for short paragraphs, cancel, or copy", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(fastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("Writing editor");
    fireEvent.change(editor, { target: { value: "Many student believe that AI tools can 鎻愰珮瀛︿範鏁堢巼." } });
    fireEvent.click(screen.getByRole("button", { name: "Enhance latest sentence" }));
    await screen.findByText("Suggested revision");
    fireEvent.click(screen.getByRole("button", { name: "Copy revised sentence" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual(["/api/enhance-fast"]);
  });
});

describe("LinguaType v0.2.1 Inline Expression Menu", () => {
  it("opens with Ctrl/Cmd + K, inserts an intention template at the saved cursor, and closes with Escape", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("Writing editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "Hello world" } });
    editor.selectionStart = 6;
    editor.selectionEnd = 6;
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });

    expect(screen.getByText("Inline Expression Menu")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Explain reason" }));
    fireEvent.click(screen.getByRole("button", { name: "This may be because..." }));

    expect(editor).toHaveValue("Hello This may be because...world");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });
    fireEvent.keyDown(editor, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("Inline Expression Menu")).not.toBeInTheDocument());
  });

  it("inserts expressions from the library and can trigger full paragraph flow check", async () => {
    const library: LearningItem[] = [
      {
        id: "library-1",
        type: "phrase",
        content: "as a result",
        chineseMeaning: "因此",
        usageNote: "Show result.",
        sourceSentence: "As a result, students learn faster.",
        writingMode: "natural",
        createdAt: "2026-05-12T00:00:00.000Z",
        updatedAt: "2026-05-12T00:00:00.000Z",
        useCount: 5,
        favorite: true,
        tags: [],
      },
    ];
    localStorage.setItem(LEARNING_LIBRARY_STORAGE_KEY, JSON.stringify(library));
    const fetchMock = vi.fn().mockResolvedValue(response(paragraphResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("Writing editor") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: paragraphResult.originalParagraph } });
    editor.selectionStart = 0;
    editor.selectionEnd = 0;
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Insert from Library" }));
    fireEvent.click(screen.getByRole("button", { name: "as a result" }));

    expect(editor).toHaveValue(`as a result${paragraphResult.originalParagraph}`);

    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });
    fireEvent.click(screen.getByRole("button", { name: "Check this paragraph" }));

    expect(await screen.findByText("Paragraph flow check")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/check-paragraph-flow");
    expect(localStorage.getItem(CORRECTION_MEMORY_STORAGE_KEY)).toBeNull();
  });
});
