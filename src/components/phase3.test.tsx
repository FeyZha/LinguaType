import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorState } from "./StateViews";
import { LinguaTypeApp } from "./LinguaTypeApp";
import { NextExpressionToolbox } from "./NextExpressionToolbox";
import {
  API_SETTINGS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_HISTORY_STORAGE_KEY,
  defaultApiSettings,
} from "@/lib/storage";
import type { EnhanceLatestSentenceResult, LearningHistoryItem } from "@/lib/llm/types";

const enhancedResult: EnhanceLatestSentenceResult = {
  taskType: "mixed_sentence_enhancement",
  originalSentence: "Many student believe that AI tools can 提高学习效率.",
  finalSentence: "Many students believe that AI tools can improve learning efficiency.",
  hasChinese: true,
  insertedExpressions: [{ before: "提高学习效率", after: "improve learning efficiency" }],
  hasCorrection: true,
  corrections: [
    {
      before: "Many student",
      after: "Many students",
      type: "grammar",
      reason: "Many 后面使用复数名词。",
    },
  ],
  coherenceRisk: { hasRisk: false, message: "" },
  learningItems: [
    {
      type: "phrase",
      content: "improve learning efficiency",
      chineseMeaning: "提高学习效率",
      usageNote: "用于说明学习效率提升。",
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: () => "request-1" });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Phase 3 hardening UI", () => {
  it("shows empty editor state without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(screen.getByRole("button", { name: "润色最新一句" }));

    expect(await screen.findByText("请先写一句话，然后再润色最新一句。")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows missing API settings error when Mock Mode is disabled", async () => {
    localStorage.setItem(
      API_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...defaultApiSettings(), mockMode: false, baseUrl: "", apiKey: "", model: "" }),
    );
    localStorage.setItem(DRAFT_STORAGE_KEY, "Many student believe AI can help.");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "润色最新一句" }));

    expect(await screen.findByText("除非启用 Mock 模式，否则需要填写 API 设置。")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API 设置" })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores and auto-saves the editor draft", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Restored draft.");
    render(<LinguaTypeApp />);

    const editor = await screen.findByPlaceholderText(/在这里自然写作/);
    expect(editor).toHaveValue("Restored draft.");

    fireEvent.change(editor, { target: { value: "Updated draft." } });
    await waitFor(() => {
      expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBe("Updated draft.");
    });
  });

  it("uses Mock Mode without requiring real API settings", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(enhancedResult), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByPlaceholderText(/在这里自然写作/);
    fireEvent.change(editor, { target: { value: "Many student believe that AI tools can 提高学习效率." } });
    fireEvent.click(screen.getByRole("button", { name: "润色最新一句" }));

    expect(await screen.findByText("建议修改")).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      apiConfig: { mockMode: boolean; supportsJsonMode: boolean };
    };
    expect(body.apiConfig.mockMode).toBe(true);
    expect(body.apiConfig.supportsJsonMode).toBe(false);
  });

  it("does not apply a stale result when editor text changed during generation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(enhancedResult), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByPlaceholderText(/在这里自然写作/);
    fireEvent.change(editor, { target: { value: "Many student believe that AI tools can 提高学习效率." } });
    fireEvent.click(screen.getByRole("button", { name: "润色最新一句" }));

    await screen.findByText("建议修改");
    fireEvent.change(editor, { target: { value: "I changed the sentence while waiting." } });
    fireEvent.click(screen.getByRole("button", { name: "应用" }));

    expect(await screen.findByText("生成结果期间编辑器内容发生了变化。请重新润色最新一句。")).toBeInTheDocument();
    expect(editor).toHaveValue("I changed the sentence while waiting.");
  });

  it("keeps raw model response inside a collapsed debug section", () => {
    render(<ErrorState message="模型返回的内容不是有效 JSON。" rawResponse="{bad json" />);

    expect(screen.getByText("模型返回的内容不是有效 JSON。")).toBeInTheDocument();
    expect(screen.getByText("查看原始响应调试信息")).toBeInTheDocument();
    expect(screen.getByText("{bad json").closest("details")).not.toHaveAttribute("open");
  });

  it("renders static toolbox templates and local history recall without calling LLM", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const history: LearningHistoryItem[] = [
      {
        id: "item-1",
        type: "phrase",
        content: "improve learning efficiency",
        chineseMeaning: "提高学习效率",
        usageNote: "用于学习效率。",
        sourceSentence: "Many students improve learning efficiency.",
        writingMode: "natural",
        createdAt: "2026-05-12T00:00:00.000Z",
        useCount: 1,
      },
    ];
    const onInsert = vi.fn();

    render(<NextExpressionToolbox history={history} onInsert={onInsert} />);

    expect(screen.getByText("下一句表达工具箱")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "This may be because..." })).toBeInTheDocument();
    expect(screen.getByText(/如果你想复用已保存的表达/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deduplicates learning history only after Apply", async () => {
    const existing: LearningHistoryItem[] = [
      {
        id: "existing",
        type: "phrase",
        content: "improve learning efficiency",
        chineseMeaning: "提高学习效率",
        usageNote: "用于说明学习效率提升。",
        sourceSentence: "Old sentence.",
        writingMode: "natural",
        createdAt: "2026-05-12T00:00:00.000Z",
        useCount: 1,
      },
    ];
    localStorage.setItem(LEARNING_HISTORY_STORAGE_KEY, JSON.stringify(existing));
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(enhancedResult), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByPlaceholderText(/在这里自然写作/);
    fireEvent.change(editor, { target: { value: "Many student believe that AI tools can 提高学习效率." } });
    fireEvent.click(screen.getByRole("button", { name: "润色最新一句" }));
    await screen.findByText("建议修改");
    expect(JSON.parse(localStorage.getItem(LEARNING_HISTORY_STORAGE_KEY) ?? "[]")[0].useCount).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "应用" }));

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem(LEARNING_HISTORY_STORAGE_KEY) ?? "[]") as LearningHistoryItem[];
      expect(saved).toHaveLength(1);
      expect(saved[0].useCount).toBe(2);
    });
  });
});
