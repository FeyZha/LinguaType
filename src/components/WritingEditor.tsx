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

import type { EnhancementLevel, WritingMode } from "@/lib/llm/types";
import type { ProofreadingResult } from "@/lib/proofreading";
import type { TriggerSettings } from "@/lib/storage";

type SelectionSnapshot = {
  start: number;
  end: number;
  text: string;
  paragraphIndex: number;
  anchorRect: DOMRect;
  containerRect: DOMRect;
};

type SuggestionMarker = {
  id: string;
  range: {
    start: number;
    end: number;
  };
  state: "available" | "reviewed";
  onOpen: () => void;
};

export type WritingEditorHandle = {
  focus: () => void;
  getSelectionRange: () => { start: number; end: number };
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
  onEnhance: () => void;
  onWritingModeChange?: (mode: WritingMode) => void;
  onEnhancementLevelChange?: (level: EnhancementLevel) => void;
  onOpenModeMenu?: () => void;
  onOpenEnhancementMenu?: () => void;
  onOpenExpressionMenu?: (selection: SelectionSnapshot) => void;
  onCloseExpressionMenu?: () => void;
  onSelectionChange?: (selection: SelectionSnapshot) => void;
  outlineEditState?: unknown;
  onStartOutlineEdit?: (index: number) => void;
  onOutlineDraftChange?: (draft: string) => void;
  onSaveOutlineEdit?: () => void;
  onCancelOutlineEdit?: () => void;
  onAddOutlinePoint?: () => void;
  onDeleteOutlinePoint?: (index: number) => void;
  onEscape?: () => void;
  inlineSuggestion?: ReactNode | null;
  inlineSuggestionReviewOnly?: boolean;
  focusedSuggestionSentence?: string;
  focusedSuggestionRange?: { start: number; end: number } | null;
  focusedSuggestionSourceText?: string;
  activeSuggestionSource?: boolean;
  onFocusedSuggestionSourceClick?: () => void;
  suggestionMarker?: SuggestionMarker | null;
  suggestionMarkers?: SuggestionMarker[];
  inlineSuggestionParagraphIndex?: number;
  placeholderNotice?: string;
  onApplySuggestionShortcut?: () => void;
  onRegenerateSuggestionShortcut?: () => void;
  wideLayout?: boolean;
};

const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  natural: "自然",
  ielts: "IELTS",
  academic: "学术",
  business: "商业",
  concise: "简洁",
};

const WRITING_MODE_DESCRIPTIONS: Record<WritingMode, string> = {
  natural: "日常与通用英文表达",
  ielts: "雅思写作表达",
  academic: "论文、报告、学术表达",
  business: "邮件、汇报、商务表达",
  concise: "更简洁直接的表达",
};

const ENHANCEMENT_LEVEL_LABELS: Record<EnhancementLevel, string> = {
  minimal: "轻度",
  balanced: "平衡",
  polished: "润色",
};

const ENHANCEMENT_LEVEL_DESCRIPTIONS: Record<EnhancementLevel, string> = {
  minimal: "尽量保留原句，只修正不自然处",
  balanced: "提升自然度，同时保留原意",
  polished: "更主动地重组句子表达",
};

const EDITOR_PLACEHOLDER =
  "直接写英文，卡住时可以夹中文。例如：This may 影响 young people's values.";

function clampOffset(offset: number, max: number) {
  return Math.max(0, Math.min(offset, max));
}

function getTextareaSelectionRange(
  element: HTMLTextAreaElement | null,
  fallbackOffset: number,
) {
  if (!element) {
    return { start: fallbackOffset, end: fallbackOffset };
  }

  return {
    start: element.selectionStart ?? fallbackOffset,
    end: element.selectionEnd ?? fallbackOffset,
  };
}

function getParagraphIndex(text: string, offset: number) {
  const safeOffset = clampOffset(offset, text.length);
  const beforeCursor = text.slice(0, safeOffset);
  const paragraphs = beforeCursor.split(/\n{2,}/);
  return Math.max(0, paragraphs.length - 1);
}

