import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import {
  API_SETTINGS_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  defaultApiSettings,
} from "@/lib/storage";
import type { FastEnhanceResult, LearningExtractionResult } from "@/lib/llm/types";

const placeholderResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "I found that many students lack 自主学习能力.",
  finalSentence: "I found that many students lack the ability to learn independently.",
  explanationZh: "结构：lack + the ability to + verb",
  hasChinese: true,
};

const wholeChineseSentenceResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "我觉得我这个会火。",
  finalSentence: "I think this will go viral.",
  explanationZh: "结构：think + this will + verb",
  hasChinese: true,
};

const secondPlaceholderResult: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "This may 影响 young people's values.",
  finalSentence: "This may affect young people's values.",
  explanationZh: "结构：affect + someone's values",
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
    setEditorText(editor, "I found that many students lack 自主学习能力.");

    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/enhance-fast", expect.anything());
    expect(screen.queryByText(/正在/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("查看当前句 AI 建议")).not.toBeInTheDocument();
  });

  it("does not show a weak prompt or call AI before the sentence is complete", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => response(placeholderResult));
    vi.stubGlobal("fetch", fetchMock);

    render(<LinguaTypeApp />);
    const editor = await screen.findByLabelText("写作编辑器");
    vi.useFakeTimers();
    setEditorText(editor, "I found that many students lack 自主学习能力");

    expect(screen.queryByLabelText("中文占位弱提示")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(799);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(fetchMock).not.toHaveBeenCalled();

    setEditorText(editor, "I found that many students lack 自主学习能力.");
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(799);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(1);
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
    const text = "Last week, I joined a project. I found that many students lack 自主学习能力.";
    setEditorText(editor, text);
    await act(async () => {
      vi.advanceTimersByTime(800);
      await Promise.resolve();
    });
    vi.useRealTimers();

    const suggestionIcon = await screen.findByLabelText("查看当前句 AI 建议");
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    expect(screen.queryByText("✦ 更自然的表达")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("查看当前句 AI 建议虚线")).not.toBeInTheDocument();
    fireEvent.click(suggestionIcon);

    await screen.findByLabelText("当前句行内建议");
    expect(screen.queryByText("✦ 更自然的表达")).not.toBeInTheDocument();
    expect(screen.getByLabelText("AI 建议句子焦点")).toHaveTextContent("I found that many students lack 自主学习能力.");
    const sourcePhrase = screen.getByLabelText("中文占位意群：自主学习能力");
    expect(sourcePhrase).toHaveTextContent("自主学习能力");
    expect(screen.getAllByText("the ability to learn independently").length).toBeGreaterThan(0);
    expect(screen.getByText("结构：lack + the ability to + verb")).toBeInTheDocument();
    expect(screen.getByLabelText("对应英文表达")).toHaveAttribute("data-active", "false");
    fireEvent.click(sourcePhrase);
    expect(screen.getByLabelText("对应英文表达")).toHaveAttribute("data-active", "true");

    fireEvent.click(screen.getByRole("button", { name: "忽略" }));
    await waitFor(() => expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("已调用 AI 修改，点击查看建议"));
    await screen.findByLabelText("当前句行内建议");

    const enhanceCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/api/enhance-fast"));
    const enhanceRequest = JSON.parse(String((enhanceCall?.[1] as RequestInit | undefined)?.body)) as { latestSentence: string };
    expect(enhanceRequest.latestSentence).toBe("I found that many students lack 自主学习能力.");

    fireEvent.click(screen.getByRole("button", { name: "应用修改" }));

    const returnedEditor = await screen.findByLabelText("写作编辑器");
    await waitFor(() =>
      expect(returnedEditor).toHaveValue(
        "Last week, I joined a project. I found that many students lack the ability to learn independently.",
      ),
    );
    expect(screen.queryByText("学习内容已保存")).not.toBeInTheDocument();
    expect(screen.getByLabelText("表达库有新内容")).toBeInTheDocument();
    expect(screen.queryByLabelText("当前句行内建议")).not.toBeInTheDocument();
    const reviewedMarker = screen.getByLabelText("已调用 AI 修改，点击查看建议");
    expect(reviewedMarker).toBeInTheDocument();
    expect(screen.queryByLabelText("已调用 AI 修改虚线，点击查看建议")).not.toBeInTheDocument();

    fireEvent.click(reviewedMarker);
    const reviewCard = await screen.findByLabelText("当前句行内建议");
    expect(reviewCard).toBeInTheDocument();
    expect(reviewCard).toHaveAttribute("data-suggestion-mode", "review");
    expect(within(reviewCard).queryByText("I found that many students lack the ability to learn independently.")).not.toBeInTheDocument();
    expect(screen.getAllByText("the ability to learn independently").length).toBeGreaterThan(0);

    expect(screen.queryByRole("button", { name: "忽略" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "应用修改" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "换一种说法" })).toBeInTheDocument();

    const library = JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]") as Array<{
      content: string;
      chineseMeaning: string;
      usageNote: string;
    }>;
    expect(library).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          content: "the ability to learn independently",
          chineseMeaning: "自主学习能力",
          usageNote: "结构：lack + the ability to + verb",
        }),
      ]),
    );

    fireEvent.click(screen.getByRole("button", { name: /表达库/ }));
    await waitFor(() => expect(screen.queryByLabelText("表达库有新内容")).not.toBeInTheDocument());
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

    fireEvent.click(await screen.findByLabelText("查看当前句 AI 建议"));
    expect(await screen.findByLabelText("当前句行内建议")).toBeInTheDocument();
    expect(screen.getByLabelText("AI 建议句子焦点")).toHaveTextContent("我觉得我这个会火。");
    expect(screen.getByLabelText("中文占位意群：会火")).toHaveTextContent("会火");
    expect(screen.queryByLabelText("中文占位意群：我觉得我这个会火")).not.toBeInTheDocument();
    expect(screen.queryByText(/我觉得我这个会火\s*→/u)).not.toBeInTheDocument();
    expect(screen.getByLabelText("对应英文表达")).toHaveTextContent("go viral");

    fireEvent.click(screen.getByLabelText("中文占位意群：会火"));
    expect(screen.getByLabelText("对应英文表达")).toHaveAttribute("data-active", "true");
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
    expect(screen.getAllByLabelText("查看当前句 AI 建议")).toHaveLength(2);

    fireEvent.click(screen.getAllByLabelText("查看当前句 AI 建议")[1]);
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
    expect(enhanceRequest.latestSentence).toBe("I found that many students lack 自主学习能力.");
  });
});
