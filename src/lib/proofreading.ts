export type TextStats = {
  characterCount: number;
  englishWordCount: number;
  sentenceCount: number;
  paragraphCount: number;
};

export type ProofreadingSignalType = "grammar" | "punctuation" | "style" | "length";

export type ProofreadingSignal = {
  id: string;
  type: ProofreadingSignalType;
  titleZh: string;
  messageZh: string;
  excerpt: string;
  replacement?: string;
  start: number;
  end: number;
};

export type ProofreadingResult = {
  stats: TextStats;
  signals: ProofreadingSignal[];
};

const COMMON_TYPOS: Record<string, string> = {
  teh: "the",
  recieve: "receive",
  definately: "definitely",
  seperate: "separate",
  goverment: "government",
  enviroment: "environment",
  accomodate: "accommodate",
  occured: "occurred",
  childrens: "children",
};

const MAX_SIGNALS = 8;

export function calculateTextStats(text: string): TextStats {
  const trimmed = text.trim();
  return {
    characterCount: text.length,
    englishWordCount: countEnglishWords(text),
    sentenceCount: trimmed ? splitSentences(text).filter((sentence) => sentence.text.trim()).length : 0,
    paragraphCount: trimmed ? text.split(/\n\s*\n/u).filter((paragraph) => paragraph.trim()).length : 0,
  };
}

export function analyzeProofreading(text: string, personalDictionary: string[] = []): ProofreadingResult {
  const dictionary = new Set(normalizePersonalDictionary(personalDictionary).map((term) => term.toLowerCase()));
  const signals: ProofreadingSignal[] = [];

  collectCommonTypos(text, dictionary, signals);
  collectDuplicateWords(text, dictionary, signals);
  collectPunctuationSpacing(text, signals);
  collectRepeatedPunctuation(text, signals);
  collectStyleSignals(text, signals);
  collectLengthSignals(text, signals);

  return {
    stats: calculateTextStats(text),
    signals: signals
      .sort((a, b) => a.start - b.start || a.type.localeCompare(b.type))
      .slice(0, MAX_SIGNALS)
      .map((signal, index) => ({ ...signal, id: `${signal.type}-${index}-${signal.start}` })),
  };
}

export function normalizePersonalDictionary(terms: string[]): string[] {
  const byKey = new Map<string, string>();
  for (const term of terms) {
    const normalized = term.trim().replace(/\s+/gu, " ");
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  }
  return Array.from(byKey.values());
}

function collectCommonTypos(text: string, dictionary: Set<string>, signals: ProofreadingSignal[]) {
  for (const match of text.matchAll(/\b[A-Za-z][A-Za-z']*\b/gu)) {
    const word = match[0];
    const lower = word.toLowerCase();
    const replacement = COMMON_TYPOS[lower];
    if (!replacement || dictionary.has(lower)) {
      continue;
    }
    signals.push({
      id: "",
      type: "grammar",
      titleZh: "语法",
      messageZh: `可能是拼写错误，建议改为 ${replacement}。`,
      excerpt: word,
      replacement,
      start: match.index,
      end: match.index + word.length,
    });
  }
}

function collectDuplicateWords(text: string, dictionary: Set<string>, signals: ProofreadingSignal[]) {
  for (const match of text.matchAll(/\b([A-Za-z]+(?:'[A-Za-z]+)?)\s+\1\b/giu)) {
    const repeated = match[1];
    if (dictionary.has(repeated.toLowerCase())) {
      continue;
    }
    signals.push({
      id: "",
      type: "grammar",
      titleZh: "重复",
      messageZh: `可能重复输入：${repeated}。`,
      excerpt: match[0],
      replacement: repeated,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
}

function collectPunctuationSpacing(text: string, signals: ProofreadingSignal[]) {
  for (const match of text.matchAll(/\b([A-Za-z]+)([,;:!?])([A-Za-z]+)\b/gu)) {
    signals.push({
      id: "",
      type: "punctuation",
      titleZh: "标点符号",
      messageZh: "英文标点后通常应保留空格。",
      excerpt: match[0],
      replacement: `${match[1]}${match[2]} ${match[3]}`,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
}

function collectRepeatedPunctuation(text: string, signals: ProofreadingSignal[]) {
  for (const match of text.matchAll(/([!?]){2,}/gu)) {
    signals.push({
      id: "",
      type: "punctuation",
      titleZh: "重复标点",
      messageZh: "重复标点会影响可读性，请按习惯保留一个。",
      excerpt: match[0],
      replacement: match[0][0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
}

function collectStyleSignals(text: string, signals: ProofreadingSignal[]) {
  for (const match of text.matchAll(/\bvery\s+[A-Za-z]+\b/giu)) {
    signals.push({
      id: "",
      type: "style",
      titleZh: "表达强度",
      messageZh: "可考虑用更自然的词组替换，避免用词过度强调。",
      excerpt: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
}

function collectLengthSignals(text: string, signals: ProofreadingSignal[]) {
  for (const sentence of splitSentences(text)) {
    const wordCount = countEnglishWords(sentence.text);
    if (wordCount < 32) {
      continue;
    }
    const excerpt = sentence.text.trim();
    signals.push({
      id: "",
      type: "length",
      titleZh: "句子偏长",
      messageZh: `该句词数为 ${wordCount}，建议拆分为两个更短句子，减少阅读负担。`,
      excerpt: excerpt.length > 96 ? `${excerpt.slice(0, 96).trim()}...` : excerpt,
      start: sentence.start,
      end: sentence.end,
    });
  }
}

function splitSentences(text: string): Array<{ text: string; start: number; end: number }> {
  const sentences: Array<{ text: string; start: number; end: number }> = [];
  for (const match of text.matchAll(/[^.!?。]+[.!?。]/gu)) {
    sentences.push({
      text: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return sentences;
}

function countEnglishWords(text: string): number {
  return text.match(/[A-Za-z]+(?:'[A-Za-z]+)?/gu)?.length ?? 0;
}