function estimateSelectionRect(element: HTMLTextAreaElement, offset: number) {
  const rect = element.getBoundingClientRect();
  const beforeCursor = element.value.slice(0, clampOffset(offset, element.value.length));
  const lines = beforeCursor.split("\n");
  const lineIndex = Math.max(0, lines.length - 1);
  const lineHeight = Number.parseFloat(window.getComputedStyle(element).lineHeight || "32");
  const top = rect.top + 28 + lineIndex * (Number.isFinite(lineHeight) ? lineHeight : 32);

  return new DOMRect(rect.left + 24, top, 1, 28);
}

function estimateOffsetTop(text: string, offset: number) {
  const safeOffset = clampOffset(offset, text.length);
  const beforeOffset = text.slice(0, safeOffset);
  const lineIndex = Math.max(0, beforeOffset.split("\n").length - 1);
  return 8 + lineIndex * 36;
}

function splitFocusedText(value: string, range?: { start: number; end: number } | null) {
  if (!range) {
    return { before: value, sentence: "", after: "" };
  }
  const start = clampOffset(range.start, value.length);
  const end = clampOffset(range.end, value.length);
  return {
    before: value.slice(0, start).trimEnd(),
    sentence: value.slice(start, end),
    after: value.slice(end).trimStart(),
  };
}

function renderFocusedSentence(
  sentence: string,
  sourceText: string,
  active: boolean,
  onActivate?: () => void,
) {
  const source = sourceText.trim();
  const index = source ? sentence.indexOf(source) : -1;
  if (index < 0) {
    return sentence;
  }

  return (
    <>
      {sentence.slice(0, index)}
      <button
        type="button"
        aria-label={`中文占位意群：${source}`}
        aria-pressed={active}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onActivate}
        onMouseEnter={onActivate}
        className={`rounded-[3px] underline decoration-[var(--lt-accent)] decoration-[1.5px] underline-offset-[5px] transition ${
          active
            ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
            : "hover:bg-[var(--lt-accent-soft)] hover:text-[var(--lt-accent)]"
        }`}
      >
        {source}
      </button>
      {sentence.slice(index + source.length)}
    </>
  );
}

function syncTextareaHeight(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  const nextHeight = Math.max(520, element.scrollHeight);
  element.style.height = `${nextHeight}px`;
}

