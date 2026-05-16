import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import { DiffViewer } from "./DiffViewer";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  PERSONAL_DICTIONARY_STORAGE_KEY,
  TRIGGER_SETTINGS_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
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

function longParagraph(sentence = fastResult.originalSentence) {
  return [
    "AI tools are useful because they make daily writing practice easier for students who need steady language support.",
    "For example, for example, they save time when students review vocabulary and organize short writing tasks before class, especially during independent study sessions.",
    sentence,
  ].join(" ");
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

describe("LinguaType v0.2.2 current sentence popover", () => {
  it("keeps the editor quiet while enhancement is still checking, then opens the result", async () => {
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
    setEditorText(editor, fastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/enhance-fast", expect.anything()));
    expect(screen.queryByText("当前句建议")).not.toBeInTheDocument();
    expect(screen.queryByText("检查中...")).not.toBeInTheDocument();

    resolveEnhancement(response(fastResult));
    expect(await screen.findByText(fastResult.explanationZh)).toBeInTheDocument();
  });

  it("shows the current sentence suggestion near the editor and closes with Escape without saving data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(fastResult)));
    localStorage.setItem(
      TRIGGER_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        popoverBehavior: { escapeCloses: false },
      }),
    );
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, fastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(await screen.findByText("当前句建议")).toBeInTheDocument();
    expect(screen.getByText(fastResult.explanationZh)).toBeInTheDocument();
    fireEvent.keyDown(editor, { key: "Escape" });

    await waitFor(() => expect(screen.queryByText("当前句建议")).not.toBeInTheDocument());
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
  });

  it("closes the current sentence suggestion when clicking outside it", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(fastResult)));
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, fastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    expect(await screen.findByText("当前句建议")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);

    await waitFor(() => expect(screen.queryByText("当前句建议")).not.toBeInTheDocument());
  });

  it("renders the current sentence suggestion as an inline diff bar without applying automatically", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(fastResult)));
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, fastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });

    const suggestion = await screen.findByLabelText("当前句行内建议");
    const removedPieces = screen.getAllByText((content, node) => {
      return Boolean(node?.getAttribute("data-diff-part") === "removed" && content.includes("bring"));
    });
    expect(removedPieces.length).toBeGreaterThan(0);
    const addedPieces = screen.getAllByText((content, node) => {
      return Boolean(node?.getAttribute("data-diff-part") === "added" && /have/.test(content));
    });
    expect(addedPieces.length).toBeGreaterThan(0);
    expectEditorText(editor, fastResult.originalSentence);
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
  });
});

describe("LinguaType v0.2.2 ", () => {
  it("uses the product placeholder and does not open the expression menu with Alt slash", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    expect(editor).toHaveAttribute(
      "data-placeholder",
      expect.stringContaining("例如：This may 影响 young people's values."),
    );
    expect(screen.getByRole("button", { name: "模式：自然" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "强度：平衡" })).toBeInTheDocument();
    expect(screen.getByText("触发：Ctrl/Cmd + Enter")).toBeInTheDocument();

    fireEvent.keyDown(editor, { key: "/", altKey: true });
    expect(screen.queryByText("表达菜单")).not.toBeInTheDocument();
  });

  it("persists button-only enhancement without exposing the old enhancement button", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(fastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "触发设置" }));
    fireEvent.click(screen.getByRole("combobox", { name: "句子增强触发方式" }));
    fireEvent.click(screen.getByRole("option", { name: "按钮触发" }));
    fireEvent.click(screen.getByRole("button", { name: /LinguaType/ }));

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, fastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "增强最新一句" })).not.toBeInTheDocument();
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
    setEditorText(editor, "Hello world");
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });

    expect(screen.queryByText("表达菜单")).not.toBeInTheDocument();
  });

  it("supports disabling sentence shortcuts without restoring the old enhancement button", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(fastResult));
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "触发设置" }));
    fireEvent.click(screen.getByRole("combobox", { name: /句子增强触发|Sentence enhancement trigger/i }));
    fireEvent.click(screen.getByRole("option", { name: /关闭 Off|关闭.*shortcut|Disable shortcut|关闭/i }));
    fireEvent.click(screen.getByRole("button", { name: /LinguaType/ }));
    expect(JSON.parse(localStorage.getItem(TRIGGER_SETTINGS_STORAGE_KEY) ?? "{}").sentenceEnhancementShortcut).toBe("disable_shortcut");

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, fastResult.originalSentence);
    fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
    fireEvent.keyDown(editor, { key: "j", ctrlKey: true });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /增强最新一句|Enhance latest sentence/i })).not.toBeInTheDocument();
  });

  it("keeps manual paragraph checking out of the unified settings page", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "触发设置" }));

    expect(screen.queryByRole("button", { name: "检查当前段落" })).not.toBeInTheDocument();
    expect(screen.queryByText("按 Escape 关闭弹层")).not.toBeInTheDocument();
    expect(screen.queryByText("Escape")).not.toBeInTheDocument();
    expect(screen.getByLabelText("触发设置页面")).toBeInTheDocument();
  });

  it("shows API settings without local demo mode and uses 20000 default tokens", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "API 设置" }));

    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-workspace-motion", "api");
    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-intensity", "noticeable");
    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-duration", "820");
    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-state", "entering");
    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-exit-duration", "420");
    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-exit-pattern", "soft-rise-fade");
    expect(screen.queryByText(/Mock Mode|演示模式/u)).not.toBeInTheDocument();
    expect(screen.getByLabelText("最大 Tokens")).toHaveValue(20000);

    fireEvent.click(screen.getByRole("button", { name: "API 设置" }));

    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-state", "exiting");
    await waitFor(() => expect(screen.getByLabelText("写作编辑器")).toBeInTheDocument());
  });

  it("returns to the writing editor after saving API settings", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "API 设置" }));
    fireEvent.change(screen.getByLabelText("API Base URL"), { target: { value: "https://open.bigmodel.cn" } });
    fireEvent.change(screen.getByLabelText("API Key"), { target: { value: "saved-key" } });
    fireEvent.change(screen.getByLabelText("模型名称 Model"), { target: { value: "glm-5.1" } });
    fireEvent.click(screen.getByRole("button", { name: /保存设置|Save Settings/i }));

    expect(screen.getByLabelText("API 设置页面")).toHaveAttribute("data-motion-state", "exiting");
    await waitFor(() => expect(screen.getByLabelText("写作编辑器")).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem(API_SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({
      baseUrl: "https://open.bigmodel.cn",
      apiKey: "saved-key",
      model: "glm-5.1",
      mockMode: false,
    });
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

    expect(screen.getByText("bring bad influence to")).toHaveAttribute("data-diff-part", "removed");
    expect(screen.getByText("bring bad influence to")).toHaveClass("text-[var(--lt-muted)]");
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

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, "Students acquire knowledge through practice.");
    setEditorSelection(editor, 9, 26);
    fireEvent.mouseUp(editor);

    expect(screen.getByRole("button", { name: /解释选中内容|Explain selected|Explain Selected/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /解释选中内容|Explain selected|Explain Selected/i }));
    expect(await screen.findByText(selectionResult.usageNoteZh)).toBeInTheDocument();
    expectEditorText(editor, "Students acquire knowledge through practice.");

    fireEvent.click(screen.getByRole("button", { name: "保存到表达库" }));
    expect(await screen.findByText("已保存到表达库")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")[0]).toMatchObject({
      content: "acquire knowledge",
      type: "collocation",
    });
  });
});

