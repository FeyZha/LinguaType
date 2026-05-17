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

    expect(container.querySelector("[data-welcome-brand-mark]")).toHaveAttribute(
      "src",
      "/brand/linguatype-mark-light.png",
    );
    expect(screen.getByAltText("LinguaType")).toHaveAttribute("src", "/brand/linguatype-wordmark-light.png");

    rerender(<WelcomeScreen theme="dark" onStart={vi.fn()} />);

    expect(container.querySelector("[data-welcome-brand-mark]")).toHaveAttribute(
      "src",
      "/brand/linguatype-mark-dark.png",
    );
    expect(screen.getByAltText("LinguaType")).toHaveAttribute("src", "/brand/linguatype-wordmark-dark.png");
  });

  it("presents formal product copy and starts the demo archive", () => {
    const onStart = vi.fn();
    render(<WelcomeScreen theme="light" onStart={onStart} />);

    expect(screen.getByText("产品定位")).toBeInTheDocument();
    expect(
      screen.getByText(
        "围绕中文母语者的英文写作过程，提供中英文混合改写、英文句子润色、修改差异解释、表达沉淀、写作存档与文章地图检查；模型输出始终先作为建议呈现，由用户确认后再应用。",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开示例文档" }));

    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
