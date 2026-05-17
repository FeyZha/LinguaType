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
import type { Change } from "diff";

import type { ExpressionReappearanceMatch } from "@/lib/expressionReappearance";
import type { EnhancementLevel, WritingMode } from "@/lib/llm/types";
import { extractCurrentSentence } from "@/lib/sentence";
import type { TriggerSettings } from "@/lib/storage";
import { buildMappedDiffRows, renderOriginalDiffTokens } from "./EnhancementPopover";
import { ChartBarIcon } from "./HeroIcons";
import { useDismissableLayer } from "./useDismissableLayer";

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
  state: "available" | "reviewed" | "loading";
  onOpen: () => void;
};

const EMPTY_SUGGESTION_MARKERS: SuggestionMarker[] = [];

export type ExpressionReappearanceCue = ExpressionReappearanceMatch & {
  state?: "fresh" | "seen";
};

const EMPTY_EXPRESSION_REAPPEARANCE_CUES: ExpressionReappearanceCue[] = [];

export type WritingEditorHandle = {
  focus: () => void;
  getSelectionRange: () => { start: number; end: number };
  setCursor: (offset: number) => void;
  selectRange: (start: number, end: number) => void;
};

type WritingEditorProps = {
  value: string;
  outlinePoints?: string[];
  isLoading: boolean;
  writingMode: WritingMode;
  enhancementLevel: EnhancementLevel;
  triggerSettings: TriggerSettings;
  topicAreaLabel?: string;
  documentMapStatusLabel?: string;
  onChange: (value: string) => void;
  onEnhance: () => void;
  onOpenDocumentMap?: () => void;
  onWritingModeChange?: (mode: WritingMode) => void;
  onEnhancementLevelChange?: (level: EnhancementLevel) => void;
  onOpenModeMenu?: () => void;
  onOpenEnhancementMenu?: () => void;
  onCheckCurrentParagraph?: (cursorPosition?: number) => void;
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
  focusedSuggestionDiffParts?: Change[];
  activeSuggestionDiffId?: string | null;
  onFocusedSuggestionDiffHover?: (id: string | null) => void;
  onFocusedSuggestionSourceClick?: () => void;
  suggestionMarker?: SuggestionMarker | null;
  suggestionMarkers?: SuggestionMarker[];
  expressionReappearanceCues?: ExpressionReappearanceCue[];
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
    return { start: fallbackOffset, end: fallbackOffset, focus: fallbackOffset };
  }

  const start = element.selectionStart ?? fallbackOffset;
  const end = element.selectionEnd ?? fallbackOffset;
  const focus = element.selectionDirection === "backward" ? start : end;

  return {
    start,
    end,
    focus,
  };
}

function getParagraphIndex(text: string, offset: number) {
  const safeOffset = clampOffset(offset, text.length);
  const beforeCursor = text.slice(0, safeOffset);
  const paragraphs = beforeCursor.split(/\n{2,}/);
  return Math.max(0, paragraphs.length - 1);
}

const FALLBACK_FONT_SIZE = 21;
const FALLBACK_LINE_HEIGHT = 48;
const SELECTION_TOP_CLAMP = 4;

type TextareaVisualMetrics = {
  fontSize: number;
  lineHeight: number;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
  charWidth: number;
  charsPerVisualLine: number;
};

type WritingStats = {
  englishWordCount: number;
  sentenceCount: number;
  paragraphCount: number;
};

