import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinguaTypeApp } from "./LinguaTypeApp";
import {
  CORRECTION_EVENTS_STORAGE_KEY,
  DRAFT_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
  THEME_SETTINGS_STORAGE_KEY,
  WRITING_ARCHIVES_STORAGE_KEY,
  WRITING_SETUP_STORAGE_KEY,
} from "@/lib/storage";

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

describe("LinguaType v0.2.5 writing setup", () => {
  it("shows Chinese-only setup, saves outline points, and opens segmented editor", async () => {
    render(<LinguaTypeApp />);

    expect(await screen.findByText("写作准备")).toBeInTheDocument();
    expect(screen.queryByLabelText("写作编辑器")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "艺术" }));
    fireEvent.change(screen.getByLabelText("文章主题"), { target: { value: "How art education shapes creativity" } });
    fireEvent.change(screen.getByLabelText("第 1 点"), { target: { value: "Creativity" } });
    fireEvent.change(screen.getByLabelText("第 2 点"), { target: { value: "Confidence" } });
    fireEvent.click(screen.getByRole("button", { name: "进入写作" }));

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    expect(screen.getByLabelText("第 2 段正文")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(WRITING_SETUP_STORAGE_KEY) ?? "{}")).toMatchObject({
      topicArea: "art",
      essayTopic: "How art education shapes creativity",
      outlinePoints: ["Creativity", "Confidence"],
      outline: "Creativity\nConfidence",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fills a preset topic from the selected writing area", async () => {
    render(<LinguaTypeApp />);

    fireEvent.click(await screen.findByRole("button", { name: "科技" }));
    fireEvent.click(screen.getByRole("button", { name: "换一个主题" }));

    expect(screen.getByLabelText("文章主题")).not.toHaveValue("");
  });

  it("allows continuing a local draft without creating learning data", async () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "Existing draft sentence.");
    render(<LinguaTypeApp />);

    expect(await screen.findByText("写作准备")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "继续上次写作" }));
    const editor = await screen.findByLabelText("写作编辑器");
    expect(editor).toHaveValue("Existing draft sentence.");
    expect(localStorage.getItem(WRITING_SETUP_STORAGE_KEY)).toBeNull();
  });
});

describe("LinguaType v0.2.5 theme preference", () => {
  it("saves dark theme preference from the writing page and applies it to the document root", async () => {
    render(<LinguaTypeApp />);

    fireEvent.change(await screen.findByLabelText("文章主题"), { target: { value: "A topic" } });
    fireEvent.change(screen.getByLabelText("第 1 点"), { target: { value: "First point" } });
    fireEvent.click(screen.getByRole("button", { name: "进入写作" }));

    fireEvent.change(await screen.findByLabelText("界面主题"), { target: { value: "dark" } });

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("dark"));
    expect(document.documentElement.dataset.themePreference).toBe("dark");
    expect(JSON.parse(localStorage.getItem(THEME_SETTINGS_STORAGE_KEY) ?? "{}").preference).toBe("dark");
  });

  it("does not show theme settings on the setup page", async () => {
    render(<LinguaTypeApp />);

    expect(await screen.findByText("写作准备")).toBeInTheDocument();
    expect(screen.queryByLabelText("界面主题")).not.toBeInTheDocument();
  });
});

describe("LinguaType v0.2.7 editor shell", () => {
  it("edits topic and outline inline and checks outline only after confirm", async () => {
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
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "编辑文章主题" }));
    fireEvent.change(screen.getByLabelText("内联文章主题"), { target: { value: "Updated education topic" } });
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "保存主题" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "编辑第 1 个大纲点" }));
    fireEvent.change(screen.getByLabelText("内联第 1 个大纲点"), { target: { value: "Updated first" } });
    expect(fetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "保存大纲点" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(localStorage.getItem(WRITING_SETUP_STORAGE_KEY) ?? "{}")).toMatchObject({
      essayTopic: "Updated education topic",
      outlinePoints: ["Updated first", "Second"],
    });
  });

  it("stores local writing archives and allows renaming without changing essay topic", async () => {
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
    fireEvent.change(screen.getByLabelText("当前存档标题"), { target: { value: "My renamed draft" } });

    await waitFor(() => {
      const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
      expect(archives.items[0].title).toBe("My renamed draft");
      expect(archives.items[0].setup.essayTopic).toBe("AI topic");
    });
  });

  it("collapses the writing archive sidebar without losing the current editor text", async () => {
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

    expect(await screen.findByLabelText("写作编辑器")).toHaveValue("Existing draft sentence.");
    fireEvent.click(screen.getByRole("button", { name: "收起写作存档" }));

    expect(screen.queryByText("当前存档标题")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "展开写作存档" })).toBeInTheDocument();
    expect(screen.getByLabelText("写作编辑器")).toHaveValue("Existing draft sentence.");
  });

  it("uses an immersive document flow with topic and outline headings while preserving paragraph joining", async () => {
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
    expect(screen.getByRole("heading", { level: 2, name: /Context/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /Counterpoint/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("第 2 段正文"), { target: { value: "Updated second paragraph." } });

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
    expect(screen.getByLabelText("写作编辑器")).toHaveValue("Focused draft sentence.");
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

    expect(await screen.findByLabelText("写作编辑器")).toHaveValue("Archive B text.");
    fireEvent.click(screen.getByRole("button", { name: "打开存档操作：Draft B" }));
    fireEvent.click(screen.getByRole("button", { name: "删除存档" }));
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认删除存档" }));

    await waitFor(() => expect(screen.getByLabelText("写作编辑器")).toHaveValue("Archive A text."));
    const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
    expect(archives.activeId).toBe("archive-a");
    expect(archives.items).toHaveLength(1);
    expect(localStorage.getItem(LEARNING_LIBRARY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(CORRECTION_EVENTS_STORAGE_KEY)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
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

    expect(await screen.findByLabelText("写作编辑器")).toHaveValue("Only archive text.");
    fireEvent.click(screen.getByRole("button", { name: "打开存档操作：Only Draft" }));
    fireEvent.click(screen.getByRole("button", { name: "删除存档" }));
    fireEvent.click(screen.getByRole("button", { name: "确认删除存档" }));

    await waitFor(() => expect(screen.getByLabelText("写作编辑器")).toHaveValue(""));
    const archives = JSON.parse(localStorage.getItem(WRITING_ARCHIVES_STORAGE_KEY) ?? "{}");
    expect(archives.items).toHaveLength(1);
    expect(archives.items[0].title).toBe("未命名写作");
    expect(archives.activeId).toBe(archives.items[0].id);
  });
});
