import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import { DiffViewer } from "./DiffViewer";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  TRIGGER_SETTINGS_STORAGE_KEY,
  defaultApiSettings,
} from "@/lib/storage";
import type {
  FastEnhanceResult,
  LearningExtractionResult,
  ParagraphHealthResult,
  SelectionExplainResult,
} from "@/lib/llm/types";

const fastResult: FastEnhanceResult = {
  taskType: "english_polish",
  originalSentence: "It can bring bad influence to children.",
  finalSentence: "It can have a negative influence on children.",
  explanationZh: "Replaced an unnatural collocation with a more natural one.",
  hasChinese: false,
};

const extractionResult: LearningExtractionResult = {
  learningItems: [
    {
      type: "collocation",
      content: "have a negative influence on",
      chineseMeaning: "产生负面影响",
      usageNote: "Use this collocation instead of bring bad influence.",
    },
  ],
  correctionEvents: [
    {
      before: "bring bad influence to",
      after: "have a negative influence on",
      type: "collocation",
      reason: "Natural collocation.",
    },
  ],
};

const healthResult: ParagraphHealthResult = {
  paragraphFingerprint: "health-1",
  hasIssues: true,
  issueCount: 2,
  issueTypes: ["transition", "repetition"],
  shortSummaryZh: "The paragraph may have two flow issues.",
};

const selectionResult: SelectionExplainResult = {
  selectedText: "acquire knowledge",
  meaningZh: "获得知识",
  usageNoteZh: "A natural academic collocation.",
  expressionType: "collocation",
};

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function longParagraph(sentence = fastResult.originalSentence) {
  return [
    "AI tools are useful because they make daily writing practice easier for students who need steady language support.",
    "For example, for example, they save time when students review vocabulary and organize short writing tasks before class, especially during independent study sessions.",
    sentence,
  ].join(" ");
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

describe("LinguaType v0.2.2 current sentence popover", () => {
  it("opens immediately with the original sentence while enhancement is still checking", async () => {
    let resolveEnhancement: (response: Response) => void = () => {};
    const enhancementPromise = new Promise<Response>((resolve) => {
      resolveEnhancement = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/enhance-fast") return enhancementPromise;
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    fireEvent.change(editor, { target: { value: fastResult.originalSentence } });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(await screen.findByText("当前句建议 Current Sentence")).toBeInTheDocument();
    expect(screen.getAllByText(fastResult.originalSentence).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("检查中...")).toBeInTheDocument();

    resolveEnhancement(response(fastResult));
    expect(await screen.findByText(fastResult.explanationZh)).toBeInTheDocument();
  });

  it("shows the current sentence suggestion near the editor and closes with Escape without saving data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(fastResult)));
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    fireEvent.change(editor, { target: { value: fastResult.originalSentence } });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(await screen.findByText("当前句建议 Current Sentence")).toBeInTheDocument();
    expect(screen.getByText("原句 Original")).toBeInTheDocument();
    expect(screen.getByText("建议 Suggested")).toBeInTheDocument();
    expect(screen.getByText(fastResult.explanationZh)).toBeInTheDocument();
    fireEvent.keyDown(editor, { key: "Escape" });

    await waitFor(() => expect(screen.queryByText("当前句建议 Current Sentence")).not.toBeInTheDocument());
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
  });
});

describe("LinguaType v0.2.2 trigger settings", () => {
  it("uses the product placeholder and does not open the expression menu with Alt slash", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    const editor = await screen.findByPlaceholderText(/请直接写英文，卡住时可以夹中文。/i);
    expect(editor).toHaveAttribute(
      "placeholder",
      expect.stringContaining("例：This may 影响 young people's values."),
    );
    expect(screen.getByText(/模式 Mode：Natural 自然 \| 强度 Level：balanced 平衡 \| 触发 Trigger：Ctrl\/Cmd \+ Enter/)).toBeInTheDocument();

    fireEvent.keyDown(editor, { key: "/", altKey: true });
    expect(screen.queryByText("表达菜单 Inline Expression Menu")).not.toBeInTheDocument();
  });

  it("persists button-only enhancement and disables shortcut enhancement while keeping the button active", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(fastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("tab", { name: "工具与设置" }));
    fireEvent.change(screen.getByLabelText("句子增强触发"), { target: { value: "button_only" } });

    const editor = screen.getByLabelText("写作编辑器");
    fireEvent.change(editor, { target: { value: fastResult.originalSentence } });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "增强最新一句" }));
    expect(await screen.findByText("当前句建议 Current Sentence")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(TRIGGER_SETTINGS_STORAGE_KEY) ?? "{}").sentenceEnhancementShortcut).toBe("button_only");
  });

  it("disables the inline expression shortcut when configured", async () => {
    localStorage.setItem(
      TRIGGER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        inlineExpressionMenuTrigger: "disabled",
      }),
    );
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    fireEvent.change(editor, { target: { value: "Hello world" } });
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });

    expect(screen.queryByText("表达菜单 Inline Expression Menu")).not.toBeInTheDocument();
  });

  it("supports disabling sentence shortcuts while keeping explicit button enhancement available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(fastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("tab", { name: "工具与设置" }));
    fireEvent.change(screen.getByLabelText("句子增强触发"), { target: { value: "disable_shortcut" } });

    const editor = screen.getByLabelText("写作编辑器");
    fireEvent.change(editor, { target: { value: fastResult.originalSentence } });
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(editor, { key: "j", ctrlKey: true });
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "增强最新一句" }));
    expect(await screen.findByText("当前句建议 Current Sentence")).toBeInTheDocument();
  });

  it("keeps manual paragraph checking out of the Tools panel as a direct action", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("tab", { name: "工具与设置" }));

    expect(screen.queryByRole("button", { name: "检查当前段落" })).not.toBeInTheDocument();
    expect(screen.getByText(/需要检查当前段落时，请在编辑器内打开 Inline Expression Menu/i)).toBeInTheDocument();
  });
});

