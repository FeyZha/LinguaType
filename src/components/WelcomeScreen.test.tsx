import { fireEvent, render, screen } from "@testing-library/react";
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
    const onStart = vi.fn();
    render(<WelcomeScreen theme="light" onStart={onStart} />);

    expect(screen.getByText("产品定位")).toBeInTheDocument();
    expect(
      screen.getByText(
        "把中文思路稳稳写成自然英文。LinguaType 像贴在光标旁的写作搭档：卡住时帮你把中英混合句改顺，写完后带你看清每一次修改，沉淀可复用表达，再用文章地图检查全文结构。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开示例文档" }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
