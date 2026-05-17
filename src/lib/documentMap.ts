import type {
  ApiConfig,
  DocumentMapFreshness,
  DocumentMapParagraphFingerprint,
  DocumentMapParagraphInput,
} from "./llm/types";

export const DOCUMENT_MAP_AUTO_CHECK_RULES = {
  minParagraphs: 2,
  minWords: 120,
  idleMs: 10_000,
  minChangedWords: 40,
  minChangedRatio: 0.18,
  minIntervalMs: 180_000,
  maxAutoChecksPerSession: 5,
} as const;

export type DocumentMapAutoCheckRules = typeof DOCUMENT_MAP_AUTO_CHECK_RULES;

export type DocumentMapFreshnessStateContext = {
  text: string;
  paragraphs: DocumentMapParagraphInput[];
  essayTopic: string;
  outlinePoints: string[];
  cache: {
    cacheKey?: string;
    textHash?: string;
    essayTopicHash?: string;
    outlinePointsHash?: string;
    outlineHash?: string;
    paragraphFingerprints?: DocumentMapParagraphFingerprint[];
    generatedAt?: string;
    freshness?: DocumentMapFreshness;
    lastAutoCheckedAt?: string;
    autoCheckCountInSession?: number;
  } | null;
  now?: number;
};

export type DocumentMapAutoCheckPolicyContext = {
  now: number;
  lastInputAt: number;
};

export type DocumentMapCacheKeyInput = {
  archiveId: string | null;
  textHash: string;
  essayTopic: string;
  outlinePoints: string[];
  domain: string;
  model: string;
};

export function splitDocumentIntoParagraphs(text: string): DocumentMapParagraphInput[] {
  const blankLineParagraphs = collectDocumentParagraphs(text, /\r?\n\s*\r?\n/gu);
  if (blankLineParagraphs.length >= 2) {
    return blankLineParagraphs;
  }

  return collectDocumentParagraphs(text, /\r?\n/gu);
}

function collectDocumentParagraphs(text: string, separatorPattern: RegExp): DocumentMapParagraphInput[] {
  const paragraphs: DocumentMapParagraphInput[] = [];
  let rawStart = 0;
  let match: RegExpExecArray | null;

  function addParagraph(rawEnd: number) {
    let start = rawStart;
    let end = rawEnd;
    while (start < end && /\s/u.test(text[start])) {
      start += 1;
    }
    while (end > start && /\s/u.test(text[end - 1])) {
      end -= 1;
    }
    const paragraphText = text.slice(start, end);
    if (!paragraphText.trim()) {
      return;
    }
    const index = paragraphs.length + 1;
    const normalizedText = paragraphText.trim();
    const wordCount = countWords(normalizedText);
    paragraphs.push({
      paragraphId: `p${index}`,
      index,
      range: { start, end },
      text: paragraphText,
      hash: createStableHash(normalizedText.toLowerCase()),
      wordCount,
    });
  }

  while ((match = separatorPattern.exec(text)) !== null) {
    addParagraph(match.index);
    rawStart = match.index + match[0].length;
  }
  addParagraph(text.length);

  return paragraphs;
}

export function createDocumentMapTextHash(text: string): string {
  return createStableHash(text.trim().replace(/\s+/gu, " "));
}

export function createDocumentMapOutlineHash(outlinePoints: string[]): string {
  return createStableHash(outlinePoints.map((point) => point.trim()).filter(Boolean).join("\n"));
}

export function createDocumentMapCacheKey(input: DocumentMapCacheKeyInput): string {
  return [
    input.archiveId ?? "draft",
    input.textHash,
    createStableHash(input.essayTopic.trim()),
    createDocumentMapOutlineHash(input.outlinePoints),
    input.domain.trim() || "custom",
    input.model.trim() || "mock",
  ].join("|");
}

export function documentMapModelKey(apiConfig: ApiConfig): string {
  if (apiConfig.mockMode) {
    return "mock";
  }
  if (apiConfig.useServerApiKey && !apiConfig.model.trim()) {
    return [apiConfig.provider, "server-managed"].map((part) => part.trim()).join(":");
  }
  return [apiConfig.provider, apiConfig.baseUrl, apiConfig.model].map((part) => part.trim()).join(":");
}

export function createStableHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

export function createDocumentMapParagraphFingerprints(paragraphs: DocumentMapParagraphInput[]): DocumentMapParagraphFingerprint[] {
  return paragraphs.map((paragraph) => ({
    paragraphId: paragraph.paragraphId,
    range: paragraph.range,
    hash: paragraph.hash || createStableHash(paragraph.text.trim().toLowerCase()),
    wordCount: paragraph.wordCount ?? countWords(paragraph.text.trim()),
  }));
}

export function calculateDocumentMapWordCount(text: string): number {
  return countWords(text);
}

