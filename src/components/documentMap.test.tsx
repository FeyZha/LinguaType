import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_SETTINGS_STORAGE_KEY,
  DOCUMENT_MAP_CACHE_STORAGE_KEY,
  TRIGGER_SETTINGS_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  defaultApiSettings,
  defaultTriggerSettings,
} from "@/lib/storage";
import type { DocumentMapResult, ParagraphCheckResult, ParagraphHealthResult } from "@/lib/llm/types";
import { LinguaTypeApp } from "./LinguaTypeApp";

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

function setEditorText(editor: HTMLElement, value: string) {
  fireEvent.change(editor, {
    target: { value, selectionStart: value.length, selectionEnd: value.length },
  });
}

function openArticleMapEntry() {
  fireEvent.click(screen.getByRole("button", { name: /检查文章地图|文章地图 ·/u }));
}

function makeLongParagraph(prefix: string) {
  return Array.from({ length: 70 }, (_, index) => `${prefix}${index + 1}`).join(" ") + ".";
}

const documentMapResult: DocumentMapResult = {
  overallMainIdeaZh: "文章主要讨论考试压力如何削弱学生的自主学习能力。",
  structureSummaryZh: "背景 -> 原因 -> 影响 -> 结论",
  paragraphs: [
    {
      paragraphId: "p1",
      index: 1,
      range: { start: 0, end: 69 },
      roleZh: "背景 + 立场",
      mainPointZh: "提出考试压力会改变学生学习方式。",
      status: "healthy",
      healthSummaryZh: "主旨清楚。",
      relationToPreviousZh: null,
      issueRefs: [],
    },
    {
      paragraphId: "p2",
      index: 2,
      range: { start: 71, end: 152 },
      roleZh: "原因",
      mainPointZh: "说明学生依赖刷题和短期记忆。",
      status: "needs_attention",
      healthSummaryZh: "与前一段有重复。",
      relationToPreviousZh: "承接第 1 段，但过渡略弱。",
      issueRefs: ["issue_1"],
    },
  ],
  globalIssues: [
    {
      id: "issue_1",
      type: "repetition",
      severity: "medium",
      titleZh: "第 1 段和第 2 段观点重复",
      paragraphIds: ["p1", "p2"],
      explanationZh: "两段都在说明考试压力削弱自主学习。",
      suggestionZh: "建议让第 1 段聚焦背景，第 2 段聚焦原因。",
    },
  ],
  nextActions: [
    {
      targetParagraphIds: ["p1", "p2"],
      actionZh: "优先区分第 1 段和第 2 段的论证功能。",
    },
  ],
};

const healthResult: ParagraphHealthResult = {
  paragraphFingerprint: "paragraph-health",
  hasIssues: true,
  issueCount: 1,
  issueTypes: ["repetition"],
  shortSummaryZh: "这一段有重复表达。",
};

