import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FastEnhanceResult, LearningExtractionResult } from "@/lib/llm/types";
import {
  API_SETTINGS_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY,
  WRITING_ARCHIVES_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  defaultApiSettings,
} from "@/lib/storage";
import { LinguaTypeApp } from "./LinguaTypeApp";

const placeholderText = "I found that many students lack 自主学习能力.";

const placeholderResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: placeholderText,
  finalSentence: "I found that many students lack the ability to learn independently.",
  explanationZh: "lack + the ability to + verb",
  hasChinese: true,
};

const wholeChineseSentenceResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "我觉得我这个会火。",
  finalSentence: "I think this will go viral.",
  explanationZh: "think + this will + verb",
  hasChinese: true,
};

const secondPlaceholderResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "This may 影响 young people's values.",
  finalSentence: "This may affect young people's values.",
  explanationZh: "affect + someone's values",
  hasChinese: true,
};

const emptyExtraction: LearningExtractionResult = {
  learningItems: [],
  correctionEvents: [],
};

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function setEditorText(editor: HTMLElement, value: string) {
  fireEvent.change(editor, {
    target: { value, selectionStart: value.length, selectionEnd: value.length },
  });
}

function setEditorTextAt(editor: HTMLElement, value: string, cursor: number) {
  fireEvent.change(editor, {
    target: { value, selectionStart: cursor, selectionEnd: cursor },
  });
}

function writeArchiveWithText(text: string) {
  localStorage.setItem(
    WRITING_ARCHIVES_STORAGE_KEY,
    JSON.stringify({
      activeId: "cache-archive",
      items: [
        {
          id: "cache-archive",
          title: "Learning habits",
          text,
          setup: {
            topicArea: "education",
            essayTopic: "Learning habits",
            outlinePoints: [],
            outline: "",
            updatedAt: "2026-05-16T00:00:00.000Z",
          },
          createdAt: "2026-05-16T00:00:00.000Z",
          updatedAt: "2026-05-16T00:00:00.000Z",
          lastOpenedAt: "2026-05-16T00:00:00.000Z",
        },
      ],
    }),
  );
}

