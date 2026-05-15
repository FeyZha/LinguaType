"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { waapi } from "animejs/waapi";
import {
  getParagraphOffset,
  joinParagraphBlocks,
  splitTextIntoParagraphs,
} from "@/lib/editorDocument";
import type { EnhancementLevel, WritingMode } from "@/lib/llm/types";
import type { ProofreadingResult } from "@/lib/proofreading";
import type { TriggerSettings } from "@/lib/storage";

const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  natural: "自然",
  ielts: "雅思",
  academic: "学术",
  business: "商务",
  concise: "简洁",
};

const WRITING_MODE_DESCRIPTIONS: Record<WritingMode, string> = {
  natural: "日常表达，保持自然语气",
  ielts: "偏考试写作，适合论证",
  academic: "正式学术表达",
  business: "清晰专业的商务语气",
  concise: "压缩句子，减少冗余",
};

const ENHANCEMENT_LEVELS: EnhancementLevel[] = ["minimal", "balanced", "polished"];

const ENHANCEMENT_LEVEL_LABELS: Record<EnhancementLevel, string> = {
  minimal: "轻度",
  balanced: "平衡",
  polished: "润色",
};

const ENHANCEMENT_LEVEL_DESCRIPTIONS: Record<EnhancementLevel, string> = {
  minimal: "只做轻微修正",
  balanced: "兼顾自然度和准确度",
  polished: "更完整地润色表达",
};

type TextSelectionRange = {
  start: number;
  end: number;
};

export type WritingEditorHandle = {
  focus: () => void;
  getSelectionRange: () => TextSelectionRange;
  setCursor: (offset: number) => void;
};

type WritingEditorProps = {
  value: string;
  outlinePoints?: string[];
  isLoading: boolean;
  isExpressionMenuOpen?: boolean;
  writingMode: WritingMode;
  enhancementLevel: EnhancementLevel;
  proofreadingResult: ProofreadingResult;
  triggerSettings: TriggerSettings;
  topicAreaLabel?: string;
  onChange: (value: string) => void;
  onWritingModeChange: (mode: WritingMode) => void;
  onEnhancementLevelChange: (level: EnhancementLevel) => void;
  onEnhance: () => void;
  onOpenExpressionMenu: (selection: { start: number; end: number }) => void;
  onCloseExpressionMenu: () => void;
  onSelectionChange: (selection: {
    start: number;
    end: number;
    text: string;
    paragraphIndex: number;
    anchorRect: DOMRect;
    containerRect: DOMRect;
  }) => void;
  outlineEditState: { index: number; draft: string } | null;
  onStartOutlineEdit: (index: number) => void;
  onOutlineDraftChange: (draft: string) => void;
  onSaveOutlineEdit: () => void;
  onCancelOutlineEdit: () => void;
  onAddOutlinePoint: () => void;
  onDeleteOutlinePoint: (index: number) => void;
  onEscape: () => void;
  inlineSuggestion?: ReactNode;
  inlineSuggestionParagraphIndex?: number;
};