function getTextareaVisualMetrics(
  element?: HTMLTextAreaElement | null,
): TextareaVisualMetrics {
  const style = element ? window.getComputedStyle(element) : null;
  const fontSize = Number.parseFloat(style?.fontSize || `${FALLBACK_FONT_SIZE}`);
  const lineHeight = Number.parseFloat(style?.lineHeight || `${FALLBACK_LINE_HEIGHT}`);
  const paddingTop = Number.parseFloat(style?.paddingTop || "0");
  const paddingLeft = Number.parseFloat(style?.paddingLeft || "0");
  const paddingRight = Number.parseFloat(style?.paddingRight || "0");
  const rectWidth = element?.getBoundingClientRect().width ?? 0;
  const normalizedFontSize = Number.isFinite(fontSize) ? fontSize : FALLBACK_FONT_SIZE;
  const normalizedLineHeight = Number.isFinite(lineHeight) ? lineHeight : FALLBACK_LINE_HEIGHT;
  const normalizedPaddingTop = Number.isFinite(paddingTop) ? paddingTop : 0;
  const normalizedPaddingLeft = Number.isFinite(paddingLeft) ? paddingLeft : 0;
  const normalizedPaddingRight = Number.isFinite(paddingRight) ? paddingRight : 0;
  const charWidth = Math.max(8, normalizedFontSize * 0.55);
  const usableWidth =
    rectWidth > 0
      ? Math.max(120, rectWidth - normalizedPaddingLeft - normalizedPaddingRight)
      : 860;

  return {
    fontSize: normalizedFontSize,
    lineHeight: normalizedLineHeight,
    paddingTop: normalizedPaddingTop,
    paddingLeft: normalizedPaddingLeft,
    paddingRight: normalizedPaddingRight,
    charWidth,
    charsPerVisualLine: Math.max(18, Math.floor(usableWidth / charWidth)),
  };
}

function getVisualCaretPosition(
  text: string,
  offset: number,
  metrics: TextareaVisualMetrics,
) {
  const safeOffset = clampOffset(offset, text.length);
  const beforeOffset = text.slice(0, safeOffset);
  const lines = beforeOffset.split("\n");
  let visualLineIndex = 0;
  let visualColumnIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const lineLength = lines[index]?.length ?? 0;
    if (index === lines.length - 1) {
      visualLineIndex += Math.floor(lineLength / metrics.charsPerVisualLine);
      visualColumnIndex = lineLength % metrics.charsPerVisualLine;
      continue;
    }

    visualLineIndex += Math.max(
      1,
      Math.ceil(Math.max(1, lineLength) / metrics.charsPerVisualLine),
    );
  }

  return { visualLineIndex, visualColumnIndex };
}

function measureSelectionRectWithMirror(
  element: HTMLTextAreaElement,
  focusOffset: number,
  metrics: TextareaVisualMetrics,
) {
  if (typeof document === "undefined") {
    return null;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0) {
    return null;
  }

  const style = window.getComputedStyle(element);
  const mirror = document.createElement("div");
  mirror.setAttribute("data-selection-mirror", "true");
  const mirrorStyle = mirror.style;
  mirrorStyle.position = "fixed";
  mirrorStyle.visibility = "hidden";
  mirrorStyle.pointerEvents = "none";
  mirrorStyle.zIndex = "-1";
  mirrorStyle.left = `${rect.left - element.scrollLeft}px`;
  mirrorStyle.top = `${rect.top - element.scrollTop}px`;
  mirrorStyle.width = `${rect.width}px`;
  mirrorStyle.boxSizing = style.boxSizing;
  mirrorStyle.padding = style.padding;
  mirrorStyle.border = style.border;
  mirrorStyle.font = style.font;
  mirrorStyle.fontSize = style.fontSize;
  mirrorStyle.fontFamily = style.fontFamily;
  mirrorStyle.fontWeight = style.fontWeight;
  mirrorStyle.fontStyle = style.fontStyle;
  mirrorStyle.lineHeight = style.lineHeight;
  mirrorStyle.letterSpacing = style.letterSpacing;
  mirrorStyle.textTransform = style.textTransform;
  mirrorStyle.whiteSpace = "pre-wrap";
  mirrorStyle.overflowWrap = "break-word";
  mirrorStyle.wordBreak = style.wordBreak || "normal";

  const focusSpan = document.createElement("span");
  focusSpan.setAttribute("data-selection-mirror-range", "focus");
  focusSpan.style.display = "inline-block";
  focusSpan.style.width = "1px";
  focusSpan.style.height = `${metrics.lineHeight}px`;
  focusSpan.style.overflow = "hidden";
  focusSpan.style.verticalAlign = "baseline";

  mirror.append(document.createTextNode(element.value.slice(0, focusOffset)));
  mirror.append(focusSpan);
  mirror.append(document.createTextNode(element.value.slice(focusOffset)));
  document.body.append(mirror);

  const measuredRect = focusSpan.getBoundingClientRect();
  mirror.remove();
  if (measuredRect.width <= 0 && measuredRect.height <= 0) {
    return null;
  }

  return new DOMRect(
    measuredRect.left,
    measuredRect.top,
    Math.max(1, measuredRect.width || metrics.charWidth),
    Math.max(metrics.lineHeight, measuredRect.height || metrics.lineHeight),
  );
}

