"use client";

import { useMemo, useState } from "react";
import type { LearningItem, LearningItemType, WritingMode } from "@/lib/llm/types";
import { exportLearningLibraryJson, filterLearningLibrary } from "@/lib/storage";

const TYPE_LABELS: Record<LearningItemType, string> = {
  phrase: "短语 Phrase",
  collocation: "搭配 Collocation",
  sentence_pattern: "句型 Sentence pattern",
};

const WRITING_MODE_LABELS: Record<WritingMode, string> = {
  natural: "Natural",
  ielts: "IELTS",
  academic: "Academic",
  business: "Business",
  concise: "Concise",
};

type LearningLibraryPanelProps = {
  items: LearningItem[];
  writingMode: WritingMode;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onInsert: (content: string) => void;
};

export function LearningLibraryPanel({
  items,
  writingMode,
  onDelete,
  onToggleFavorite,
  onInsert,
}: LearningLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LearningItemType | "all">("all");
  const [mode, setMode] = useState<WritingMode | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"updatedAt" | "useCount">("updatedAt");
  const [exportMessage, setExportMessage] = useState("");

  const visibleItems = useMemo(
    () => filterLearningLibrary(items, { query, type, writingMode: mode, favoriteOnly, sortBy }),
    [favoriteOnly, items, mode, query, sortBy, type],
  );

  async function exportJson() {
    const json = exportLearningLibraryJson(items);
    await navigator.clipboard?.writeText(json);
    setExportMessage("Learning Library JSON 已复制。");
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">表达库</h2>
          <p className="mt-1 text-xs text-slate-500">保存你认可过、以后可复用的表达。</p>
        </div>
        <button
          type="button"
          onClick={exportJson}
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        >
          导出 JSON
        </button>
      </div>
      {exportMessage ? <p className="mt-2 text-xs text-emerald-700">{exportMessage}</p> : null}
      <div className="mt-3 grid gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索表达或中文含义"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-moss"
          aria-label="搜索 Learning Library"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as LearningItemType | "all")}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            aria-label="按表达类型筛选"
          >
            <option value="all">全部类型</option>
            <option value="phrase">短语 Phrase</option>
            <option value="collocation">搭配 Collocation</option>
            <option value="sentence_pattern">句型 Sentence pattern</option>
          </select>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as WritingMode | "all")}
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            aria-label="按写作模式筛选"
          >
            <option value="all">全部模式</option>
            {(Object.keys(WRITING_MODE_LABELS) as WritingMode[]).map((item) => (
              <option key={item} value={item}>
                {WRITING_MODE_LABELS[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={favoriteOnly}
              onChange={(event) => setFavoriteOnly(event.target.checked)}
            />
            只看收藏
          </label>
          <button
            type="button"
            onClick={() => setSortBy("updatedAt")}
            className={`rounded border px-2 py-1 ${sortBy === "updatedAt" ? "border-moss text-moss" : "border-slate-300"}`}
          >
            最近更新
          </button>
          <button
            type="button"
            onClick={() => setSortBy("useCount")}
            className={`rounded border px-2 py-1 ${sortBy === "useCount" ? "border-moss text-moss" : "border-slate-300"}`}
          >
            使用次数
          </button>
        </div>
      </div>
      {visibleItems.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">应用 句子建议后，有价值的表达会保存到这里。</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {visibleItems.map((item) => (
            <li key={item.id} className="rounded-md bg-slate-50 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-slate-900">{item.content}</div>
                  <div className="mt-1 text-slate-600">{item.chineseMeaning}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(item.id)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  {item.favorite ? "已收藏" : "收藏"}
                </button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-600">{item.usageNote}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                <span>{TYPE_LABELS[item.type]}</span>
                <span>{WRITING_MODE_LABELS[item.writingMode]}</span>
                <span>使用 {item.useCount} 次</span>
                {item.writingMode === writingMode ? <span>当前模式</span> : null}
              </div>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{item.sourceSentence}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onInsert(item.content)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  插入
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(item.content)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-white"
                >
                  复制
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