export const WritingEditor = forwardRef<WritingEditorHandle, WritingEditorProps>(
  function WritingEditor({
    value,
    outlinePoints,
    isLoading,
    isExpressionMenuOpen,
    writingMode,
    enhancementLevel,
    proofreadingResult,
    triggerSettings,
    topicAreaLabel = "自定义",
    onChange,
    onWritingModeChange,
    onEnhancementLevelChange,
    onEnhance,
    onOpenExpressionMenu,
    onCloseExpressionMenu,
    onSelectionChange,
    outlineEditState,
    onStartOutlineEdit,
    onOutlineDraftChange,
    onSaveOutlineEdit,
    onCancelOutlineEdit,
    onAddOutlinePoint,
    onDeleteOutlinePoint,
    onEscape,
    inlineSuggestion,
    inlineSuggestionParagraphIndex,
  }, ref) {
    const paragraphCount = outlinePoints?.length ?? 1;
    const paragraphs = useMemo(() => splitTextIntoParagraphs(value, paragraphCount), [paragraphCount, value]);
    const paragraphRefs = useRef(new Map<number, HTMLDivElement>());
    const statusMenuRef = useRef<HTMLDivElement | null>(null);
    const statusMenuLayerRef = useRef<HTMLSpanElement | null>(null);
    const statusMenuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [statusMenu, setStatusMenu] = useState<"mode" | "level" | null>(null);
    const [closingStatusMenu, setClosingStatusMenu] = useState<"mode" | "level" | null>(null);
    const visibleStatusMenu = statusMenu ?? closingStatusMenu;
    const triggerLabel = sentenceTriggerLabel(triggerSettings.sentenceEnhancementShortcut);
    const textStats = useMemo(() => getTextStats(value), [value]);

    function clearStatusCloseTimer() {
      if (statusMenuCloseTimerRef.current) {
        clearTimeout(statusMenuCloseTimerRef.current);
        statusMenuCloseTimerRef.current = null;
      }
    }

    function closeStatusMenu() {
      if (!statusMenu) {
        return;
      }
      const closingMenu = statusMenu;
      const menuElement = statusMenuLayerRef.current;
      if (menuElement && typeof menuElement.animate === "function") {
        waapi.animate(menuElement, {
          opacity: [1, 0],
          transform: ["translateY(0px) scale(1)", "translateY(7px) scale(0.98)"],
          filter: ["blur(0px)", "blur(5px)"],
          duration: 140,
          ease: "cubic-bezier(0.4, 0, 1, 1)",
        });
      }
      clearStatusCloseTimer();
      setClosingStatusMenu(closingMenu);
      setStatusMenu(null);
      statusMenuCloseTimerRef.current = setTimeout(() => {
        setClosingStatusMenu((current) => (current === closingMenu ? null : current));
        statusMenuCloseTimerRef.current = null;
      }, 150);
    }

    function toggleStatusMenu(nextMenu: "mode" | "level") {
      if (statusMenu === nextMenu) {
        closeStatusMenu();
        return;
      }
      clearStatusCloseTimer();
      setClosingStatusMenu(null);
      setStatusMenu(nextMenu);
    }

    useEffect(() => {
      if (!statusMenu) {
        return;
      }

      const menuElement = statusMenuLayerRef.current;
      if (menuElement && typeof menuElement.animate === "function") {
        waapi.animate(menuElement, {
          opacity: [0, 1],
          transform: ["translateY(8px) scale(0.98)", "translateY(0px) scale(1)"],
          filter: ["blur(5px)", "blur(0px)"],
          duration: 190,
          ease: "cubic-bezier(0.22, 1, 0.36, 1)",
        });
        const selectedOption = menuElement.querySelector<HTMLElement>('[data-status-menu-selected="true"]');
        if (selectedOption && typeof selectedOption.animate === "function") {
          waapi.animate(selectedOption, {
            transform: ["scale(0.98)", "scale(1)"],
            duration: 220,
            ease: "cubic-bezier(0.22, 1, 0.36, 1)",
          });
        }
      }

      function closeOnOutside(event: MouseEvent) {
        if (!statusMenuRef.current?.contains(event.target as Node)) {
          closeStatusMenu();
        }
      }

      document.addEventListener("mousedown", closeOnOutside);
      return () => document.removeEventListener("mousedown", closeOnOutside);
    }, [statusMenu]);

    useEffect(() => {
      return () => clearStatusCloseTimer();
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        focus() {
          paragraphRefs.current.get(0)?.focus();
        },
        getSelectionRange() {
          return getCurrentSelectionRange(paragraphRefs.current, paragraphs) ?? {
            start: value.length,
            end: value.length,
          };
        },
        setCursor(offset: number) {
          setCursorAtTextOffset(paragraphRefs.current, paragraphs, offset);
        },
      }),
      [paragraphs, value.length],
    );

    function setParagraphRef(index: number, element: HTMLDivElement | null) {
      if (!element) {
        paragraphRefs.current.delete(index);
        return;
      }
      paragraphRefs.current.set(index, element);
      defineEditableTestAccessors(element);
    }

    function updateParagraph(index: number, nextValue: string) {
      const nextParagraphs = [...paragraphs];
      nextParagraphs[index] = normalizeEditableText(nextValue);
      onChange(joinParagraphBlocks(nextParagraphs));
    }

    function reportSelection(target: HTMLDivElement, paragraphIndex: number) {
      const selection = getSelectionForParagraph(target, paragraphIndex, paragraphs);
      onSelectionChange({
        start: selection.start,
        end: selection.end,
        text: selection.text,
        paragraphIndex,
        anchorRect: estimateSelectionRect(target),
        containerRect: target.closest("[data-editor-container]")?.getBoundingClientRect() ?? target.getBoundingClientRect(),
      });
    }

    function openExpressionMenu(target: HTMLDivElement, paragraphIndex: number) {
      const selection = getSelectionForParagraph(target, paragraphIndex, paragraphs);
      onOpenExpressionMenu({
        start: selection.start,
        end: selection.end,
      });
    }

    function handleEditableInput(target: HTMLDivElement, index: number, nextValueOverride?: string) {
      const nextValue = normalizeEditableText(nextValueOverride ?? readEditableText(target));
      if (nextValueOverride !== undefined && readEditableText(target) !== nextValue) {
        target.textContent = nextValue;
      }
      updateStoredSelection(target, Math.min(nextValue.length, readStoredSelectionStart(target)), Math.min(nextValue.length, readStoredSelectionEnd(target)));
      if (!isComposing) {
        updateParagraph(index, nextValue);
      }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number) {
      const isCommand = event.ctrlKey || event.metaKey;
      if (isCommand && event.key === "Enter" && triggerSettings.sentenceEnhancementShortcut === "ctrl_enter") {
        event.preventDefault();
        onEnhance();
      }
      if (isCommand && event.key.toLowerCase() === "j" && triggerSettings.sentenceEnhancementShortcut === "ctrl_j_legacy") {
        event.preventDefault();
        onEnhance();
      }
      if (isCommand && event.key.toLowerCase() === "k" && triggerSettings.inlineExpressionMenuTrigger === "ctrl_k") {
        event.preventDefault();
        openExpressionMenu(event.currentTarget, index);
      }
      if (event.key === "Escape" && isExpressionMenuOpen) {
        event.preventDefault();
        onCloseExpressionMenu();
      }
      if (event.key === "Escape" && !isExpressionMenuOpen) {
        event.preventDefault();
        onEscape();
      }
    }

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="grid min-h-[520px] flex-1 gap-12 overflow-auto px-1 py-2 pb-6" data-editor-container>
          {paragraphs.map((paragraph, index) => (
            <section key={index} className="group/editor-block grid gap-3">
              <div className="flex items-center gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span aria-hidden className="text-xl font-normal text-[var(--lt-faint)]">#</span>
                  <h2 className="truncate text-[19px] font-semibold leading-snug text-[var(--lt-text)]">
                    {outlinePoints?.[index]?.trim() || `第 ${index + 1} 段 自由写作`}
                  </h2>
                </div>
              </div>
              {outlineEditState?.index === index ? (
                <span className="flex flex-wrap gap-2">
                  <input
                    value={outlineEditState.draft}
                    onChange={(event) => onOutlineDraftChange(event.target.value)}
                    aria-label={`内联第 ${index + 1} 个大纲点`}
                    className="h-8 min-w-64 rounded-md bg-[var(--lt-surface-soft)] px-2 text-xs text-[var(--lt-text)] outline-none transition focus:bg-[var(--lt-surface)] focus:ring-1 focus:ring-[var(--lt-ring)]"
                  />
                  <button
                    type="button"
                    onClick={onSaveOutlineEdit}
                    className="rounded-md bg-[var(--lt-text)] px-2 py-1 text-xs font-medium text-[var(--lt-bg)]"
                  >
                    保存大纲点
                  </button>
                  <button
                    type="button"
                    onClick={onCancelOutlineEdit}
                    className="rounded-md bg-[var(--lt-surface-soft)] px-2 py-1 text-xs text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)]"
                  >
                    取消
                  </button>
                </span>
              ) : null}
              <div
                ref={(element) => setParagraphRef(index, element)}
                role="textbox"
                aria-label={index === 0 ? "写作编辑器" : `第 ${index + 1} 段正文`}
                aria-multiline="true"
                contentEditable
                suppressContentEditableWarning
                data-paragraph-index={index}
                data-placeholder="直接写英文，卡住时可以夹中文。例如：This may 影响 young people's values."
                onInput={(event) => handleEditableInput(event.currentTarget, index)}
                onChange={(event) => handleEditableInput(event.currentTarget, index, readEventValue(event))}
                onChangeCapture={(event) => handleEditableInput(event.currentTarget, index, readEventValue(event))}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={(event) => {
                  setIsComposing(false);
                  updateParagraph(index, readEditableText(event.currentTarget));
                }}
                onMouseUp={(event) => reportSelection(event.currentTarget, index)}
                onKeyUp={(event) => reportSelection(event.currentTarget, index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="min-h-[112px] whitespace-pre-wrap break-words bg-transparent text-[17px] leading-8 text-[var(--lt-text)] outline-none empty:before:pointer-events-none empty:before:text-[var(--lt-faint)] empty:before:content-[attr(data-placeholder)]"
              >
                {paragraph}
              </div>
              {inlineSuggestion && index === (inlineSuggestionParagraphIndex ?? paragraphs.length - 1) ? (
                <div className="mt-1">{inlineSuggestion}</div>
              ) : null}
            </section>
          ))}
        </div>
        <footer
          aria-label="写作状态栏"
          data-status-layout="balanced-editorial"
          className="sticky bottom-0 z-20 mt-auto grid min-h-8 grid-cols-[minmax(260px,1fr)_auto_minmax(260px,1fr)] items-center gap-x-5 gap-y-1 border-t border-[var(--lt-border)] bg-[var(--lt-bg)] px-2 py-1 text-[12px] text-[var(--lt-muted)] shadow-[0_-10px_18px_var(--lt-bg)] lg:-mx-16 xl:-mx-24"
        >
          <div ref={statusMenuRef} aria-label="写作状态栏左侧" className="flex min-w-0 items-center gap-3">
            <span aria-label="写作统计" className="inline-flex shrink-0 items-center gap-2 text-[var(--lt-faint)]">
              <span>{textStats.words} words</span>
              <span aria-hidden="true" className="text-[var(--lt-border)]">
                /
              </span>
              <span>{textStats.sentences} sentences</span>
              <span aria-hidden="true" className="text-[var(--lt-border)]">
                /
              </span>
              <span>{textStats.paragraphs} paragraphs</span>
            </span>
            <span aria-hidden="true" className="h-3 w-px bg-[var(--lt-border)]" />
            <span aria-label="写作控制状态" className="inline-flex min-w-0 items-center gap-1.5">
            <span className="relative inline-flex">
              <button
                type="button"
                onClick={() => toggleStatusMenu("mode")}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${
                  statusMenu === "mode"
                    ? "bg-[var(--lt-surface-soft)] text-[var(--lt-text)]"
                    : "text-[var(--lt-muted)] hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)]"
                }`}
              >
                模式：{WRITING_MODE_LABELS[writingMode]}
              </button>
              {visibleStatusMenu === "mode" ? (
                <span
                  ref={statusMenuLayerRef}
                  role="menu"
                  aria-label="写作模式选择"
                  data-status-menu-motion="soft-rounded-popover"
                  data-status-menu-state={statusMenu === "mode" ? "open" : "closing"}
                  className="absolute bottom-[calc(100%+10px)] left-0 z-40 grid min-w-52 origin-bottom-left gap-1 rounded-2xl border border-[var(--lt-border)] bg-[var(--lt-menu-bg)] p-1.5 text-xs shadow-[0_18px_42px_var(--lt-shadow-strong)] backdrop-blur-xl will-change-transform"
                >
                  {(Object.keys(WRITING_MODE_LABELS) as WritingMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="menuitemradio"
                      aria-label={WRITING_MODE_LABELS[mode]}
                      aria-checked={writingMode === mode}
                      data-status-menu-selected={writingMode === mode ? "true" : "false"}
                      onClick={() => {
                        onWritingModeChange(mode);
                        closeStatusMenu();
                      }}
                      className={`grid gap-0.5 rounded-xl px-3 py-2 text-left transition ${
                        writingMode === mode
                          ? "bg-[var(--lt-surface-soft)] text-[var(--lt-text)]"
                          : "text-[var(--lt-muted)] hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)]"
                      }`}
                    >
                      <span className="font-semibold">{WRITING_MODE_LABELS[mode]}</span>
                      <span className="text-[11px] font-normal text-[var(--lt-faint)]">{WRITING_MODE_DESCRIPTIONS[mode]}</span>
                    </button>
                  ))}
                </span>
              ) : null}
            </span>
            <span className="relative inline-flex">
              <button
                type="button"
                onClick={() => toggleStatusMenu("level")}
                className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${
                  statusMenu === "level"
                    ? "bg-[var(--lt-surface-soft)] text-[var(--lt-text)]"
                    : "text-[var(--lt-muted)] hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)]"
                }`}
              >
                强度：{ENHANCEMENT_LEVEL_LABELS[enhancementLevel]}
              </button>
              {visibleStatusMenu === "level" ? (
                <span
                  ref={statusMenuLayerRef}
                  role="menu"
                  aria-label="增强强度选择"
                  data-status-menu-motion="soft-rounded-popover"
                  data-status-menu-state={statusMenu === "level" ? "open" : "closing"}
                  className="absolute bottom-[calc(100%+10px)] left-0 z-40 grid min-w-52 origin-bottom-left gap-1 rounded-2xl border border-[var(--lt-border)] bg-[var(--lt-menu-bg)] p-1.5 text-xs shadow-[0_18px_42px_var(--lt-shadow-strong)] backdrop-blur-xl will-change-transform"
                >
                  {ENHANCEMENT_LEVELS.map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="menuitemradio"
                      aria-label={ENHANCEMENT_LEVEL_LABELS[level]}
                      aria-checked={enhancementLevel === level}
                      data-status-menu-selected={enhancementLevel === level ? "true" : "false"}
                      onClick={() => {
                        onEnhancementLevelChange(level);
                        closeStatusMenu();
                      }}
                      className={`grid gap-0.5 rounded-xl px-3 py-2 text-left transition ${
                        enhancementLevel === level
                          ? "bg-[var(--lt-surface-soft)] text-[var(--lt-text)]"
                          : "text-[var(--lt-muted)] hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)]"
                      }`}
                    >
                      <span className="font-semibold">{ENHANCEMENT_LEVEL_LABELS[level]}</span>
                      <span className="text-[11px] font-normal text-[var(--lt-faint)]">
                        {ENHANCEMENT_LEVEL_DESCRIPTIONS[level]}
                      </span>
                    </button>
                  ))}
                </span>
              ) : null}
            </span>
            </span>
          </div>
          <div
            aria-label="写作状态栏文本校对"
            className="justify-self-center whitespace-nowrap rounded-full bg-[var(--lt-surface-soft)] px-3 py-1 text-[12px] font-semibold text-[var(--lt-text)]"
          >
            文本校对：{proofreadingResult.signals.length} 个问题
          </div>
          <div aria-label="写作状态栏右侧" className="flex min-w-0 items-center justify-end gap-3 text-[var(--lt-faint)]">
            <span className="whitespace-nowrap">触发：{triggerLabel}</span>
            <span className="whitespace-nowrap">领域：{topicAreaLabel}</span>
            {triggerSettings.inlineExpressionMenuTrigger === "floating_button" ? (
              <button
                type="button"
                onClick={() =>
                  onOpenExpressionMenu(
                    getCurrentSelectionRange(paragraphRefs.current, paragraphs) ?? {
                      start: value.length,
                      end: value.length,
                    },
                  )
                }
                className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
              >
                表达菜单
              </button>
            ) : null}
          </div>
        </footer>
      </div>
    );
  },
);

