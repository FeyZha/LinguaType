import type { LearningItem } from "./llm/types";

export type ExpressionReappearanceMatch = {
  id: string;
  itemId: string;
  expression: string;
  matchedText: string;
  start: number;
  end: number;
  meaning?: string;
  usage?: string;
  source?: string;
  chineseMeaning?: string;
  usageNote?: string;
  sourceSentence?: string;
};

const WORD_OR_NUM = /[a-z0-9]+(?:'[a-z0-9]+)?/giu;
const APOSTROPHE_CHARS = /['\u2018\u2019\u02bc\u00b4]/gu;
const APOSTROPHE_CHAR = /['\u2018\u2019\u02bc\u00b4]/u;
const POSSESSIVE_PLACEHOLDER = "one's";
const APOSTROPHE_GROUP = ["my", "your", "his", "her", "its", "our", "their"];
const SENTENCE_BOUNDARIES = new Set([".", "?", "!", "\u3002", "\uFF1F", "\uFF01", ";", "\uFF1B", "\n"]);

export function findExpressionReappearanceCues(
  fullText: string,
  learningItems: LearningItem[],
): ExpressionReappearanceMatch[] {
  const candidates = learningItems
    .filter(isHighValueLearningItem)
    .flatMap((item) => buildExpressionRules(item));

  const matches: ExpressionReappearanceMatch[] = [];

  for (const sentence of splitIntoSentences(fullText)) {
    const sentenceText = fullText.slice(sentence.start, sentence.end);
    if (!sentenceText.trim()) {
      continue;
    }
    const match = findBestMatchInSentence(sentenceText, sentence.start, candidates);
    if (match) {
      matches.push(match);
    }
  }

  return matches;
}

type ExpressionRule = {
  item: LearningItem;
  expression: string;
  pattern: RegExp;
};

function isHighValueLearningItem(item: LearningItem): boolean {
  if (item.type !== "phrase" && item.type !== "collocation") {
    return false;
  }

  const normalized = normalizePhrase(item.content);
  if (!normalized) {
    return false;
  }

  const tokens = extractNormalizedWords(normalized);
  if (tokens.length === 0) {
    return false;
  }
  if (tokens.length < 2 || normalized.length < 6) {
    return false;
  }

  return true;
}

function buildExpressionRules(item: LearningItem): ExpressionRule[] {
  const normalized = normalizePhrase(item.content);
  if (!normalized) {
    return [];
  }

  const tokens = extractNormalizedWords(normalized);
  const tokenPattern = buildWordPatternList(tokens);
  if (!tokenPattern) {
    return [];
  }

  return [
    {
      item,
      expression: item.content,
      pattern: new RegExp(`(^|[^a-z0-9'])(${tokenPattern})(?=[^a-z0-9']|$)`, "g"),
    },
  ];
}

function buildWordPatternList(tokens: string[]): string {
  const tokenPatterns = tokens.map((token) => {
    if (token === POSSESSIVE_PLACEHOLDER) {
      return buildPossessivePlaceholderPattern();
    }
    const variants = generateWordVariants(token);
    const escapedVariants = variants.map(escapeForRegex);
    return `(?:${escapedVariants.join("|")})`;
  });
  return tokenPatterns.join("\\s+");
}

function buildPossessivePlaceholderPattern(): string {
  return `(?:${APOSTROPHE_GROUP.join("|")}|[a-z0-9]+(?:\\s+[a-z0-9]+){0,2}'s|[a-z0-9]+s')`;
}

function generateWordVariants(token: string): string[] {
  const cleaned = token.toLowerCase();
  const variants = new Set<string>([cleaned]);
  if (!isAlphabeticToken(cleaned) || cleaned.length < 4) {
    return Array.from(variants);
  }

  variants.add(`${cleaned}s`);
  variants.add(`${cleaned}ed`);
  variants.add(`${cleaned}ing`);
  if (cleaned.endsWith("e")) {
    variants.add(`${cleaned.slice(0, -1)}ing`);
    variants.add(`${cleaned.slice(0, -1)}ed`);
  }
  if (/[sx]$/.test(cleaned)) {
    variants.add(`${cleaned}es`);
  }
  if (/(sh|ch|z|o)$/.test(cleaned)) {
    variants.add(`${cleaned}es`);
  }

  return Array.from(variants);
}

function isAlphabeticToken(value: string): boolean {
  return /^[a-z]+(?:'[a-z]+)?$/.test(value);
}

function findBestMatchInSentence(
  sentence: string,
  sentenceStart: number,
  candidates: ExpressionRule[],
): ExpressionReappearanceMatch | null {
  const { text: normalizedSentence, indexMap } = normalizeTextWithIndexMap(sentence);
  if (!normalizedSentence) {
    return null;
  }

  let bestMatch: Omit<ExpressionReappearanceMatch, "id"> | null = null;

  for (const candidate of candidates) {
    candidate.pattern.lastIndex = 0;
    for (const rawMatch of normalizedSentence.matchAll(candidate.pattern)) {
      const matchedExpression = rawMatch[2] ?? "";
      if (!matchedExpression) {
        continue;
      }

      const expressionStart = rawMatch.index + (rawMatch[1] ? rawMatch[1].length : 0);
      const expressionEnd = expressionStart + matchedExpression.length;

      const globalStart = sentenceStart + mapCanonicalToOriginalIndex(indexMap, expressionStart);
      const globalEnd = sentenceStart + mapCanonicalToOriginalIndex(indexMap, expressionEnd, true);
      const matchedText = sentence.slice(globalStart - sentenceStart, globalEnd - sentenceStart);
      const currentMatch = {
        itemId: candidate.item.id,
        expression: candidate.expression,
        matchedText,
        start: globalStart,
        end: globalEnd,
        meaning: candidate.item.chineseMeaning || undefined,
        usage: candidate.item.usageNote || undefined,
        source: candidate.item.sourceSentence || undefined,
        chineseMeaning: candidate.item.chineseMeaning,
        usageNote: candidate.item.usageNote,
        sourceSentence: candidate.item.sourceSentence,
      };

      if (!bestMatch || isStrongerMatch(currentMatch, bestMatch)) {
        bestMatch = currentMatch;
      }
    }
  }

  if (!bestMatch) {
    return null;
  }

  return {
    id: `${bestMatch.itemId}-${bestMatch.start}-${bestMatch.end}`,
    ...bestMatch,
  };
}

function isStrongerMatch(
  candidate: Omit<ExpressionReappearanceMatch, "id">,
  current: Omit<ExpressionReappearanceMatch, "id">,
): boolean {
  const candidateLen = candidate.end - candidate.start;
  const currentLen = current.end - current.start;
  if (candidateLen !== currentLen) {
    return candidateLen > currentLen;
  }
  return candidate.start < current.start;
}

function normalizeTextWithIndexMap(text: string): { text: string; indexMap: number[] } {
  const textChars: string[] = [];
  const indexMap: number[] = [];

  for (let i = 0; i < text.length; i += 1) {
    textChars.push(normalizeCharacter(text[i]));
    indexMap.push(i);
  }

  return { text: textChars.join(""), indexMap };
}

function normalizeCharacter(char: string): string {
  const normalized = char.toLowerCase();
  if (isAlphaNumeric(normalized)) {
    return normalized;
  }
  if (/\s/u.test(char)) {
    return " ";
  }
  if (APOSTROPHE_CHAR.test(normalized)) {
    return "'";
  }
  return " ";
}

function isAlphaNumeric(char: string): boolean {
  return /^[a-z0-9]$/i.test(char);
}

function mapCanonicalToOriginalIndex(indexMap: number[], index: number, isEnd = false): number {
  if (index <= 0) {
    return 0;
  }
  if (index >= indexMap.length) {
    return indexMap.length > 0 ? indexMap[indexMap.length - 1] + 1 : 0;
  }
  if (isEnd) {
    return indexMap[index - 1] + 1;
  }
  return indexMap[index];
}

function splitIntoSentences(fullText: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let start = 0;

  for (let index = 0; index < fullText.length; index += 1) {
    if (!SENTENCE_BOUNDARIES.has(fullText[index])) {
      continue;
    }
    ranges.push({ start, end: index + 1 });
    start = index + 1;
  }

  if (start < fullText.length) {
    ranges.push({ start, end: fullText.length });
  }

  return ranges.filter((range) => range.end > range.start);
}

function extractNormalizedWords(value: string): string[] {
  return [...value.matchAll(WORD_OR_NUM)].map((match) => match[0]);
}

function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(APOSTROPHE_CHARS, "'")
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
