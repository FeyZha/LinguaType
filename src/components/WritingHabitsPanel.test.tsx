import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WritingHabitsPanel } from "./WritingHabitsPanel";
import type { CorrectionEvent } from "@/lib/llm/types";

describe("WritingHabitsPanel", () => {
  it("uses a quiet editorial summary and shows only the latest example for each habit", () => {
    const onDeleteType = vi.fn();

    render(<WritingHabitsPanel events={writingHabitEvents()} onDeleteType={onDeleteType} />);

    expect(screen.queryByText("写作观察")).not.toBeInTheDocument();
    const visual = screen.getByLabelText("写作习惯简约摘要");
    expect(visual).toHaveAttribute("data-visual-tone", "minimal-editorial");
    expect(visual).toHaveAttribute("data-motion-library", "animejs");
    expect(screen.getByLabelText("修正节奏摘要")).toBeInTheDocument();
    expect(screen.getByLabelText("习惯频率摘要")).toBeInTheDocument();
    const trendChart = screen.getByLabelText("写作习惯趋势图");
    expect(trendChart).toHaveAttribute("data-habit-chart-state", "ready");
    expect(within(trendChart).getByLabelText("5/11 20 次")).toBeInTheDocument();
    expect(within(trendChart).getByText("20 次")).toBeInTheDocument();

    const insightList = screen.getByLabelText("写作习惯洞察列表");
    expect(insightList).toHaveAttribute("data-reactbits-reference", "animated-list");
    const firstInsight = within(insightList).getAllByLabelText("习惯洞察条目")[0];
    expect(firstInsight).toHaveAttribute("data-habit-row-motion", "stagger-rise");
    expect(firstInsight).toHaveAttribute("data-habit-row-design", "editorial-compact");
    expect(within(firstInsight).queryByTestId("habit-count-circle")).not.toBeInTheDocument();
    expect(within(firstInsight).getByText("31 次")).toHaveAttribute("data-habit-count", "true");
    expect(within(firstInsight).getByText("高频")).toHaveAttribute("data-severity-tone", "heavy");
    expect(screen.getByText("按出现次数分档：1-10 低频，11-30 中频，31 次及以上高频。")).toBeInTheDocument();
    expect(screen.getByText("have a positive influence")).toBeInTheDocument();
    expect(screen.getAllByText("修改前")[0]).toHaveClass("text-[var(--lt-muted)]");
    expect(screen.getAllByText("修改后")[0]).toHaveClass("text-[var(--lt-muted)]");
    expect(screen.queryByText("We not only face challenge")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /展开/u })).not.toBeInTheDocument();

    const deleteButton = screen.getAllByRole("button", { name: "删除此类写作习惯" })[0];
    expect(deleteButton).toHaveAttribute("data-icon-only", "true");
    expect(deleteButton).not.toHaveTextContent("删除此类");
    fireEvent.click(deleteButton);

    expect(onDeleteType).toHaveBeenCalledWith("chinese_transfer");
  });

  it("shows a readable empty state instead of a blank chart when there is no habit data", () => {
    render(<WritingHabitsPanel events={[]} onDeleteType={vi.fn()} />);

    const trendChart = screen.getByLabelText("写作习惯趋势图");
    expect(trendChart).toHaveAttribute("data-habit-chart-state", "empty");
    expect(screen.getByText("还没有近 7 天修正记录。")).toBeInTheDocument();
  });

  it("shows a temporary delete notice with corrected Chinese copy", () => {
    vi.useFakeTimers();
    try {
      render(<WritingHabitsPanel events={writingHabitEvents()} onDeleteType={vi.fn()} />);

      const deleteButton = getDeleteTypeButtons()[0];
      fireEvent.click(deleteButton);

      const notice = screen.getByRole("status");
      expect(notice).toHaveTextContent("已清理 chinese_transfer 本地修改记录。");
      expect(notice).toHaveTextContent("表达库不受影响。");

      act(() => {
        vi.advanceTimersByTime(2500);
      });
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("replaces the previous delete notice and resets the auto-dismiss timer", () => {
    vi.useFakeTimers();
    try {
      render(<WritingHabitsPanel events={writingHabitEvents()} onDeleteType={vi.fn()} />);
      const deleteButtons = getDeleteTypeButtons();

      fireEvent.click(deleteButtons[0]);
      expect(screen.getByRole("status")).toHaveTextContent("已清理 chinese_transfer 本地修改记录。");

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      fireEvent.click(deleteButtons[1]);
      expect(screen.getByRole("status")).toHaveTextContent("已清理 word_order 本地修改记录。");

      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByRole("status")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

function getDeleteTypeButtons(): HTMLElement[] {
  return screen.getAllByRole("button", { name: "删除此类写作习惯" });
}

function writingHabitEvents(): CorrectionEvent[] {
  return [
    event("a", "chinese_transfer", "We not only face challenge", "We face not only challenges", 20),
    event("b", "chinese_transfer", "bring a good influence", "have a positive influence", 11),
    event("c", "word_order", "innovation speed", "the speed of innovation", 11),
    event("d", "polishing", "in the future time", "in the future", 1),
  ];
}

function event(
  id: string,
  type: CorrectionEvent["type"],
  before: string,
  after: string,
  useCount: number,
): CorrectionEvent {
  return {
    id,
    before,
    after,
    type,
    reason: "Applied sentence improvement.",
    sourceSentence: before,
    writingMode: "natural",
    createdAt: `2026-05-1${id.charCodeAt(0) - 96}T10:00:00.000Z`,
    updatedAt: `2026-05-1${id.charCodeAt(0) - 96}T11:00:00.000Z`,
    useCount,
  };
}
