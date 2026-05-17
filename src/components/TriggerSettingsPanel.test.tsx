import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TriggerSettingsPanel } from "./TriggerSettingsPanel";
import { defaultTriggerSettings, type TriggerSettings } from "@/lib/storage";

describe("TriggerSettingsPanel", () => {
  it("shows update messages when changing existing trigger controls", () => {
    const onChange = vi.fn();
    const settings: TriggerSettings = {
      ...defaultTriggerSettings(),
    };

    render(<TriggerSettingsPanel settings={settings} onChange={onChange} />);

    fireEvent.click(screen.getByRole("combobox", { name: "句子增强触发模式" }));
    fireEvent.click(screen.getByRole("option", { name: "按钮触发" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultTriggerSettings(),
      sentenceEnhancementShortcut: "button_only",
    });

    onChange.mockReset();
    fireEvent.click(screen.getByRole("combobox", { name: "段落健康触发模式" }));
    fireEvent.click(screen.getByRole("option", { name: "段落完成后" }));
    expect(onChange).toHaveBeenCalledWith({
      ...defaultTriggerSettings(),
      paragraphHealthTrigger: "after_paragraph_complete",
    });
  });

  it("adds the article map auto check modes and defaults to auto_idle", () => {
    const onChange = vi.fn();
    const settings: TriggerSettings = {
      ...defaultTriggerSettings(),
    };

    render(<TriggerSettingsPanel settings={settings} onChange={onChange} />);

    const autoSelect = screen.getByRole("combobox", { name: "文章地图自动检查模式" });
    expect(autoSelect).toHaveTextContent("安静时预检查");
    fireEvent.click(autoSelect);
    fireEvent.click(screen.getByRole("option", { name: "仅提醒" }));

    expect(onChange).toHaveBeenCalledWith({
      ...defaultTriggerSettings(),
      documentMapAutoCheck: "remind_only",
    });
  });
});
