import { diffWordsWithSpace, type Change } from "diff";

export type SentenceRange = {
  sentence: string;
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

export function replaceLatestSentence(
  fullText: string,
  range: { start: number; end: number },
  finalSentence: string,
): string {
  return `${fullText.slice(0, range.start)}${finalSentence}${fullText.slice(range.end)}`;
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

export function createWordDiff(
  originalSentence: string,
  finalSentence: string,
): Change[] {
  return diffWordsWithSpace(originalSentence, finalSentence);
}
