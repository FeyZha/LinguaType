export type EditorHeadingBlock = {
  type: "heading";
  level: 2;
  outlineIndex: number;
  text: string;
};

export type EditorParagraphBlock = {
  type: "paragraph";
  paragraphIndex: number;
  text: string;
};

export type EditorBlock = EditorHeadingBlock | EditorParagraphBlock;

export type TextRange = {
  start: number;
  end: number;
};

export function splitTextIntoParagraphs(value: string, count: number): string[] {
  const targetCount = Math.max(1, count);
  if (targetCount === 1) {
    return [value];
  }

  const parts = value.split(/\n{2,}/u);
  while (parts.length < targetCount) {
    parts.push("");
  }

  if (parts.length > targetCount) {
    return [...parts.slice(0, targetCount - 1), parts.slice(targetCount - 1).join("\n\n")];
  }

  return parts;
}

export function buildEditorBlocks(value: string, outlinePoints: string[] = []): EditorBlock[] {
  const paragraphs = splitTextIntoParagraphs(value, outlinePoints.length || 1);

  return paragraphs.flatMap((paragraph, index) => {
    const heading: EditorHeadingBlock = {
      type: "heading",
      level: 2,
      outlineIndex: index,
      text: outlinePoints[index]?.trim() || `第 ${index + 1} 段 自由写作`,
    };

    return [
      heading,
      {
        type: "paragraph",
        paragraphIndex: index,
        text: paragraph,
      },
    ];
  });
}

export function getParagraphOffset(paragraphs: string[], paragraphIndex: number): number {
  return paragraphs
    .slice(0, Math.max(0, paragraphIndex))
    .reduce((offset, paragraph) => offset + paragraph.length + 2, 0);
}

export function joinParagraphBlocks(paragraphs: string[]): string {
  return paragraphs.join("\n\n");
}

export function findParagraphIndexForRange(paragraphs: string[], range: TextRange): number {
  for (let index = 0; index < paragraphs.length; index += 1) {
    const start = getParagraphOffset(paragraphs, index);
    const end = start + paragraphs[index].length;
    if (range.start >= start && range.start <= end) {
      return index;
    }
  }

  return Math.max(0, paragraphs.length - 1);
}
