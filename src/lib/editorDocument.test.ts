import { describe, expect, it } from "vitest";
import {
  buildEditorBlocks,
  findParagraphIndexForRange,
  getParagraphOffset,
  joinParagraphBlocks,
  splitTextIntoParagraphs,
} from "./editorDocument";

describe("editor document model", () => {
  it("splits text into paragraph blocks aligned to outline points", () => {
    expect(splitTextIntoParagraphs("First.\n\nSecond.\n\nThird.", 2)).toEqual([
      "First.",
      "Second.\n\nThird.",
    ]);
    expect(splitTextIntoParagraphs("Only paragraph.", 3)).toEqual([
      "Only paragraph.",
      "",
      "",
    ]);
  });

  it("builds heading and paragraph blocks without mixing outline text into body text", () => {
    expect(buildEditorBlocks("Opening.\n\nBody.", ["Intro", "Argument"])).toEqual([
      { type: "heading", level: 2, outlineIndex: 0, text: "Intro" },
      { type: "paragraph", paragraphIndex: 0, text: "Opening." },
      { type: "heading", level: 2, outlineIndex: 1, text: "Argument" },
      { type: "paragraph", paragraphIndex: 1, text: "Body." },
    ]);
  });

  it("maps paragraph blocks to full text offsets using blank-line separators", () => {
    const paragraphs = ["Opening.", "Second paragraph.", "Final."];

    expect(getParagraphOffset(paragraphs, 0)).toBe(0);
    expect(getParagraphOffset(paragraphs, 1)).toBe("Opening.\n\n".length);
    expect(getParagraphOffset(paragraphs, 2)).toBe("Opening.\n\nSecond paragraph.\n\n".length);
  });

  it("joins edited paragraph blocks back into the source text shape", () => {
    expect(joinParagraphBlocks(["Opening.", "Updated body."])).toBe("Opening.\n\nUpdated body.");
  });

  it("finds the paragraph that contains a captured latest-sentence range", () => {
    const paragraphs = ["Opening sentence.", "The second paragraph has the latest sentence."];
    const start = "Opening sentence.\n\nThe second paragraph has ".length;

    expect(findParagraphIndexForRange(paragraphs, { start, end: start + "the latest sentence.".length })).toBe(1);
  });
});
