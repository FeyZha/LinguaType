"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDismissableLayer } from "./useDismissableLayer";
import type { LearningItem } from "@/lib/llm/types";

type WritingIntention =
  | "explain_reason"
  | "show_result"
  | "give_example"
  | "add_contrast"
  | "make_concession"
  | "summarize_point";

const INTENTIONS: Array<{ value: WritingIntention; label: string; helper: string }> = [
  {
    value: "explain_reason",
    label: "解释原因",
    helper: "适合想确认逻辑关系时使用。",
  },
  {
    value: "show_result",
    label: "展示结果",
    helper: "适合补充说明句子后续含义。",
  },
  {
    value: "give_example",
    label: "给出示例",
    helper: "适合补充可直接套用的表达。",
  },
  {
    value: "add_contrast",
    label: "补充对比",
    helper: "适合插入转折或对立关系。",
  },
  {
    value: "make_concession",
    label: "加入让步",
    helper: "适合加上有条件的缓和表达。",
  },
  {
    value: "summarize_point",
    label: "总结要点",
    helper: "适合给段落句子做简明收束。",
  },
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
  onClose: () => void;
  onInsert: (content: string) => void;
  onCheckParagraph: () => void;
};

export function InlineExpressionMenu({
  open,
  library,
  onClose,
  onInsert,
  onCheckParagraph,
}: InlineExpressionMenuProps) {
  const [view, setView] = useState<View>("root");
  const [intention, setIntention] = useState<WritingIntention>("explain_reason");
  const [query, setQuery] = useState("");
  const layerRef = useRef<HTMLDivElement | null>(null);
  useDismissableLayer(layerRef, onClose, open);
  const recalled = useMemo(
    () => recallLearningItems(library, query).slice(0, 8),
    [library, query],
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
    <div className="absolute bottom-14 right-4 z-20 w-[min(360px,calc(100%-2rem))] rounded-lg bg-[#f7f4ed] p-3 text-[#1c1c1c] shadow-[0_16px_48px_rgba(28,28,28,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">表达菜单</h2>
          <p className="mt-1 text-xs text-slate-500">本地表达工具，不会默认调用 LLM。</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭表达菜单"
          className="rounded-md bg-black/[0.035] px-2 py-1 text-xs text-[#1c1c1c]/55 transition hover:bg-black/[0.06] hover:text-[#1c1c1c]"
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
              className="rounded-md bg-black/[0.035] px-3 py-2 text-left text-xs font-medium text-[#1c1c1c]/68 transition hover:bg-black/[0.06] hover:text-[#1c1c1c]"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setView("library")}
            className="rounded-md bg-black/[0.035] px-3 py-2 text-left text-xs font-medium text-[#1c1c1c]/68 transition hover:bg-black/[0.06] hover:text-[#1c1c1c]"
          >
            从表达库插入
          </button>
          <button
            type="button"
            onClick={onCheckParagraph}
            className="rounded-md bg-black/[0.035] px-3 py-2 text-left text-xs font-medium text-[#1c1c1c]/68 transition hover:bg-black/[0.06] hover:text-[#1c1c1c]"
          >
            检查本段
          </button>
        </div>
      ) : null}

      {view === "templates" ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => setView("root")}
            className="rounded-md bg-black/[0.035] px-2 py-1 text-xs text-[#1c1c1c]/55 transition hover:bg-black/[0.06] hover:text-[#1c1c1c]"
          >
            返回
          </button>
          <p className="text-xs text-slate-500">{currentIntention.helper}</p>
          {TEMPLATES[intention].map((template) => (
            <button
              key={template}
              type="button"
              onClick={() => onInsert(template)}
              className="block w-full rounded-md bg-black/[0.025] px-3 py-2 text-left text-sm text-[#1c1c1c]/72 transition hover:bg-black/[0.05] hover:text-[#1c1c1c]"
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
            className="rounded-md bg-black/[0.035] px-2 py-1 text-xs text-[#1c1c1c]/55 transition hover:bg-black/[0.06] hover:text-[#1c1c1c]"
          >
            返回
          </button>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索表达库"
            aria-label="搜索表达库"
            className="w-full rounded-md bg-black/[0.035] px-3 py-2 text-sm text-[#1c1c1c]/75 outline-none transition placeholder:text-[#1c1c1c]/35 focus:bg-[#fcfbf8] focus:ring-1 focus:ring-black/10"
          />
          {recalled.length === 0 ? (
            <p className="rounded-md bg-black/[0.025] p-3 text-xs text-[#1c1c1c]/50">暂无匹配表达。</p>
          ) : (
            recalled.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onInsert(item.content)}
                className="block w-full rounded-md bg-black/[0.025] px-3 py-2 text-left text-sm text-[#1c1c1c]/72 transition hover:bg-black/[0.05] hover:text-[#1c1c1c]"
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
      return b.useCount - a.useCount || b.updatedAt.localeCompare(a.updatedAt);
    });
}
