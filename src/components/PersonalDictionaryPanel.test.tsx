import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PersonalDictionaryPanel } from "./PersonalDictionaryPanel";

describe("PersonalDictionaryPanel", () => {
  it("adds and removes normalized local dictionary terms", () => {
    const onChange = vi.fn();
    render(<PersonalDictionaryPanel terms={["LinguaType"]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("添加个人词典项"), {
      target: { value: " DeepSeek " },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加词典项" }));

    expect(onChange).toHaveBeenCalledWith(["LinguaType", "DeepSeek"]);

    fireEvent.click(screen.getByRole("button", { name: "删除 LinguaType" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
