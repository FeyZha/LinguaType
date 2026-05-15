import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultTriggerSettings } from "@/lib/storage";
import type { ProofreadingResult } from "@/lib/proofreading";
import { WritingEditor } from "./WritingEditor";

const proofreadingResult: ProofreadingResult = {
  stats: {
    characterCount: 0,
    englishWordCount: 0,
    sentenceCount: 0,
    paragraphCount: 0,
  },
  signals: [],
};

function renderEditor(overrides: Partial<React.ComponentProps<typeof WritingEditor>> = {}) {
  const props: React.ComponentProps<typeof WritingEditor> = {
    value: "Opening paragraph.\n\nSecond paragraph.",
    outlinePoints: ["Intro", "Argument"],
    isLoading: false,
    writingMode: "natural",
    enhancementLevel: "balanced",
    proofreadingResult,
    triggerSettings: defaultTriggerSettings(),
    onChange: vi.fn(),
    onWritingModeChange: vi.fn(),
    onEnhancementLevelChange: vi.fn(),
    onEnhance: vi.fn(),
    onOpenExpressionMenu: vi.fn(),
    onCloseExpressionMenu: vi.fn(),
    onSelectionChange: vi.fn(),
    outlineEditState: null,
    onStartOutlineEdit: vi.fn(),
    onOutlineDraftChange: vi.fn(),
    onSaveOutlineEdit: vi.fn(),
    onCancelOutlineEdit: vi.fn(),
    onAddOutlinePoint: vi.fn(),
    onDeleteOutlinePoint: vi.fn(),
    onEscape: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<WritingEditor {...props} />),
    props,
  };
}

describe("WritingEditor contentEditable document model", () => {
  it("renders paragraph text as contentEditable document blocks", () => {
    renderEditor();

    expect(screen.getByLabelText("写作编辑器")).toHaveAttribute("contenteditable", "true");
    expect(screen.getByLabelText("第 2 段正文")).toHaveAttribute("contenteditable", "true");
    expect(screen.queryByRole("textbox", { name: "写作编辑器" })).toBeInTheDocument();
  });

  it("joins edited contentEditable paragraph blocks with blank lines", () => {
    const onChange = vi.fn();
    renderEditor({ onChange });

    const secondParagraph = screen.getByLabelText("第 2 段正文");
    secondParagraph.textContent = "Updated second paragraph.";
    fireEvent.input(secondParagraph);

    expect(onChange).toHaveBeenCalledWith("Opening paragraph.\n\nUpdated second paragraph.");
  });

  it("keeps sentence enhancement shortcuts on the contentEditable block", () => {
    const onEnhance = vi.fn();
    renderEditor({ onEnhance });

    fireEvent.keyDown(screen.getByLabelText("写作编辑器"), { key: "Enter", ctrlKey: true });

    expect(onEnhance).toHaveBeenCalledTimes(1);
  });

  it("renders a compact three-zone bottom writing status bar with centered Chinese proofreading", () => {
    renderEditor({
      value: "Opening paragraph.\n\nSecond paragraph.",
      proofreadingResult: {
        ...proofreadingResult,
        signals: [
          {
            id: "long-sentence-1",
            type: "length",
            titleZh: "句子偏长 Sentence length",
            messageZh: "Sentence is long.",
            excerpt: "Opening paragraph.",
            start: 0,
            end: 17,
          },
        ],
      },
    });

    const statusBar = screen.getByLabelText("写作状态栏");
    expect(statusBar).toHaveClass("sticky", "bottom-0");
    expect(statusBar).toHaveAttribute("data-status-layout", "balanced-editorial");
    expect(statusBar).toHaveClass("grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)]", "py-1");
    expect(statusBar).toHaveTextContent("文本校对：1 个问题");
    expect(statusBar).not.toHaveTextContent("Proofreading");

    const leftStatus = screen.getByLabelText("写作状态栏左侧");
    const proofreadingStatus = screen.getByLabelText("写作状态栏文本校对");
    const rightStatus = screen.getByLabelText("写作状态栏右侧");
    const statsStatus = screen.getByLabelText("写作统计");
    const controlStatus = screen.getByLabelText("写作控制状态");

    expect(leftStatus.textContent?.indexOf("4 words")).toBeLessThan(leftStatus.textContent?.indexOf("模式：自然") ?? 0);
    expect(statsStatus).toHaveTextContent("4 words");
    expect(statsStatus).toHaveTextContent("2 sentences");
    expect(statsStatus).toHaveTextContent("2 paragraphs");
    expect(controlStatus.textContent?.indexOf("模式：自然")).toBeLessThan(
      controlStatus.textContent?.indexOf("强度：平衡") ?? 0,
    );
    expect(proofreadingStatus).toHaveClass("rounded-full", "bg-[var(--lt-surface-soft)]", "px-3");
    expect(proofreadingStatus).toHaveTextContent("文本校对：1 个问题");
    expect(rightStatus.textContent?.indexOf("触发：Ctrl/Cmd + Enter")).toBeLessThan(
      rightStatus.textContent?.indexOf("领域：自定义") ?? 0,
    );
  });

  it("opens separate upward menus for mode and enhancement level without changing status bar content", () => {
    renderEditor();

    const statusBar = screen.getByLabelText("写作状态栏");
    fireEvent.click(screen.getByRole("button", { name: "模式：自然" }));

    expect(screen.getByRole("menu", { name: "写作模式选择" })).toHaveClass(
      "bottom-[calc(100%+10px)]",
      "min-w-52",
      "rounded-2xl",
      "backdrop-blur-xl",
    );
    expect(screen.getByRole("menu", { name: "写作模式选择" })).toHaveAttribute("data-status-menu-motion", "soft-rounded-popover");
    expect(screen.getByRole("menu", { name: "写作模式选择" })).toHaveAttribute("data-status-menu-state", "open");
    expect(screen.getByRole("menuitemradio", { name: "雅思" })).toBeInTheDocument();
    expect(screen.getByText("日常表达，保持自然语气")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "自然" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "自然" })).toHaveAttribute("data-status-menu-selected", "true");
    expect(screen.getByRole("menuitemradio", { name: "自然" })).toHaveClass("rounded-xl", "bg-[var(--lt-surface-soft)]");
    expect(screen.queryByRole("menu", { name: "增强强度选择" })).not.toBeInTheDocument();
    expect(statusBar).toHaveTextContent("强度：平衡");

    fireEvent.click(screen.getByRole("button", { name: "强度：平衡" }));

    expect(screen.getByRole("menu", { name: "增强强度选择" })).toHaveClass(
      "bottom-[calc(100%+10px)]",
      "min-w-52",
      "rounded-2xl",
      "backdrop-blur-xl",
    );
    expect(screen.getByRole("menu", { name: "增强强度选择" })).toHaveAttribute(
      "data-status-menu-motion",
      "soft-rounded-popover",
    );
    expect(screen.getByRole("menuitemradio", { name: "轻度" })).toBeInTheDocument();
    expect(screen.getByText("兼顾自然度和准确度")).toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: "平衡" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemradio", { name: "平衡" })).toHaveAttribute("data-status-menu-selected", "true");
    expect(screen.queryByRole("menu", { name: "写作模式选择" })).not.toBeInTheDocument();
    expect(statusBar).toHaveTextContent("模式：自然");

    fireEvent.mouseDown(document.body);

    expect(screen.getByRole("menu", { name: "增强强度选择" })).toHaveAttribute("data-status-menu-state", "closing");
    return waitFor(() => expect(screen.queryByRole("menu", { name: "增强强度选择" })).not.toBeInTheDocument());
  });
});
