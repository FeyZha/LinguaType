'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CreateEssayDialog } from './create-essay-dialog';
import {
  SCAFFOLD_ERROR_CODES,
  SCAFFOLD_API_PATH,
  SCAFFOLD_API_VERSION,
} from './scaffold-api-contract';
import {
  SCAFFOLD_REQUEST_FAILED,
  readScaffoldResponse,
} from './scaffold-response';
import {
  findMixedSentences,
  findSentences,
  hasChinese,
  reconcileSentenceAnchor,
  selectionIsInsideSentence,
  type SentenceSpan,
} from './sentence-tracking';
import {
  LEGACY_DRAFT_KEY,
  WORKSPACE_KEY,
  createEssayDocument,
  documentTitle,
  isLegacyDraft,
  isPersistedWorkspace,
  migrateLegacyDraft,
  recoverWorkspace,
  type ArchivedCard,
  type EssayDocument,
  type Feedback,
  type PersistedWorkspace,
  type PromptSource,
  type SupportCard,
} from './workspace-state';
import {
  DEMO_DOCUMENTS,
  DEMO_LIBRARY_RELEASE,
  DEMO_LIBRARY_RELEASE_KEY,
  createPrototypeResult,
} from './prototype-cases';

type ActivePanel = 'library' | 'support' | null;

function formatDocumentDate(value: string) {
  if (!value) return '当前';
  return value.slice(5, 10).replace('-', '/');
}

function createId(prefix: 'document' | 'card') {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function scaffoldResultId(cardId: string, itemIndex: number, scaffoldId: string) {
  return `scaffold-result-${cardId}-${itemIndex}-${scaffoldId}`;
}

function readEssaySelection(editor: HTMLTextAreaElement) {
  return { start: editor.selectionStart, end: editor.selectionEnd };
}

function DeleteEssayDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: EssayDocument | null;
  onCancel: () => void;
  onConfirm: (documentId: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (target && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!target && dialog.open) {
      dialog.close();
      window.setTimeout(() => returnFocusRef.current?.focus(), 0);
    }
  }, [target]);

  return (
    <dialog
      ref={dialogRef}
      className="delete-dialog"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="delete-copy">
        <strong id="delete-dialog-title">永久删除这篇作文？</strong>
        <p id="delete-dialog-description">
          “{target ? documentTitle(target) : ''}”及其支架记录将被删除，无法恢复。
        </p>
      </div>
      <div className="dialog-actions">
        <button className="btn btn-secondary" type="button" onClick={onCancel} autoFocus>
          取消
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            if (!target) return;
            returnFocusRef.current = null;
            onConfirm(target.documentId);
          }}
        >
          永久删除
        </button>
      </div>
    </dialog>
  );
}

