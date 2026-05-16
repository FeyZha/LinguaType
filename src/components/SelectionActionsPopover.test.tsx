import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { calculateSelectionPopoverPosition } from "./LinguaTypeApp";
import { SelectionActionsPopover } from "./SelectionActionsPopover";

describe("SelectionActionsPopover", () => {
  it("shows a compact toolbar before the user requests an explanation", () => {
    const onExplain = vi.fn();

    render(
      <SelectionActionsPopover
        selectedText="make a difference"
        position={{ left: 120, top: 80 }}
        isLoading={false}
        onExplain={onExplain}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const toolbar = document.querySelector('[data-selection-toolbar="true"]') as HTMLElement | null;
    expect(toolbar).not.toBeNull();
    expect(toolbar).toHaveAttribute("data-selection-toolbar", "true");
    expect(toolbar).toHaveStyle({
      left: "120px",
      top: "80px",
      transform: "translate(calc(-100% + 12px), calc(-100% - 8px))",
    });
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByText("make a difference")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onExplain).toHaveBeenCalledTimes(1);
  });

  it("renders the explanation content in a compact floating panel", () => {
    render(
      <SelectionActionsPopover
        selectedText="make a difference"
        position={{ left: 120, top: 80 }}
        explanation={{
          selectedText: "make a difference",
          meaningZh: "meaning body",
          usageNoteZh: "usage body",
          contextRoleZh: "context body",
          expressionType: "phrase",
        }}
        isLoading={false}
        onExplain={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("make a difference")).toBeInTheDocument();
    expect(screen.getByText("meaning body")).toBeInTheDocument();
    expect(screen.getByText("usage body")).toBeInTheDocument();
    expect(screen.getByText("context body")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    expect(document.querySelector('[data-selection-toolbar="true"]')).toHaveStyle({
      left: "120px",
      top: "80px",
      transform: "translate(calc(-100% + 12px), calc(-100% - 8px))",
    });
  });

  it("places the popup close to the selection focus edge", () => {
    const containerRect = new DOMRect(40, 20, 720, 420);
    const anchorRect = new DOMRect(360, 180, 120, 24);
    const position = calculateSelectionPopoverPosition(anchorRect, containerRect);

    expect(position.left).toBe(480);
    expect(position.top).toBe(180);
  });

  it("keeps the popup inside the viewport when the focus edge is near the right side", () => {
    vi.stubGlobal("innerWidth", 640);
    const containerRect = new DOMRect(40, 20, 720, 420);
    const anchorRect = new DOMRect(580, 180, 24, 24);
    const position = calculateSelectionPopoverPosition(anchorRect, containerRect);

    expect(position.left).toBe(604);
    expect(position.top).toBe(180);
    vi.unstubAllGlobals();
  });
});