function readEditableText(element: HTMLElement): string {
  return normalizeEditableText(element.textContent ?? "");
}

function readEventValue(event: { target: EventTarget | null }): string | undefined {
  const value = (event.target as { value?: unknown } | null)?.value;
  return typeof value === "string" ? value : undefined;
}

function normalizeEditableText(value: string): string {
  return value.replace(/\u00a0/gu, " ");
}

function getTextStats(value: string): { words: number; sentences: number; paragraphs: number } {
  const trimmed = value.trim();
  return {
    words: value.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)?.length ?? 0,
    sentences: trimmed ? trimmed.split(/[.!?。？！；;\n]+/u).filter((part) => part.trim().length > 0).length : 0,
    paragraphs: trimmed ? trimmed.split(/\n{2,}/u).filter((part) => part.trim().length > 0).length : 0,
  };
}

function defineEditableTestAccessors(element: HTMLDivElement) {
  const target = element as HTMLDivElement & {
    __linguatypeAccessors?: true;
    value?: string;
    selectionStart?: number;
    selectionEnd?: number;
  };

  if (target.__linguatypeAccessors) {
    return;
  }

  Object.defineProperty(target, "value", {
    configurable: true,
    get() {
      return readEditableText(element);
    },
    set(nextValue: string) {
      element.textContent = nextValue;
    },
  });
  Object.defineProperty(target, "selectionStart", {
    configurable: true,
    get() {
      return readStoredSelectionStart(element);
    },
    set(nextValue: number) {
      updateStoredSelection(element, nextValue, readStoredSelectionEnd(element));
    },
  });
  Object.defineProperty(target, "selectionEnd", {
    configurable: true,
    get() {
      return readStoredSelectionEnd(element);
    },
    set(nextValue: number) {
      updateStoredSelection(element, readStoredSelectionStart(element), nextValue);
    },
  });
  target.__linguatypeAccessors = true;
}

