import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProofreadingResult } from "@/lib/proofreading";
import { defaultTriggerSettings } from "@/lib/storage";

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
    onSelectionChange: vi.fn(),
    onEscape: vi.fn(),
    ...overrides,
  };

  return {
    ...render(<WritingEditor {...props} />),
    props,
  };
}

describe("WritingEditor native long-text input", () => {
  it("renders the draft as one long textarea writing surface", () => {
    renderEditor();

    const editor = screen.getByRole("textbox", { name: "写作编辑器" });
    expect(editor).toBeInstanceOf(HTMLTextAreaElement);
    expect(editor).toHaveValue("Opening paragraph.\n\nSecond paragraph.");
    expect(screen.queryByLabelText("第 2 段正文")).not.toBeInTheDocument();
    expect(screen.queryByText("Intro")).not.toBeInTheDocument();
  });

  it("emits the whole long text when the writing surface changes", () => {
    const onChange = vi.fn();
    renderEditor({ onChange });

    const editor = screen.getByLabelText("写作编辑器");
    fireEvent.change(editor, {
      target: { value: "Updated opening.\n\nUpdated second paragraph." },
    });

    expect(onChange).toHaveBeenCalledWith("Updated opening.\n\nUpdated second paragraph.");
  });

  it("keeps the native cursor at the typed position after controlled value sync", () => {
    const onChange = vi.fn();
    const { rerender, props } = renderEditor({ value: "Draft sentence", onChange });
    const editor = screen.getByLabelText("写作编辑器") as HTMLTextAreaElement;

    editor.setSelectionRange("Draft sentence".length, "Draft sentence".length);
    fireEvent.change(editor, { target: { value: "Draft sentence continues" } });
    rerender(<WritingEditor {...props} value="Draft sentence continues" />);

    expect(onChange).toHaveBeenCalledWith("Draft sentence continues");
    expect(editor.selectionStart).toBe("Draft sentence continues".length);
    expect(editor.selectionEnd).toBe("Draft sentence continues".length);
  });

  it("keeps sentence enhancement shortcuts on the textarea", () => {
    const onEnhance = vi.fn();
    renderEditor({ onEnhance });

    fireEvent.keyDown(screen.getByLabelText("写作编辑器"), {
      key: "Enter",
      ctrlKey: true,
    });

    expect(onEnhance).toHaveBeenCalledTimes(1);
  });

  it("keeps placeholder suggestions inline with lightweight keyboard actions", () => {
    const onApplySuggestionShortcut = vi.fn();
    const onRegenerateSuggestionShortcut = vi.fn();
    renderEditor({
      placeholderNotice: "我看到了：中文占位会在完整句子后给建议。",
      inlineSuggestion: (
        <div aria-label="当前句建议 Current Sentence">更自然的表达</div>
      ),
      onApplySuggestionShortcut,
      onRegenerateSuggestionShortcut,
    });

    const editor = screen.getByLabelText("写作编辑器");
    expect(screen.queryByLabelText("中文占位弱提示")).not.toBeInTheDocument();
    expect(screen.getByLabelText("当前句建议 Current Sentence")).toHaveTextContent("更自然的表达");

    fireEvent.keyDown(editor, { key: "Tab" });
    fireEvent.keyDown(editor, { key: "r", metaKey: true });

    expect(onApplySuggestionShortcut).toHaveBeenCalledTimes(1);
    expect(onRegenerateSuggestionShortcut).toHaveBeenCalledTimes(1);
  });

  it("keeps suggestion markers visual-only so text clicks still belong to the textarea", () => {
    const onOpen = vi.fn();
    const value = "I found that many students lack 自主学习能力.";
    const start = value.indexOf("自主学习能力");
    renderEditor({
      value,
      suggestionMarkers: [
        {
          id: "marker-1",
          range: { start, end: start + "自主学习能力".length },
          state: "available",
          onOpen,
        },
      ],
    });

    const editor = screen.getByLabelText("写作编辑器");
    expect(editor).toHaveAttribute("data-input-mode", "native-document");
    expect(editor).toHaveClass("lt-writing-textarea");
    expect(screen.getByLabelText("写作区")).toHaveAttribute("data-input-priority", "textarea-first");

    const positionProbe = screen.getByText("自主学习能力");
    expect(positionProbe.tagName).toBe("SPAN");
    expect(positionProbe).toHaveAttribute("data-input-overlay", "position-probe");
    expect(positionProbe).toHaveAttribute("aria-hidden", "true");
    expect(positionProbe).toHaveClass("pointer-events-none", "border-0");
    expect(screen.queryByLabelText("查看当前句 AI 建议虚线")).not.toBeInTheDocument();

    fireEvent.click(positionProbe);
    expect(onOpen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("查看当前句 AI 建议"));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("renders a compact bottom writing status bar with proofreading pinned to the right", () => {
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
    expect(statusBar).toHaveClass("grid-cols-[minmax(0,1fr)_auto]", "py-1");

    const leftStatus = screen.getByLabelText("写作状态栏左侧");
    const proofreadingStatus = screen.getByLabelText("写作状态栏文本校对");
    const triggerDomainStatus = screen.getByLabelText("写作状态栏触发与领域");
    const statsStatus = screen.getByLabelText("写作统计");
    const controlStatus = screen.getByLabelText("写作控制状态");

    expect(statsStatus).toHaveTextContent("4 words");
    expect(statsStatus).toHaveTextContent("2 sentences");
    expect(statsStatus).toHaveTextContent("2 paragraphs");
    expect(leftStatus.textContent?.indexOf("4 words")).toBeLessThan(
      leftStatus.textContent?.indexOf("模式：自然") ?? 0,
    );
    expect(controlStatus.textContent?.indexOf("模式：自然")).toBeLessThan(
      controlStatus.textContent?.indexOf("强度：平衡") ?? 0,
    );
    expect(triggerDomainStatus.textContent?.indexOf("触发：Ctrl/Cmd + Enter")).toBeLessThan(
      triggerDomainStatus.textContent?.indexOf("领域：自定义") ?? 0,
    );
    expect(proofreadingStatus).not.toHaveClass("rounded-full", "bg-[var(--lt-surface-soft)]", "px-3");
    expect(proofreadingStatus).toHaveClass("justify-self-end");
    expect(proofreadingStatus).toHaveTextContent("文本校对：1 个问题");
    expect(statusBar).not.toHaveTextContent("Proofreading");
  });

  it("opens lightweight upward menus for mode and enhancement level", async () => {
    const onWritingModeChange = vi.fn();
    const onEnhancementLevelChange = vi.fn();
    renderEditor({ onWritingModeChange, onEnhancementLevelChange });

    fireEvent.click(screen.getByRole("button", { name: "模式：自然" }));
    expect(screen.getByText("写作模式")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "学术" }));
    expect(onWritingModeChange).toHaveBeenCalledWith("academic");

    fireEvent.click(screen.getByRole("button", { name: "强度：平衡" }));
    expect(screen.getByText("增强强度")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: "润色" }));
    expect(onEnhancementLevelChange).toHaveBeenCalledWith("polished");

    await waitFor(() => expect(screen.queryByText("增强强度")).not.toBeInTheDocument());
  });
});