function estimateSelectionRect(
  element: HTMLTextAreaElement,
  startOffset: number,
  endOffset = startOffset,
  focusOffset = endOffset,
) {
  const rect = element.getBoundingClientRect();
  const metrics = getTextareaVisualMetrics(element);
  const safeStart = clampOffset(Math.min(startOffset, endOffset), element.value.length);
  const safeEnd = clampOffset(Math.max(startOffset, endOffset), element.value.length);
  const safeFocus = clampOffset(focusOffset, element.value.length);
  const measuredRect = measureSelectionRectWithMirror(
    element,
    safeFocus,
    metrics,
  );
  if (measuredRect) {
    return measuredRect;
  }

  const focusPosition = getVisualCaretPosition(element.value, safeFocus, metrics);
  const usableWidth = Math.max(
    metrics.charWidth,
    rect.width - metrics.paddingLeft - metrics.paddingRight,
  );
  const width = metrics.charWidth;

  const top = Math.max(
    rect.top +
      metrics.paddingTop +
      Math.max(0, focusPosition.visualLineIndex) * metrics.lineHeight,
    rect.top + SELECTION_TOP_CLAMP,
  );

  const maxLeft = Math.max(
    rect.left,
    rect.left + metrics.paddingLeft + usableWidth - width - 1,
  );
  const clampedLeft = Math.max(
    rect.left + Math.max(0, metrics.paddingLeft),
    Math.min(
      rect.left +
        focusPosition.visualColumnIndex * metrics.charWidth +
        metrics.paddingLeft,
      maxLeft,
    ),
  );

  return new DOMRect(clampedLeft, top, width, metrics.lineHeight);
}

function estimateOffsetTop(
  text: string,
  offset: number,
  element?: HTMLTextAreaElement | null,
) {
  const safeOffset = clampOffset(offset, text.length);
  const metrics = getTextareaVisualMetrics(element);
  const { visualLineIndex } = getVisualCaretPosition(text, safeOffset, metrics);

  return 8 + metrics.paddingTop + visualLineIndex * metrics.lineHeight;
}

function calculateWritingStats(text: string): WritingStats {
  const trimmed = text.trim();
  const englishWordCount = trimmed.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)?.length ?? 0;
  const sentenceCount = trimmed
    ? trimmed.split(/[.!?。！？]+/u).filter((part) => part.trim().length > 0).length
    : 0;
  const paragraphCount = trimmed
    ? trimmed.split(/\n\s*\n|\n/u).filter((part) => part.trim().length > 0).length
    : 0;

  return {
    englishWordCount,
    sentenceCount,
    paragraphCount,
  };
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

function sentenceTriggerLabel(triggerSettings: TriggerSettings) {
  switch (triggerSettings.sentenceEnhancementShortcut) {
    case "button_only":
      return "按钮";
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
    <div
      data-status-menu="open"
      className="absolute bottom-7 left-0 z-40 w-56 rounded-[6px] border border-[var(--lt-border)] bg-[var(--lt-bg)] p-2 text-left"
    >
      <p className="text-[12px] font-semibold text-[var(--lt-text)]">{title}</p>
      <div className="mt-2 space-y-1 text-[12px] text-[var(--lt-muted)]">
        {children}
      </div>
    </div>
  );
}

