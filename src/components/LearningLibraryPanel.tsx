"use client";

import { useMemo, useState } from "react";
import {
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  StarIcon,
  TrashIcon,
} from "./HeroIcons";
import { DesignSelect } from "./DesignSelect";
import type { LearningItem, LearningItemType } from "@/lib/llm/types";
import { exportLearningLibraryJson, filterLearningLibrary, type LearningItemDifficulty } from "@/lib/storage";
import { normalizePersonalDictionary } from "@/lib/proofreading";

const TYPE_LABELS: Record<LearningItemType, string> = {
  phrase: "短语",
  collocation: "搭配",
  sentence_pattern: "句型",
};

type LibraryTypeFilter = LearningItemType | "all" | "dictionary";
type DifficultyFilter = LearningItemDifficulty | "all";

type LearningLibraryPanelProps = {
  items: LearningItem[];
  personalDictionary: string[];
  onPersonalDictionaryChange: (terms: string[]) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onInsert: (content: string) => void;
};

export function LearningLibraryPanel({
  items,
  personalDictionary,
  onPersonalDictionaryChange,
  onDelete,
  onToggleFavorite,
  onInsert,
}: LearningLibraryPanelProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryTypeFilter>("all");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyFilter>("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"updatedAt" | "useCount">("updatedAt");
  const [exportMessage, setExportMessage] = useState("");
  const [dictionaryDraft, setDictionaryDraft] = useState("");

  const visibleItems = useMemo(
    () =>
      type === "dictionary"
        ? []
        : filterLearningLibrary(items, {
            query,
            type,
            difficultyLevel,
            favoriteOnly,
            sortBy,
          }),
    [difficultyLevel, favoriteOnly, items, query, sortBy, type],
  );

  const dictionaryTerms = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return personalDictionary;
    }
    return personalDictionary.filter((term) => term.toLowerCase().includes(normalizedQuery));
  }, [personalDictionary, query]);

  async function exportJson() {
    const json = exportLearningLibraryJson(items);
    await navigator.clipboard?.writeText(json);
    setExportMessage("Learning Library JSON 已复制。");
  }

  function addDictionaryTerm() {
    const next = normalizePersonalDictionary([...personalDictionary, dictionaryDraft]);
    onPersonalDictionaryChange(next);
    setDictionaryDraft("");
  }

  function removeDictionaryTerm(term: string) {
    onPersonalDictionaryChange(personalDictionary.filter((item) => item !== term));
  }

  const showDictionary = type === "dictionary";

  return (
    <section className="text-[var(--lt-text)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-[38px] font-normal leading-tight">表达库</h1>
          <p className="mt-2 text-base leading-7 text-[var(--lt-muted)]">沉淀可复用表达，随时插入当前写作。</p>
        </div>
        <button
          type="button"
          onClick={exportJson}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)]"
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
          导出 JSON
        </button>
      </header>

      {exportMessage ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{exportMessage}</p> : null}

      <div className="mt-7 space-y-4">
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--lt-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索表达、释义或场景"
            className="h-12 w-full border-b border-[var(--lt-border)] bg-transparent pl-9 pr-2 text-base text-[var(--lt-text)] outline-none transition placeholder:text-[var(--lt-muted)] focus:border-[var(--lt-ring)]"
            aria-label="搜索 Learning Library"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            ["all", "全部"],
            ["phrase", "短语"],
            ["collocation", "搭配"],
            ["sentence_pattern", "句型"],
            ["dictionary", "个人词典"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value as LibraryTypeFilter)}
              className={`rounded-full px-3 py-1.5 transition ${
                type === value
                  ? "bg-[var(--lt-text)] text-[var(--lt-bg)]"
                  : "bg-[var(--lt-surface-soft)] text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!showDictionary ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--lt-muted)]">
            <DesignSelect
              value={difficultyLevel}
              onChange={(event) =>
                setDifficultyLevel(event.target.value === "all" ? "all" : (Number(event.target.value) as LearningItemDifficulty))
              }
              aria-label="按难度筛选"
              compact
            >
              <option value="all">全部难度</option>
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  难度 {level}
                </option>
              ))}
            </DesignSelect>
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={favoriteOnly}
                onChange={(event) => setFavoriteOnly(event.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--lt-text)]"
              />
              只看收藏
            </label>
            <div className="inline-flex rounded-md bg-[var(--lt-surface-soft)] p-0.5">
              <button
                type="button"
                onClick={() => setSortBy("updatedAt")}
                className={`rounded px-3 py-1.5 transition ${
                  sortBy === "updatedAt" ? "bg-[var(--lt-surface)] text-[var(--lt-text)] shadow-sm" : "text-[var(--lt-muted)]"
                }`}
              >
                最近更新
              </button>
              <button
                type="button"
                onClick={() => setSortBy("useCount")}
                className={`rounded px-3 py-1.5 transition ${
                  sortBy === "useCount" ? "bg-[var(--lt-surface)] text-[var(--lt-text)] shadow-sm" : "text-[var(--lt-muted)]"
                }`}
              >
                使用次数
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {showDictionary ? (
        <DictionarySection
          dictionaryDraft={dictionaryDraft}
          dictionaryTerms={dictionaryTerms}
          onDraftChange={setDictionaryDraft}
          onAdd={addDictionaryTerm}
          onRemove={removeDictionaryTerm}
        />
      ) : visibleItems.length === 0 ? (
        <p className="mt-8 border-t border-[var(--lt-border)] pt-6 text-sm leading-6 text-[var(--lt-muted)]">
          应用句子建议后，有价值的表达会保存到这里。
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-[var(--lt-border)]">
          {visibleItems.map((item) => (
            <li key={item.id} className="group py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-[21px] font-semibold leading-snug">{item.content}</h2>
                    <DifficultyTag level={toDifficulty(item.difficultyLevel)} />
                  </div>
                  <p className="mt-1 break-words text-sm text-[var(--lt-muted)]">{item.chineseMeaning}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(item.id)}
                  aria-label={item.favorite ? `取消收藏 ${item.content}` : `收藏 ${item.content}`}
                  className={`shrink-0 rounded-full p-1.5 transition ${
                    item.favorite
                      ? "bg-[var(--lt-accent-soft)] text-[var(--lt-accent)]"
                      : "text-[var(--lt-muted)] hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
                  }`}
                >
                  <StarIcon className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--lt-text)]">{item.usageNote}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--lt-muted)]">
                <span>{TYPE_LABELS[item.type]}</span>
                <span>使用 {item.useCount} 次</span>
                <span>{formatDate(item.updatedAt)}</span>
              </div>
              {item.sourceSentence ? (
                <p className="mt-2 max-w-4xl text-xs leading-5 text-[var(--lt-muted)]">{item.sourceSentence}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => onInsert(item.content)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--lt-accent-soft)] px-3 py-1.5 text-[var(--lt-accent)] transition hover:bg-[var(--lt-accent-soft-strong)]"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  插入当前段落
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(item.content)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--lt-surface-soft)] px-3 py-1.5 text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)]"
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  复制
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-red-700/80 transition hover:bg-red-500/[0.08] dark:text-red-300"
                >
                  <TrashIcon className="h-4 w-4" />
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

function DictionarySection({
  dictionaryDraft,
  dictionaryTerms,
  onDraftChange,
  onAdd,
  onRemove,
}: {
  dictionaryDraft: string;
  dictionaryTerms: string[];
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (term: string) => void;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">个人词典</h2>
      <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">
        专有名词、品牌名或你认可的表达会在本地校对中被更温和地处理。
      </p>
      <div className="mt-5 flex flex-wrap gap-2 border-b border-[var(--lt-border)] pb-5">
        <input
          value={dictionaryDraft}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder="例如 LinguaType / IELTS"
          aria-label="添加个人词典词条"
          className="min-w-64 flex-1 bg-transparent px-1 py-2 text-sm text-[var(--lt-text)] outline-none placeholder:text-[var(--lt-muted)]"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-[var(--lt-text)] px-4 py-2 text-sm font-medium text-[var(--lt-bg)] opacity-95 transition hover:opacity-85"
        >
          加入词典
        </button>
      </div>

      {dictionaryTerms.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-[var(--lt-muted)]">当前没有匹配的个人词典词条。</p>
      ) : (
        <ul className="mt-5 divide-y divide-[var(--lt-border)]">
          {dictionaryTerms.map((term) => (
            <li key={term} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 truncate font-medium">{term}</span>
              <button
                type="button"
                onClick={() => onRemove(term)}
                aria-label={`删除 ${term}`}
                className="rounded-md px-2 py-1 text-xs text-red-700/80 transition hover:bg-red-500/[0.08] dark:text-red-300"
              >
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DifficultyTag({ level }: { level: LearningItemDifficulty }) {
  return (
    <span className="rounded-full bg-[var(--lt-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--lt-muted)]">
      难度 {level}
    </span>
  );
}

function toDifficulty(value: number | undefined): LearningItemDifficulty {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }
  return 3;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "最近更新";
  }
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}
