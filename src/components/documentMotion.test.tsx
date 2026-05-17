import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WRITING_ARCHIVES_STORAGE_KEY } from "@/lib/storage";
import { LinguaTypeApp } from "./LinguaTypeApp";

vi.mock("animejs/waapi", () => ({
  waapi: {
    animate: vi.fn((targets: HTMLElement | HTMLElement[], parameters: Record<string, unknown>) => {
      const elements = Array.isArray(targets) ? targets : [targets];
      for (const element of elements) {
        if (!(element instanceof HTMLElement)) {
          continue;
        }
        const transform = parameters.transform;
        const filter = parameters.filter;
        const opacity = parameters.opacity;
        if (Array.isArray(transform)) {
          element.style.transform = String(transform.at(-1));
        }
        if (Array.isArray(filter)) {
          element.style.filter = String(filter.at(-1));
        }
        if (Array.isArray(opacity)) {
          element.style.opacity = String(opacity.at(-1));
        }
      }
    }),
  },
}));

vi.mock("animejs/utils", () => ({
  stagger: vi.fn(() => 0),
}));

const originalAnimate = HTMLElement.prototype.animate;

function makeArchive(id: string, title: string, text: string) {
  const now = "2026-05-18T00:00:00.000Z";
  return {
    id,
    title,
    text,
    setup: {
      topicArea: "custom",
      customTopicArea: "自定义",
      essayTopic: title,
      outlinePoints: [],
      outline: "",
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn());
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
  Object.defineProperty(HTMLElement.prototype, "animate", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  if (originalAnimate) {
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: originalAnimate,
    });
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "animate");
  }
});

describe("LinguaType document motion", () => {
  it("clears writing surface transform styles so the fixed bottom status bar keeps viewport positioning", async () => {
    localStorage.setItem(
      WRITING_ARCHIVES_STORAGE_KEY,
      JSON.stringify({
        activeId: "first",
        items: [
          makeArchive("first", "First archive", "First archive sentence."),
          makeArchive("second", "Second archive", "Second archive sentence."),
        ],
      }),
    );

    render(<LinguaTypeApp />);

    expect(await screen.findByLabelText("写作编辑器")).toBeInTheDocument();
    const writingSurface = screen.getByLabelText("沉浸式写作区") as HTMLElement;

    vi.useFakeTimers();
    const switchArchiveButton = screen
      .getAllByRole("button", { name: /Second archive/u })
      .find((button) => !button.getAttribute("aria-label"));
    expect(switchArchiveButton).toBeTruthy();
    fireEvent.click(switchArchiveButton as HTMLButtonElement);

    expect(writingSurface.style.transform).toBe("translateX(0px) rotateY(0deg)");
    expect(writingSurface.style.filter).toBe("blur(0px)");
    expect(screen.getByRole("contentinfo")).toHaveClass(
      "fixed",
      "bottom-0",
      "right-0",
      "xl:left-[var(--lt-sidebar-width,320px)]",
    );

    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(writingSurface.style.transform).toBe("");
    expect(writingSurface.style.filter).toBe("");
    expect(writingSurface.style.opacity).toBe("");
  });
});
