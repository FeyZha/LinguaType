import { diffWordsWithSpace, type Change } from "diff";

export type SentenceRange = {
  sentence: string;
  start: number;
  end: number;
};

export type ChinesePlaceholder = {
  text: string;
  start: number;
  end: number;
};

export type ChinesePlaceholderSentenceRange = SentenceRange & {
  placeholders: ChinesePlaceholder[];
};

export type ParagraphRange = {
  paragraph: string;
  start: number;
  end: number;
};

const SENTENCE_BOUNDARIES = new Set([
  ".",
  "?",
  "!",
  "\u3002",
  "\uff1f",
  "\uff01",
  ";",
  "\uff1b",
  "\n",
]);

export function containsChinese(text: string): boolean {
  return /[\u3400-\u9fff]/u.test(text);
}

function isSentenceBoundary(char: string): boolean {
  return SENTENCE_BOUNDARIES.has(char);
}

export function endsWithSentenceBoundary(text: string): boolean {
  return /[.!?;。？！；]\s*$|\n\s*$/u.test(text);
}

export function detectChinesePlaceholders(text: string): ChinesePlaceholder[] {
  const placeholders: ChinesePlaceholder[] = [];
  const pattern = /[\u3400-\u9fff]+(?:[\s、，：；。！？]*[\u3400-\u9fff]+)*/gu;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    placeholders.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return placeholders;
}

export function extractLatestSentence(fullText: string): SentenceRange {
  const detectionText = fullText.replace(/\s+$/u, "");
  const detectionEnd = detectionText.length;

  if (detectionEnd === 0) {
    return { sentence: "", start: 0, end: 0 };
  }

  const lastChar = fullText[detectionEnd - 1];
  let searchIndex = isSentenceBoundary(lastChar) ? detectionEnd - 2 : detectionEnd - 1;
  let boundaryIndex = -1;

  while (searchIndex >= 0) {
    if (isSentenceBoundary(fullText[searchIndex])) {
      boundaryIndex = searchIndex;
      break;
    }
    searchIndex -= 1;
  }

  let start = boundaryIndex + 1;
  while (start < detectionEnd && /\s/u.test(fullText[start])) {
    start += 1;
  }

  return {
    sentence: fullText.slice(start, detectionEnd),
    start,
    end: detectionEnd,
  };
}

export function extractCurrentSentence(fullText: string, cursorPosition = fullText.length): SentenceRange {
  const detectionText = fullText.replace(/\s+$/u, "");
  const detectionEnd = detectionText.length;

  if (detectionEnd === 0) {
    return { sentence: "", start: 0, end: 0 };
  }

  let cursor = Number.isFinite(cursorPosition) ? cursorPosition : detectionEnd;
  cursor = Math.max(0, Math.min(cursor, detectionEnd));

  let sentenceEnd = cursor;
  const previousChar = sentenceEnd > 0 ? fullText[sentenceEnd - 1] : "";
  let leftSearchIndex = isSentenceBoundary(previousChar) ? sentenceEnd - 2 : sentenceEnd - 1;

  if (!isSentenceBoundary(previousChar)) {
    let rightSearchIndex = sentenceEnd;
    while (rightSearchIndex < detectionEnd) {
      if (isSentenceBoundary(fullText[rightSearchIndex])) {
        sentenceEnd = rightSearchIndex + 1;
        break;
      }
      rightSearchIndex += 1;
    }
    if (rightSearchIndex >= detectionEnd) {
      sentenceEnd = detectionEnd;
    }
  }

  let boundaryIndex = -1;
  while (leftSearchIndex >= 0) {
    if (isSentenceBoundary(fullText[leftSearchIndex])) {
      boundaryIndex = leftSearchIndex;
      break;
    }
    leftSearchIndex -= 1;
  }

  let start = boundaryIndex + 1;
  while (start < sentenceEnd && /\s/u.test(fullText[start])) {
    start += 1;
  }

  return {
    sentence: fullText.slice(start, sentenceEnd),
    start,
    end: sentenceEnd,
  };
}

export function extractChinesePlaceholderSentence(
  fullText: string,
  cursorPosition = fullText.length,
): ChinesePlaceholderSentenceRange | null {
  const range = extractCurrentSentence(fullText, cursorPosition);
  const placeholders = detectChinesePlaceholders(range.sentence).map((placeholder) => ({
    ...placeholder,
    start: range.start + placeholder.start,
    end: range.start + placeholder.end,
  }));

  if (range.sentence.trim().length === 0 || placeholders.length === 0) {
    return null;
  }

  return {
    ...range,
    placeholders,
  };
}

