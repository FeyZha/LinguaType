import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FastEnhanceResult } from "@/lib/llm/types";
import { createWordDiff } from "@/lib/sentence";
import { EnhancementPopover } from "./EnhancementPopover";

const result: FastEnhanceResult = {
  taskType: "mixed_chinese_rewrite",
  originalSentence: "The weather was good, so I planned to go outside, but it started to pour.",
  finalSentence: "The weather was good, so I planned to go to the park, but it started to rain.",
  explanationZh: "结构提示示例",
  hasChinese: true,
};

function renderPopover() {
  return render(
    <EnhancementPopover
      originalSentence={result.originalSentence}
      result={result}
      activeDiffId="diff-0"
      diffParts={createWordDiff(result.originalSentence, result.finalSentence)}
      onApply={vi.fn()}
      onCancel={vi.fn()}
      onRegenerate={vi.fn()}
      onCopy={vi.fn()}
    />,
  );
}

describe("EnhancementPopover", () => {
  it("shows the legacy sentence suggestion structure with original snippet and final sentence", () => {
    const { container } = renderPopover();

    expect(screen.getByText("当前句建议")).toBeInTheDocument();
    expect(screen.getByText(/改写类型/u)).toBeInTheDocument();
    expect(screen.getByLabelText("原文关键修改片段")).toHaveTextContent(
      /outside|pour/u,
    );
    expect(screen.getByLabelText("修改后句子")).toHaveTextContent(result.finalSentence);
    expect(screen.getByText(/结构：结构提示示例/u)).toBeInTheDocument();
    expect(screen.getByText(/->/u)).toBeInTheDocument();

    const changedRevisedDiff = container.querySelector("[data-revised-diff='changed']");
    expect(changedRevisedDiff).not.toBeNull();
    expect(changedRevisedDiff).not.toHaveClass("line-through", "border");
    expect(screen.queryByRole("button", { name: /原句改动/u })).not.toBeInTheDocument();
  });

  it("uses the same legacy layout for placeholder suggestions", () => {
    render(
      <EnhancementPopover
        originalSentence={result.originalSentence}
        result={result}
        placeholderHint={{
          sourceText: "to go outside",
          targetText: "go to the park / rain",
          structure: "go to + place",
        }}
        isPlaceholderSuggestion
        diffParts={createWordDiff(result.originalSentence, result.finalSentence)}
        onApply={vi.fn()}
        onCancel={vi.fn()}
        onRegenerate={vi.fn()}
        onCopy={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("修改后句子")).toHaveTextContent(result.finalSentence);
    expect(screen.getByLabelText("原文关键修改片段")).toBeInTheDocument();
    expect(screen.getByText(/->/u)).toBeInTheDocument();
    expect(screen.queryByLabelText("对应英文表达")).not.toBeInTheDocument();
  });
});