describe("LinguaType v0.2.2 diff display", () => {
  it("uses muted strikethrough for removed text", () => {
    render(
      <DiffViewer
        parts={[
          { value: "bring bad influence to", removed: true },
          { value: "have a negative influence on", added: true },
        ]}
      />,
    );

    expect(screen.getByText("bring bad influence to")).toHaveClass("text-slate-400");
    expect(screen.getByText("bring bad influence to")).not.toHaveClass("text-red-700");
  });
});

describe("LinguaType v0.2.2 selection actions", () => {
  it("explains selected text without modifying the editor and saves it to the library on explicit action", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/explain-selection") return Promise.resolve(response(selectionResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "Students acquire knowledge through practice." } });
    editor.selectionStart = 9;
    editor.selectionEnd = 26;
    fireEvent.mouseUp(editor);

    expect(screen.getByText("选中文本操作 Selection Actions")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "解释选中内容" }));
    expect(await screen.findByText(selectionResult.usageNoteZh)).toBeInTheDocument();
    expect(editor).toHaveValue("Students acquire knowledge through practice.");

    fireEvent.click(screen.getByRole("button", { name: "保存到 Learning Library" }));
    expect(await screen.findByText("已保存到 Learning Library")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")[0]).toMatchObject({
      content: "acquire knowledge",
      type: "collocation",
    });
  });
});

describe("LinguaType v0.2.2 paragraph health settings and data control", () => {
  it("runs paragraph health only on the third applied edit when configured", async () => {
    localStorage.setItem(
      TRIGGER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        paragraphHealthTrigger: "after_3_applied_edits",
      }),
    );
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/enhance-fast") return Promise.resolve(response(fastResult));
      if (url === "/api/extract-learning") return Promise.resolve(response(extractionResult));
      if (url === "/api/check-paragraph-health") return Promise.resolve(response(healthResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    for (let index = 0; index < 3; index += 1) {
      fireEvent.change(editor, { target: { value: longParagraph(fastResult.originalSentence) } });
      fireEvent.click(screen.getByRole("button", { name: "增强最新一句" }));
      await screen.findByText("当前句建议 Current Sentence");
      await screen.findByText(fastResult.explanationZh);
      fireEvent.click(screen.getByRole("button", { name: "应用修改" }));
      await waitFor(() => expect(screen.queryByText("当前句建议 Current Sentence")).not.toBeInTheDocument());
    }

    await waitFor(() => expect(fetchMock.mock.calls.map((call) => call[0]).filter((url) => url === "/api/check-paragraph-health")).toHaveLength(1));
    expect(await screen.findByText("段落健康 Paragraph Health：可能有 2 个问题")).toBeInTheDocument();
  });

  it("exports and clears local learning data through Data Control", async () => {
    localStorage.setItem(
      LEARNING_LIBRARY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "item-1",
          type: "phrase",
          content: "as a result",
          chineseMeaning: "因此",
          usageNote: "Show result.",
          sourceSentence: "As a result, students learn faster.",
          writingMode: "natural",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
          useCount: 1,
          favorite: false,
          tags: [],
        },
      ]),
    );
    localStorage.setItem(
      CORRECTION_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          id: "event-1",
          before: "learn knowledge",
          after: "acquire knowledge",
          type: "collocation",
          reason: "Natural collocation.",
          sourceSentence: "Students acquire knowledge.",
          writingMode: "academic",
          createdAt: "2026-05-12T00:00:00.000Z",
          updatedAt: "2026-05-12T00:00:00.000Z",
          useCount: 2,
        },
      ]),
    );
    localStorage.setItem(API_SETTINGS_STORAGE_KEY, JSON.stringify({ ...defaultApiSettings(), mockMode: false, model: "x" }));
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("tab", { name: "数据管理 Data Control" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "导出 Writing Habits JSON" }));
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining("collocation"));

    fireEvent.click(screen.getByRole("button", { name: "清空 Learning Library" }));
    fireEvent.click(screen.getByRole("button", { name: "确认清空 Learning Library" }));
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "清空 Writing Habits" }));
    fireEvent.click(screen.getByRole("button", { name: "确认清空 Writing Habits" }));
    expect(JSON.parse(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY) ?? "[]")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "重置 API Settings" }));
    expect(JSON.parse(localStorage.getItem(API_SETTINGS_STORAGE_KEY) ?? "{}").mockMode).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "查看 localStorage keys" }));
    expect(screen.getByText("linguatype.triggerSettings.v1")).toBeInTheDocument();
  });
});