export function extractChinesePlaceholderSentences(fullText: string): ChinesePlaceholderSentenceRange[] {
  const ranges: ChinesePlaceholderSentenceRange[] = [];
  let rawStart = 0;

  for (let index = 0; index < fullText.length; index += 1) {
    if (!isSentenceBoundary(fullText[index])) {
      continue;
    }

    const rawEnd = index + 1;
    addChinesePlaceholderSentenceRange(ranges, fullText, rawStart, rawEnd);
    rawStart = rawEnd;
  }

  return ranges;
}

function addChinesePlaceholderSentenceRange(
  ranges: ChinesePlaceholderSentenceRange[],
  fullText: string,
  rawStart: number,
  rawEnd: number,
) {
  let start = rawStart;
  let end = rawEnd;
  while (start < end && /\s/u.test(fullText[start])) {
    start += 1;
  }
  while (end > start && /\s/u.test(fullText[end - 1]) && fullText[end - 1] !== "\n") {
    end -= 1;
  }

  const sentence = fullText.slice(start, end);
  const placeholders = detectChinesePlaceholders(sentence).map((placeholder) => ({
    ...placeholder,
    start: start + placeholder.start,
    end: start + placeholder.end,
  }));

  if (sentence.trim() && placeholders.length > 0 && endsWithSentenceBoundary(sentence)) {
    ranges.push({ sentence, start, end, placeholders });
  }
}

export function replaceLatestSentence(
  fullText: string,
  range: { start: number; end: number },
  finalSentence: string,
): string {
  return `${fullText.slice(0, range.start)}${finalSentence}${fullText.slice(range.end)}`;
}

export function replaceRange(
  fullText: string,
  range: { start: number; end: number },
  replacement: string,
): string {
  return `${fullText.slice(0, range.start)}${replacement}${fullText.slice(range.end)}`;
}

export function getPreviousContext(fullText: string, latestSentenceStart: number): string {
  return fullText.slice(0, latestSentenceStart).trim();
}

export function getCurrentParagraph(fullText: string, latestSentenceStart: number): string {
  const before = fullText.slice(0, latestSentenceStart);
  const after = fullText.slice(latestSentenceStart);
  const paragraphStartMatch = Array.from(before.matchAll(/\n\s*\n/gu)).at(-1);
  const paragraphStart = paragraphStartMatch
    ? paragraphStartMatch.index + paragraphStartMatch[0].length
    : 0;
  const paragraphEndMatch = after.match(/\n\s*\n/u);
  const paragraphEnd = paragraphEndMatch?.index === undefined
    ? fullText.length
    : latestSentenceStart + paragraphEndMatch.index;

  return fullText.slice(paragraphStart, paragraphEnd).trim();
}

export function extractCurrentParagraph(fullText: string, cursorPosition?: number): ParagraphRange {
  const blocks = getParagraphBlocks(fullText);
  if (blocks.length === 0) {
    return { paragraph: "", start: 0, end: 0 };
  }

  if (typeof cursorPosition === "number" && Number.isFinite(cursorPosition)) {
    const clampedCursor = Math.max(0, Math.min(fullText.length, cursorPosition));
    const blockAtCursor = blocks.find((block) => block.start <= clampedCursor && clampedCursor <= block.end);
    if (blockAtCursor) {
      return blockAtCursor;
    }
  }

  return blocks.at(-1) ?? { paragraph: "", start: 0, end: 0 };
}

function getParagraphBlocks(fullText: string): ParagraphRange[] {
  const blocks: ParagraphRange[] = [];
  const separatorPattern = /\n\s*\n/gu;
  let rawStart = 0;
  let match: RegExpExecArray | null;

  while ((match = separatorPattern.exec(fullText)) !== null) {
    addParagraphBlock(blocks, fullText, rawStart, match.index);
    rawStart = match.index + match[0].length;
  }
  addParagraphBlock(blocks, fullText, rawStart, fullText.length);

  return blocks;
}

function addParagraphBlock(blocks: ParagraphRange[], fullText: string, rawStart: number, rawEnd: number): void {
  let start = rawStart;
  let end = rawEnd;
  while (start < end && /\s/u.test(fullText[start])) {
    start += 1;
  }
  while (end > start && /\s/u.test(fullText[end - 1])) {
    end -= 1;
  }

  const paragraph = fullText.slice(start, end);
  if (paragraph.trim()) {
    blocks.push({ paragraph, start, end });
  }
}

export function createWordDiff(
  originalSentence: string,
  finalSentence: string,
): Change[] {
  return diffWordsWithSpace(originalSentence, finalSentence);
}