export function evaluateDocumentMapFreshness(
  context: DocumentMapFreshnessStateContext,
): DocumentMapFreshness {
  const rules = DOCUMENT_MAP_AUTO_CHECK_RULES;
  const now = context.now ?? Date.now();
  const currentTextHash = createDocumentMapTextHash(context.text);
  const totalWordCount = calculateDocumentMapWordCount(context.text);
  const currentParagraphs = createDocumentMapParagraphFingerprints(context.paragraphs);
  const currentEssayHash = createStableHash(context.essayTopic.trim());
  const currentOutlineHash = createDocumentMapOutlineHash(context.outlinePoints);
  const paragraphCount = context.paragraphs.length;

  if (paragraphCount < rules.minParagraphs || totalWordCount < rules.minWords) {
    return "empty";
  }

  if (!context.cache) {
    return "needs_check";
  }

  if (context.cache.freshness === "checking") {
    return "checking";
  }

  const previous = context.cache.paragraphFingerprints ?? [];
  const cacheGeneratedAt = context.cache.generatedAt ? Date.parse(context.cache.generatedAt) : Number.NaN;
  const previousWordCount = previous.reduce((sum, paragraph) => sum + paragraph.wordCount, 0);
  const changedWordCount = Math.abs(totalWordCount - previousWordCount);
  const changedRatio = previousWordCount > 0 ? changedWordCount / previousWordCount : 1;
  if (!context.cache.textHash) {
    return "stale";
  }

  const currentChangedByText = context.cache.textHash !== currentTextHash;
  const hasEssayTopicChanged = Boolean(context.cache.essayTopicHash)
    ? context.cache.essayTopicHash !== currentEssayHash
    : false;
  const hasOutlineChanged = Boolean(context.cache.outlinePointsHash)
    ? context.cache.outlinePointsHash !== currentOutlineHash
    : false;
  const hasOutlineLegacyChanged = Boolean(context.cache.outlineHash)
    ? context.cache.outlineHash !== currentOutlineHash
    : false;

  const paragraphCountChanged = previous.length !== currentParagraphs.length;

  if (!context.cache.freshness) {
    return "stale";
  }

  const needsCheck =
    paragraphCountChanged ||
    hasEssayTopicChanged ||
    hasOutlineChanged ||
    hasOutlineLegacyChanged ||
    changedWordCount >= rules.minChangedWords ||
    changedRatio >= rules.minChangedRatio;

  if (needsCheck) {
    return "needs_check";
  }

  if (currentChangedByText) {
    return "stale";
  }

  if (!Number.isFinite(cacheGeneratedAt)) {
    return "stale";
  }

  if (Number.isFinite(cacheGeneratedAt)) {
    const outdatedMs = now - cacheGeneratedAt;
    if (outdatedMs > rules.minIntervalMs) {
      return "stale";
    }
  }

  if (context.cache.freshness === "ready") {
    return context.cache.freshness;
  }

  if (context.cache.freshness === "failed") {
    return "failed";
  }

  return "fresh";
}

export function shouldQueueDocumentMapAutoCheck(
  freshness: DocumentMapFreshness,
  cache: { lastAutoCheckedAt?: string; autoCheckCountInSession?: number } | null,
  policy: DocumentMapAutoCheckPolicyContext,
): boolean {
  if (freshness !== "needs_check") {
    return false;
  }

  if (policy.now - policy.lastInputAt < DOCUMENT_MAP_AUTO_CHECK_RULES.idleMs) {
    return false;
  }

  const checkedCount = cache?.autoCheckCountInSession ?? 0;
  if (checkedCount >= DOCUMENT_MAP_AUTO_CHECK_RULES.maxAutoChecksPerSession) {
    return false;
  }

  if (!cache?.lastAutoCheckedAt) {
    return true;
  }

  const lastAutoCheckedAt = Date.parse(cache.lastAutoCheckedAt);
  if (!Number.isFinite(lastAutoCheckedAt)) {
    return true;
  }

  return policy.now - lastAutoCheckedAt >= DOCUMENT_MAP_AUTO_CHECK_RULES.minIntervalMs;
}

function doParagraphFingerprintsChange(
  previous: DocumentMapParagraphFingerprint[],
  current: DocumentMapParagraphFingerprint[],
): boolean {
  if (previous.length !== current.length) {
    return true;
  }

  const previousById = new Map<string, DocumentMapParagraphFingerprint>();
  for (const paragraph of previous) {
    previousById.set(paragraph.paragraphId, paragraph);
  }

  return current.some((paragraph) => {
    const prior = previousById.get(paragraph.paragraphId);
    if (!prior) {
      return true;
    }

    return (
      prior.hash !== paragraph.hash ||
      prior.range.start !== paragraph.range.start ||
      prior.range.end !== paragraph.range.end ||
      prior.wordCount !== paragraph.wordCount
    );
  });
}

function countWords(text: string): number {
  const matches = text.toLowerCase().match(/[a-z']+/gu);
  return matches ? matches.length : 0;
}