function updateStoredSelection(element: HTMLElement, start: number, end: number) {
  element.dataset.selectionStart = String(Math.max(0, start));
  element.dataset.selectionEnd = String(Math.max(0, end));
}

function readStoredSelectionStart(element: HTMLElement): number {
  const fallback = readEditableText(element).length;
  return Number.isFinite(Number(element.dataset.selectionStart)) ? Number(element.dataset.selectionStart) : fallback;
}

function readStoredSelectionEnd(element: HTMLElement): number {
  const fallback = readStoredSelectionStart(element);
  return Number.isFinite(Number(element.dataset.selectionEnd)) ? Number(element.dataset.selectionEnd) : fallback;
}

function getSelectionForParagraph(
  target: HTMLDivElement,
  paragraphIndex: number,
  paragraphs: string[],
): TextSelectionRange & { text: string } {
  const domRange = getDomSelectionInside(target);
  const localStart = domRange?.start ?? readStoredSelectionStart(target);
  const localEnd = domRange?.end ?? readStoredSelectionEnd(target);
  const normalizedStart = Math.max(0, Math.min(localStart, localEnd));
  const normalizedEnd = Math.max(normalizedStart, Math.max(localStart, localEnd));
  updateStoredSelection(target, normalizedStart, normalizedEnd);

  const paragraphText = readEditableText(target);
  const offset = getParagraphOffset(paragraphs, paragraphIndex);
  return {
    start: offset + normalizedStart,
    end: offset + normalizedEnd,
    text: paragraphText.slice(normalizedStart, normalizedEnd),
  };
}

