import type { SentenceSpan } from './sentence-tracking';
import type { ScaffoldSuccessResponse } from './scaffold-api-contract';

export type { Scaffold, ScaffoldItem } from './scaffold-api-contract';
export type ScaffoldResult = ScaffoldSuccessResponse;

export type Feedback = 'helpful' | 'not_helpful' | null;
export type CardStatus = 'loading' | 'ready' | 'error';

export type RequestSnapshot = {
  taskPrompt: string;
  essay: string;
  targetSentence: string;
  requestedAt: string;
};

export type SupportCard = {
  cardId: string;
  anchor: SentenceSpan;
  request: RequestSnapshot;
  result: ScaffoldResult | null;
  revealedScaffolds: string[];
  feedback: Feedback;
  feedbackReason: string;
  status: CardStatus;
  error: string | null;
  createdAt: string;
};

export type ArchivedCard = SupportCard & {
  archivedAt: string;
};

export type PromptSource =
  | {
      kind: 'original_bank';
      promptId: string;
      promptVersion: 1;
      category: string;
      title: string;
    }
  | { kind: 'custom' };

export type EssayDocument = {
  documentId: string;
  taskPrompt: string;
  essay: string;
  promptSource?: PromptSource;
  supportCards: SupportCard[];
  archivedCards: ArchivedCard[];
  activeCardId: string | null;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type PersistedWorkspace = {
  version: 2;
  documents: EssayDocument[];
  activeDocumentId: string;
  savedAt: string;
};

export type LegacyDraft = {
  version: 1;
  taskPrompt: string;
  essay: string;
  supportCards: SupportCard[];
  archivedCards: ArchivedCard[];
  activeCardId: string | null;
  savedAt: string;
};

export const WORKSPACE_KEY = 'linguatype:workspace:v2';
export const LEGACY_DRAFT_KEY = 'linguatype:draft:v1';

export function createEssayDocument(
  documentId: string,
  now: string,
  content?: { taskPrompt?: string; essay?: string; promptSource?: PromptSource },
): EssayDocument {
  return {
    documentId,
    taskPrompt: content?.taskPrompt ?? '',
    essay: content?.essay ?? '',
    promptSource: content?.promptSource,
    supportCards: [],
    archivedCards: [],
    activeCardId: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  };
}

export function isPersistedWorkspace(value: unknown): value is PersistedWorkspace {
  if (!value || typeof value !== 'object') return false;
  const workspace = value as Partial<PersistedWorkspace>;
  return (
    workspace.version === 2 &&
    typeof workspace.activeDocumentId === 'string' &&
    Array.isArray(workspace.documents)
  );
}

export function isLegacyDraft(value: unknown): value is LegacyDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<LegacyDraft>;
  return (
    draft.version === 1 &&
    typeof draft.taskPrompt === 'string' &&
    typeof draft.essay === 'string' &&
    Array.isArray(draft.supportCards) &&
    Array.isArray(draft.archivedCards)
  );
}

function recoverCard(card: SupportCard): SupportCard {
  return card.status === 'loading'
    ? {
        ...card,
        status: 'error',
        error: '上次请求已中断，请重新处理本句。',
      }
    : card;
}

export function recoverWorkspace(workspace: PersistedWorkspace): PersistedWorkspace {
  return {
    ...workspace,
    documents: workspace.documents.map((document) => ({
      ...document,
      supportCards: document.supportCards.map(recoverCard),
      archivedCards: document.archivedCards.map((card) => ({
        ...recoverCard(card),
        archivedAt: card.archivedAt,
      })),
    })),
  };
}

export function migrateLegacyDraft(
  draft: LegacyDraft,
  documentId: string,
  now: string,
): PersistedWorkspace {
  const document: EssayDocument = {
    documentId,
    taskPrompt: draft.taskPrompt,
    essay: draft.essay,
    supportCards: draft.supportCards.map(recoverCard),
    archivedCards: draft.archivedCards.map((card) => ({
      ...recoverCard(card),
      archivedAt: card.archivedAt,
    })),
    activeCardId: draft.activeCardId,
    status: 'active',
    createdAt: draft.savedAt || now,
    updatedAt: draft.savedAt || now,
    archivedAt: null,
  };

  return {
    version: 2,
    documents: [document],
    activeDocumentId: documentId,
    savedAt: now,
  };
}

export function documentTitle(document: EssayDocument) {
  const normalized = document.taskPrompt.replace(/\s+/g, ' ').trim();
  if (!normalized) return '未命名作文';
  return normalized.length > 42 ? `${normalized.slice(0, 42)}…` : normalized;
}
