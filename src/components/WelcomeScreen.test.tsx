import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WelcomeScreen } from "./WelcomeScreen";

vi.mock("animejs/waapi", () => ({
  waapi: {
    animate: vi.fn(),
  },
}));

vi.mock("animejs/utils", () => ({
  stagger: vi.fn(() => 0),
}));

describe("WelcomeScreen", () => {
  it("uses visible brand assets for the resolved theme", () => {
    const { container, rerender } = render(<WelcomeScreen theme="light" onStart={vi.fn()} />);

    expect(container.querySelector("[data-welcome-brand-mark]")).not.toBeInTheDocument();
    expect(screen.getByAltText("LinguaType")).toHaveAttribute("src", "/brand/linguatype-wordmark-light.png");
    expect(screen.getByAltText("LinguaType")).toHaveClass("h-16");

    rerender(<WelcomeScreen theme="dark" onStart={vi.fn()} />);

    expect(container.querySelector("[data-welcome-brand-mark]")).not.toBeInTheDocument();
    expect(screen.getByAltText("LinguaType")).toHaveAttribute("src", "/brand/linguatype-wordmark-dark.png");
  });

  it("presents formal product copy and starts the demo archive", () => {
    vi.useFakeTimers();
    const onStart = vi.fn();

    try {
      render(<WelcomeScreen theme="light" onStart={onStart} />);

      const positioningLabel = screen.getByText("产品定位");
      const heading = screen.getByRole("heading", { name: "用中文思路，写出自然英文" });
      const positioningBody = screen.getByText(
        "LinguaType 是一款面向中文母语者的英文写作辅助工具。你可以先用中英混合写下想法，再在原文位置附近获得自然英文改写、修改解释和表达沉淀，让每一次写作都变成可积累的英文表达训练。",
      );
      const preview = screen.getByLabelText("快速使用说明");

      expect(positioningLabel).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(positioningBody).toBeInTheDocument();
      expect(preview).toHaveAttribute("data-welcome-live-motion", "staggered-preview");
      expect(screen.getByText("文章地图 · 可检查")).toHaveClass("lt-welcome-map-status");
      expect(screen.getByText("I cannot clearly 表达这个观点 in English.")).toHaveClass("lt-welcome-caret");
      expect(screen.getByText("建议会出现在当前句附近。你先看差异，再决定是否采纳。")).toHaveClass(
        "lt-welcome-suggestion-card",
      );
      expect(screen.getByText("英文句子润色")).toHaveClass("lt-welcome-feature-card");
      expect(heading.compareDocumentPosition(positioningLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(positioningLabel.compareDocumentPosition(positioningBody) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "打开示例文档" }));

      expect(screen.getByRole("main", { name: "LinguaType 欢迎页" })).toHaveAttribute(
        "data-welcome-state",
        "leaving",
      );
      expect(screen.getByRole("button", { name: "正在打开..." })).toBeDisabled();
      expect(onStart).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onStart).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
