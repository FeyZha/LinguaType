"use client";

import { useEffect, useMemo, useState } from "react";
import type { LearningItem, WritingMode } from "@/lib/llm/types";

type WritingIntention =
  | "explain_reason"
  | "show_result"
  | "give_example"
  | "add_contrast"
  | "make_concession"
  | "summarize_point";

const INTENTIONS: Array<{ value: WritingIntention; label: string; helper: string }> = [
  { value: "explain_reason", label: "Explain reason", helper: "If you want to explain a reason, you can use:" },
  { value: "show_result", label: "Show result", helper: "If you want to show a result, you can use:" },
  { value: "give_example", label: "Give example", helper: "If you want to give an example, you can use:" },
  { value: "add_contrast", label: "Add contrast", helper: "If you want to add contrast, you can use:" },
  { value: "make_concession", label: "Make concession", helper: "If you want to make a concession, you can use:" },
  { value: "summarize_point", label: "Summarize point", helper: "If you want to summarize a point, you can use:" },
];

const TEMPLATES: Record<WritingIntention, string[]> = {
  explain_reason: ["This may be because...", "One possible reason is that...", "This can be explained by..."],
  show_result: ["As a result, ...", "This may lead to...", "Over time, this can..."],
  give_example: ["For example, ...", "A typical example is...", "This can be seen in..."],
  add_contrast: ["However, ...", "In contrast, ...", "This does not necessarily mean that..."],
  make_concession: ["Admittedly, ...", "It is true that...", "This does not mean that..."],
  summarize_point: ["Therefore, ...", "In this sense, ...", "Overall, this suggests that..."],
};

type View = "root" | "templates" | "library";

type InlineExpressionMenuProps = {
  open: boolean;
  library: LearningItem[];
  writingMode: WritingMode;
  onClose: () => void;
  onInsert: (content: string) => void;
  onCheckParagraph: () => void;
};

export function InlineExpressionMenu({
  open,
  library,
  writingMode,
  onClose,
  onInsert,
  onCheckParagraph,
}: InlineExpressionMenuProps) {
  const [view, setView] = useState<View>("root");
  const [intention, setIntention] = useState<WritingIntention>("explain_reason");
  const [query, setQuery] = useState("");
  const recalled = useMemo(
    () => recallLearningItems(library, writingMode, query).slice(0, 8),
    [library, query, writingMode],
  );
  const currentIntention = INTENTIONS.find((item) => item.value === intention) ?? INTENTIONS[0];

  useEffect(() => {
    if (open) {
      setView("root");
      setQuery("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute bottom-14 right-4 z-20 w-[min(360px,calc(100%-2rem))] rounded-md border border-slate-200 bg-white p-3 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Inline Expression Menu</h2>
          <p className="mt-1 text-xs text-slate-500">Local expression tools. LLM off.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inline expression menu"
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          Esc
        </button>
      </div>

      {view === "root" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {INTENTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setIntention(item.value);
                setView("templates");
              }}
              className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setView("library")}
            className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Insert from Library
          </button>
          <button
            type="button"
            onClick={onCheckParagraph}
            className="rounded-md border border-slate-300 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Check this paragraph
          </button>
        </div>
      ) : null}

      {view === "templates" ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => setView("root")}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <p className="text-xs text-slate-500">{currentIntention.helper}</p>
          {TEMPLATES[intention].map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => onInsert(template)}
              className="block w-full rounded-md bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:bg-skysoft/60"
            >
              {template}
            </button>
          ))}
        </div>
      ) : null}

      {view === "library" ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => setView("root")}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          >
            Back
          </button>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search library"
            aria-label="Search inline library"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          />
          {recalled.length === 0 ? (
            <p className="rounded bg-slate-50 p-3 text-xs text-slate-500">
              No library expression yet.
            </p>
          ) : (
            recalled.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onInsert(item.content)}
                className="block w-full rounded-md bg-slate-50 px-3 py-2 text-left text-sm text-slate-800 hover:bg-skysoft/60"
              >
                {item.content}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function recallLearningItems(
  items: LearningItem[],
  writingMode: WritingMode,
  query: string,
): LearningItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return [...items]
    .filter((item) => {
      if (!normalizedQuery) {
        return true;
      }
      return `${item.content} ${item.chineseMeaning}`.toLowerCase().includes(normalizedQuery);
    })
    .sort((a, b) => {
      const favoriteScore = Number(b.favorite) - Number(a.favorite);
      if (favoriteScore !== 0) {
        return favoriteScore;
      }
      const modeScore = Number(b.writingMode === writingMode) - Number(a.writingMode === writingMode);
      if (modeScore !== 0) {
        return modeScore;
      }
      return b.useCount - a.useCount || b.updatedAt.localeCompare(a.updatedAt);
    });
}