export const WritingEditor = forwardRef<WritingEditorHandle, WritingEditorProps>(
  function WritingEditor(
    {
      value,
      isLoading,
      writingMode,
      enhancementLevel,
      triggerSettings,
      topicAreaLabel = "自定义",
      documentMapStatusLabel = "检查文章地图",
      onChange,
      onEnhance,
      onOpenDocumentMap,
      onWritingModeChange,
      onEnhancementLevelChange,
      onOpenModeMenu,
      onOpenEnhancementMenu,
      onCheckCurrentParagraph,
      onSelectionChange,
      onEscape,
      inlineSuggestion = null,
      focusedSuggestionSentence = "",
      focusedSuggestionRange = null,
      focusedSuggestionSourceText = "",
      activeSuggestionSource = false,
      focusedSuggestionDiffParts = [],
      activeSuggestionDiffId = null,
      onFocusedSuggestionDiffHover,
      onFocusedSuggestionSourceClick,
      suggestionMarker = null,
      suggestionMarkers = EMPTY_SUGGESTION_MARKERS,
      expressionReappearanceCues = EMPTY_EXPRESSION_REAPPEARANCE_CUES,
      onApplySuggestionShortcut,
      onRegenerateSuggestionShortcut,
      wideLayout = false,
      inlineSuggestionReviewOnly = false,
    },
    ref,
  ) {
    const editorRef = useRef<HTMLTextAreaElement | null>(null);
    const markerElementRefs = useRef<Map<string, HTMLElement>>(new Map());
    const markerButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
    const prevSuggestionMarkerIds = useRef<Set<string>>(new Set());
    const statusControlsRef = useRef<HTMLDivElement | null>(null);
    const [openStatusMenu, setOpenStatusMenu] = useState<"mode" | "level" | null>(
      null,
    );
    const [markerPositions, setMarkerPositions] = useState<Record<string, { top: number }>>({});
    const [activeSuggestionMarkerId, setActiveSuggestionMarkerId] = useState<
      string | null
    >(null);
    const writingStats = useMemo(() => calculateWritingStats(value), [value]);
    const documentMapStatusTone =
      /发现|可检查|过期|失败/u.test(documentMapStatusLabel) ? "attention" : "muted";
    const showEditorEnhanceButton = triggerSettings.sentenceEnhancementShortcut === "button_only";
    const focusedText = useMemo(
      () => splitFocusedText(value, focusedSuggestionRange),
      [focusedSuggestionRange, value],
    );
    const focusedSuggestionDiffRows = useMemo(
      () => buildMappedDiffRows(focusedSuggestionDiffParts),
      [focusedSuggestionDiffParts],
    );
    const shouldRenderFocusedDiff =
      focusedSuggestionDiffRows.original.some((token) => token.changed);
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
    const activeSuggestionMarker = useMemo(
      () =>
        activeSuggestionMarkers.find((marker) => marker.id === activeSuggestionMarkerId),
      [activeSuggestionMarkerId, activeSuggestionMarkers],
    );
    useDismissableLayer(statusControlsRef, () => setOpenStatusMenu(null), Boolean(openStatusMenu));

    useEffect(() => {
      if (!openStatusMenu) {
        return;
      }
      function closeOnEscape(event: globalThis.KeyboardEvent) {
        if (event.key === "Escape") {
          setOpenStatusMenu(null);
        }
      }
      document.addEventListener("keydown", closeOnEscape);
      return () => document.removeEventListener("keydown", closeOnEscape);
    }, [openStatusMenu]);

    useEffect(() => {
      if (editorRef.current) {
        syncTextareaHeight(editorRef.current);
      }
    }, [value]);

    useEffect(() => {
      if (activeSuggestionMarkers.length === 0) {
        setMarkerPositions((current) =>
          Object.keys(current).length === 0 ? current : {},
        );
        return;
      }

      const nextPositions: Record<string, { top: number }> = {};
      for (const marker of activeSuggestionMarkers) {
        const element = markerElementRefs.current.get(marker.id);
        const fallbackTop = estimateOffsetTop(value, marker.range.start, editorRef.current);
        const top = element?.offsetTop ?? fallbackTop;
        nextPositions[marker.id] = { top: top > 0 ? top : fallbackTop };
      }
      setMarkerPositions(nextPositions);
    }, [activeSuggestionMarkers, value]);

    useEffect(() => {
      const nextIds = new Set(activeSuggestionMarkers.map((marker) => marker.id));
      const hasRecent = new Set<string>();
      for (const id of nextIds) {
        if (!prevSuggestionMarkerIds.current.has(id)) {
          hasRecent.add(id);
        }
      }
      prevSuggestionMarkerIds.current = nextIds;

      if (hasRecent.size > 0) {
        for (const markerId of hasRecent) {
          const buttonElement = markerButtonRefs.current.get(markerId);
          if (
            buttonElement &&
            typeof buttonElement.animate === "function" &&
            typeof waapi.animate === "function"
          ) {
            waapi.animate(buttonElement, {
              scale: [1, 1.06, 1],
              opacity: [1, 0.92, 1],
              duration: 700,
              ease: "ease-out",
            });
          }
        }

        return;
      }
    }, [activeSuggestionMarkers]);

    useEffect(() => {
      const menuLayer = statusControlsRef.current?.querySelector<HTMLElement>("[data-status-menu='open']");
      if (openStatusMenu && menuLayer && typeof menuLayer.animate === "function") {
        waapi.animate(menuLayer, {
          opacity: [0, 1],
          translateY: [6, 0],
          duration: 180,
          ease: "cubic-bezier(0.22, 1, 0.36, 1)",
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
        selectRange: (start: number, end: number) => {
          const element = editorRef.current;
          if (!element) {
            return;
          }
          const safeStart = clampOffset(start, element.value.length);
          const safeEnd = clampOffset(end, element.value.length);
          element.focus();
          element.setSelectionRange(Math.min(safeStart, safeEnd), Math.max(safeStart, safeEnd));
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
        paragraphIndex: getParagraphIndex(element.value, range.focus),
        anchorRect: estimateSelectionRect(element, range.start, range.end, range.focus),
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
        if (inlineSuggestion) {
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
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        const element = editorRef.current;
        if (!element) {
          return;
        }
        event.preventDefault();
        onCheckCurrentParagraph?.(buildSelectionSnapshot(element).start);
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

    function renderSuggestionHighlightLayer(activeMarker: SuggestionMarker | undefined) {
      if (!activeMarker) {
        return null;
      }

      const sentenceRange = extractCurrentSentence(value, activeMarker.range.start + 1);
      const start = clampOffset(sentenceRange.start, value.length);
      const end = clampOffset(sentenceRange.end, value.length);
      if (end <= start) {
        return null;
      }

      return (
        <>
          <span>{value.slice(0, start)}</span>
          <mark
            data-suggestion-highlight="active"
            className="rounded-[3px] bg-[var(--lt-accent-soft)] px-0.5 leading-[inherit] text-transparent"
          >
            {value.slice(start, end)}
          </mark>
          <span>{value.slice(end)}</span>
        </>
      );
    }

    function renderExpressionReappearanceLayer(cues: ExpressionReappearanceCue[]) {
      if (cues.length === 0) {
        return null;
      }

      const nodes: ReactNode[] = [];
      let cursor = 0;
      const sortedCues = [...cues]
        .map((cue) => ({
          ...cue,
          start: clampOffset(cue.start, value.length),
          end: clampOffset(cue.end, value.length),
        }))
        .filter((cue) => cue.end > cue.start)
        .sort((first, second) => first.start - second.start);

      for (const cue of sortedCues) {
        const start = Math.max(cursor, cue.start);
        const end = Math.max(start, cue.end);
        if (end <= start) {
          continue;
        }
        if (start > cursor) {
          nodes.push(
            <span key={`${cue.id}-before-${cursor}`} aria-hidden="true">
              {value.slice(cursor, start)}
            </span>,
          );
        }

        const isFresh = cue.state === "fresh";
        nodes.push(
          <span
            key={cue.id}
            aria-hidden="true"
            data-expression-reappearance-cue={isFresh ? "fresh" : "seen"}
            data-expression-reappearance-visual={isFresh ? "card-stamp" : "idle"}
            className={`lt-expression-cue relative inline whitespace-pre-wrap text-transparent ${
              isFresh ? "lt-expression-cue--fresh lt-expression-cue--card-stamp" : ""
            }`}
          >
            {value.slice(start, end)}
          </span>,
        );
        cursor = end;
      }

      if (cursor < value.length) {
        nodes.push(
          <span key="expression-cue-after" aria-hidden="true">
            {value.slice(cursor)}
          </span>,
        );
      }

      return nodes;
    }

    const writingTextClass =
      "font-serif text-[21px] leading-[2.22] tracking-[0] md:text-[22px] md:leading-[2.25] whitespace-pre-wrap break-words";
    const writingGutterClass = "pl-0 pr-12 sm:pr-14";
    const writingPaperClass = `${writingTextClass} ${writingGutterClass} text-transparent`;
    const writingSurfaceClass = `lt-writing-surface min-h-[520px] max-w-[860px] ${writingTextClass} ${writingGutterClass}`;
    const layoutClass = wideLayout ? "max-w-[1120px]" : "max-w-[980px]";

    return (
      <section
        aria-label="写作区"
        data-input-priority="textarea-first"
        className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      >
        <div
          data-writing-column="true"
          className={`lt-scrollbar-hidden mx-auto flex w-full flex-1 flex-col overflow-y-auto px-4 pb-20 pt-6 sm:px-8 md:px-10 md:pt-10 ${layoutClass}`}
        >
          <div className="relative flex flex-1 flex-col">
            <textarea
              ref={editorRef}
              aria-label="写作编辑器"
              aria-multiline="true"
              className={
                inlineSuggestion
                  ? "sr-only"
                  : `lt-writing-textarea min-h-[520px] w-full resize-none overflow-hidden border-0 !bg-transparent ${writingGutterClass} py-0 ${writingTextClass} text-[var(--lt-text)] outline-none placeholder:text-[var(--lt-muted)] placeholder:opacity-60`
                }
              data-input-mode="native-document"
              data-placeholder={EDITOR_PLACEHOLDER}
              placeholder={EDITOR_PLACEHOLDER}
              spellCheck={false}
              value={value}
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

            {!inlineSuggestion && showEditorEnhanceButton ? (
              <button
                type="button"
                aria-label="增强当前句"
                disabled={isLoading}
                onClick={onEnhance}
                className="absolute right-0 top-2 z-10 rounded-[4px] border border-[var(--lt-border)] bg-[var(--lt-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--lt-text)] transition hover:border-[var(--lt-accent)] hover:text-[var(--lt-accent)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                增强当前句
              </button>
            ) : null}

            {!inlineSuggestion ? (
              <>
                {activeSuggestionMarkers.length > 0 ? (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 top-0 min-h-[520px] ${writingPaperClass}`}
                  >
                    {renderSuggestionPositionText()}
                  </div>
                ) : null}
                {activeSuggestionMarker ? (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 top-0 min-h-[520px] ${writingPaperClass}`}
                  >
                    {renderSuggestionHighlightLayer(activeSuggestionMarker)}
                  </div>
                ) : null}

                {expressionReappearanceCues.length > 0 ? (
                  <div
                    className={`pointer-events-none absolute inset-x-0 top-0 z-10 min-h-[520px] ${writingPaperClass}`}
                  >
                    {renderExpressionReappearanceLayer(expressionReappearanceCues)}
                  </div>
                ) : null}

                {activeSuggestionMarkers.map((marker) => (
                  <button
                    key={marker.id}
                    type="button"
                    ref={(element) => {
                      if (element) {
                        markerButtonRefs.current.set(marker.id, element);
                      } else {
                        markerButtonRefs.current.delete(marker.id);
                      }
                    }}
                    data-suggestion-entry={marker.state}
                    aria-busy={marker.state === "loading"}
                    disabled={marker.state === "loading"}
                    aria-label={
                      marker.state === "loading"
                        ? "AI 正在修改当前句"
                        : marker.state === "available"
                          ? "查看当前 AI 建议"
                          : "重新查看AI修改"
                    }
                    className={`absolute right-1 z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--lt-accent)_58%,transparent)] bg-[var(--lt-bg)]/90 p-0 text-[var(--lt-accent)] opacity-85 shadow-[0_8px_22px_rgba(185,105,72,0.12)] backdrop-blur-sm transition-[opacity,background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--lt-accent)] hover:bg-[var(--lt-accent-soft)] hover:opacity-100 hover:shadow-[0_10px_28px_rgba(185,105,72,0.16)] focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lt-accent)] sm:right-2 ${
                      activeSuggestionMarkerId === marker.id
                        ? "border-[var(--lt-accent)] bg-[var(--lt-accent-soft)] ring-1 ring-[var(--lt-accent)]"
                        : ""
                    } ${marker.state === "loading" ? "cursor-wait opacity-100" : ""}`}
                    style={{ top: (markerPositions[marker.id]?.top ?? estimateOffsetTop(value, marker.range.start, editorRef.current)) + 2 }}
                    onClick={() => {
                      if (marker.state !== "loading") {
                        marker.onOpen();
                      }
                    }}
                    onMouseEnter={() => setActiveSuggestionMarkerId(marker.id)}
                    onMouseLeave={() =>
                      setActiveSuggestionMarkerId((current) =>
                        current === marker.id ? null : current,
                      )
                    }
                    onFocus={() => setActiveSuggestionMarkerId(marker.id)}
                    onBlur={() =>
                      setActiveSuggestionMarkerId((current) =>
                        current === marker.id ? null : current,
                      )
                    }
                  >
                    {marker.state === "loading" ? (
                      <span aria-hidden="true" className="relative flex h-3.5 w-3.5 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={`relative flex h-3.5 w-3.5 items-center justify-center transition ${
                          marker.state === "available"
                            ? ""
                            : "opacity-75"
                        }`}
                      >
                        <span className="absolute h-3.5 w-3.5 rounded-full border border-current opacity-55" />
                        <span
                          className={`rounded-full bg-current ${
                            marker.state === "available"
                              ? "h-1.5 w-1.5 opacity-80"
                              : "h-2 w-2 opacity-20"
                          }`}
                        />
                      </span>
                    )}
                  </button>
                ))}
              </>
            ) : null}
            {inlineSuggestion ? (
              <div
                className={writingSurfaceClass}
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
                    className={`mt-6 whitespace-pre-wrap border-l-2 border-[var(--lt-accent)] pl-4 ${writingTextClass} text-[var(--lt-text)] ${
                      inlineSuggestionReviewOnly ? "border-opacity-70" : ""
                    }`}
                  >
                    {shouldRenderFocusedDiff
                      ? renderOriginalDiffTokens(
                          focusedSuggestionDiffRows.original,
                          activeSuggestionDiffId,
                          onFocusedSuggestionDiffHover ?? (() => undefined),
                        )
                      : renderFocusedSentence(
                          focusedSuggestionSentence,
                          focusedSuggestionSourceText,
                          activeSuggestionSource,
                          onFocusedSuggestionSourceClick,
                        )}
                  </p>
                ) : null}
                <div className="mt-2 max-w-[860px]">{inlineSuggestion}</div>
                {focusedText.after ? (
                  <p
                    aria-label="AI 建议后文"
                    className="mt-6 whitespace-pre-wrap"
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
          className="fixed bottom-0 right-0 z-40 grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 border-t border-[var(--lt-border)] bg-[var(--lt-bg)] px-8 py-1 text-[12px] text-[var(--lt-muted)] xl:left-[var(--lt-sidebar-width,320px)]"
        >
          <div
            aria-label="写作状态栏左侧"
            className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1"
          >
            <div
              aria-label="写作控制状态"
              className="flex flex-wrap items-center gap-x-4 gap-y-1"
              ref={statusControlsRef}
            >
              <div
                aria-label="写作统计"
                className="flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--lt-muted)]"
              >
                <span>{writingStats.englishWordCount} 词</span>
                <span>·</span>
                <span>{writingStats.sentenceCount} 句</span>
                <span>·</span>
                <span>{writingStats.paragraphCount} 段</span>
              </div>
              <div className="relative">
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
                      {WRITING_MODE_LABELS[mode]}
                    </button>
                  ))}
                  <p className="border-t border-[var(--lt-border)] pt-2 text-[11px] leading-5 text-[var(--lt-muted)]">
                    {WRITING_MODE_DESCRIPTIONS[writingMode]}
                  </p>
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
                      {ENHANCEMENT_LEVEL_LABELS[level]}
                    </button>
                  ))}
                  <p className="border-t border-[var(--lt-border)] pt-2 text-[11px] leading-5 text-[var(--lt-muted)]">
                    {ENHANCEMENT_LEVEL_DESCRIPTIONS[enhancementLevel]}
                  </p>
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
            aria-label={documentMapStatusLabel}
            onClick={onOpenDocumentMap}
            className={`inline-flex justify-self-end whitespace-nowrap text-right transition hover:text-[var(--lt-text)] ${
              documentMapStatusTone === "attention"
                ? "font-medium text-[#d97706]"
                : "text-[var(--lt-muted)]"
            }`}
          >
            <ChartBarIcon className="mr-1.5 h-3.5 w-3.5" />
            {documentMapStatusLabel}
          </button>
        </footer>
      </section>
    );
  },
);
