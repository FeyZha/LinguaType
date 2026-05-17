import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import {
  API_SETTINGS_STORAGE_KEY,
  CORRECTION_EVENTS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  THEME_SETTINGS_STORAGE_KEY,
  WRITING_ARCHIVES_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
  defaultApiSettings,
} from "@/lib/storage";

function setEditorText(editor: HTMLElement, value: string) {
  fireEvent.change(editor, {
    target: { value, selectionStart: value.length, selectionEnd: value.length },
  });
}

function expectEditorText(editor: HTMLElement, value: string) {
  expect(editor).toHaveValue(value);
}

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status });
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
});

describe("LinguaType deprecated writing setup", () => {
  it("opens the writing editor directly without rendering the deprecated setup page", async () => {
    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    expect(screen.queryByText("写作准备")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "进入写作" })).not.toBeInTheDocument();
    const title = screen.getByRole("heading", { level: 1, name: "How students can build independent learning habits" });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass("font-semibold");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("creates a demo local archive when no setup or archive exists", async () => {
    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();

    const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
    expect(archives.activeId).toBeTruthy();
    expect(archives.items).toHaveLength(1);
    expect(archives.items[0]).toMatchObject({
      title: "体验示例：Independent learning habits",
      setup: {
        essayTopic: "How students can build independent learning habits",
        topicArea: "education",
      },
    });
    expect(archives.items[0].text).toContain("把它落实到每天的行动中");
  });

  it("restores a local draft directly without creating learning data", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Existing draft sentence.");
    render(<LinguaTypeApp />);

    const editor = await screen.findByLabelText("写作编辑器");
    expectEditorText(editor, "Existing draft sentence.");
    expect(screen.queryByText("写作准备")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY) ?? "[]")).toHaveLength(0);
  });
});

describe("LinguaType v0.2.5 theme preference", () => {
  it("saves dark theme preference from the writing page and applies it to the document root", async () => {
    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText("界面主题"));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /深色/ }));

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(JSON.parse(localStorage.getItem(THEME_SETTINGS_STORAGE_KEY) ?? "{}").preference).toBe("dark");
    expect(screen.getByRole("button", { name: "LinguaType" }).querySelector('[data-brand-logo="wordmark"]')).toHaveAttribute(
      "src",
      "/brand/linguatype-wordmark-dark.png",
    );
  });

  it("shows theme settings immediately because the setup page is removed", async () => {
    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    expect(screen.getByLabelText("界面主题")).toBeInTheDocument();
    expect(screen.queryByText("写作准备")).not.toBeInTheDocument();
  });
});