export default function Home() {
  const [documents, setDocuments] = useState<EssayDocument[]>(DEMO_DOCUMENTS);
  const [activeDocumentId, setActiveDocumentId] = useState(DEMO_DOCUMENTS[0].documentId);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'loading' | 'saved' | 'error'>('loading');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [essayScrollTop, setEssayScrollTop] = useState(0);
  const [essaySelection, setEssaySelection] = useState<{
    documentId: string;
    start: number;
    end: number;
  } | null>(null);
  const [linkedSentenceKey, setLinkedSentenceKey] = useState<string | null>(null);
  const [inlineLayout, setInlineLayout] = useState<{ height: number; tops: number[] }>({
    height: 0,
    tops: [],
  });
  const essayEditorRef = useRef<HTMLTextAreaElement>(null);
  const essayMirrorRef = useRef<HTMLDivElement>(null);
  const supportTitleRef = useRef<HTMLHeadingElement>(null);
  const panelTriggerRef = useRef<HTMLElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const canPersistRef = useRef(false);
  const essayMeasureRef = useRef({ essay: '', width: 0 });

  const activeDocuments = documents.filter((document) => document.status === 'active');
  const archivedDocuments = documents.filter((document) => document.status === 'archived');
  const activeDocument =
    activeDocuments.find((document) => document.documentId === activeDocumentId) ??
    activeDocuments[0] ??
    null;
  const taskPrompt = activeDocument?.taskPrompt ?? '';
  const promptIsFixed = Boolean(activeDocument?.promptSource && taskPrompt.trim());
  const essay = activeDocument?.essay ?? '';
  const supportCards = activeDocument?.supportCards ?? [];
  const archivedCards = activeDocument?.archivedCards ?? [];
  const activeCardId = activeDocument?.activeCardId ?? null;
  const activeCard = supportCards.find((card) => card.cardId === activeCardId) ?? null;
  const currentEssaySelection =
    essaySelection?.documentId === activeDocumentId ? essaySelection : null;
  const deleteTarget =
    documents.find((document) => document.documentId === deleteTargetId) ?? null;
  const sentences = findSentences(essay);
  const mixedSentences = findMixedSentences(essay);
  const activeSentence = activeCard
    ? sentences.find(
        (sentence) =>
          sentence.start === activeCard.anchor.start && sentence.end === activeCard.anchor.end,
      )
    : null;
  const focusedSentence =
    activePanel === 'support' &&
    activeSentence &&
    (hasChinese(activeSentence.text) ||
      selectionIsInsideSentence(activeSentence, currentEssaySelection))
      ? activeSentence
      : null;
  const focusedSentenceKey = focusedSentence
    ? `${focusedSentence.start}:${focusedSentence.end}`
    : null;
  const promptUsage = documents.reduce<Record<string, number>>((usage, document) => {
    const promptId =
      document.promptSource?.kind === 'original_bank'
        ? document.promptSource.promptId
        : null;
    if (promptId) usage[promptId] = (usage[promptId] ?? 0) + 1;
    return usage;
  }, {});

  const syncEssaySelection = useCallback((editor: HTMLTextAreaElement) => {
    const next = readEssaySelection(editor);
    const scopedNext = next ? { ...next, documentId: activeDocumentId } : null;
    setEssaySelection((current) =>
      current?.documentId === scopedNext?.documentId &&
      current?.start === scopedNext?.start &&
      current?.end === scopedNext?.end
        ? current
        : scopedNext,
    );
  }, [activeDocumentId]);

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const storedWorkspace = localStorage.getItem(WORKSPACE_KEY);
        const storedLegacyDraft = localStorage.getItem(LEGACY_DRAFT_KEY);
        const refreshDemoLibrary =
          localStorage.getItem(DEMO_LIBRARY_RELEASE_KEY) !== DEMO_LIBRARY_RELEASE;
        let workspace: PersistedWorkspace | null = null;

        if (storedWorkspace) {
          const parsed: unknown = JSON.parse(storedWorkspace);
          if (!isPersistedWorkspace(parsed)) throw new Error('Invalid saved workspace');
          workspace = recoverWorkspace(parsed);
        } else if (storedLegacyDraft) {
          const parsed: unknown = JSON.parse(storedLegacyDraft);
          if (!isLegacyDraft(parsed)) throw new Error('Invalid legacy draft');
          const now = new Date().toISOString();
          workspace = migrateLegacyDraft(parsed, createId('document'), now);
        }

        if (workspace) {
          const restoredDocuments = refreshDemoLibrary
            ? [
                ...workspace.documents.map(
                  (document) =>
                    DEMO_DOCUMENTS.find(
                      (demo) =>
                        demo.documentId === document.documentId ||
                        demo.taskPrompt === document.taskPrompt,
                    ) ?? {
                      ...document,
                      supportCards: [],
                      archivedCards: [],
                      activeCardId: null,
                    },
                ),
                ...DEMO_DOCUMENTS.filter(
                  (demo) =>
                    !workspace.documents.some(
                      (document) =>
                        document.documentId === demo.documentId ||
                        document.taskPrompt === demo.taskPrompt,
                    ),
                ),
              ]
            : workspace.documents;
          const available = restoredDocuments.filter(
            (document) => document.status === 'active',
          );
          if (available.length) {
            setDocuments(restoredDocuments);
            setActiveDocumentId(
              available.some(
                (document) => document.documentId === workspace.activeDocumentId,
              )
                ? workspace.activeDocumentId
                : available[0].documentId,
            );
          } else {
            const now = new Date().toISOString();
            const blank = createEssayDocument(createId('document'), now);
            setDocuments([...restoredDocuments, blank]);
            setActiveDocumentId(blank.documentId);
          }
        }

        if (refreshDemoLibrary) {
          localStorage.setItem(DEMO_LIBRARY_RELEASE_KEY, DEMO_LIBRARY_RELEASE);
        }

        canPersistRef.current = true;
        setSaveStatus('saved');
      } catch {
        setSaveStatus('error');
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  useEffect(() => {
    if (!hydrated || !canPersistRef.current) return;
    let statusTimer: number;
    try {
      const workspace: PersistedWorkspace = {
        version: 2,
        documents,
        activeDocumentId,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      statusTimer = window.setTimeout(() => setSaveStatus('saved'), 500);
    } catch {
      statusTimer = window.setTimeout(() => setSaveStatus('error'), 0);
    }
    return () => window.clearTimeout(statusTimer);
  }, [activeDocumentId, documents, hydrated]);

  useEffect(
    () => () => {
      if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const editor = essayEditorRef.current;
    if (!editor) return;
    const syncSelection = () => syncEssaySelection(editor);
    editor.addEventListener('selectionchange', syncSelection);
    return () => editor.removeEventListener('selectionchange', syncSelection);
  }, [syncEssaySelection]);

  useEffect(() => {
    if (!activePanel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('dialog[open]')) return;
      event.preventDefault();
      const trigger = panelTriggerRef.current;
      setActivePanel(null);
      window.setTimeout(() => trigger?.focus(), 0);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activePanel]);

  useEffect(() => {
    const narrowViewport = window.matchMedia('(max-width: 1099px)');
    const prioritizeWriting = () => {
      if (!narrowViewport.matches) return;
      setActivePanel(null);
      setSidebarCollapsed(true);
    };

    prioritizeWriting();
    narrowViewport.addEventListener('change', prioritizeWriting);
    return () => narrowViewport.removeEventListener('change', prioritizeWriting);
  }, []);

  useLayoutEffect(() => {
    const editor = essayEditorRef.current;
    const mirror = essayMirrorRef.current;
    if (!editor || !mirror) return;

    const measure = () => {
      const nextWidth = editor.clientWidth;
      const shouldResize =
        essayMeasureRef.current.essay !== essay ||
        Math.abs(essayMeasureRef.current.width - nextWidth) > 1;
      if (shouldResize) {
        const writingPane = editor.closest<HTMLElement>('.writing-pane');
        const writingScrollTop = writingPane?.scrollTop;
        editor.style.height = 'auto';
        editor.style.height = `${Math.max(540, editor.scrollHeight)}px`;
        if (writingPane && writingScrollTop !== undefined) {
          writingPane.scrollTop = writingScrollTop;
        }
        essayMeasureRef.current = { essay, width: editor.clientWidth };
      }
      const style = window.getComputedStyle(editor);
      mirror.style.width = `${editor.clientWidth}px`;
      mirror.style.boxSizing = style.boxSizing;
      mirror.style.top = `${editor.offsetTop}px`;
      mirror.style.left = `${editor.offsetLeft}px`;
      mirror.style.padding = style.padding;
      mirror.style.font = style.font;
      mirror.style.letterSpacing = style.letterSpacing;
      mirror.style.lineHeight = style.lineHeight;
      mirror.replaceChildren();

      const appendRange = (parent: Node, start: number, end: number) => {
        const selectedStart = currentEssaySelection
          ? Math.max(start, currentEssaySelection.start)
          : end;
        const selectedEnd = currentEssaySelection
          ? Math.min(end, currentEssaySelection.end)
          : start;
        if (selectedStart >= selectedEnd) {
          parent.appendChild(document.createTextNode(essay.slice(start, end)));
          return;
        }
        parent.appendChild(document.createTextNode(essay.slice(start, selectedStart)));
        const selection = document.createElement('span');
        selection.className = 'essay-selection';
        selection.textContent = essay.slice(selectedStart, selectedEnd);
        parent.appendChild(selection);
        parent.appendChild(document.createTextNode(essay.slice(selectedEnd, end)));
      };

      const markers = new Map<string, HTMLSpanElement>();
      const measuredSentences = findSentences(essay);
      const measuredMixedSentences = findMixedSentences(essay);
      const measuredMixedKeys = new Set(
        measuredMixedSentences.map((sentence) => `${sentence.start}:${sentence.end}`),
      );
      let cursor = 0;
      for (const sentence of measuredSentences) {
        appendRange(mirror, cursor, sentence.start);
        const sentenceKey = `${sentence.start}:${sentence.end}`;
        if (!measuredMixedKeys.has(sentenceKey) && sentenceKey !== focusedSentenceKey) {
          appendRange(mirror, sentence.start, sentence.end);
          cursor = sentence.end;
          continue;
        }
        const marker = document.createElement('span');
        appendRange(marker, sentence.start, sentence.end);
        marker.dataset.sentenceKey = sentenceKey;
        marker.classList.toggle(
          'is-focused',
          marker.dataset.sentenceKey === focusedSentenceKey,
        );
        marker.classList.toggle(
          'is-linked',
          marker.dataset.sentenceKey === linkedSentenceKey,
        );
        mirror.append(marker);
        markers.set(sentenceKey, marker);
        cursor = sentence.end;
      }
      appendRange(mirror, cursor, essay.length);
      setInlineLayout({
        height: editor.clientHeight,
        tops: measuredMixedSentences.map(
          (sentence) => markers.get(`${sentence.start}:${sentence.end}`)?.offsetTop ?? 0,
        ),
      });
    };

    measure();
    const observer = new ResizeObserver(() => {
      if (Math.abs(editor.clientWidth - essayMeasureRef.current.width) > 1) measure();
    });
    observer.observe(editor);
    return () => observer.disconnect();
  }, [activePanel, currentEssaySelection, essay, focusedSentenceKey, linkedSentenceKey]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }

  function rememberPanelTrigger() {
    panelTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function closePanel() {
    const trigger = panelTriggerRef.current;
    setActivePanel(null);
    window.setTimeout(() => trigger?.focus(), 0);
  }

  function showSupport(focusPanel = true) {
    if (activePanel !== 'support') rememberPanelTrigger();
    setActivePanel('support');
    if (focusPanel) window.setTimeout(() => supportTitleRef.current?.focus(), 0);
  }

  function showWriting() {
    setActivePanel(null);
    window.setTimeout(
      () => (document.getElementById('task-prompt') ?? document.getElementById('essay'))?.focus(),
      0,
    );
  }

  function updateDocument(
    documentId: string,
    updater: (document: EssayDocument) => EssayDocument,
  ) {
    setDocuments((current) =>
      current.map((document) =>
        document.documentId === documentId ? updater(document) : document,
      ),
    );
  }

  function patchActiveDocument(update: Partial<EssayDocument>) {
    if (!activeDocument) return;
    const now = new Date().toISOString();
    updateDocument(activeDocument.documentId, (document) => ({
      ...document,
      ...update,
      updatedAt: now,
    }));
  }

  function patchCard(
    documentId: string,
    cardId: string,
    update: Partial<SupportCard>,
  ) {
    const now = new Date().toISOString();
    updateDocument(documentId, (document) => ({
      ...document,
      supportCards: document.supportCards.map((card) =>
        card.cardId === cardId ? { ...card, ...update } : card,
      ),
      archivedCards: document.archivedCards.map((card) =>
        card.cardId === cardId ? { ...card, ...update } : card,
      ),
      updatedAt: now,
    }));
  }

  function updateEssay(value: string) {
    if (!activeDocument) return;
    const now = new Date().toISOString();
    updateDocument(activeDocument.documentId, (document) => {
      const removedIds = new Set<string>();
      const nextCards: SupportCard[] = [];
      const newlyArchived: ArchivedCard[] = [];

      for (const card of document.supportCards) {
        const anchor = reconcileSentenceAnchor(document.essay, value, card.anchor);
        if (anchor) {
          nextCards.push({ ...card, anchor });
        } else {
          removedIds.add(card.cardId);
          newlyArchived.push({ ...card, archivedAt: now });
        }
      }

      return {
        ...document,
        essay: value,
        supportCards: nextCards,
        archivedCards: [...document.archivedCards, ...newlyArchived],
        activeCardId:
          document.activeCardId && removedIds.has(document.activeCardId)
            ? null
            : document.activeCardId,
        updatedAt: now,
      };
    });
  }

  function cardForSentence(sentence: SentenceSpan) {
    return supportCards.find(
      (card) => card.anchor.start === sentence.start && card.anchor.end === sentence.end,
    );
  }

  async function runCardRequest(
    documentId: string,
    cardId: string,
    anchor: SentenceSpan,
    requestTaskPrompt: string,
    requestEssay: string,
  ) {
    const snapshot = {
      taskPrompt: requestTaskPrompt.trim(),
      essay: requestEssay,
      targetSentence: anchor.text,
      requestedAt: new Date().toISOString(),
    };

    patchCard(documentId, cardId, {
      request: snapshot,
      result: null,
      revealedScaffolds: [],
      feedback: null,
      feedbackReason: '',
      status: 'loading',
      error: null,
    });

    try {
      const response = await fetch(SCAFFOLD_API_PATH, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          taskPrompt: snapshot.taskPrompt,
          fullEssay: snapshot.essay,
          targetSentence: snapshot.targetSentence,
        }),
      });
      const parsed = await readScaffoldResponse(response, SCAFFOLD_API_VERSION);
      if (!parsed.ok) {
        const prototypeResult =
          parsed.code === SCAFFOLD_ERROR_CODES.MODEL_NOT_CONFIGURED
            ? createPrototypeResult(snapshot.targetSentence)
            : null;
        if (prototypeResult) {
          await new Promise((resolve) => window.setTimeout(resolve, 520));
          patchCard(documentId, cardId, {
            result: prototypeResult,
            status: 'ready',
            error: null,
          });
          return;
        }
        patchCard(documentId, cardId, {
          status: 'error',
          error: parsed.error,
        });
        return;
      }
      patchCard(documentId, cardId, {
        result: parsed.result,
        status: 'ready',
        error: null,
      });
    } catch {
      patchCard(documentId, cardId, {
        status: 'error',
        error: SCAFFOLD_REQUEST_FAILED,
      });
    }
  }

  function processSentence(sentence: SentenceSpan) {
    if (!activeDocument) return;
    if (!taskPrompt.trim()) {
      showToast('先填写题目，再处理本句。');
      return;
    }
    const editor = essayEditorRef.current;
    const selection = editor
      ? {
          start: editor.selectionStart,
          end: editor.selectionEnd,
          scrollTop: editor.scrollTop,
        }
      : null;
    const returnToEditor = () => {
      if (!editor || !selection || !window.matchMedia('(min-width: 1100px)').matches) return;
      window.setTimeout(() => {
        editor.focus({ preventScroll: true });
        editor.setSelectionRange(selection.start, selection.end);
        editor.scrollTop = selection.scrollTop;
      }, 0);
    };
    const existingCard = cardForSentence(sentence);
    if (existingCard) {
      patchActiveDocument({ activeCardId: existingCard.cardId });
      showSupport(false);
      returnToEditor();
      if (existingCard.request.targetSentence !== sentence.text) {
        void runCardRequest(
          activeDocument.documentId,
          existingCard.cardId,
          sentence,
          taskPrompt,
          essay,
        );
      }
      return;
    }

    const cardId = createId('card');
    const now = new Date().toISOString();
    const card: SupportCard = {
      cardId,
      anchor: sentence,
      request: {
        taskPrompt: taskPrompt.trim(),
        essay,
        targetSentence: sentence.text,
        requestedAt: now,
      },
      result: null,
      revealedScaffolds: [],
      feedback: null,
      feedbackReason: '',
      status: 'loading',
      error: null,
      createdAt: now,
    };

    updateDocument(activeDocument.documentId, (document) => ({
      ...document,
      supportCards: [...document.supportCards, card],
      activeCardId: cardId,
      updatedAt: now,
    }));
    showSupport(false);
    returnToEditor();
    void runCardRequest(activeDocument.documentId, cardId, sentence, taskPrompt, essay);
  }

  function reveal(itemIndex: number, scaffoldId: string) {
    if (!activeDocument || !activeCard) return;
    const key = `${itemIndex}:${scaffoldId}`;
    if (activeCard.revealedScaffolds.includes(key)) return;
    patchCard(activeDocument.documentId, activeCard.cardId, {
      revealedScaffolds: [...activeCard.revealedScaffolds, key],
    });
    window.setTimeout(
      () => document.getElementById(scaffoldResultId(activeCard.cardId, itemIndex, scaffoldId))?.focus(),
      0,
    );
  }

  function setCardFeedback(feedback: Feedback) {
    if (!activeDocument || !activeCard) return;
    patchCard(activeDocument.documentId, activeCard.cardId, {
      feedback,
      feedbackReason: feedback === 'not_helpful' ? activeCard.feedbackReason : '',
    });
  }

  function retryActiveCard() {
    if (
      !activeDocument ||
      !activeCard ||
      !taskPrompt.trim() ||
      !hasChinese(activeCard.anchor.text) ||
      essay.slice(activeCard.anchor.start, activeCard.anchor.end) !== activeCard.anchor.text
    ) {
      return;
    }
    void runCardRequest(
      activeDocument.documentId,
      activeCard.cardId,
      activeCard.anchor,
      taskPrompt,
      essay,
    );
  }

  function createDocument(content: { taskPrompt: string; promptSource: PromptSource }) {
    const now = new Date().toISOString();
    const newDocument = createEssayDocument(createId('document'), now, content);
    setDocuments((current) => [newDocument, ...current]);
    setActiveDocumentId(newDocument.documentId);
    setCreateDialogOpen(false);
    showWriting();
    showToast('新作文已创建。');
  }

  function archiveActiveDocument() {
    if (!activeDocument) return;
    const now = new Date().toISOString();
    const remaining = activeDocuments.filter(
      (document) => document.documentId !== activeDocument.documentId,
    );
    const blank = remaining.length ? null : createEssayDocument(createId('document'), now);
    setActiveDocumentId(remaining[0]?.documentId ?? blank?.documentId ?? activeDocumentId);
    setDocuments((current) => {
      const archived = current.map((document) =>
        document.documentId === activeDocument.documentId
          ? { ...document, status: 'archived' as const, archivedAt: now, updatedAt: now }
          : document,
      );
      return blank ? [blank, ...archived] : archived;
    });
    showWriting();
    showToast('作文已归档。');
  }

  function restoreDocument(documentId: string) {
    const now = new Date().toISOString();
    updateDocument(documentId, (document) => ({
      ...document,
      status: 'active',
      archivedAt: null,
      updatedAt: now,
    }));
    setActiveDocumentId(documentId);
    showWriting();
    showToast('作文已恢复。');
  }

  function deleteDocument(documentId: string) {
    const target = documents.find((document) => document.documentId === documentId);
    if (!target) return;
    const remaining = documents.filter((document) => document.documentId !== documentId);
    const remainingActive = remaining.filter((document) => document.status === 'active');
    if (!remainingActive.length) {
      const now = new Date().toISOString();
      const blank = createEssayDocument(createId('document'), now);
      setDocuments([blank, ...remaining]);
      setActiveDocumentId(blank.documentId);
    } else {
      setDocuments(remaining);
      if (documentId === activeDocumentId) setActiveDocumentId(remainingActive[0].documentId);
    }
    setDeleteTargetId(null);
    showWriting();
    showToast('作文及其支架已永久删除，无法恢复。');
  }

  function downloadRecord() {
    if (!activeDocument || (!supportCards.length && !archivedCards.length)) return;
    const record = {
      recordVersion: 3,
      document: {
        documentId: activeDocument.documentId,
        title: documentTitle(activeDocument),
        taskPrompt,
        essay,
        createdAt: activeDocument.createdAt,
        updatedAt: activeDocument.updatedAt,
        promptSource: activeDocument.promptSource ?? null,
      },
      cards: [
        ...supportCards.map((card) => ({ visibility: 'visible', ...card })),
        ...archivedCards.map((card) => ({ visibility: 'removed', ...card })),
      ],
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `linguatype-session-${activeDocument.documentId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('本篇记录已导出。');
  }

  const activeTargetExists = Boolean(
    activeCard &&
    essay.slice(activeCard.anchor.start, activeCard.anchor.end) === activeCard.anchor.text,
  );
  const retryDisabled =
    !taskPrompt.trim() || !activeTargetExists || !activeCard || !hasChinese(activeCard.anchor.text);
  const retryLabel = !taskPrompt.trim()
    ? '先填写题目后重试'
    : !activeTargetExists
      ? '目标句已无法定位'
      : activeCard && !hasChinese(activeCard.anchor.text)
        ? '目标句已无中文，无法重试'
        : '重新处理本句';

  return (
    <>
      <div
        className="app-shell"
        data-active-panel={activePanel ?? 'none'}
        data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}
      >
        {activePanel ? (
          <button
            className="panel-backdrop"
            type="button"
            onClick={closePanel}
            aria-label="关闭侧栏"
            tabIndex={-1}
          />
        ) : null}

        <main
          id="content"
          className="workspace-grid"
        >
          <section
            className="pane library-pane"
            id="essay-library"
            aria-label="写作存档"
          >
            <div className="sidebar-brand">
              <div className="sidebar-brand-lockup" role="img" aria-label="LinguaType">
                <Image
                  className="sidebar-wordmark"
                  src="/brand/linguatype-wordmark-light.png"
                  alt=""
                  width={624}
                  height={136}
                  priority
                  unoptimized
                />
                <Image
                  className="sidebar-mark"
                  src="/brand/linguatype-mark-light.png"
                  alt=""
                  width={132}
                  height={113}
                  priority
                  unoptimized
                />
              </div>
              <button
                className="sidebar-toggle desktop-sidebar-toggle"
                type="button"
                onClick={() => setSidebarCollapsed((current) => !current)}
                aria-controls="essay-library"
                aria-label={sidebarCollapsed ? '展开写作存档' : '收起写作存档'}
                title={sidebarCollapsed ? '展开写作存档' : '收起写作存档'}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m14.5 6-6 6 6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="sidebar-toggle mobile-sidebar-close"
                type="button"
                onClick={closePanel}
                aria-label="关闭作文库"
                title="关闭作文库"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m14.5 6-6 6 6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div className="pane-heading">
              <div>
                <h2>作文库</h2>
                <p className="pane-caption">继续哪一篇？</p>
              </div>
            </div>

            <div className="document-list" aria-label="进行中的作文">
              {activeDocuments.map((document, index) => (
                <button
                  type="button"
                  className="document-item"
                  key={document.documentId}
                  onClick={() => {
                    setActiveDocumentId(document.documentId);
                    showWriting();
                  }}
                  aria-current={document.documentId === activeDocumentId ? 'true' : undefined}
                >
                  <span>作文 {index + 1}</span>
                  <strong>{documentTitle(document)}</strong>
                  <small>
                    {formatDocumentDate(document.updatedAt)} · 已处理 {document.supportCards.length} 句
                  </small>
                </button>
              ))}
            </div>

            <div className="library-actions">
              <button
                className="btn new-essay"
                type="button"
                onClick={() => setCreateDialogOpen(true)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 5v14M5 12h14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span>新建作文</span>
              </button>
              <button className="btn btn-secondary" type="button" onClick={archiveActiveDocument}>
                归档当前
              </button>
              <button
                className="btn btn-danger-ghost"
                type="button"
                onClick={() => activeDocument && setDeleteTargetId(activeDocument.documentId)}
              >
                永久删除
              </button>
            </div>

            <details className="archive-drawer">
              <summary>已归档（{archivedDocuments.length}）</summary>
              <div className="archive-list">
                {archivedDocuments.length ? (
                  archivedDocuments.map((document) => (
                    <article className="archive-row" key={document.documentId}>
                      <strong>{documentTitle(document)}</strong>
                      <div>
                        <button
                          className="btn btn-secondary"
                          type="button"
                          onClick={() => restoreDocument(document.documentId)}
                          aria-label={`恢复“${documentTitle(document)}”`}
                        >
                          恢复
                        </button>
                        <button
                          className="btn btn-danger-ghost"
                          type="button"
                          onClick={() => setDeleteTargetId(document.documentId)}
                          aria-label={`永久删除“${documentTitle(document)}”`}
                        >
                          永久删除
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="archive-empty">暂无归档作文。</p>
                )}
              </div>
            </details>
          </section>

          <section
            className="pane writing-pane"
            aria-label="写作工作区"
          >
            <div className="writing-form">
              <div className="field prompt-field">
                <div className="field-row">
                  {promptIsFixed ? (
                    <p className="field-label">雅思题目</p>
                  ) : (
                    <label htmlFor="task-prompt">雅思题目</label>
                  )}
                </div>
                {promptIsFixed ? (
                  <h1 className="prompt-title">{taskPrompt}</h1>
                ) : (
                  <textarea
                    id="task-prompt"
                    className="input task-prompt-input"
                    value={taskPrompt}
                    onChange={(event) => patchActiveDocument({ taskPrompt: event.target.value })}
                    onBlur={() => {
                      if (taskPrompt.trim()) {
                        patchActiveDocument({
                          taskPrompt: taskPrompt.trim(),
                          promptSource: { kind: 'custom' },
                        });
                      }
                    }}
                    disabled={!hydrated}
                    rows={3}
                    maxLength={4000}
                    placeholder="输入或从原创题库选择 IELTS Writing Task 2 题目"
                  />
                )}
              </div>

              <div className="field essay-field">
                <div className="field-row">
                  <label htmlFor="essay">作文正文</label>
                  <div className="field-meta">
                    <span className={'save-indicator ' + saveStatus} role="status">
                      {saveStatus === 'saved'
                        ? '已保存'
                        : saveStatus === 'error'
                          ? '未保存 · 请复制内容备份'
                          : hydrated
                            ? '保存中…'
                            : '正在恢复作文库'}
                    </span>
                    <span>{essay.trim().split(/\s+/).filter(Boolean).length} 词</span>
                  </div>
                </div>
                <div className="essay-editor-shell">
                  <textarea
                    ref={essayEditorRef}
                    id="essay"
                    className="textarea"
                    value={essay}
                    onChange={(event) => {
                      syncEssaySelection(event.currentTarget);
                      updateEssay(event.target.value);
                    }}
                    onSelect={(event) => {
                      syncEssaySelection(event.currentTarget);
                    }}
                    onPointerMove={(event) => {
                      if (event.buttons === 1) {
                        syncEssaySelection(event.currentTarget);
                      }
                    }}
                    onKeyUp={(event) => syncEssaySelection(event.currentTarget)}
                    onScroll={(event) => setEssayScrollTop(event.currentTarget.scrollTop)}
                    disabled={!hydrated}
                    maxLength={20000}
                    placeholder="先继续写；不会表达时可以保留中文占位。"
                    spellCheck={false}
                  />
                  <div ref={essayMirrorRef} className="essay-mirror" aria-hidden="true" />
                  <div
                    className="inline-detections"
                    role="group"
                    aria-label="表达卡点入口"
                    style={{ height: inlineLayout.height }}
                  >
                    {mixedSentences.map((sentence, index) => {
                      const card = cardForSentence(sentence);
                      const sentenceKey = `${sentence.start}:${sentence.end}`;
                      const currentCard =
                        card?.cardId === activeCardId &&
                        card.request.targetSentence === sentence.text;
                      const label = !taskPrompt.trim()
                        ? '填写题目后可生成本句支架'
                        : !card
                          ? '为本句生成支架'
                          : card.status === 'loading'
                            ? '本句支架生成中'
                            : card.status === 'error'
                              ? '查看本句失败信息'
                              : '查看本句支架';
                      const markerTop = (inlineLayout.tops[index] ?? 0) - essayScrollTop;
                      return (
                        <button
                          className="inline-detection-button"
                          type="button"
                          key={sentence.start}
                          onClick={() => processSentence(sentence)}
                          onPointerEnter={() => setLinkedSentenceKey(sentenceKey)}
                          onPointerLeave={() =>
                            setLinkedSentenceKey(
                              document.activeElement?.getAttribute('data-sentence-key') ?? null,
                            )
                          }
                          onFocus={() => setLinkedSentenceKey(sentenceKey)}
                          onBlur={() => setLinkedSentenceKey(null)}
                          disabled={card?.status === 'loading' || !taskPrompt.trim()}
                          hidden={markerTop < -44 || markerTop > inlineLayout.height - 4}
                          style={{
                            transform: 'translateY(' + Math.round(markerTop) + 'px)',
                            animationDelay: `${Math.min(index, 6) * 40}ms`,
                          }}
                          aria-label={`${label}：${sentence.text}`}
                          title={label}
                          aria-current={currentCard ? 'true' : undefined}
                          data-sentence-key={sentenceKey}
                          data-linked={linkedSentenceKey === sentenceKey ? 'true' : undefined}
                          data-state={card?.status ?? 'idle'}
                        >
                          <svg className="detection-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 3.5c.65 4.15 2.85 6.35 7 7-4.15.65-6.35 2.85-7 7-.65-4.15-2.85-6.35-7-7 4.15-.65 6.35-2.85 7-7Z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <span className="sr-only" aria-live="polite">
                  {mixedSentences.length
                    ? '检测到 ' + mixedSentences.length + ' 个含中文句子。'
                    : '当前没有中文占位。'}
                </span>
              </div>
            </div>
          </section>

          <aside
            className="pane support-pane"
            id="expression-panel"
            aria-labelledby="support-title"
            aria-hidden={activePanel !== 'support'}
          >
            <header className="support-header">
              <div className="support-header-row">
                <h2 id="support-title" ref={supportTitleRef} tabIndex={-1}>表达支架</h2>
                <button className="support-close" type="button" onClick={closePanel} aria-label="关闭表达支架">×</button>
              </div>
              <p className="target-sentence">
                <span>原句</span>
                {activeCard ? activeCard.request.targetSentence : '尚未选择句子'}
              </p>
            </header>

            <div className="support-content">
              {!activeCard ? (
                <div className="empty-state">
                  <strong>选择一个含中文的句子</strong>
                  <p>系统会参考题目和全文，只帮助你处理当前一句。</p>
                </div>
              ) : null}

              {activeCard?.status === 'loading' ? (
                <div className="loading-card" role="status">
                  <span className="spinner" aria-hidden="true" />
                  <div>
                    <h3>正在准备表达支架</h3>
                    <p>你可以先回到正文继续写。</p>
                  </div>
                </div>
              ) : null}

              {activeCard?.status === 'error' ? (
                <div className="error-card" role="alert">
                  <span className="state-mark" aria-hidden="true">!</span>
                  <div>
                    <h3>没有修改你的原文</h3>
                    <p>{activeCard.error}</p>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={retryActiveCard}
                      disabled={retryDisabled}
                    >
                      {retryLabel}
                    </button>
                  </div>
                </div>
              ) : null}

              {activeCard?.status === 'ready' && activeCard.result ? (
                <>
                  <p className="sr-only" role="status">本句支架已生成。</p>
                  <div className="result-stack">
                    {activeCard.result.items.map((item, itemIndex) => (
                      <div className="result-group" key={item.sourceZh + '-' + itemIndex}>
                        <div className="source-row">
                          <span>原中文</span>
                          <p>{item.sourceZh}</p>
                        </div>

                        <section className="result-card" aria-label="表达支架">
                          {item.action === 'provide_expression' ? (
                            <div className="direct-expression">
                              <span>唯一表达支架</span>
                              <strong>{item.recommendedExpression}</strong>
                              <p>你可以自行移动、变形或接入原句。</p>
                            </div>
                          ) : (
                            <>
                              <div className="scaffold-intro">
                                <span>按需揭示英文</span>
                                <span>
                                  已揭示{' '}
                                  {item.scaffolds.filter((scaffold) =>
                                    activeCard.revealedScaffolds.includes(
                                      itemIndex + ':' + scaffold.scaffoldId,
                                    ),
                                  ).length}
                                  /{item.scaffolds.length}
                                </span>
                              </div>
                              <div className="scaffold-list">
                                {item.scaffolds.map((scaffold) => {
                                  const key = itemIndex + ':' + scaffold.scaffoldId;
                                  const visible = activeCard.revealedScaffolds.includes(key);
                                  const resultId = scaffoldResultId(
                                    activeCard.cardId,
                                    itemIndex,
                                    scaffold.scaffoldId,
                                  );
                                  return (
                                    <div
                                      className={'scaffold-item' + (visible ? ' revealed' : '')}
                                      key={scaffold.scaffoldId}
                                    >
                                      <button
                                        className="scaffold-row"
                                        type="button"
                                        onClick={() => reveal(itemIndex, scaffold.scaffoldId)}
                                        aria-expanded={visible}
                                        aria-controls={resultId}
                                      >
                                        <span className="focus-zh">{scaffold.focusZh}</span>
                                        <span className="reveal-action">
                                          {visible ? '已揭示' : '揭示英文 →'}
                                        </span>
                                      </button>
                                      {visible ? (
                                        <div
                                          className="revealed-expression"
                                          id={resultId}
                                          role="status"
                                          tabIndex={-1}
                                        >
                                          <span className="sr-only">英文表达：</span>
                                          {scaffold.recommendedExpression}
                                        </div>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </section>
                      </div>
                    ))}
                  </div>

                  <section className="feedback-card">
                    <div className="feedback-head">
                      <span>使用反馈</span>
                      <strong>这次支架有帮助吗？</strong>
                      <p>你的反馈只用于改进支架质量。</p>
                    </div>
                    <div className="feedback-actions">
                      <button
                        className={'btn btn-secondary' + (activeCard.feedback === 'helpful' ? ' selected' : '')}
                        type="button"
                        onClick={() => setCardFeedback('helpful')}
                        aria-pressed={activeCard.feedback === 'helpful'}
                      >
                        有帮助
                      </button>
                      <button
                        className={'btn btn-secondary' + (activeCard.feedback === 'not_helpful' ? ' selected' : '')}
                        type="button"
                        onClick={() => setCardFeedback('not_helpful')}
                        aria-pressed={activeCard.feedback === 'not_helpful'}
                      >
                        没帮助
                      </button>
                    </div>
                    {activeCard.feedback === 'not_helpful' ? (
                      <div className="reason-field">
                        <label htmlFor="feedback-reason">具体是哪一处没有帮助？</label>
                        <select
                          id="feedback-reason"
                          value={activeCard.feedbackReason}
                          onChange={(event) =>
                            activeDocument &&
                            patchCard(activeDocument.documentId, activeCard.cardId, {
                              feedbackReason: event.target.value,
                            })
                          }
                        >
                          <option value="">请选择</option>
                          <option value="inaccurate">意思不准确</option>
                          <option value="unnatural">英文不自然</option>
                          <option value="too_much">帮助过多</option>
                          <option value="too_little">帮助太少</option>
                          <option value="other">其他</option>
                        </select>
                      </div>
                    ) : null}
                    {activeCard.feedback === 'helpful' ? (
                      <p className="feedback-thanks" role="status">已记录，感谢反馈。</p>
                    ) : null}
                    {activeCard.feedback === 'not_helpful' && activeCard.feedbackReason ? (
                      <p className="feedback-thanks" role="status">已记录，感谢反馈。</p>
                    ) : null}
                  </section>
                </>
              ) : null}

              <footer className="support-footer">
                {supportCards.length || archivedCards.length ? (
                  <button
                    className="btn btn-secondary export-button"
                    type="button"
                    onClick={downloadRecord}
                  >
                    导出本篇记录
                  </button>
                ) : null}
                <p className="support-reminder">表达只供参考，不会写回你的作文。</p>
              </footer>
            </div>
          </aside>
        </main>
      </div>

      <CreateEssayDialog
        open={createDialogOpen}
        promptUsage={promptUsage}
        onClose={() => setCreateDialogOpen(false)}
        onCreate={createDocument}
      />
      <DeleteEssayDialog
        target={deleteTarget}
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={deleteDocument}
      />
      {toast ? <div className="toast" role="status" aria-live="polite">{toast}</div> : null}
    </>
  );
}
