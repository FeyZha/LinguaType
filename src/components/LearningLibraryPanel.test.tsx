import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { LearningItem } from "@/lib/llm/types";
import { LearningLibraryPanel } from "./LearningLibraryPanel";

const ITEM: LearningItem = {
  id: "item-1",
  type: "collocation",
  content: "make a decision",
  chineseMeaning: "A common collocation for making choices.",
  usageNote: "Use this collocation to introduce a clear action.",
  difficultyLevel: 2,
  tags: [],
  sourceSentence: "You need to make a decision quickly.",
  writingMode: "natural",
  createdAt: "2026-05-01T08:00:00.000Z",
  updatedAt: "2026-05-01T08:01:00.000Z",
  useCount: 1,
  favorite: false,
};

type PanelHandlerOverrides = {
  personalDictionary?: string[];
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onInsert?: (content: string) => void;
  onPersonalDictionaryChange?: (terms: string[]) => void;
};

function renderPanel(overrides: PanelHandlerOverrides = {}) {
  const personalDictionary = overrides.personalDictionary ?? [];
  const onPersonalDictionaryChange = overrides.onPersonalDictionaryChange ?? vi.fn();
  const onDelete = overrides.onDelete ?? vi.fn();
  const onToggleFavorite = overrides.onToggleFavorite ?? vi.fn();
  const onInsert = overrides.onInsert ?? vi.fn();
  const props = {
    items: [ITEM],
    personalDictionary,
    onPersonalDictionaryChange,
    onDelete,
    onToggleFavorite,
    onInsert,
  };

  const result = render(<LearningLibraryPanel {...props} />);
  return { ...result, onDelete, onToggleFavorite, onInsert, onPersonalDictionaryChange };
}

function switchToDictionaryTab() {
  fireEvent.click(screen.getByRole("button", { name: "个人词典" }));
}

beforeEach(() => {
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LearningLibraryPanel", () => {
  it("lays accumulated expressions out as compact cards", () => {
    const { container } = renderPanel();

    const grid = container.querySelector("[data-library-layout='compact-card-grid']");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("grid-cols-[repeat(auto-fill,minmax(260px,1fr))]");
    expect(grid).toHaveClass("auto-rows-[420px]");
    expect(container.querySelector("[data-library-card='compact']")).toHaveClass("h-full");
  });

  it("opens the full source inside the card without changing the card footprint", () => {
    const { container } = renderPanel();

    const card = container.querySelector("[data-library-card='compact']");
    const sourcePreview = container.querySelector("[data-library-source-preview='item-1']");
    expect(card).toHaveClass("h-full");
    expect(sourcePreview).toBeInTheDocument();

    fireEvent.click(sourcePreview as Element);

    expect(container.querySelector("[data-library-source-detail='open']")).toBeInTheDocument();
    expect(card).toHaveClass("h-full");
  });

  it("keeps item actions in the same lightweight footer as metadata", () => {
    const { container } = renderPanel();

    const footer = container.querySelector("[data-library-actions-layout='inline-footer']");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass("border-t");
    expect(footer).not.toHaveClass("justify-between");
    expect(footer?.querySelectorAll("button")).toHaveLength(3);
  });

  it("shows action feedback when copying a learning item", async () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "复制" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(ITEM.content);
    expect(await screen.findByRole("status")).toHaveTextContent("表达已复制");
    expect(await screen.findByText(ITEM.content)).toBeInTheDocument();
  });

  it("shows action feedback when inserting and toggling favorite", () => {
    const onInsert = vi.fn();
    const onToggleFavorite = vi.fn();
    renderPanel({ onInsert, onToggleFavorite });

    fireEvent.click(screen.getByRole("button", { name: "插入当前稿件" }));
    expect(onInsert).toHaveBeenCalledWith(ITEM.content);
    expect(screen.getByRole("status")).toHaveTextContent(ITEM.content);

    fireEvent.click(screen.getByRole("button", { name: `收藏 ${ITEM.content}` }));
    expect(onToggleFavorite).toHaveBeenCalledWith(ITEM.id);
    expect(screen.getByRole("status")).toHaveTextContent(ITEM.content);
  });

  it("shows action feedback when deleting an item", () => {
    const onDelete = vi.fn();
    renderPanel({ onDelete });

    fireEvent.click(screen.getByRole("button", { name: "删除" }));

    expect(onDelete).toHaveBeenCalledWith(ITEM.id);
    expect(screen.getByRole("status")).toHaveTextContent(ITEM.content);
  });

  it("shows action feedback and callback when add personal dictionary succeeds", () => {
    const onPersonalDictionaryChange = vi.fn();
    renderPanel({ personalDictionary: [], onPersonalDictionaryChange });
    switchToDictionaryTab();

    fireEvent.change(screen.getByLabelText("添加个人词典项"), {
      target: { value: " LinguaType " },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加词典项" }));

    expect(onPersonalDictionaryChange).toHaveBeenCalledWith(["LinguaType"]);
    expect(screen.getByRole("status")).toHaveTextContent("LinguaType");
  });

  it("shows clear feedback without saving when adding an empty dictionary term", () => {
    const onPersonalDictionaryChange = vi.fn();
    renderPanel({ personalDictionary: ["LinguaType"], onPersonalDictionaryChange });
    switchToDictionaryTab();

    fireEvent.change(screen.getByLabelText("添加个人词典项"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "添加词典项" }));

    expect(onPersonalDictionaryChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("请输入词条。");
  });

  it("shows action feedback when deleting a personal dictionary term", () => {
    const onPersonalDictionaryChange = vi.fn();
    renderPanel({ personalDictionary: ["LinguaType"], onPersonalDictionaryChange });
    switchToDictionaryTab();

    fireEvent.click(screen.getByRole("button", { name: "删除 LinguaType" }));

    expect(onPersonalDictionaryChange).toHaveBeenCalledWith([]);
    expect(screen.getByRole("status")).toHaveTextContent("LinguaType");
  });
});
