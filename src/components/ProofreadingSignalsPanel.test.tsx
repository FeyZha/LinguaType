import { fireEvent, render, screen } from "@testing-library/react";
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
      titleZh: "重复词 Grammar",
      messageZh: "可能重复输入了 They。",
      excerpt: "They they",
      replacement: "They",
      start: 0,
      end: 9,
    },
  ],
};

describe("ProofreadingSignalsPanel", () => {
  it("collapses into an issue count and expands stats only after click", () => {
    render(<ProofreadingSignalsPanel result={result} />);

    expect(screen.getByRole("button", { name: /1 个问题/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /校对提示：1 个问题/ })).toBeInTheDocument();
    expect(screen.queryByText(/Proofreading/u)).not.toBeInTheDocument();
    expect(screen.queryByText("文本统计 Text Stats")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /1 个问题/ }));

    expect(screen.getByText("文本统计 Text Stats")).toBeInTheDocument();
    expect(screen.getByText("12 words")).toBeInTheDocument();
    expect(screen.getByText("2 sentences")).toBeInTheDocument();
    expect(screen.getByText("They they")).toBeInTheDocument();
  });
});
