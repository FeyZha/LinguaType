import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SelectionActionsPopover } from "./SelectionActionsPopover";

describe("SelectionActionsPopover", () => {
  it("uses Chinese-only labels, dynamic position, and structured explanation", () => {
    render(
      <SelectionActionsPopover
        selectedText="make a difference"
        position={{ left: 120, top: 80 }}
        explanation={{
          selectedText: "make a difference",
          meaningZh: "产生影响",
          usageNoteZh: "用于说明某事带来实际影响。",
          contextRoleZh: "这里强调行动的结果。",
          expressionType: "phrase",
        }}
        isLoading={false}
        onExplain={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("选中文本操作")).toBeInTheDocument();
    expect(screen.queryByText(/Selection Actions/u)).not.toBeInTheDocument();
    expect(screen.getByText("含义")).toBeInTheDocument();
    expect(screen.getByText("用法")).toBeInTheDocument();
    expect(screen.getByText("语境作用")).toBeInTheDocument();
    expect(screen.getByText("表达类型")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "保存到表达库" })).toBeInTheDocument();
    expect(screen.getByLabelText("关闭选中文本操作").closest("section")).toHaveStyle({
      left: "120px",
      top: "80px",
    });
  });
});
