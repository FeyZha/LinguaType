"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { waapi } from "animejs/waapi";
import { stagger } from "animejs/utils";
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
  sentence_pattern: "句式",
};

const LIBRARY_MOTION_PROFILE = "library-unified-rise";
const LIBRARY_MOTION_DURATION = "420";
const LIBRARY_MOTION_STAGGER = "32";
const LIBRARY_MOTION_ATTRS = {
  "data-library-motion-profile": LIBRARY_MOTION_PROFILE,
  "data-library-motion-duration": LIBRARY_MOTION_DURATION,
  "data-library-motion-stagger": LIBRARY_MOTION_STAGGER,
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
  const panelRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<LibraryTypeFilter>("all");
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyFilter>("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"updatedAt" | "useCount">("updatedAt");
  const [actionMessage, setActionMessage] = useState("");
  const [dictionaryDraft, setDictionaryDraft] = useState("");
  const [expandedSourceItemId, setExpandedSourceItemId] = useState<string | null>(null);
  const actionMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setMessage(message: string) {
    if (actionMessageTimerRef.current) {
      clearTimeout(actionMessageTimerRef.current);
    }
    setActionMessage(message);
    actionMessageTimerRef.current = setTimeout(() => {
      setActionMessage("");
      actionMessageTimerRef.current = null;
    }, 2200);
  }

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
    if (!navigator.clipboard?.writeText) {
      setMessage("当前环境不支持直接复制。");
      return;
    }
    try {
      await navigator.clipboard.writeText(json);
      setMessage("表达库 JSON 已复制到剪贴板。");
    } catch {
      setMessage("复制失败，请稍后重试。");
    }
  }

  function addDictionaryTerm() {
    const trimmed = dictionaryDraft.trim();
    if (!trimmed) {
      setMessage("请输入词条。");
      return;
    }
    const next = normalizePersonalDictionary([...personalDictionary, trimmed]);
    if (next.length === personalDictionary.length) {
      setMessage(`词条已存在：${trimmed}`);
      return;
    }
    onPersonalDictionaryChange(next);
    setDictionaryDraft("");
    setMessage(`已添加词条：${trimmed}`);
  }

  function removeDictionaryTerm(term: string) {
    onPersonalDictionaryChange(personalDictionary.filter((item) => item !== term));
    setMessage(`已删除词条：${term}`);
  }

  const showDictionary = type === "dictionary";

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    const items = Array.from(panel.querySelectorAll<HTMLElement>("[data-library-motion-item]"));
    if (items.length === 0 || typeof items[0].animate !== "function") {
      return;
    }
    waapi.animate(items, {
      opacity: [0.86, 1],
      transform: ["translateY(8px)", "translateY(0px)"],
      duration: 300,
      delay: stagger(14),
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
    });
  }, [showDictionary, visibleItems.length]);

  useEffect(() => {
    return () => {
      if (actionMessageTimerRef.current) {
        clearTimeout(actionMessageTimerRef.current);
        actionMessageTimerRef.current = null;
      }
    };
  }, []);

  return (
    <section
      ref={panelRef}
      aria-label="表达库内容动效"
      data-library-motion="unified-rise"
      data-library-motion-profile={LIBRARY_MOTION_PROFILE}
      className="text-[var(--lt-text)]"
    >
      <header
        data-library-motion-item
        {...LIBRARY_MOTION_ATTRS}
        className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--lt-border)] pb-6"
      >
        <div className="max-w-2xl">
          <h1 className="font-serif text-[38px] font-normal leading-tight">表达库</h1>
          <p className="mt-2 text-base leading-7 text-[var(--lt-muted)]">
            存储可复用表达资产，支持按类型、难度和常用程度筛选，不替代写作主流程。
          </p>
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

      {actionMessage ? (
        <p role="status" aria-live="polite" className="mt-3 rounded-md border border-[var(--lt-accent-soft)] bg-[var(--lt-accent-soft)] px-3 py-2 text-sm text-[var(--lt-accent)]">
          {actionMessage}
        </p>
      ) : null}

      <div
        aria-label="表达库筛选控制区"
        data-library-motion-item
        {...LIBRARY_MOTION_ATTRS}
        className="mt-6 space-y-4"
      >
        <label className="relative block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--lt-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索内容、含义或词典项"
            className="h-12 w-full border-b border-[var(--lt-border)] bg-transparent pl-9 pr-2 text-base text-[var(--lt-text)] outline-none transition placeholder:text-[var(--lt-muted)] focus:border-[var(--lt-ring)]"
            aria-label="搜索表达库"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {[
            ["all", "全部"],
            ["phrase", "短语"],
            ["collocation", "搭配"],
            ["sentence_pattern", "句式"],
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
              aria-label="筛选难度"
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
              仅看收藏
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
        <div
          data-library-motion-item
          className="mt-8 rounded-[8px] border border-dashed border-[var(--lt-border)] bg-[var(--lt-surface-soft)] px-5 py-6"
        >
          <p className="text-sm font-medium text-[var(--lt-text)]">暂无可用表达</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--lt-muted)]">
            先写一条句子，完成改写后可自动归档常用表达；你也可以直接添加到表达库。
          </p>
        </div>
      ) : (
        <ul
          aria-label="表达库条目列表"
          data-library-layout="compact-card-grid"
          {...LIBRARY_MOTION_ATTRS}
          className="mt-8 grid auto-rows-[420px] grid-cols-[repeat(auto-fill,minmax(260px,1fr))] items-stretch gap-3"
        >
          {visibleItems.map((item) => (
            <li
              key={item.id}
              data-library-motion-item
              data-library-card="compact"
              {...LIBRARY_MOTION_ATTRS}
              className="group relative flex h-full flex-col overflow-hidden rounded-[8px] border border-[var(--lt-border)] bg-[var(--lt-surface)] px-4 py-4 transition hover:border-[var(--lt-ring)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[var(--lt-surface-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--lt-muted)]">
                      {TYPE_LABELS[item.type]}
                    </span>
                    <DifficultyTag level={toDifficulty(item.difficultyLevel)} />
                    {item.favorite ? (
                      <span className="rounded-full bg-[var(--lt-accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--lt-accent)]">
                        已收藏
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 break-words text-[20px] font-semibold leading-snug">{item.content}</h2>
                  <p className="mt-1 break-words text-sm leading-6 text-[var(--lt-muted)]">{item.chineseMeaning}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onToggleFavorite(item.id);
                    setMessage(item.favorite ? `已取消收藏 ${item.content}` : `已收藏 ${item.content}`);
                  }}
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

              <p className="mt-3 max-h-[4.75rem] overflow-hidden text-sm leading-6 text-[var(--lt-text)]">{item.usageNote}</p>
              {item.sourceSentence ? (
                <button
                  type="button"
                  aria-expanded={expandedSourceItemId === item.id}
                  aria-label={`查看完整来源 ${item.content}`}
                  data-library-source-preview={item.id}
                  onClick={() =>
                    setExpandedSourceItemId((current) => (current === item.id ? null : item.id))
                  }
                  className="mt-3 max-h-[5rem] overflow-hidden rounded-[6px] bg-[var(--lt-surface-soft)] px-3 py-2 text-left text-[12px] leading-5 text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lt-ring)]"
                >
                  <span className="font-medium text-[var(--lt-text)]">来源</span>
                  <p className="mt-1 break-words">{item.sourceSentence}</p>
                </button>
              ) : null}

              <div
                data-library-actions-layout="inline-footer"
                className="mt-auto border-t border-[var(--lt-border)] pt-3 text-xs text-[var(--lt-muted)]"
              >
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  <span>使用 {item.useCount} 次</span>
                  <span>上次 {formatOptionalDate(item.lastUsedAt)}</span>
                  <span>更新 {formatDate(item.updatedAt)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onInsert(item.content);
                      setMessage(`已插入当前稿件：${item.content}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[var(--lt-accent)] transition hover:bg-[var(--lt-accent-soft)]"
                  >
                    <PencilSquareIcon className="h-3.5 w-3.5" />
                    插入当前稿件
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void (async () => {
                        try {
                          if (!navigator.clipboard?.writeText) {
                            setMessage("当前环境不支持直接复制。");
                            return;
                          }
                          await navigator.clipboard.writeText(item.content);
                          setMessage(`表达已复制：${item.content}`);
                        } catch {
                          setMessage("复制失败，请稍后重试。");
                        }
                      })()
                    }
                    className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-soft)]"
                  >
                    <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                    复制
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(item.id);
                      setMessage(`表达已删除：${item.content}`);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)]"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>
              </div>
              {expandedSourceItemId === item.id && item.sourceSentence ? (
                <section
                  role="region"
                  aria-label={`完整来源 ${item.content}`}
                  data-library-source-detail="open"
                  className="absolute inset-3 z-20 flex flex-col rounded-[8px] border border-[var(--lt-border)] bg-[var(--lt-surface)] p-4 text-left"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-[var(--lt-border)] pb-2">
                    <span className="text-sm font-medium text-[var(--lt-text)]">完整来源</span>
                    <button
                      type="button"
                      aria-label={`收起来源 ${item.content}`}
                      onClick={() => setExpandedSourceItemId(null)}
                      className="rounded-[4px] px-2 py-1 text-xs text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-soft)] hover:text-[var(--lt-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--lt-ring)]"
                    >
                      收起
                    </button>
                  </div>
                  <p className="mt-3 min-h-0 overflow-auto pr-1 text-[13px] leading-6 text-[var(--lt-text)]">
                    {item.sourceSentence}
                  </p>
                </section>
              ) : null}
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
        可把常见拼写或固定词组加入词典，让校对更贴合你的写作习惯。
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
          placeholder="例如：LinguaType / IELTS"
          aria-label="添加个人词典项"
          className="min-w-64 flex-1 bg-transparent px-1 py-2 text-sm text-[var(--lt-text)] outline-none placeholder:text-[var(--lt-muted)]"
        />
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-[var(--lt-text)] px-4 py-2 text-sm font-medium text-[var(--lt-bg)] opacity-95 transition hover:opacity-85"
        >
          添加词典项
        </button>
      </div>

      {dictionaryTerms.length === 0 ? (
        <p className="mt-5 text-sm leading-6 text-[var(--lt-muted)]">暂无匹配词典项。</p>
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
    return "无效日期";
  }
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function formatOptionalDate(value: string | undefined): string {
  return value ? formatDate(value) : "从未使用";
}