function writeCachedPlaceholderSuggestion(text = placeholderText, withRange = true) {
  localStorage.setItem(
    PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY,
    JSON.stringify([
      {
        id: "cache-1",
        requestKey: `cache-archive|natural|balanced|education|${text}`,
        requestInputSnapshot: {
          writingMode: "natural",
          enhancementLevel: "balanced",
          domain: "education",
        },
        archiveId: "cache-archive",
        originalSentence: text,
        finalSentence: placeholderResult.finalSentence,
        explanationZh: "structure hint",
        taskType: "mixed_chinese_rewrite",
        hasChinese: true,
        markerState: "available",
        reviewed: false,
        latestSentenceRange: { start: 0, end: text.length, sentence: text },
        reviewedRange: { start: 0, end: text.length, sentence: text },
        placeholderRange: withRange
          ? {
              sentence: text,
              start: 0,
              end: text.length,
              placeholders: [
                {
                  text: "自主学习能力",
                  start: text.indexOf("自主学习能力"),
                  end: text.indexOf("自主学习能力") + "自主学习能力".length,
                },
              ],
            }
          : undefined,
        placeholderHint: {
          sourceText: "自主学习能力",
          targetText: "the ability to learn independently",
          structure: "lack + the ability to + verb",
        },
        updatedAt: "2026-05-16T01:00:00.000Z",
      },
    ]),
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    WRITING_SETUP_STORAGE_KEY,
    JSON.stringify({
      topicArea: "education",
      essayTopic: "Learning habits",
      outline: "",
      outlinePoints: [],
      updatedAt: "2026-05-15T00:00:00.000Z",
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
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Chinese placeholder writing flow", () => {
  it("reuses cached placeholder suggestions after hydration without re-calling /api/enhance-fast", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);
    writeArchiveWithText(placeholderText);
    writeCachedPlaceholderSuggestion();

    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces expression reappearance cues from the local library without calling the model", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);
    const text = "Social media can shape young people's values.";
    writeArchiveWithText(text);
    localStorage.setItem(
      LEARNING_LIBRARY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "library-shape-values",
          type: "phrase",
          content: "shape one's values",
          chineseMeaning: "塑造 / 影响某人的价值观",
          usageNote: "用于说明环境或媒介对价值观的影响。",
          sourceSentence: "This phenomenon may shape young people's values.",
          writingMode: "natural",
          createdAt: "2026-05-16T00:00:00.000Z",
          updatedAt: "2026-05-16T00:00:00.000Z",
          useCount: 1,
          favorite: false,
          tags: [],
        },
      ]),
    );

    const { container } = render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    await waitFor(() =>
      expect(container.querySelector("[data-expression-reappearance-cue='seen']")).not.toBeNull(),
    );
    const cue = container.querySelector("[data-expression-reappearance-cue='seen']") as HTMLElement;
    expect(cue).toHaveAttribute("data-expression-reappearance-cue", "seen");
    expect(cue).toHaveAttribute("data-expression-reappearance-visual", "idle");
    expect(cue).toHaveAttribute("aria-hidden", "true");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) || "[]")[0].useCount).toBe(1);
  });

  it("opens a cached placeholder suggestion directly without requesting /api/enhance-fast again", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);
    writeArchiveWithText(placeholderText);
    writeCachedPlaceholderSuggestion();

    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: /AI/ }));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByLabelText("修改后句子")).toHaveTextContent(
      "the ability to learn independently",
    );
  });

  it("does not re-call /api/enhance-fast when the requestKey is already cached even if the cached marker cannot be rebuilt", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);
    writeArchiveWithText(placeholderText);
    writeCachedPlaceholderSuggestion(placeholderText, false);

    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    await act(async () => {
      vi.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the editor quiet while the backend suggestion request is running", async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(() => {
          // Keep the request pending so the test can inspect the loading state.
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    setEditorText(editor, placeholderText);

    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/enhance-fast", expect.anything());
    expect(screen.queryByText(/正在/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/查看当前.*AI/)).not.toBeInTheDocument();
  });

  it("does not show a weak prompt or call AI before the sentence is complete", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    setEditorText(editor, "I found that many students lack 自主学习能力");

    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();

    setEditorText(editor, placeholderText);
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/enhance-fast", expect.anything());
  });

  it("shows a right-side icon first, then expands the inline card and keeps a reusable marker after Apply", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).includes("/api/extract-learning")) {
        return response(emptyExtraction);
      }
      return response(placeholderResult);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    const text = `Last week, I joined a project. ${placeholderText}`;
    setEditorText(editor, text);
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    vi.useRealTimers();

    const suggestionIcon = await screen.findByLabelText(/查看当前.*AI/);
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    fireEvent.click(suggestionIcon);

    await screen.findByLabelText("当前句行内建议");
    expect(screen.getByLabelText("AI 建议句子焦点")).toHaveTextContent(placeholderText);
    const originalDiff = screen.getByLabelText(/原句改动/u);
    expect(originalDiff).toHaveTextContent("自主学习能力");
    expect(originalDiff).not.toHaveAttribute("role", "button");
    expect(screen.getByLabelText("修改后句子")).toHaveTextContent(
      "the ability to learn independently",
    );
    expect(screen.queryByLabelText("对应英文表达")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "忽略" }));
    await waitFor(() => expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("重新查看AI修改"));
    await screen.findByLabelText("当前句行内建议");

    const enhanceCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/enhance-fast"));
    const enhanceRequest = JSON.parse(String((enhanceCall?.[1] as RequestInit | undefined)?.body)) as { latestSentence: string };
    expect(enhanceRequest.latestSentence).toBe(placeholderText);

    fireEvent.click(screen.getByRole("button", { name: "应用修改" }));

    const returnedEditor = await screen.findByLabelText("写作编辑器");
    await waitFor(() =>
      expect(returnedEditor).toHaveValue(
        "Last week, I joined a project. I found that many students lack the ability to learn independently.",
      ),
    );
    expect(screen.queryByText("学习内容已保存")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("表达库有新内容")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    const reviewedMarker = await screen.findByLabelText("重新查看AI修改");
    expect(reviewedMarker).toBeInTheDocument();

    fireEvent.click(reviewedMarker);
    const reviewCard = await screen.findByLabelText("当前句行内建议");
    expect(reviewCard).toHaveAttribute("data-suggestion-mode", "review");
    expect(within(reviewCard).getByLabelText("修改后句子")).toHaveTextContent(
      placeholderResult.finalSentence,
    );
    expect(screen.queryByRole("button", { name: "忽略" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "应用修改" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "换一种表达" })).toBeInTheDocument();

    await waitFor(() => {
      const cache = JSON.parse(localStorage.getItem(PLACEHOLDER_SUGGESTION_CACHE_STORAGE_KEY) ?? "[]");
      expect(cache).toHaveLength(1);
      expect(cache[0]).toMatchObject({
        originalSentence: placeholderText,
        finalSentence: placeholderResult.finalSentence,
        reviewed: true,
      });
    });

    const library = JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]");
    expect(library).toEqual([]);
  });

  it("does not repeat a whole Chinese sentence inside the inline learning card", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      response(wholeChineseSentenceResult),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    setEditorText(editor, "Although digital transformation improved efficiency. 我觉得我这个会火。");
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    vi.useRealTimers();

    fireEvent.click(await screen.findByLabelText(/查看当前.*AI/));
    expect(await screen.findByLabelText("当前句行内建议")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 建议句子焦点")).toHaveTextContent("我觉得我这个会火。");
    const originalDiff = screen.getByLabelText(/原句改动/u);
    expect(originalDiff).toBeInTheDocument();
    expect(originalDiff).not.toHaveAttribute("role", "button");
    expect(screen.queryByLabelText("句级结构问题")).not.toBeInTheDocument();
    expect(screen.getByText(/->/u)).toBeInTheDocument();
    expect(screen.getByLabelText("修改后句子")).toHaveTextContent("go viral");
    expect(screen.queryByLabelText("对应英文表达")).not.toBeInTheDocument();
  });

  it("keeps independent stable suggestion icons for multiple Chinese sentences and clears them on new archive", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { latestSentence?: string };
      if (body.latestSentence?.includes("自主学习能力")) {
        return response(placeholderResult);
      }
      if (body.latestSentence?.includes("影响")) {
        return response(secondPlaceholderResult);
      }
      return response(wholeChineseSentenceResult);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    setEditorText(
      editor,
      "I found that many students lack 自主学习能力. This may 影响 young people's values.",
    );
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByLabelText("查看当前句 AI 建议虚线")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/查看当前.*AI/)).toHaveLength(2);

    fireEvent.click(screen.getAllByLabelText(/查看当前.*AI/)[1]);
    expect(await screen.findByLabelText("当前句行内建议")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 建议句子焦点")).toHaveTextContent("This may 影响 young people's values.");

    fireEvent.click(screen.getByRole("button", { name: "新建" }));
    const newEditor = await screen.findByLabelText("写作编辑器");
    await waitFor(() => expect(newEditor).toHaveValue(""));
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("查看当前句 AI 建议虚线")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("已调用 AI 修改虚线，点击查看建议")).not.toBeInTheDocument();
  });

  it("lets the shortcut request the sentence at the cursor instead of the latest sentence", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    const text = "I found that many students lack 自主学习能力. Final English sentence.";
    const cursor = text.indexOf("自主学习能力") + "自主学习能力".length;
    setEditorTextAt(editor, text, cursor);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    await screen.findByLabelText("当前句行内建议");
    const enhanceCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/enhance-fast"));
    const enhanceRequest = JSON.parse(String((enhanceCall?.[1] as RequestInit | undefined)?.body)) as { latestSentence: string };
    expect(enhanceRequest.latestSentence).toBe(placeholderText);
  });
});
