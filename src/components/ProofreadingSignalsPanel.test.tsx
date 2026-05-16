import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProofreadingSignalsPanel } from "./ProofreadingSignalsPanel";
import type { ProofreadingResult } from "@/lib/proofreading";

const result: ProofreadingResult = {
  stats: {
    characterCount: 80,
    englishWordCount: 12,
    sentenceCount: 2,
    paragraphCount: 1,
  },
  signals: [
    {
      id: "grammar-0",
      type: "grammar",
      titleZh: "重复",
      messageZh: "可能重复输入：They。",
      excerpt: "They they",
      replacement: "They",
      start: 0,
      end: 9,
    },
  ],
};

describe("ProofreadingSignalsPanel", () => {
  it("renders compact proofreading status without an expandable panel", () => {
    render(<ProofreadingSignalsPanel result={result} />);

    expect(screen.getByText("文本校对：1 条提示")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /文本校对/u })).not.toBeInTheDocument();
  });
});
