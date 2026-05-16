import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { defaultTriggerSettings, type TriggerSettings } from "@/lib/storage";

describe("TriggerSettingsPanel", () => {
  it("shows lightweight save feedback after changing trigger values", () => {
    const onChange = vi.fn();
    const settings: TriggerSettings = {
      ...defaultTriggerSettings(),
    };

    render(<TriggerSettingsPanel settings={settings} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "句子增强触发方式" }));
    fireEvent.click(screen.getByRole("option", { name: "按钮触发" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultTriggerSettings(),
      sentenceEnhancementShortcut: "button_only",
    });
    expect(screen.getByRole("status")).toBeTruthy();

    onChange.mockReset();

    fireEvent.click(screen.getByRole("combobox", { name: "段落健康触发方式" }));
    fireEvent.click(screen.getByRole("option", { name: "每次应用后" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultTriggerSettings(),
      paragraphHealthTrigger: "after_every_apply",
    });
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
