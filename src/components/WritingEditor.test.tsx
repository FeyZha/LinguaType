import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createWordDiff } from "@/lib/sentence";
import { defaultTriggerSettings } from "@/lib/storage";
import { calculateSelectionPopoverPosition } from "./LinguaTypeApp";

vi.mock("animejs/waapi", () => ({
  waapi: {
    animate: vi.fn(),
  },
}));

import { WritingEditor } from "./WritingEditor";

function renderEditor(overrides: Partial<React.ComponentProps<typeof WritingEditor>> = {}) {
  const props: React.ComponentProps<typeof WritingEditor> = {
    value: "Opening paragraph.\n\nSecond paragraph.",
    outlinePoints: ["Intro", "Argument"],
    isLoading: false,
    writingMode: "natural",
    enhancementLevel: "balanced",
    triggerSettings: defaultTriggerSettings(),
    onChange: vi.fn(),
    onWritingModeChange: vi.fn(),
    onEnhancementLevelChange: vi.fn(),
    onEnhance: vi.fn(),
    onCheckCurrentParagraph: vi.fn(),
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

    const editor = screen.getByRole("textbox");
    expect(editor).toBeInstanceOf(HTMLTextAreaElement);
    expect(editor).toHaveValue("Opening paragraph.\n\nSecond paragraph.");
    expect(screen.queryByText("Intro")).not.toBeInTheDocument();
  });

  it("emits the whole long text when the writing surface changes", () => {
    const onChange = vi.fn();
    renderEditor({ onChange });

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Updated opening.\n\nUpdated second paragraph." },
    });

    expect(onChange).toHaveBeenCalledWith("Updated opening.\n\nUpdated second paragraph.");
  });

  it("keeps the native cursor at the typed position after controlled value sync", () => {
    const onChange = vi.fn();
    const { rerender, props } = renderEditor({ value: "Draft sentence", onChange });
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;

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

    fireEvent.keyDown(screen.getByRole("textbox"), {
      key: "Enter",
      ctrlKey: true,
    });

    expect(onEnhance).toHaveBeenCalledTimes(1);
  });

  it("uses Ctrl/Cmd + K for current paragraph checking", () => {
    const onCheckCurrentParagraph = vi.fn();
    renderEditor({ onCheckCurrentParagraph });

    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    editor.setSelectionRange(3, 3);
    fireEvent.keyDown(editor, { key: "k", ctrlKey: true });

    expect(onCheckCurrentParagraph).toHaveBeenCalledWith(3);
  });

  it("keeps placeholder suggestions inline with lightweight keyboard actions", () => {
    const onApplySuggestionShortcut = vi.fn();
    const onRegenerateSuggestionShortcut = vi.fn();
    renderEditor({
      placeholderNotice: "我看到了：中文占位会在完整句子后给建议。",
      inlineSuggestion: <div aria-label="当前句建议 Current Sentence">更自然的表达</div>,
      onApplySuggestionShortcut,
      onRegenerateSuggestionShortcut,
    });

    const editor = screen.getByRole("textbox");
    expect(screen.queryByText("中文占位弱提示")).not.toBeInTheDocument();
    expect(screen.getByText("更自然的表达")).toBeInTheDocument();

    fireEvent.keyDown(editor, { key: "Tab" });
    fireEvent.keyDown(editor, { key: "r", metaKey: true });

    expect(onApplySuggestionShortcut).toHaveBeenCalledTimes(1);
    expect(onRegenerateSuggestionShortcut).toHaveBeenCalledTimes(1);
  });

  it("estimates selection anchor rect from range and places the selection popup above", () => {
    const onSelectionChange = vi.fn();
    renderEditor({
      value: "This is a two-line text.\nSecond line content.",
      onSelectionChange,
    });
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    const originalGetComputedStyle = window.getComputedStyle;
    const spy = vi.spyOn(window, "getComputedStyle").mockImplementation((target: Element) => {
      if (target === editor) {
        return {
          ...(originalGetComputedStyle(editor) as CSSStyleDeclaration),
          fontSize: "20px",
          lineHeight: "40px",
          paddingTop: "10px",
          paddingLeft: "5px",
        } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(target);
    });

    Object.defineProperty(editor, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(80, 130, 640, 220),
    });

    editor.setSelectionRange(6, 13, "forward");
    fireEvent.mouseUp(editor);

    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    const snapshot = onSelectionChange.mock.calls[0]?.[0];
    expect(snapshot).toBeDefined();
    expect(snapshot.start).toBe(6);
    expect(snapshot.end).toBe(13);
    expect(snapshot.anchorRect.left).toBeGreaterThan(220);
    expect(snapshot.anchorRect.top).toBeGreaterThan(130);

    const menuPosition = calculateSelectionPopoverPosition(
      snapshot.anchorRect,
      snapshot.containerRect,
    );
    expect(menuPosition.top).toBeCloseTo(snapshot.anchorRect.top);

    spy.mockRestore();
  });

  it("anchors selection actions to the selection focus when selecting backward", () => {
    const onSelectionChange = vi.fn();
    renderEditor({
      value: "This is a two-line text.\nSecond line content.",
      onSelectionChange,
    });
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    const originalGetComputedStyle = window.getComputedStyle;
    const spy = vi.spyOn(window, "getComputedStyle").mockImplementation((target: Element) => {
      if (target === editor) {
        return {
          ...(originalGetComputedStyle(editor) as CSSStyleDeclaration),
          fontSize: "20px",
          lineHeight: "40px",
          paddingTop: "10px",
          paddingLeft: "5px",
        } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(target);
    });

    Object.defineProperty(editor, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(80, 130, 640, 220),
    });
    editor.setSelectionRange(6, 13);
    Object.defineProperty(editor, "selectionDirection", {
      configurable: true,
      value: "backward",
    });
    fireEvent.mouseUp(editor);

    const snapshot = onSelectionChange.mock.calls[0]?.[0];
    expect(snapshot.start).toBe(6);
    expect(snapshot.end).toBe(13);
    expect(snapshot.anchorRect.left).toBeGreaterThan(140);
    expect(snapshot.anchorRect.left).toBeLessThan(180);

    spy.mockRestore();
  });

  it("anchors selection actions to the visual wrapped line, not only hard line breaks", () => {
    const onSelectionChange = vi.fn();
    const value = "Alpha beta gamma delta epsilon zeta eta theta.";
    renderEditor({ value, onSelectionChange });
    const editor = screen.getByRole("textbox") as HTMLTextAreaElement;
    const originalGetComputedStyle = window.getComputedStyle;
    const spy = vi.spyOn(window, "getComputedStyle").mockImplementation((target: Element) => {
      if (target === editor) {
        return {
          ...(originalGetComputedStyle(editor) as CSSStyleDeclaration),
          fontSize: "20px",
          lineHeight: "40px",
          paddingTop: "10px",
          paddingLeft: "5px",
          paddingRight: "5px",
        } as CSSStyleDeclaration;
      }
      return originalGetComputedStyle(target);
    });

    Object.defineProperty(editor, "getBoundingClientRect", {
      configurable: true,
      value: () => new DOMRect(80, 130, 120, 220),
    });

    editor.setSelectionRange(24, 31);
    fireEvent.mouseUp(editor);

    const snapshot = onSelectionChange.mock.calls[0]?.[0];
    expect(snapshot.anchorRect.top).toBeGreaterThanOrEqual(180);
    expect(snapshot.anchorRect.left).toBeGreaterThanOrEqual(80);

    spy.mockRestore();
  });

  it("renders subtle AI sentence diff marks on the focused original sentence without hover coupling", () => {
    const original = "The weather was good, so I planned 去公园.";
    const revised = "The weather was good, so I planned to go to the park.";
    const onDiffHover = vi.fn();

    renderEditor({
      value: original,
      inlineSuggestion: <div aria-label="当前句建议">修改后</div>,
      focusedSuggestionSentence: original,
      focusedSuggestionRange: { start: 0, end: original.length },
      focusedSuggestionDiffParts: createWordDiff(original, revised),
      onFocusedSuggestionDiffHover: onDiffHover,
    });

    const focusedSentence = screen.getByLabelText("AI 建议句子焦点");
    expect(focusedSentence).toHaveClass("border-l-2");
    const diffMark = screen.getByLabelText(/原句改动/u);
    expect(diffMark).toHaveTextContent("去公园");
    expect(diffMark).not.toHaveAttribute("role", "button");
    expect(diffMark).not.toHaveClass("border");
    expect(screen.queryByLabelText("原句改动标记")).not.toBeInTheDocument();

    fireEvent.mouseEnter(diffMark);
    expect(onDiffHover).not.toHaveBeenCalled();
  });

  it("keeps suggestion markers visual-only so text clicks still belong to the textarea", () => {
    const onOpen = vi.fn();
    const value = "I found that many students lack 自主学习能力.";
    const start = value.indexOf("自主学习能力");
    const { container } = renderEditor({
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

    const editor = screen.getByRole("textbox");
    expect(editor).toHaveAttribute("data-input-mode", "native-document");
    expect(editor).toHaveClass("lt-writing-textarea");
    expect(screen.getByLabelText("写作区")).toHaveAttribute("data-input-priority", "textarea-first");

    const positionProbe = screen.getByText("自主学习能力");
    expect(positionProbe.tagName).toBe("SPAN");
    expect(positionProbe).toHaveAttribute("data-input-overlay", "position-probe");
    expect(positionProbe).toHaveAttribute("aria-hidden", "true");
    expect(positionProbe).toHaveClass("pointer-events-none", "border-0");

    fireEvent.click(positionProbe);
    expect(onOpen).not.toHaveBeenCalled();

    const aiButton = screen.getByRole("button", { name: /查看当前句 AI 建议|Current Sentence AI|AI 建议/ });
    expect(aiButton).toHaveClass("h-6", "w-6", "rounded-full");
    expect(aiButton.querySelector("svg")).toBeNull();
    fireEvent.mouseEnter(aiButton);
    expect(container.querySelector("[data-suggestion-highlight='active']")).toHaveTextContent(value);
    fireEvent.click(aiButton);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("shows an animated AI marker while the current sentence request is running", () => {
    const onOpen = vi.fn();
    const value = "This sentence is waiting for AI feedback.";
    renderEditor({
      value,
      suggestionMarkers: [
        {
          id: "loading-marker",
          range: { start: 0, end: value.length },
          state: "loading",
          onOpen,
        },
      ],
    });

    const loadingButton = screen.getByRole("button", { name: /AI 正在修改当前句/ });
    expect(loadingButton).toHaveAttribute("aria-busy", "true");
    expect(loadingButton).toBeDisabled();
    expect(loadingButton.querySelector(".animate-ping")).not.toBeNull();

    fireEvent.click(loadingButton);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("renders expression reappearance cues as independent text-level reinforcement", () => {
    const value = "Social media can shape young people's values.";
    const start = value.indexOf("shape");
    const end = start + "shape young people's values".length;
    const { container } = renderEditor({
      value,
      expressionReappearanceCues: [
        {
          id: "cue-1",
          itemId: "library-1",
          expression: "shape one's values",
          matchedText: "shape young people's values",
          start,
          end,
          meaning: "塑造 / 影响某人的价值观",
          state: "fresh",
        },
      ],
    });

    const cue = container.querySelector("[data-expression-reappearance-cue='fresh']") as HTMLElement;
    expect(cue).not.toBeNull();
    expect(cue).toHaveAttribute("data-expression-reappearance-cue", "fresh");
    expect(cue).toHaveAttribute("data-expression-reappearance-visual", "card-stamp");
    expect(cue).toHaveAttribute("aria-hidden", "true");
    expect(cue).not.toHaveAttribute("tabindex");
    expect(cue).toHaveClass("lt-expression-cue--fresh");
    expect(cue).toHaveClass("lt-expression-cue--card-stamp");
    expect(cue).not.toHaveClass("pointer-events-auto");
    expect(cue).not.toHaveClass("lt-expression-cue--paper-wash");
    expect(cue).not.toHaveClass("lt-expression-cue--flash");
    expect(container.querySelector("[data-suggestion-entry]")).toBeNull();
    expect(container.querySelector("[data-proofreading-item]")).toBeNull();

    fireEvent.mouseEnter(cue);
    expect(container.querySelector("[data-expression-reappearance-detail='open']")).toBeNull();
  });

  it("uses a neutral card-stamp animation without hover card, green, or persistent underline", () => {
    const value = "Social media can shape young people's values.";
    const start = value.indexOf("shape");
    const end = start + "shape young people's values".length;
    const { container } = renderEditor({
      value,
      expressionReappearanceCues: [
        {
          id: "cue-1",
          itemId: "library-1",
          expression: "shape one's values",
          matchedText: "shape young people's values",
          start,
          end,
          meaning: "塑造 / 影响某人的价值观",
          state: "seen",
        },
      ],
    });

    const cue = container.querySelector("[data-expression-reappearance-cue='seen']") as HTMLElement;
    expect(cue).not.toBeNull();
    expect(cue).toHaveAttribute("data-expression-reappearance-cue", "seen");
    expect(cue).toHaveAttribute("data-expression-reappearance-visual", "idle");
    expect(cue).toHaveAttribute("aria-hidden", "true");
    expect(cue).not.toHaveAttribute("tabindex");
    expect(cue).not.toHaveClass("lt-expression-cue--fresh");
    expect(cue).not.toHaveClass("lt-expression-cue--flash");
    expect(cue).not.toHaveClass("lt-expression-cue--paper-wash");
    expect(cue).not.toHaveClass("lt-expression-cue--card-stamp");

    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    const baseCueRule = css.match(/\.lt-expression-cue\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const cardStampRule =
      css.match(/\.lt-expression-cue--fresh,\s*\n\.lt-expression-cue--card-stamp\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const cardStampKeyframes =
      css.match(/@keyframes lt-expression-cue-card-stamp\s*\{[\s\S]*?\n\}/)?.[0] ?? "";
    const expressionCueCss = css.slice(
      css.indexOf(".lt-expression-cue"),
      css.indexOf("@media (prefers-reduced-motion: reduce)"),
    );

    expect(baseCueRule).not.toContain("100% 1px");
    expect(baseCueRule).not.toContain("0 92%");
    expect(baseCueRule).not.toContain("pointer-events");
    expect(baseCueRule).toContain("box-decoration-break: clone");
    expect(cardStampRule).toContain("lt-expression-cue-card-stamp");
    expect(cardStampKeyframes).toContain("clip-path");
    expect(cardStampKeyframes).toContain("inset 0 0 0 1px");
    expect(cardStampKeyframes).not.toContain("var(--lt-memory)");
    expect(cardStampKeyframes).not.toContain("scale");
    expect(cardStampKeyframes).not.toContain("blur");
    expect(expressionCueCss).not.toContain("lt-expression-cue--active");
    expect(expressionCueCss).not.toContain("var(--lt-memory)");
    expect(css).not.toContain("data-expression-reappearance-detail");
    expect(css).not.toContain("lt-expression-cue-paper-wash");
    expect(css).not.toContain("lt-expression-cue-flash");
    expect(css).not.toContain("lt-expression-cue-card-flash");
  });

  it("keeps AI suggestion marker near the right gutter", () => {
    const value = "This is a proofing marker placement sentence.";
    const markerStart = 10;
    const { container } = renderEditor({
      value,
      suggestionMarkers: [
        {
          id: "marker-inline",
          range: { start: markerStart, end: markerStart + 4 },
          state: "available",
          onOpen: vi.fn(),
        },
      ],
    });

    const aiButton = container.querySelector(
      '[data-suggestion-entry="available"]',
    ) as HTMLElement;
    expect(aiButton).toBeInTheDocument();
    expect(aiButton).toHaveClass("left-[calc(100%+24px)]");
  });

  it("renders a compact bottom writing status bar", () => {
    renderEditor({
      value: "Opening paragraph.\n\nSecond paragraph.",
    });

    const statusBar = screen.getByRole("contentinfo");
    expect(statusBar).toHaveClass("fixed", "bottom-0");
    expect(statusBar).toHaveTextContent("文章地图");
    expect(screen.getByRole("button", { name: /检查文章地图|文章地图 · /u })).toBeInTheDocument();
    expect(statusBar).not.toHaveTextContent("文本校对");
  });

  it("opens lightweight upward menus for mode and enhancement level", async () => {
    const onWritingModeChange = vi.fn();
    const onEnhancementLevelChange = vi.fn();
    renderEditor({ onWritingModeChange, onEnhancementLevelChange });

    fireEvent.click(screen.getByRole("button", { name: /模式/ }));
    expect(screen.getByText("写作模式")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: /学术/ }));
    expect(onWritingModeChange).toHaveBeenCalledWith("academic");

    fireEvent.click(screen.getByRole("button", { name: /强度/ }));
    expect(screen.getByText("增强强度")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("menuitemradio", { name: /润色/ }));
    expect(onEnhancementLevelChange).toHaveBeenCalledWith("polished");

    await waitFor(() => expect(screen.queryByText("增强强度")).not.toBeInTheDocument());
  });

  it("closes status menus on outside click and Escape", async () => {
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: /模式/ }));
    expect(screen.getByText("写作模式")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText("写作模式")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /强度/ }));
    expect(screen.getByText("增强强度")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByText("增强强度")).not.toBeInTheDocument());
  });
});