describe("LinguaType v0.2.7 editor shell", () => {
  it("edits the document title directly without explicit edit buttons or outline side panels", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "First paragraph.\n\nSecond paragraph.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "education",
        essayTopic: "Education topic",
        outlinePoints: ["First", "Second"],
        outline: "First\nSecond",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ hasIssues: false, suggestionsZh: [] }),
    } as Response);

    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    expect(screen.queryByText("文章大纲")).not.toBeInTheDocument();
    expect(screen.queryByText("写作设置")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑文章主题" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /编辑第 1 个大纲点/u })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();

    const title = screen.getByRole("heading", { level: 1, name: "Education topic" });
    title.textContent = "Updated education topic";
    fireEvent.blur(title);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(WRITING_SETUP_STORAGE_KEY) ?? "{}")).toMatchObject({
        essayTopic: "Updated education topic",
        outlinePoints: ["First", "Second"],
      });
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores local writing archives and keeps archive-menu rename separate from the essay topic", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Existing draft sentence.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "technology",
        essayTopic: "AI topic",
        outlinePoints: ["Point"],
        outline: "Point",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );

    render(<LinguaTypeApp />);

    expect(await screen.findByText("写作存档")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "打开存档操作：AI topic" }));
    fireEvent.click(screen.getByRole("button", { name: "重命名" }));
    const renameInput = screen.getByLabelText("重命名存档：AI topic");
    fireEvent.change(renameInput, { target: { value: "My renamed draft" } });
    fireEvent.keyDown(renameInput, { key: "Enter" });

    await waitFor(() => {
      const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
      expect(archives.items[0].title).toBe("My renamed draft");
      expect(archives.items[0].setup.essayTopic).toBe("AI topic");
    });
    expect(screen.getByText("My renamed draft")).toBeInTheDocument();
    expect(screen.queryByLabelText("重命名存档：AI topic")).not.toBeInTheDocument();
  });

  it("keeps writing archives filtered by domain but listed in one last-modified order without domain tags", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-a",
        items: [
          {
            id: "archive-a",
            title: "Technology older",
            text: "Technology older text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Technology older",
              outlinePoints: ["Technology"],
              outline: "Technology",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T03:00:00.000Z",
          },
          {
            id: "archive-b",
            title: "Custom newest",
            text: "Custom newest text.",
            setup: {
              topicArea: "custom",
              essayTopic: "Custom newest",
              outlinePoints: ["Custom"],
              outline: "Custom",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T01:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    expect(await screen.findByText("写作存档")).toBeInTheDocument();
    const domainSelect = screen.getByRole("combobox", { name: "按领域筛选" });
    expect(screen.queryByRole("combobox", { name: "排序写作存档" })).not.toBeInTheDocument();
    expect(screen.queryByText("最近打开")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("领域：自定义")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("领域：科技")).not.toBeInTheDocument();
    expect(screen.getByLabelText("写作存档列表")).toHaveAttribute("data-archive-motion-duration", "320");

    const customNewest = screen.getByText("Custom newest").closest("button");
    const technologyOlder = screen
      .getAllByText("Technology older")
      .map((element) => element.closest("button"))
      .find(Boolean);

    if (!customNewest || !technologyOlder) {
      throw new Error("Expected archive buttons to be rendered.");
    }
    expect(customNewest).toHaveTextContent("自定义 ·");
    expect(customNewest).toHaveTextContent("3 词");
    expect(Boolean(customNewest.compareDocumentPosition(technologyOlder) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    fireEvent.click(domainSelect);
    const domainListbox = screen.getByRole("listbox", { name: "按领域筛选" });
    expect(domainListbox).toHaveClass("lt-scrollbar-hidden", "fixed", "z-[100]");
    expect(domainListbox.parentElement).toBe(document.body);
    fireEvent.click(screen.getByRole("option", { name: "科技" }));

    expect(screen.getByRole("button", { name: /^Technology older/u })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Custom newest/u })).not.toBeInTheDocument();
  });

  it("keeps archive item actions visible when the title is long", async () => {
    const longTitle =
      "ExtremelyLongArchiveTitleWithoutSpacesThatPreviouslyForcedHorizontalScrollingAndHidTheMenuButton";
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-long",
        items: [
          {
            id: "archive-long",
            title: longTitle,
            text: "Long archive text.",
            setup: {
              topicArea: "custom",
              essayTopic: longTitle,
              outlinePoints: ["Point"],
              outline: "Point",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-15T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    const archiveList = await screen.findByLabelText("写作存档列表");
    expect(archiveList).toHaveClass("overflow-x-hidden");
    const archiveButton = screen.getByRole("button", { name: new RegExp(`^${longTitle}`, "u") });
    const archiveRow = archiveButton.closest("[data-archive-row]");
    expect(archiveRow).toHaveClass("w-full", "min-w-0");
    expect(archiveButton).toHaveClass("min-w-0", "overflow-hidden");
    expect(within(archiveButton).getByText(longTitle)).toHaveClass("max-w-full", "truncate");
    expect(screen.getByRole("button", { name: `打开存档操作：${longTitle}` })).toHaveClass("ml-auto", "shrink-0");
  });

  it("does not reorder archives on switch until the opened archive is edited", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-newer",
        items: [
          {
            id: "archive-newer",
            title: "Newer draft",
            text: "Newer draft text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Newer draft",
              outlinePoints: ["Newer"],
              outline: "Newer",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-15T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
          },
          {
            id: "archive-older",
            title: "Older draft",
            text: "Older draft text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Older draft",
              outlinePoints: ["Older"],
              outline: "Older",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    const newerDraft = await screen.findByRole("button", { name: /^Newer draft/u });
    const olderDraft = screen.getByRole("button", { name: /^Older draft/u });
    expect(Boolean(newerDraft.compareDocumentPosition(olderDraft) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    fireEvent.click(olderDraft);
    await waitFor(() => expectEditorText(screen.getByLabelText("写作编辑器"), "Older draft text."));

    const newerAfterSwitch = screen.getByRole("button", { name: /^Newer draft/u });
    const olderAfterSwitch = screen.getByRole("button", { name: /^Older draft/u });
    expect(Boolean(newerAfterSwitch.compareDocumentPosition(olderAfterSwitch) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);

    setEditorText(screen.getByLabelText("写作编辑器"), "Older draft text. Edited.");

    await waitFor(() => {
      const olderAfterEdit = screen.getByRole("button", { name: /^Older draft/u });
      const newerAfterEdit = screen.getByRole("button", { name: /^Newer draft/u });
      expect(Boolean(olderAfterEdit.compareDocumentPosition(newerAfterEdit) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    });
  });

  it("keeps archive switching local and uses a soft page-turn motion", async () => {
    const longDraft = `${Array.from({ length: 130 }, (_, index) => `word${index}`).join(" ")}.`;
    localStorage.setItem(
      API_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultApiSettings(),
        baseUrl: "https://api.example.test",
        apiKey: "test-key",
        model: "test-model",
      }),
    );
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-current",
        items: [
          {
            id: "archive-current",
            title: "Current long draft",
            text: longDraft,
            setup: {
              topicArea: "technology",
              essayTopic: "Current long draft",
              outlinePoints: ["Point"],
              outline: "Point",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-15T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
          },
          {
            id: "archive-target",
            title: "Target draft",
            text: "Target draft text.",
            setup: {
              topicArea: "education",
              essayTopic: "Target draft",
              outlinePoints: ["Point"],
              outline: "Point",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T00:00:00.000Z",
          },
        ],
      }),
    );

    const fetchMock = vi.mocked(fetch);
    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    fireEvent.click(screen.getByRole("button", { name: /^Target draft/u }));

    await waitFor(() => expectEditorText(screen.getByLabelText("写作编辑器"), "Target draft text."));
    expect(screen.getByLabelText("沉浸式写作区")).toHaveAttribute("data-page-turn-motion", "soft-page-turn");
    expect(screen.getByLabelText("沉浸式写作区")).toHaveAttribute("data-document-motion-reason", "switch");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("toggles low-frequency navigation pages back to the writing editor", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Existing draft sentence.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "technology",
        essayTopic: "AI topic",
        outlinePoints: ["Point"],
        outline: "Point",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );

    render(<LinguaTypeApp />);

    expectEditorText(await screen.findByLabelText("写作编辑器"), "Existing draft sentence.");
    fireEvent.click(screen.getByRole("button", { name: "表达库" }));
    expect(screen.getByRole("heading", { name: "表达库" })).toBeInTheDocument();
    expect(screen.getByLabelText("表达库页面")).toHaveAttribute("data-motion-profile", "library-unified-rise");
    expect(screen.getByLabelText("表达库内容动效")).toHaveAttribute("data-library-motion", "unified-rise");

    fireEvent.click(screen.getByRole("button", { name: "表达库" }));

    expect(screen.getByLabelText("表达库页面")).toHaveAttribute("data-motion-state", "exiting");
    await waitFor(() => expect(screen.getByLabelText("写作编辑器")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "快捷键帮助" }));
    expect(screen.getByRole("heading", { name: "快捷键帮助" })).toBeInTheDocument();
    expect(screen.getByText("增强当前句")).toBeInTheDocument();
    expect(screen.getByText("换一种表达（建议卡展开时）")).toBeInTheDocument();
    expect(screen.getByText("检查本段")).toBeInTheDocument();
    expect(screen.getByText("Ctrl/Cmd + R")).toBeInTheDocument();
    expect(screen.getByText("Ctrl/Cmd + K")).toBeInTheDocument();
  });

  it("uses one motion profile for Learning Library controls and list content", async () => {
    localStorage.setItem(
      LEARNING_LIBRARY_STORAGE_KEY,
      JSON.stringify([
        {
          id: "library-motion-1",
          type: "phrase",
          content: "seize the strategic high ground",
          chineseMeaning: "抢占制高点",
          usageNote: "Used in business or technology writing.",
          sourceSentence: "Major tech companies strive to achieve breakthroughs in core technologies.",
          writingMode: "business",
          createdAt: "2026-05-15T00:00:00.000Z",
          updatedAt: "2026-05-15T00:00:00.000Z",
          useCount: 1,
          favorite: false,
          tags: [],
          difficultyLevel: 4,
        },
      ]),
    );

    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");
    fireEvent.click(screen.getByRole("button", { name: "表达库" }));

    const controls = await screen.findByLabelText("表达库筛选控制区");
    const list = screen.getByLabelText("表达库条目列表");
    expect(controls).toHaveAttribute("data-library-motion-profile", "library-unified-rise");
    expect(list).toHaveAttribute("data-library-motion-profile", "library-unified-rise");
    expect(controls).toHaveAttribute("data-library-motion-duration", "420");
    expect(list).toHaveAttribute("data-library-motion-duration", "420");
    expect(controls).toHaveAttribute("data-library-motion-stagger", "32");
    expect(list).toHaveAttribute("data-library-motion-stagger", "32");
  });

  it("collapses the writing archive sidebar without losing the current editor text", async () => {
    localStorage.setItem(
      API_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        ...defaultApiSettings(),
        baseUrl: "https://api.example.test",
        apiKey: "test-key",
        model: "test-model",
      }),
    );
    localStorage.setItem(DRAFT_STORAGE_KEY, "Existing draft sentence.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "technology",
        essayTopic: "AI topic",
        outlinePoints: ["Point"],
        outline: "Point",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );

    render(<LinguaTypeApp />);

    expectEditorText(await screen.findByLabelText("写作编辑器"), "Existing draft sentence.");
    expect(screen.getByLabelText("LinguaType 工作区布局")).toHaveClass("transition-[grid-template-columns]");
    expect(screen.getByLabelText("写作存档侧边栏")).toHaveAttribute("data-sidebar-motion-state", "expanded");
    const brandButton = screen.getByRole("button", { name: "LinguaType" });
    expect(brandButton.querySelector('[data-brand-logo="wordmark"]')).toHaveClass("h-[84px]", "w-[252px]");
    expect(brandButton.querySelector('[data-brand-logo="wordmark"]')).toHaveAttribute(
      "src",
      "/brand/linguatype-wordmark-light.png",
    );
    const expandedNav = screen.getByLabelText("左侧功能导航");
    expect(expandedNav).toHaveAttribute("data-sidebar-nav-density", "compact");
    expect(expandedNav).toHaveClass("mt-4", "gap-1", "pt-4");
    expect(within(expandedNav).getByRole("button", { name: "写作习惯" })).toHaveClass("py-2");
    const sidebarUtilities = screen.getByLabelText("侧边栏辅助入口");
    expect(sidebarUtilities).toHaveAttribute("data-sidebar-utility-layout", "balanced");
    expect(within(sidebarUtilities).getByRole("button", { name: "触发设置" })).toHaveClass("py-3", "text-sm");
    expect(within(sidebarUtilities).getByRole("button", { name: "触发设置" }).querySelector("svg")).toHaveClass("h-5", "w-5");
    expect(within(sidebarUtilities).getByRole("button", { name: "快捷键帮助" })).toHaveClass("py-3", "text-sm");
    expect(within(sidebarUtilities).getByRole("button", { name: "快捷键帮助" }).querySelector("svg")).toHaveClass(
      "h-5",
      "w-5",
    );

    fireEvent.click(screen.getByRole("button", { name: "收起写作存档" }));

    expect(screen.queryByText("当前存档标题")).not.toBeInTheDocument();
    expect(screen.getByLabelText("写作存档侧边栏")).toHaveAttribute("data-sidebar-motion-state", "collapsed");
    expect(screen.getByLabelText("写作存档侧边栏")).toHaveAttribute("data-sidebar-motion-duration", "360");
    expect(screen.getByRole("button", { name: "展开写作存档" })).toBeInTheDocument();
    const collapsedQuickActions = screen.getByLabelText("折叠侧边栏快捷区");
    expect(Array.from(collapsedQuickActions.children).map((element) => element.getAttribute("aria-label"))).toEqual([
      "LinguaType 标识",
      "展开写作存档",
      "增强当前句",
      "检查本段",
    ]);
    vi.mocked(fetch).mockResolvedValueOnce(response({
      originalParagraph: "Existing draft sentence.",
      revisedParagraph: "Existing draft sentence.",
      hasIssues: false,
      issues: [],
      summary: "No paragraph flow issues found.",
    }));
    fireEvent.click(screen.getByRole("button", { name: "检查本段" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/check-paragraph-flow", expect.anything()));

    vi.mocked(fetch).mockResolvedValueOnce(response({
      finalSentence: "Existing draft sentence.",
      explanationZh: "句子已经自然。",
    }));
    fireEvent.click(screen.getByRole("button", { name: "增强当前句" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/enhance-fast", expect.anything()));
    expect(screen.getByLabelText("LinguaType 标识").tagName).not.toBe("BUTTON");
    expect(screen.getByLabelText("LinguaType 标识").querySelector('[data-brand-logo="mark"]')).toHaveClass(
      "h-11",
      "w-11",
    );
    expect(screen.getByLabelText("LinguaType 标识").querySelector('[data-brand-logo="mark"]')).toHaveAttribute(
      "src",
      "/brand/linguatype-mark-light.png",
    );
    expect(screen.getByLabelText("LinguaType 标识")).not.toHaveClass("bg-[var(--lt-surface-soft)]");
    expectEditorText(screen.getByLabelText("写作编辑器"), "Existing draft sentence.");

    fireEvent.click(screen.getByRole("button", { name: "展开写作存档" }));

    expect(screen.getByLabelText("写作存档侧边栏")).toHaveAttribute("data-sidebar-motion-state", "expanded");
    expect(screen.getByLabelText("写作存档侧边栏")).toHaveAttribute("data-sidebar-motion-duration", "460");
  });

  it("animates archive list changes after search, filter, and creating a new draft", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-a",
        items: [
          {
            id: "archive-a",
            title: "Technology draft",
            text: "AI changes learning.",
            setup: {
              topicArea: "technology",
              essayTopic: "Technology draft",
              outlinePoints: ["Technology"],
              outline: "Technology",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-15T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
          },
          {
            id: "archive-b",
            title: "History draft",
            text: "History shapes society.",
            setup: {
              topicArea: "history",
              essayTopic: "History draft",
              outlinePoints: ["History"],
              outline: "History",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    expect(await screen.findByText("写作存档")).toBeInTheDocument();
    const archiveList = screen.getByLabelText("写作存档列表");
    expect(archiveList).toHaveAttribute("data-archive-appear-animation", "soft-list-rise");
    expect(within(archiveList).getByText("Technology draft")).toHaveClass("font-serif");

    fireEvent.change(screen.getByLabelText("搜索写作存档"), { target: { value: "history" } });

    expect(screen.getByLabelText("写作存档列表")).toHaveAttribute("data-archive-motion-reason", "search");
    expect(screen.getByRole("button", { name: /^History draft/u })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("搜索写作存档"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("combobox", { name: "按领域筛选" }));
    fireEvent.click(screen.getByRole("option", { name: "科技" }));

    expect(screen.getByLabelText("写作存档列表")).toHaveAttribute("data-archive-motion-reason", "filter");

    fireEvent.click(screen.getByRole("button", { name: "新建" }));

    expect(screen.getByLabelText("写作存档列表")).toHaveAttribute("data-archive-motion-reason", "create");
    expect(screen.getByLabelText("沉浸式写作区")).toHaveAttribute("data-document-motion-reason", "new");
  });

  it("does not overwrite existing localStorage archives or API settings during hydration", async () => {
    const existingApiSettings = {
      ...defaultApiSettings(),
      baseUrl: "https://open.bigmodel.cn",
      apiKey: "persisted-key",
      model: "glm-5.1",
      maxTokens: 20000,
    };
    const rawArchiveStorage = "not-json-but-do-not-delete";
    localStorage.setItem(API_SETTINGS_STORAGE_KEY, JSON.stringify(existingApiSettings));
    localStorage.setItem(WRITING_ARCHIVES_STORAGE_KEY, rawArchiveStorage);

    render(<LinguaTypeApp />);

    await screen.findByLabelText("写作编辑器");

    expect(localStorage.getItem(API_SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(existingApiSettings));
    expect(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY)).toBe(rawArchiveStorage);
  });

  it("uses one native long-text editor while keeping the document title in flow", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Opening paragraph.\n\nSecond paragraph.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "education",
        essayTopic: "AI topic",
        outlinePoints: ["Context", "Counterpoint"],
        outline: "Context\nCounterpoint",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );

    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("沉浸式写作区")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "AI topic" })).toBeInTheDocument();
    const metadata = screen.getByText(/最后修改/u).closest("[data-document-metadata='true']");
    expect(metadata).toBeTruthy();
    expect(metadata).toHaveClass("text-[11px]", "text-[var(--lt-faint)]");
    expect(metadata).toHaveTextContent("4 词");
    expect(metadata).toHaveTextContent("2 句");
    expect(metadata).toHaveTextContent("2 段");
    expect(metadata).toHaveTextContent("教育");
    expect(screen.queryByRole("heading", { level: 2, name: /Context/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: /Counterpoint/ })).not.toBeInTheDocument();

    setEditorText(screen.getByLabelText("写作编辑器"), "Opening paragraph.\n\nUpdated second paragraph.");

    await waitFor(() => {
      const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
      expect(archives.items[0].text).toBe("Opening paragraph.\n\nUpdated second paragraph.");
    });
  });

  it("keeps the immersive editor region available after collapsing writing archives", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Focused draft sentence.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "technology",
        essayTopic: "Focused topic",
        outlinePoints: ["Focus"],
        outline: "Focus",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );

    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "收起写作存档" }));

    expect(screen.getByRole("button", { name: "展开写作存档" })).toBeInTheDocument();
    expect(screen.getByLabelText("沉浸式写作区")).toBeInTheDocument();
    expectEditorText(screen.getByLabelText("写作编辑器"), "Focused draft sentence.");
  });

  it("deletes the active archive from the item menu and switches to the most recently opened remaining archive", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-b",
        items: [
          {
            id: "archive-a",
            title: "Draft A",
            text: "Archive A text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Topic A",
              outlinePoints: ["A"],
              outline: "A",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T01:00:00.000Z",
          },
          {
            id: "archive-b",
            title: "Draft B",
            text: "Archive B text.",
            setup: {
              topicArea: "education",
              essayTopic: "Topic B",
              outlinePoints: ["B"],
              outline: "B",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T02:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    expectEditorText(await screen.findByLabelText("写作编辑器"), "Archive B text.");
    fireEvent.click(screen.getByRole("button", { name: "打开存档操作：Draft B" }));
    fireEvent.click(screen.getByRole("button", { name: "删除存档" }));
    const confirmation = screen.getByLabelText("删除存档确认");
    expect(confirmation).toHaveClass("bg-transparent");
    expect(confirmation).not.toHaveClass("rounded-md");
    expect(confirmation).not.toHaveClass("bg-red-500/[0.08]");
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认删除存档" }));

    await waitFor(() => expectEditorText(screen.getByLabelText("写作编辑器"), "Archive A text."));
    const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
    expect(archives.activeId).toBe("archive-a");
    expect(archives.items).toHaveLength(1);
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps archive action menus above later archive rows and does not switch when requesting delete", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-a",
        items: [
          {
            id: "archive-a",
            title: "Draft A",
            text: "Archive A text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Draft A",
              outlinePoints: ["A"],
              outline: "A",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-15T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
          },
          {
            id: "archive-b",
            title: "Draft B",
            text: "Archive B text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Draft B",
              outlinePoints: ["B"],
              outline: "B",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T00:00:00.000Z",
          },
          {
            id: "archive-c",
            title: "Draft C",
            text: "Archive C text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Draft C",
              outlinePoints: ["C"],
              outline: "C",
              updatedAt: "2026-05-13T00:00:00.000Z",
            },
            createdAt: "2026-05-13T00:00:00.000Z",
            updatedAt: "2026-05-13T00:00:00.000Z",
            lastOpenedAt: "2026-05-13T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    expectEditorText(await screen.findByLabelText("写作编辑器"), "Archive A text.");
    const archiveRow = screen.getByRole("button", { name: /^Draft B/u }).closest("[data-archive-row]");

    fireEvent.click(screen.getByRole("button", { name: "打开存档操作：Draft B" }));

    expect(archiveRow).toHaveClass("z-50");
    expect(screen.getByLabelText("存档操作菜单：Draft B")).toHaveClass(
      "z-[60]",
      "pointer-events-auto",
      "rounded-2xl",
      "backdrop-blur-xl",
    );
    expect(screen.getByLabelText("存档操作菜单：Draft B")).toHaveAttribute("data-archive-menu-design", "editorial-soft");
    expect(screen.getByLabelText("存档操作菜单：Draft B")).toHaveAttribute("data-archive-menu-motion", "soft-popover");

    fireEvent.click(screen.getByRole("button", { name: "删除存档" }));

    expectEditorText(screen.getByLabelText("写作编辑器"), "Archive A text.");
    expect(JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}").activeId).toBe("archive-a");
    expect(screen.getByLabelText("删除存档确认")).toBeInTheDocument();
  });

  it("assigns an existing archive to a domain through drag and drop", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-a",
        items: [
          {
            id: "archive-a",
            title: "Draft A",
            text: "Archive A text.",
            setup: {
              topicArea: "custom",
              essayTopic: "Draft A",
              outlinePoints: ["A"],
              outline: "A",
              updatedAt: "2026-05-15T00:00:00.000Z",
            },
            createdAt: "2026-05-15T00:00:00.000Z",
            updatedAt: "2026-05-15T00:00:00.000Z",
            lastOpenedAt: "2026-05-15T00:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    const archiveRow = (await screen.findByRole("button", { name: /^Draft A/u })).closest("[data-archive-row]");
    if (!archiveRow) {
      throw new Error("Expected archive row.");
    }
    expect(archiveRow).toHaveAttribute("draggable", "true");

    const dataTransfer = {
      effectAllowed: "",
      dropEffect: "",
      setData: vi.fn(),
      getData: vi.fn(() => "archive-a"),
    };

    fireEvent.dragStart(archiveRow, { dataTransfer });
    expect(screen.getByLabelText("领域投放区")).toHaveAttribute("data-domain-drop-visible", "true");
    expect(screen.getByLabelText("领域投放区")).toHaveAttribute("data-domain-drop-motion", "slow-soft-reveal");
    expect(screen.getByLabelText("领域投放区")).toHaveAttribute("data-domain-drop-duration", "420");
    expect(archiveRow).toHaveAttribute("data-archive-drag-state", "dragging");
    expect(archiveRow).toHaveAttribute("data-archive-drag-preview", "compact-strip");
    expect(screen.getByRole("button", { name: "归入科技领域" })).toHaveAttribute("data-domain-drop-target", "technology");

    fireEvent.dragOver(screen.getByRole("button", { name: "归入科技领域" }), { dataTransfer });
    fireEvent.drop(screen.getByRole("button", { name: "归入科技领域" }), { dataTransfer });

    const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
    expect(archives.items[0].setup.topicArea).toBe("technology");
    expect(archives.items[0].topicAreaSource).toBe("manual");
    expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "archive-a");
    expect(screen.getByLabelText("领域投放区")).toHaveAttribute("data-domain-drop-feedback", "success");
    expect(screen.getByLabelText("领域投放区")).toHaveAttribute("data-domain-drop-feedback-domain", "technology");
    expect(screen.getByText("已归入科技领域")).toHaveAttribute("data-domain-feedback-motion", "pop");
    expect(screen.getByText("已归入科技领域")).toHaveAttribute("data-motion-library", "animejs");
    expect(screen.getByText("已归入科技领域")).toBeInTheDocument();
  });

  it("closes archive item menus when clicking outside", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Existing draft sentence.");
    localStorage.setItem(
      WRITING_SETUP_STORAGE_KEY,
      JSON.stringify({
        topicArea: "technology",
        essayTopic: "AI topic",
        outlinePoints: ["Point"],
        outline: "Point",
        updatedAt: "2026-05-14T00:00:00.000Z",
      }),
    );

    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "打开存档操作：AI topic" }));
    expect(screen.getByRole("button", { name: "删除存档" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => expect(screen.queryByRole("button", { name: "删除存档" })).not.toBeInTheDocument());
  });

  it("creates a blank archive after deleting the only archive", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "archive-only",
        items: [
          {
            id: "archive-only",
            title: "Only Draft",
            text: "Only archive text.",
            setup: {
              topicArea: "technology",
              essayTopic: "Only topic",
              outlinePoints: ["Only point"],
              outline: "Only point",
              updatedAt: "2026-05-14T00:00:00.000Z",
            },
            createdAt: "2026-05-14T00:00:00.000Z",
            updatedAt: "2026-05-14T00:00:00.000Z",
            lastOpenedAt: "2026-05-14T02:00:00.000Z",
          },
        ],
      }),
    );

    render(<LinguaTypeApp />);

    expectEditorText(await screen.findByLabelText("写作编辑器"), "Only archive text.");
    fireEvent.click(screen.getByRole("button", { name: "打开存档操作：Only Draft" }));
    fireEvent.click(screen.getByRole("button", { name: "删除存档" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除存档" }));

    await waitFor(() => expectEditorText(screen.getByLabelText("写作编辑器"), ""));
    const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
    expect(archives.items).toHaveLength(1);
    expect(archives.items[0].title).toBe("未命名写作");
    expect(archives.activeId).toBe(archives.items[0].id);
  });
});