describe("LinguaType v0.2.2 settings and data control", () => {
  it("runs only on the third applied edit when configured", async () => {
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
      setEditorText(editor, longParagraph(fastResult.originalSentence));
      fireEvent.keyDown(editor, { key: "Enter", ctrlKey: true });
      await screen.findByRole("button", { name: "应用修改" });
      await screen.findByText(fastResult.explanationZh);
      fireEvent.click(screen.getByRole("button", { name: "应用修改" }));
      await waitFor(() => expect(screen.queryByText("当前句建议")).not.toBeInTheDocument());
    }

    await waitFor(() => expect(fetchMock.mock.calls.map((call) => call[0]).filter((url) => url === "/api/check-paragraph-health")).toHaveLength(1));
    expect(await screen.findByText("段落健康：可能有 2 个问题")).toBeInTheDocument();
  });

  it("exports and clears local learning data through data control", async () => {
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

    fireEvent.click(await screen.findByRole("button", { name: "数据管理" }));
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", {
          name: "导出写作习惯 JSON",
        }),
      );
    });
    const habitsExportPayload = String(
      vi.mocked(navigator.clipboard.writeText).mock.calls.at(-1)?.[0] ?? "",
    );
    expect(habitsExportPayload).toMatch(/\"type\"\s*:\s*\"collocation\"/);
    fireEvent.click(screen.getByRole("button", { name: "清空表达库" }));
    fireEvent.click(screen.getByRole("button", { name: "确认清空表达库" }));
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY) ?? "[]")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "清空写作习惯" }));
    fireEvent.click(screen.getByRole("button", { name: "确认清空写作习惯" }));
    expect(JSON.parse(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY) ?? "[]")).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "重置 API 设置" }));
    expect(JSON.parse(localStorage.getItem(API_SETTINGS_STORAGE_KEY) ?? "{}")).toMatchObject({
      maxTokens: 20000,
      mockMode: false,
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: /查看本地存储键|查看 localStorage keys|View localStorage keys/i,
      }),
    );
    expect(screen.getByText("linguatype.triggerSettings.v1")).toBeInTheDocument();
  });

  it("keeps Personal Dictionary inside the Learning Library type view", async () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "表达库" }));
    fireEvent.click(screen.getByRole("button", { name: "个人词典" }));
    fireEvent.change(screen.getByLabelText("添加个人词典项"), { target: { value: "LinguaType" } });
    fireEvent.click(screen.getByRole("button", { name: "添加词典项" }));

    expect(JSON.parse(localStorage.getItem(PERSONAL_DICTIONARY_STORAGE_KEY) ?? "[]")).toEqual(["LinguaType"]);
    expect(screen.getByRole("button", { name: "删除 LinguaType" })).toBeInTheDocument();
  });
});
