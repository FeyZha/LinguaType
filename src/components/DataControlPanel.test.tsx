import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataControlPanel } from "./DataControlPanel";
import {
  CORRECTION_EVENTS_STORAGE_KEY,
  LEARNING_LIBRARY_STORAGE_KEY,
} from "@/lib/storage";
import type { LearningItem } from "@/lib/llm/types";

const defaultLearningItem: LearningItem[] = [];

describe("DataControlPanel", () => {
  it("clears learning library only after confirm and shows scoped feedback", () => {
    const onClearLearningLibrary = vi.fn();
    const onClearWritingHabits = vi.fn();
    const onResetApiSettings = vi.fn();

    render(
      <DataControlPanel
        learningLibrary={defaultLearningItem}
        correctionEvents={[]}
        onClearLearningLibrary={onClearLearningLibrary}
        onClearWritingHabits={onClearWritingHabits}
        onResetApiSettings={onResetApiSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清空表达库" }));
    expect(onClearLearningLibrary).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认清空表达库" }));
    expect(onClearLearningLibrary).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("localStorage key");
    expect(screen.getByRole("status")).toHaveTextContent(LEARNING_LIBRARY_STORAGE_KEY);
    expect(screen.getByRole("status")).not.toHaveTextContent(CORRECTION_EVENTS_STORAGE_KEY);
    expect(onClearWritingHabits).not.toHaveBeenCalled();
  });

  it("clears writing habits only after confirm and shows scoped feedback", () => {
    const onClearLearningLibrary = vi.fn();
    const onClearWritingHabits = vi.fn();
    const onResetApiSettings = vi.fn();

    render(
      <DataControlPanel
        learningLibrary={defaultLearningItem}
        correctionEvents={[]}
        onClearLearningLibrary={onClearLearningLibrary}
        onClearWritingHabits={onClearWritingHabits}
        onResetApiSettings={onResetApiSettings}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清空写作习惯" }));
    expect(onClearWritingHabits).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认清空写作习惯" }));
    expect(onClearWritingHabits).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("localStorage key");
    expect(screen.getByRole("status")).toHaveTextContent(CORRECTION_EVENTS_STORAGE_KEY);
    expect(screen.getByRole("status")).not.toHaveTextContent(LEARNING_LIBRARY_STORAGE_KEY);
    expect(onClearLearningLibrary).not.toHaveBeenCalled();
  });

  it("shows failed message when clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("copy failed"));
    const originalClipboard = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    try {
      render(
        <DataControlPanel
          learningLibrary={defaultLearningItem}
          correctionEvents={[]}
          onClearLearningLibrary={vi.fn()}
          onClearWritingHabits={vi.fn()}
          onResetApiSettings={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "导出表达库 JSON" }));
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("表达库 JSON 复制失败，请稍后重试。");
      });
      expect(writeText).toHaveBeenCalledTimes(1);
    } finally {
      if (originalClipboard) {
        Object.defineProperty(window.navigator, "clipboard", originalClipboard);
      }
    }
  });

  it("shows unsupported message when clipboard API is unavailable", async () => {
    const originalClipboard = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");

    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    try {
      render(
        <DataControlPanel
          learningLibrary={defaultLearningItem}
          correctionEvents={[]}
          onClearLearningLibrary={vi.fn()}
          onClearWritingHabits={vi.fn()}
          onResetApiSettings={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "导出表达库 JSON" }));
      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("当前环境不支持剪贴板，无法复制表达库 JSON。");
      });
    } finally {
      if (originalClipboard) {
        Object.defineProperty(window.navigator, "clipboard", originalClipboard);
      }
    }
  });
});