function getCurrentSelectionRange(
  paragraphRefs: Map<number, HTMLDivElement>,
  paragraphs: string[],
): TextSelectionRange | null {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLDivElement && activeElement.dataset.paragraphIndex !== undefined) {
    const index = Number(activeElement.dataset.paragraphIndex);
    const selection = getSelectionForParagraph(activeElement, index, paragraphs);
    return { start: selection.start, end: selection.end };
  }

  for (const [index, element] of paragraphRefs) {
    const domRange = getDomSelectionInside(element);
    if (domRange) {
      const offset = getParagraphOffset(paragraphs, index);
      return {
        start: offset + domRange.start,
        end: offset + domRange.end,
      };
    }
  }

  return null;
}

function getDomSelectionInside(root: HTMLElement): TextSelectionRange | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  return {
    start: getTextOffset(root, range.startContainer, range.startOffset),
    end: getTextOffset(root, range.endContainer, range.endOffset),
  };
}

function getTextOffset(root: Node, target: Node, targetOffset: number): number {
  let offset = 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node === target) {
      return offset + targetOffset;
    }
    offset += node.textContent?.length ?? 0;
  }

  if (root === target) {
    return targetOffset;
  }

  return offset;
}

function setCursorAtTextOffset(
  paragraphRefs: Map<number, HTMLDivElement>,
  paragraphs: string[],
  fullTextOffset: number,
) {
  const safeOffset = Math.max(0, fullTextOffset);
  let targetIndex = paragraphs.length - 1;
  let localOffset = paragraphs[targetIndex]?.length ?? 0;

  for (let index = 0; index < paragraphs.length; index += 1) {
    const start = getParagraphOffset(paragraphs, index);
    const end = start + paragraphs[index].length;
    if (safeOffset <= end) {
      targetIndex = index;
      localOffset = Math.max(0, safeOffset - start);
      break;
    }
  }

  const element = paragraphRefs.get(targetIndex);
  if (!element) {
    return;
  }

  element.focus();
  updateStoredSelection(element, localOffset, localOffset);
  setDomCursor(element, localOffset);
}

function setDomCursor(root: HTMLElement, offset: number) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let lastTextNode: Node | null = null;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    lastTextNode = node;
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
  }

  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
  if (lastTextNode) {
    updateStoredSelection(root, readEditableText(root).length, readEditableText(root).length);
  }
}

function estimateSelectionRect(target: HTMLElement): DOMRect {
  const rect = target.getBoundingClientRect();
  const lineHeight = 32;
  const selectionStart = readStoredSelectionStart(target);
  const textBeforeSelection = readEditableText(target).slice(0, selectionStart);
  const lineIndex = textBeforeSelection.split(/\n/u).length - 1;
  const top = rect.top + 12 + Math.min(lineIndex, 8) * lineHeight;
  const left = rect.left + 24;
  return new DOMRect(left, top, Math.min(240, Math.max(80, rect.width * 0.45)), lineHeight);
}

function sentenceTriggerLabel(value: TriggerSettings["sentenceEnhancementShortcut"]): string {
  if (value === "ctrl_j_legacy") {
    return "Ctrl/Cmd + J";
  }
  if (value === "button_only") {
    return "仅按钮";
  }
  if (value === "disable_shortcut") {
    return "已关闭";
  }
  return "Ctrl/Cmd + Enter";
}
