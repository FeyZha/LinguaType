"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { waapi } from "animejs/waapi";
import type { Change } from "diff";

import type { ExpressionReappearanceMatch } from "@/lib/expressionReappearance";
import type { EnhancementLevel, WritingMode } from "@/lib/llm/types";
import type { ProofreadingResult } from "@/lib/proofreading";
import type { ProofreadingSignal } from "@/lib/proofreading";
import { extractCurrentSentence } from "@/lib/sentence";
import type { TriggerSettings } from "@/lib/storage";
import { buildMappedDiffRows, renderOriginalDiffTokens } from "./EnhancementPopover";
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
const PROOFREADING_GROUP_CLOSED_HEIGHT = 28;
const PROOFREADING_GROUP_GAP = 12;

type TextareaVisualMetrics = {
  fontSize: number;
  lineHeight: number;
  paddingTop: number;
  paddingLeft: number;
  paddingRight: number;
  charWidth: number;
  charsPerVisualLine: number;
};

type ProofreadingHintGroup = {
  id: string;
  start: number;
  signals: ProofreadingSignal[];
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

function estimateInlineCueCursorOffset(
  event: ReactMouseEvent<HTMLElement>,
  start: number,
  end: number,
) {
  const rect = event.currentTarget.getBoundingClientRect();
  const cueLength = Math.max(0, end - start);
  if (cueLength === 0 || rect.width <= 0) {
    return start;
  }

  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  return start + Math.round(ratio * cueLength);
}

function getSentenceStartForOffset(text: string, offset: number) {
  const safeOffset = clampOffset(offset, text.length);
  let sentenceStart = 0;

  for (let index = 0; index < safeOffset; index += 1) {
    const char = text[index];
    if (
      char === "." ||
      char === "?" ||
      char === "!" ||
      char === "。" ||
      char === "？" ||
      char === "！" ||
      char === "\n"
    ) {
      sentenceStart = index + 1;
    }
  }

  return sentenceStart;
}

function groupProofreadingHints(
  text: string,
  signals: ProofreadingSignal[],
): ProofreadingHintGroup[] {
  const groups = new Map<number, ProofreadingHintGroup>();

  for (const signal of [...signals].sort((first, second) => first.start - second.start)) {
    const groupStart = getSentenceStartForOffset(text, signal.start);
    const existing = groups.get(groupStart);
    if (existing) {
      existing.signals.push(signal);
      existing.start = Math.min(existing.start, signal.start);
      continue;
    }

    groups.set(groupStart, {
      id: `proofreading-group-${groupStart}`,
      start: signal.start,
      signals: [signal],
    });
  }

  return [...groups.values()].sort((first, second) => first.start - second.start);
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

function proofreadingHintPosition(
  value: string,
  offset: number,
  element?: HTMLTextAreaElement | null,
): number {
  return estimateOffsetTop(value, offset, element) + 6;
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
    const proofreadingDetailRefs = useRef<Map<string, HTMLElement>>(new Map());
    const prevSuggestionMarkerIds = useRef<Set<string>>(new Set());
    const statusControlsRef = useRef<HTMLDivElement | null>(null);
    const [openStatusMenu, setOpenStatusMenu] = useState<"mode" | "level" | null>(
      null,
    );
    const [markerPositions, setMarkerPositions] = useState<Record<string, { top: number }>>({});
    const [activeSuggestionMarkerId, setActiveSuggestionMarkerId] = useState<
      string | null
    >(null);
    const [proofreadingTagPositions, setProofreadingTagPositions] = useState<
      Record<string, { top: number }>
    >({});
    const [proofreadingTagHeights, setProofreadingTagHeights] = useState<
      Record<string, { expandedHeight: number }>
    >({});
    const [activeProofreadingSignalId, setActiveProofreadingSignalId] = useState<string | null>(null);
    const [activeExpressionCueId, setActiveExpressionCueId] = useState<string | null>(null);

    const proofreadingIssueCount = proofreadingResult.signals.length;
    const proofreadingHints = useMemo<ProofreadingSignal[]>(
      () => proofreadingResult.signals,
      [proofreadingResult.signals],
    );
    const proofreadingHintGroups = useMemo(
      () => groupProofreadingHints(value, proofreadingHints),
      [proofreadingHints, value],
    );
    const activeProofreadingSignal = useMemo(
      () => proofreadingHints.find((signal) => signal.id === activeProofreadingSignalId),
      [activeProofreadingSignalId, proofreadingHints],
    );
    const activeProofreadingGroup = useMemo(
      () =>
        proofreadingHintGroups.find((group) =>
          group.signals.some((signal) => signal.id === activeProofreadingSignalId),
        ),
      [activeProofreadingSignalId, proofreadingHintGroups],
    );
    const showEditorEnhanceButton =
      triggerSettings.sentenceEnhancementShortcut === "button_only" ||
      triggerSettings.sentenceEnhancementShortcut === "disable_shortcut";
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
    const activeExpressionCue = useMemo(
      () => expressionReappearanceCues.find((cue) => cue.id === activeExpressionCueId),
      [activeExpressionCueId, expressionReappearanceCues],
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
      const nextHeights: Record<string, { expandedHeight: number }> = {};
      for (const signal of proofreadingResult.signals) {
        const detailElement = proofreadingDetailRefs.current.get(signal.id);
        const nextHeight = detailElement ? detailElement.scrollHeight : 0;
        nextHeights[signal.id] = {
          expandedHeight: Math.max(16, nextHeight),
        };
      }
      setProofreadingTagHeights((previous) => {
        const changed =
          JSON.stringify(previous) !== JSON.stringify(nextHeights);
        return changed ? nextHeights : previous;
      });
    }, [proofreadingResult.signals]);

    useEffect(() => {
      if (proofreadingHintGroups.length === 0) {
        setProofreadingTagPositions((current) =>
          Object.keys(current).length === 0 ? current : {},
        );
        return;
      }

      const nextPositions: Record<string, { top: number }> = {};
      const activeGroupIndex = activeProofreadingGroup
        ? proofreadingHintGroups.findIndex(
            (group) => group.id === activeProofreadingGroup.id,
          )
        : -1;
      const activeBaseTop = activeProofreadingGroup
        ? proofreadingHintPosition(value, activeProofreadingGroup.start, editorRef.current)
        : 0;
      const activeHeight = activeProofreadingSignal
        ? PROOFREADING_GROUP_CLOSED_HEIGHT +
          (proofreadingTagHeights[activeProofreadingSignal.id]?.expandedHeight ?? 0)
        : 0;

      let previousBottom = 0;
      for (let index = 0; index < proofreadingHintGroups.length; index += 1) {
        const group = proofreadingHintGroups[index];
        const baselineTop = proofreadingHintPosition(value, group.start, editorRef.current);
        const isActiveGroup = group.id === activeProofreadingGroup?.id;
        const minimumTop =
          previousBottom > 0 ? previousBottom + PROOFREADING_GROUP_GAP : baselineTop;
        const activePushTop =
          activeGroupIndex >= 0 && index > activeGroupIndex
            ? activeBaseTop + activeHeight + PROOFREADING_GROUP_GAP
            : baselineTop;
        const top = Math.max(baselineTop, minimumTop, activePushTop);
        nextPositions[group.id] = { top };
        previousBottom =
          top +
          PROOFREADING_GROUP_CLOSED_HEIGHT +
          (isActiveGroup && activeProofreadingSignal
            ? proofreadingTagHeights[activeProofreadingSignal.id]?.expandedHeight ?? 0
            : 0);
      }

      setProofreadingTagPositions(nextPositions);
    }, [
      proofreadingHintGroups,
      value,
      activeProofreadingGroup,
      activeProofreadingSignal,
      proofreadingTagHeights,
    ]);

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

    function renderProofreadingHighlightLayer(activeSignal: ProofreadingSignal | undefined) {
      if (!activeSignal) {
        return null;
      }
      const sentenceRange = extractCurrentSentence(value, activeSignal.start + 1);
      const start = clampOffset(sentenceRange.start, value.length);
      const end = clampOffset(sentenceRange.end, value.length);
      if (end <= start) {
        return null;
      }

      return (
        <>
          <span>{value.slice(0, start)}</span>
          <mark
            data-proofreading-highlight="active"
            className="rounded-[3px] bg-[var(--lt-accent-soft)] px-0.5 leading-[inherit] text-transparent"
          >
            {value.slice(start, end)}
          </mark>
          <span>{value.slice(end)}</span>
        </>
      );
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

        const isActive = activeExpressionCue?.id === cue.id;
        nodes.push(
          <span
            key={cue.id}
            tabIndex={0}
            aria-label={`表达库命中：${cue.expression}`}
            data-expression-reappearance-cue={cue.state === "fresh" ? "fresh" : "seen"}
            className={`lt-expression-cue pointer-events-auto relative inline cursor-text whitespace-pre-wrap text-transparent outline-none ${
              cue.state === "fresh" ? "lt-expression-cue--fresh" : ""
            } ${isActive ? "lt-expression-cue--active" : ""}`}
            onMouseEnter={() => setActiveExpressionCueId(cue.id)}
            onMouseLeave={() =>
              setActiveExpressionCueId((current) => (current === cue.id ? null : current))
            }
            onFocus={() => setActiveExpressionCueId(cue.id)}
            onBlur={() =>
              setActiveExpressionCueId((current) => (current === cue.id ? null : current))
            }
            onMouseDown={(event) => {
              event.preventDefault();
              const element = editorRef.current;
              if (!element) {
                return;
              }
              const cursorOffset = estimateInlineCueCursorOffset(event, start, end);
              element.focus();
              element.setSelectionRange(cursorOffset, cursorOffset);
              reportSelection(element);
            }}
          >
            {value.slice(start, end)}
            {isActive ? (
              <span
                role="status"
                data-expression-reappearance-detail="open"
                data-expression-reappearance-detail-style="light-card"
                className="pointer-events-none absolute left-0 top-[1.95em] z-30 min-w-[300px] max-w-[380px] rounded-[8px] border border-[var(--lt-border)] bg-[var(--lt-surface)] px-4 py-3 font-serif text-[13px] leading-6 text-[var(--lt-text)]"
              >
                <span className="block text-xs text-[var(--lt-muted)]">表达库命中</span>
                <span className="mt-0.5 block text-[16px] font-medium leading-6 text-[var(--lt-text)]">{cue.expression}</span>
                {cue.meaning ? (
                  <span className="mt-1 block text-[13px] leading-5 text-[var(--lt-muted)]">{cue.meaning}</span>
                ) : null}
              </span>
            ) : null}
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
    const writingPaperClass = `${writingTextClass} text-transparent`;
    const writingSurfaceClass = `lt-writing-surface min-h-[520px] max-w-[860px] ${writingTextClass}`;
    const layoutClass = wideLayout ? "max-w-[1120px]" : "max-w-[980px]";

    return (
      <section
        aria-label="写作区"
        data-input-priority="textarea-first"
        className="flex min-h-[calc(100vh-56px)] flex-1 flex-col"
      >
        <div
          data-writing-column="true"
          className={`mx-auto flex w-full flex-1 flex-col px-4 pb-16 pt-6 sm:px-8 md:px-10 md:pt-10 ${layoutClass}`}
        >
          <div className="relative flex flex-1 flex-col">
            <textarea
              ref={editorRef}
              aria-label="写作编辑器"
              aria-multiline="true"
              className={
                inlineSuggestion
                  ? "sr-only"
                  : `lt-writing-textarea min-h-[520px] w-full resize-none overflow-hidden border-0 !bg-transparent px-0 py-0 ${writingTextClass} text-[var(--lt-text)] outline-none placeholder:text-[var(--lt-muted)] placeholder:opacity-60`
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
                {activeProofreadingSignal ? (
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-x-0 top-0 min-h-[520px] ${writingPaperClass}`}
                  >
                    {renderProofreadingHighlightLayer(activeProofreadingSignal)}
                  </div>
                ) : null}

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
                    className={`absolute left-[calc(100%+24px)] z-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-[color:color-mix(in_srgb,var(--lt-accent)_58%,transparent)] bg-[var(--lt-bg)]/90 p-0 text-[var(--lt-accent)] opacity-85 shadow-[0_8px_22px_rgba(185,105,72,0.12)] backdrop-blur-sm transition-[opacity,background-color,border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[var(--lt-accent)] hover:bg-[var(--lt-accent-soft)] hover:opacity-100 hover:shadow-[0_10px_28px_rgba(185,105,72,0.16)] focus:opacity-100 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lt-accent)] ${
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
                {proofreadingHintGroups.map((group) => {
                  const activeSignalInGroup =
                    group.signals.find((signal) => signal.id === activeProofreadingSignalId) ?? null;
                  return (
                    <div
                      key={group.id}
                      data-proofreading-group={group.id}
                      className="absolute left-[calc(100%+96px)] z-20 flex flex-col items-start"
                      style={{
                        top:
                          proofreadingTagPositions[group.id]?.top ??
                          proofreadingHintPosition(value, group.start, editorRef.current),
                      }}
                      onMouseLeave={() => setActiveProofreadingSignalId(null)}
                    >
                      <div
                        data-proofreading-row="sentence"
                        className="flex max-w-[320px] flex-wrap items-center gap-2"
                      >
                        {group.signals.map((signal) => {
                          const isActiveProofreadingSignal =
                            activeProofreadingSignal?.id === signal.id;
                          return (
                            <button
                              key={signal.id}
                              type="button"
                              aria-label={signal.titleZh}
                              aria-expanded={isActiveProofreadingSignal}
                              data-proofreading-item={signal.id}
                              data-proofreading-hint="inline-label"
                              className={`group inline-flex min-h-7 max-w-[150px] items-center gap-2 rounded-[6px] border px-3 py-1 text-left text-[12px] font-medium leading-4 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lt-warning)] ${
                                isActiveProofreadingSignal
                                  ? "border-[var(--lt-warning)] bg-[var(--lt-surface-soft)] text-[var(--lt-text)]"
                                  : "border-[var(--lt-border)] bg-[var(--lt-bg)] text-[var(--lt-muted)] hover:border-[var(--lt-warning)] hover:text-[var(--lt-text)]"
                              }`}
                              onMouseEnter={() => setActiveProofreadingSignalId(signal.id)}
                              onFocus={() => setActiveProofreadingSignalId(signal.id)}
                              onBlur={() => setActiveProofreadingSignalId(null)}
                            >
                              <span className="truncate">{signal.titleZh}</span>
                            </button>
                          );
                        })}
                      </div>
                      {group.signals.map((signal) => {
                        const isActiveProofreadingSignal = activeSignalInGroup?.id === signal.id;
                        return (
                          <section
                            key={`${signal.id}-detail`}
                            role="status"
                            aria-live="polite"
                            aria-hidden={!isActiveProofreadingSignal}
                            data-proofreading-detail={
                              isActiveProofreadingSignal ? "open" : "closed"
                            }
                            ref={(element) => {
                              if (element) {
                                proofreadingDetailRefs.current.set(signal.id, element);
                              } else {
                                proofreadingDetailRefs.current.delete(signal.id);
                              }
                            }}
                            className={`pointer-events-none ml-1 mt-1 w-[268px] overflow-hidden border-l border-[var(--lt-border)] pl-2 text-left text-[11px] leading-4 text-[var(--lt-faint)] transition-[max-height,opacity,transform] duration-150 ${
                              isActiveProofreadingSignal
                                ? "max-h-[140px] translate-y-0 opacity-100"
                                : "max-h-0 -translate-y-1 opacity-0"
                            }`}
                          >
                            {signal.messageZh}
                          </section>
                        );
                      })}
                    </div>
                  );
                })}
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
          className="sticky bottom-0 z-20 -mx-8 mt-auto grid min-h-8 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 border-t border-[var(--lt-border)] bg-[var(--lt-bg)] px-8 py-1 text-[12px] text-[var(--lt-muted)]"
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
                <span>{proofreadingResult.stats.englishWordCount} 词</span>
                <span>·</span>
                <span>{proofreadingResult.stats.sentenceCount} 句</span>
                <span>·</span>
                <span>{proofreadingResult.stats.paragraphCount} 段</span>
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

          <span
            aria-label="写作状态栏文本校对"
            className={`justify-self-end whitespace-nowrap text-right ${
              proofreadingIssueCount > 0
                ? "font-medium text-[#d97706]"
                : "text-[var(--lt-muted)]"
            }`}
          >
            文本校对：{proofreadingIssueCount} 条提示
          </span>
        </footer>
      </section>
    );
  },
);