function getTextStats(value: string) {
  const trimmed = value.trim();
  const words = trimmed.match(/[A-Za-z]+(?:[-'][A-Za-z]+)?/g)?.length ?? 0;
  const sentences =
    trimmed.match(/[^.!?\n]+[.!?。！？]+/g)?.length ??
    (trimmed.length > 0 ? 1 : 0);
  const paragraphs = trimmed
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean).length;

  return { words, sentences, paragraphs };
}

function sentenceTriggerLabel(triggerSettings: TriggerSettings) {
  switch (triggerSettings.sentenceEnhancementShortcut) {
    case "disable_shortcut":
      return "已关闭";
    case "button_only":
      return "按钮";
    case "ctrl_j_legacy":
      return "Ctrl/Cmd + J";
    case "ctrl_enter":
    default:
      return "Ctrl/Cmd + Enter";
  }
}

function StatusMenu({
  open,
  title,
  children,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="absolute bottom-9 left-0 z-40 w-64 rounded-[6px] border border-[var(--lt-border)] bg-[var(--lt-bg)] p-3 text-left shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
      <p className="text-[12px] font-semibold text-[var(--lt-text)]">{title}</p>
      <div className="mt-2 space-y-2 text-[12px] text-[var(--lt-muted)]">
        {children}
      </div>
    </div>
  );
}

export const WritingEditor = forwardRef<WritingEditorHandle, WritingEditorProps>(
  function WritingEditor(
    {
      value,
      isExpressionMenuOpen = false,
      writingMode,
      enhancementLevel,
      proofreadingResult,
      triggerSettings,
      topicAreaLabel = "自定义",
      onChange,
      onEnhance,
      onWritingModeChange,
      onEnhancementLevelChange,
      onOpenModeMenu,
      onOpenEnhancementMenu,
      onOpenExpressionMenu,
      onSelectionChange,
      onEscape,
      inlineSuggestion = null,
      focusedSuggestionSentence = "",
      focusedSuggestionRange = null,
      focusedSuggestionSourceText = "",
      activeSuggestionSource = false,
      onFocusedSuggestionSourceClick,
      suggestionMarker = null,
      suggestionMarkers = [],
      onApplySuggestionShortcut,
      onRegenerateSuggestionShortcut,
      wideLayout = false,
      inlineSuggestionReviewOnly = false,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLTextAreaElement | null>(null);
    const markerElementRefs = useRef<Map<string, HTMLElement>>(new Map());
    const statusMenuLayerRef = useRef<HTMLDivElement | null>(null);
    const [openStatusMenu, setOpenStatusMenu] = useState<"mode" | "level" | null>(
      null,
    );
    const [markerPositions, setMarkerPositions] = useState<Record<string, { top: number }>>({});

    const textStats = useMemo(() => getTextStats(value), [value]);
    const proofreadingIssueCount = proofreadingResult.signals.length;
    const focusedText = useMemo(
      () => splitFocusedText(value, focusedSuggestionRange),
      [focusedSuggestionRange, value],
    );
    const activeSuggestionMarkers = useMemo(() => {
      const markers = [
        ...suggestionMarkers,
        ...(suggestionMarker ? [{ ...suggestionMarker, id: suggestionMarker.id || "legacy-suggestion" }] : []),
      ];
      return markers
        .map((marker) => ({
          ...marker,
          range: {
            start: clampOffset(marker.range.start, value.length),
            end: clampOffset(marker.range.end, value.length),
          },
        }))
        .filter((marker) => marker.range.end > marker.range.start)
        .sort((first, second) => first.range.start - second.range.start);
    }, [suggestionMarker, suggestionMarkers, value.length]);

    useEffect(() => {
      if (editorRef.current) {
        syncTextareaHeight(editorRef.current);
      }
    }, [value]);

    useEffect(() => {
      if (activeSuggestionMarkers.length === 0) {
        setMarkerPositions({});
        return;
      }

      const nextPositions: Record<string, { top: number }> = {};
      for (const marker of activeSuggestionMarkers) {
        const element = markerElementRefs.current.get(marker.id);
        const fallbackTop = estimateOffsetTop(value, marker.range.start);
        const top = element?.offsetTop ?? fallbackTop;
        nextPositions[marker.id] = { top: top > 0 ? top : fallbackTop };
      }
      setMarkerPositions(nextPositions);
    }, [activeSuggestionMarkers, value]);

    useEffect(() => {
      const menuLayer = statusMenuLayerRef.current;
      if (openStatusMenu && menuLayer && typeof menuLayer.animate === "function") {
        waapi.animate(menuLayer, {
          opacity: [0, 1],
          translateY: [6, 0],
          duration: 180,
          easing: "easeOutQuad",
        });
      }
    }, [openStatusMenu]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editorRef.current?.focus();
        },
        getSelectionRange: () =>
          getTextareaSelectionRange(editorRef.current, value.length),
        setCursor: (offset: number) => {
          const element = editorRef.current;
          if (!element) {
            return;
          }

          const safeOffset = clampOffset(offset, element.value.length);
          element.focus();
          element.setSelectionRange(safeOffset, safeOffset);
        },
      }),
      [value.length],
    );

    function buildSelectionSnapshot(
      element: HTMLTextAreaElement,
      range = getTextareaSelectionRange(element, value.length),
    ): SelectionSnapshot {
      return {
        start: range.start,
        end: range.end,
        text: element.value.slice(range.start, range.end),
        paragraphIndex: getParagraphIndex(element.value, range.end),
        anchorRect: estimateSelectionRect(element, range.end),
        containerRect: element.getBoundingClientRect(),
      };
    }

    function reportSelection(element: HTMLTextAreaElement | null) {
      if (!element || !onSelectionChange) {
        return;
      }

      onSelectionChange(buildSelectionSnapshot(element));
    }

    function handleTextChange(nextValue: string, element: HTMLTextAreaElement) {
      onChange(nextValue);
      syncTextareaHeight(element);
      reportSelection(element);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
      if (event.key === "Escape") {
        if (inlineSuggestion || isExpressionMenuOpen) {
          event.preventDefault();
          onEscape?.();
        }
        return;
      }

      if (event.key === "Tab" && inlineSuggestion && !inlineSuggestionReviewOnly) {
        event.preventDefault();
        onApplySuggestionShortcut?.();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
        if (inlineSuggestion) {
          event.preventDefault();
          onRegenerateSuggestionShortcut?.();
        }
        return;
      }

      if (
        triggerSettings.inlineExpressionMenuTrigger !== "disabled" &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        const element = editorRef.current;
        if (!element) {
          return;
        }
        event.preventDefault();
        onOpenExpressionMenu?.(buildSelectionSnapshot(element));
        return;
      }

      if (
        triggerSettings.sentenceEnhancementShortcut === "ctrl_j_legacy" &&
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "j"
      ) {
        event.preventDefault();
        onEnhance();
        return;
      }

      if (
        triggerSettings.sentenceEnhancementShortcut === "ctrl_enter" &&
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter"
      ) {
        event.preventDefault();
        onEnhance();
      }
    }

    function renderSuggestionPositionText() {
      if (activeSuggestionMarkers.length === 0) {
        return value;
      }

      const nodes: ReactNode[] = [];
      let cursor = 0;
      activeSuggestionMarkers.forEach((marker) => {
        const start = Math.max(cursor, marker.range.start);
        const end = Math.max(start, marker.range.end);
        if (start > cursor) {
          nodes.push(value.slice(cursor, start));
        }
        nodes.push(
          <span
            key={marker.id}
            ref={(element) => {
              if (element) {
                markerElementRefs.current.set(marker.id, element);
              } else {
                markerElementRefs.current.delete(marker.id);
              }
            }}
            aria-hidden="true"
            data-input-overlay="position-probe"
            className="pointer-events-none inline whitespace-pre-wrap border-0 p-0 text-transparent"
          >
            {value.slice(start, end)}
          </span>,
        );
        cursor = end;
      });
      if (cursor < value.length) {
        nodes.push(value.slice(cursor));
      }
      return nodes;
    }

    const layoutClass = wideLayout ? "max-w-[1180px]" : "max-w-[920px]";

    return (
      <section
        aria-label="写作区"
        data-input-priority="textarea-first"
        className="flex min-h-[calc(100vh-56px)] flex-1 flex-col"
      >
        <div
          data-writing-column="true"
          className={`mx-auto flex w-full flex-1 flex-col px-4 pb-16 pt-6 sm:px-8 md:pt-10 ${layoutClass}`}
        >
          <div className="relative flex flex-1 flex-col">
            <textarea
              ref={editorRef}
              aria-label="写作编辑器"
              aria-multiline="true"
              className={
                inlineSuggestion
                  ? "sr-only"
                  : "lt-writing-textarea min-h-[520px] w-full resize-none overflow-hidden border-0 !bg-transparent px-0 py-0 font-sans text-[18px] leading-[1.84] text-[var(--lt-text)] outline-none placeholder:text-[var(--lt-muted)] placeholder:opacity-60 md:text-[19px]"
              }
              data-input-mode="native-document"
              data-placeholder={EDITOR_PLACEHOLDER}
              placeholder={EDITOR_PLACEHOLDER}
              spellCheck={false}
              value={value}
              onBlur={(event) => reportSelection(event.currentTarget)}
              onChange={(event) =>
                handleTextChange(event.currentTarget.value, event.currentTarget)
              }
              onClick={(event) => reportSelection(event.currentTarget)}
              onFocus={(event) => reportSelection(event.currentTarget)}
              onKeyDown={handleKeyDown}
              onKeyUp={(event) => reportSelection(event.currentTarget)}
              onMouseUp={(event) => reportSelection(event.currentTarget)}
              onSelect={(event) => reportSelection(event.currentTarget)}
            />

            {!inlineSuggestion ? (
              <>

                {activeSuggestionMarkers.length > 0 ? (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 min-h-[520px] whitespace-pre-wrap break-words font-sans text-[18px] leading-[1.84] text-transparent md:text-[19px]"
                  >
                    {renderSuggestionPositionText()}
                  </div>
                ) : null}

                {activeSuggestionMarkers.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    data-suggestion-entry={marker.state}
                    aria-label={
                      marker.state === "available"
                        ? "查看当前句 AI 建议"
                        : "已调用 AI 修改，点击查看建议"
                    }
                    className="absolute -right-10 grid h-6 w-6 place-items-center rounded-full border border-[var(--lt-border)] bg-[var(--lt-bg)] text-[11px] text-[var(--lt-accent)] opacity-45 shadow-[0_8px_24px_var(--lt-shadow)] transition hover:border-[var(--lt-accent)] hover:bg-[var(--lt-surface-soft)] hover:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lt-accent)]"
                    style={{ top: (markerPositions[marker.id]?.top ?? estimateOffsetTop(value, marker.range.start)) + 4 }}
                    onClick={marker.onOpen}
                  >
                    {marker.state === "available" ? "✦" : "•"}
                  </button>
                ))}
              </>
            ) : null}

            {inlineSuggestion ? (
              <div
                className="lt-writing-surface min-h-[520px] max-w-[860px] font-sans text-[18px] leading-[1.84] text-[var(--lt-text)] md:text-[19px]"
                tabIndex={-1}
                onKeyDown={handleKeyDown}
              >
                {focusedText.before ? (
                  <p
                    aria-label="AI 建议前文"
                    className="whitespace-pre-wrap"
                  >
                    {focusedText.before}
                  </p>
                ) : null}
                {focusedSuggestionSentence ? (
                  <p
                    aria-label="AI 建议句子焦点"
                    data-suggestion-focus="true"
                    className={`mt-7 whitespace-pre-wrap text-[18px] leading-[1.84] text-[var(--lt-text)] md:text-[19px] ${
                      inlineSuggestionReviewOnly
                        ? ""
                        : "border-l-2 border-[var(--lt-accent)] pl-4"
                    }`}
                  >
                    {renderFocusedSentence(
                      focusedSuggestionSentence,
                      focusedSuggestionSourceText,
                      activeSuggestionSource,
                      onFocusedSuggestionSourceClick,
                    )}
                  </p>
                ) : null}
                <div className="mt-2 max-w-[760px]">{inlineSuggestion}</div>
                {focusedText.after ? (
                  <p
                    aria-label="AI 建议后文"
                    className="mt-7 whitespace-pre-wrap"
                  >
                    {focusedText.after}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <footer
          aria-label="写作状态栏"
          data-status-layout="balanced-editorial"
          className="sticky bottom-0 z-20 -mx-8 mt-auto grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 border-t border-[var(--lt-border)] bg-[var(--lt-bg)] px-8 py-1 text-[12px] text-[var(--lt-muted)] shadow-[0_-10px_18px_var(--lt-bg)]"
        >
          <div
            aria-label="写作状态栏左侧"
            className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1"
          >
            <div
              aria-label="写作统计"
              className="flex shrink-0 items-center gap-2 whitespace-nowrap"
            >
              <span>{textStats.words} words</span>
              <span>/</span>
              <span>{textStats.sentences} sentences</span>
              <span>/</span>
              <span>{textStats.paragraphs} paragraphs</span>
            </div>
            <span aria-hidden="true" className="text-[var(--lt-border)]">
              |
            </span>
            <div
              aria-label="写作控制状态"
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
            >
              <div className="relative" ref={statusMenuLayerRef}>
                <button
                  type="button"
                  className="transition hover:text-[var(--lt-text)]"
                  onClick={() => {
                    setOpenStatusMenu((current) =>
                      current === "mode" ? null : "mode",
                    );
                    onOpenModeMenu?.();
                  }}
                >
                  模式：{WRITING_MODE_LABELS[writingMode]}
                </button>
                <StatusMenu open={openStatusMenu === "mode"} title="写作模式">
                  {(Object.keys(WRITING_MODE_LABELS) as WritingMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="menuitemradio"
                      aria-checked={mode === writingMode}
                      aria-label={WRITING_MODE_LABELS[mode]}
                      className={`block w-full rounded-[4px] px-2 py-1.5 text-left transition hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)] ${
                        mode === writingMode ? "text-[var(--lt-text)]" : ""
                      }`}
                      onClick={() => {
                        onWritingModeChange?.(mode);
                        setOpenStatusMenu(null);
                      }}
                    >
                      <span className="block font-medium">
                        {WRITING_MODE_LABELS[mode]}
                      </span>
                      <span className="block text-[11px] text-[var(--lt-muted)]">
                        {WRITING_MODE_DESCRIPTIONS[mode]}
                      </span>
                    </button>
                  ))}
                </StatusMenu>
              </div>
              <div className="relative">
                <button
                  type="button"
                  className="transition hover:text-[var(--lt-text)]"
                  onClick={() => {
                    setOpenStatusMenu((current) =>
                      current === "level" ? null : "level",
                    );
                    onOpenEnhancementMenu?.();
                  }}
                >
                  强度：{ENHANCEMENT_LEVEL_LABELS[enhancementLevel]}
                </button>
                <StatusMenu open={openStatusMenu === "level"} title="增强强度">
                  {(Object.keys(ENHANCEMENT_LEVEL_LABELS) as EnhancementLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="menuitemradio"
                      aria-checked={level === enhancementLevel}
                      aria-label={ENHANCEMENT_LEVEL_LABELS[level]}
                      className={`block w-full rounded-[4px] px-2 py-1.5 text-left transition hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)] ${
                        level === enhancementLevel ? "text-[var(--lt-text)]" : ""
                      }`}
                      onClick={() => {
                        onEnhancementLevelChange?.(level);
                        setOpenStatusMenu(null);
                      }}
                    >
                      <span className="block font-medium">
                        {ENHANCEMENT_LEVEL_LABELS[level]}
                      </span>
                      <span className="block text-[11px] text-[var(--lt-muted)]">
                        {ENHANCEMENT_LEVEL_DESCRIPTIONS[level]}
                      </span>
                    </button>
                  ))}
                </StatusMenu>
              </div>
            </div>
            <span aria-hidden="true" className="text-[var(--lt-border)]">
              |
            </span>
            <div
              aria-label="写作状态栏触发与领域"
              className="flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap"
            >
              <span>触发：{sentenceTriggerLabel(triggerSettings)}</span>
              <span>领域：{topicAreaLabel}</span>
            </div>
          </div>

          <button
            type="button"
            aria-label="写作状态栏文本校对"
            className={`justify-self-end whitespace-nowrap text-right transition hover:text-[var(--lt-text)] ${
              proofreadingIssueCount > 0
                ? "font-medium text-[#d97706]"
                : "text-[var(--lt-muted)]"
            }`}
          >
            文本校对：{proofreadingIssueCount} 个问题
          </button>
        </footer>
      </section>
    );
  },
);