const flowResult: ParagraphCheckResult = {
  originalParagraph: "Exam pressure also weakens independent learning. Students repeat short-term drills.",
  revisedParagraph: "Exam pressure weakens independent learning because students repeat short-term drills.",
  hasIssues: true,
  issues: [
    {
      type: "repetition",
      original: "Exam pressure also weakens",
      suggestion: "Exam pressure weakens",
      reason: "删去重复承接会更直接。",
    },
  ],
  detailIssues: [
    {
      type: "grammar",
      original: "Students repeats",
      suggestion: "Students repeat",
      reason: "主语是复数，动词应使用原形。",
    },
    {
      type: "spacing",
      original: "Students  repeat",
      suggestion: "Students repeat",
      reason: "句内空格过多。",
    },
  ],
  summary: "段落可以减少重复承接。",
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(
    WRITING_SETUP_STORAGE_KEY,
    JSON.stringify({
      topicArea: "education",
      essayTopic: "How exam pressure affects students",
      outlinePoints: ["Background", "Cause and impact"],
      outline: "Background\nCause and impact",
      updatedAt: "2026-05-17T00:00:00.000Z",
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
  localStorage.setItem(TRIGGER_SETTINGS_STORAGE_KEY, JSON.stringify(defaultTriggerSettings()));
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

describe("LinguaType document map", () => {
  it("does not call the model when the article has fewer than two paragraphs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, "Only one paragraph. It is not enough.");
    openArticleMapEntry();

    expect(await screen.findByText("文章内容较少，写到至少 2 个段落后可以生成文章地图。")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/check-document-map", expect.anything());
  });

  it("shows the document map and editor in independent side-by-side panes", async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url === "/api/check-document-map") return Promise.resolve(response(documentMapResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(
      editor,
      [
        "Exam pressure changes how students learn. It pushes them to chase scores.",
        "Exam pressure also weakens independent learning. Students repeat short-term drills.",
      ].join("\n\n"),
    );

    openArticleMapEntry();

    expect(await screen.findByText("文章主要讨论考试压力如何削弱学生的自主学习能力。")).toBeInTheDocument();
    const comparisonRegion = screen.getByLabelText("文章地图对照区");
    const mapPane = within(comparisonRegion).getByLabelText("文章地图栏");
    const sourcePane = within(comparisonRegion).getByLabelText("原文对照栏");

    expect(comparisonRegion).toHaveAttribute("data-scroll-mode", "independent-panes");
    expect(screen.getByLabelText("沉浸式写作区")).toHaveClass("overflow-hidden");
    expect(mapPane).toHaveClass("lt-scrollbar-hidden");
    expect(sourcePane).toHaveClass("lt-scrollbar-hidden");
    const statusBar = within(sourcePane).getByRole("contentinfo");
    expect(statusBar).toHaveAttribute("data-status-scope", "source-pane");
    expect(statusBar).toHaveClass("relative", "w-full", "shrink-0");
    expect(statusBar).not.toHaveClass("fixed", "xl:left-[var(--lt-sidebar-width,320px)]");
    expect(within(statusBar).getByRole("button", { name: /文章地图 · 1 个发现/u })).toBeInTheDocument();

    const writingColumn = within(sourcePane)
      .getByLabelText("写作区")
      .querySelector<HTMLElement>("[data-writing-column='true']");
    expect(writingColumn).toBeTruthy();
    Object.defineProperty(writingColumn, "clientHeight", { configurable: true, value: 40 });
    const scrollTo = vi.fn((options: ScrollToOptions) => {
      writingColumn!.scrollTop = Number(options.top ?? 0);
    });
    Object.defineProperty(writingColumn, "scrollTo", { configurable: true, value: scrollTo });

    const secondParagraph = screen.getByRole("group", { name: "第 2 段 原因" });
    fireEvent.click(within(secondParagraph).getByRole("button", { name: "定位段落" }));

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
    expect(writingColumn!.scrollTop).toBeGreaterThan(0);
    const sourceEditor = within(sourcePane).getByLabelText("写作编辑器") as HTMLTextAreaElement;
    expect(sourceEditor.value.slice(sourceEditor.selectionStart, sourceEditor.selectionEnd)).toContain(
      "Exam pressure also weakens independent learning.",
    );
  });

  it("shows paragraph advice inline and filters spacing-only detail issues in the secondary check view", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/check-document-map") return Promise.resolve(response(documentMapResult));
      if (url === "/api/check-paragraph-health") return Promise.resolve(response(healthResult));
      if (url === "/api/check-paragraph-flow") return Promise.resolve(response(flowResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(
      editor,
      [
        "Exam pressure changes how students learn. It pushes them to chase scores.",
        "Exam pressure also weakens independent learning. Students repeat short-term drills.",
      ].join("\n\n"),
    );

    openArticleMapEntry();
    expect(await screen.findByText("第 1 段和第 2 段观点重复")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(DOCUMENT_MAP_CACHE_STORAGE_KEY) ?? "[]")).toHaveLength(1);

    const secondParagraph = screen.getByRole("group", { name: "第 2 段 原因" });
    fireEvent.click(within(secondParagraph).getByRole("button", { name: "展开第 2 段" }));
    fireEvent.click(within(secondParagraph).getByRole("button", { name: "查看建议" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/check-paragraph-health", expect.anything()));
    expect(within(secondParagraph).getByText("轻量建议")).toBeInTheDocument();
    expect(within(secondParagraph).getByText("这一段有重复表达。")).toBeInTheDocument();
    expect(screen.queryByText(/段落健康：可能有/u)).not.toBeInTheDocument();

    fireEvent.click(within(secondParagraph).getByRole("button", { name: "检查本段" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/check-paragraph-flow", expect.anything()));
    const paragraphCheckView = await screen.findByLabelText("文章地图二级检查");
    expect(within(paragraphCheckView).getByText("本段检查")).toBeInTheDocument();
    expect(within(paragraphCheckView).getByText("段落可以减少重复承接。")).toBeInTheDocument();
    expect(within(paragraphCheckView).getByText("主语是复数，动词应使用原形。")).toBeInTheDocument();
    expect(within(paragraphCheckView).queryByText("句内空格过多。")).not.toBeInTheDocument();
    expect(within(paragraphCheckView).getByText(/已收起\s*1\s*个空格或排版类小提示/u)).toBeInTheDocument();
    expect(screen.queryByText("段落工具")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => call[0])).not.toContain("/api/extract-learning");
  });

  it("shows an in-map running indicator while paragraph check is waiting", async () => {
    let resolveFlow: (value: Response) => void = () => {};
    const flowPromise = new Promise<Response>((resolve) => {
      resolveFlow = resolve;
    });
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/check-document-map") return Promise.resolve(response(documentMapResult));
      if (url === "/api/check-paragraph-flow") return flowPromise;
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(
      editor,
      [
        "Exam pressure changes how students learn. It pushes them to chase scores.",
        "Exam pressure also weakens independent learning. Students repeat short-term drills.",
      ].join("\n\n"),
    );

    openArticleMapEntry();
    await screen.findByText("文章主要讨论考试压力如何削弱学生的自主学习能力。");

    const secondParagraph = screen.getByRole("group", { name: "第 2 段 原因" });
    fireEvent.click(within(secondParagraph).getByRole("button", { name: "展开第 2 段" }));
    fireEvent.click(within(secondParagraph).getByRole("button", { name: "检查本段" }));

    const runningView = await screen.findByLabelText("段落检查运行中");
    expect(runningView).toHaveTextContent("正在检查本段");
    expect(runningView).toHaveAttribute("data-running-state", "paragraph-flow");

    resolveFlow(response(flowResult));
    expect(await screen.findByLabelText("文章地图二级检查")).toBeInTheDocument();
  });

  it("opens the same paragraph check view from the collapsed sidebar shortcut and shows hover labels", async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url === "/api/check-paragraph-flow") return Promise.resolve(response(flowResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    setEditorText(editor, "Exam pressure changes how students learn. It pushes them to chase scores.");
    fireEvent.click(screen.getByRole("button", { name: "收起写作存档" }));

    const paragraphShortcut = await screen.findByLabelText("检查本段");
    fireEvent.mouseEnter(paragraphShortcut);
    expect(screen.getByText("检查本段")).toBeInTheDocument();
    expect(screen.getByText("增强当前句")).toBeInTheDocument();
    expect(screen.getByText("表达库")).toBeInTheDocument();

    fireEvent.click(paragraphShortcut);

    const paragraphCheckView = await screen.findByLabelText("文章地图二级检查");
    expect(within(paragraphCheckView).getByText("本段检查")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/check-paragraph-flow", expect.anything()));
  });

  it("quietly prechecks the document map after idle without opening the map panel", async () => {
    const fetchMock = vi.fn((url: string, _init?: RequestInit) => {
      if (url === "/api/check-document-map") return Promise.resolve(response(documentMapResult));
      return Promise.resolve(response({}));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");

    vi.useFakeTimers();
    setEditorText(editor, [makeLongParagraph("cause"), makeLongParagraph("impact")].join("\n\n"));

    expect(screen.getByRole("button", { name: "文章地图 · 可检查" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(10_000);
      await Promise.resolve();
    });
    vi.useRealTimers();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/check-document-map", expect.anything()));
    const documentMapCall = fetchMock.mock.calls.find(([url]) => url === "/api/check-document-map");
    const request = JSON.parse(String(documentMapCall?.[1]?.body));
    expect(request.trigger).toBe("auto_idle");
    expect(screen.queryByLabelText("文章地图对照区")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "文章地图 · 1 个发现" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.map((call) => call[0])).not.toContain("/api/check-paragraph-flow");
    expect(fetchMock.mock.calls.map((call) => call[0])).not.toContain("/api/extract-learning");
  });
});
