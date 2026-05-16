"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { waapi } from "animejs/waapi";
import { stagger } from "animejs/utils";
import { TrashIcon } from "./HeroIcons";
import type { CorrectionEvent, CorrectionEventType, WritingHabitInsight } from "@/lib/llm/types";
import { aggregateWritingHabits } from "@/lib/storage";

type WritingHabitsPanelProps = {
  events: CorrectionEvent[];
  onDeleteType: (type: CorrectionEventType) => void;
};

type TrendPoint = {
  label: string;
  value: number;
};

export function WritingHabitsPanel({ events, onDeleteType }: WritingHabitsPanelProps) {
  const panelRef = useRef<HTMLElement | null>(null);
  const insights = useMemo(() => aggregateWritingHabits(events), [events]);
  const trendPoints = useMemo(() => buildTrendPoints(events), [events]);
  const totalApplied = events.reduce((sum, event) => sum + Math.max(1, event.useCount), 0);
  const highPriorityCount = insights.filter((insight) => insight.severity === "high").length;
  const maxTrendValue = Math.max(1, ...trendPoints.map((point) => point.value));
  const maxInsightCount = Math.max(1, ...insights.map((insight) => insight.count));
  const topInsight = insights[0] ?? null;
  const hasTrendData = trendPoints.some((point) => point.value > 0);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const deleteNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DELETE_NOTICE_VISIBLE_MS = 2500;

  const showDeleteNotice = (message: string) => {
    if (deleteNoticeTimerRef.current) {
      clearTimeout(deleteNoticeTimerRef.current);
    }
    setDeleteNotice(message);
    deleteNoticeTimerRef.current = setTimeout(() => {
      setDeleteNotice(null);
      deleteNoticeTimerRef.current = null;
    }, DELETE_NOTICE_VISIBLE_MS);
  };

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const motionItems = Array.from(panel.querySelectorAll<HTMLElement>("[data-habit-motion]"));
    if (motionItems.length > 0 && canAnimate(motionItems[0])) {
      waapi.animate(motionItems, {
        opacity: [0.86, 1],
        transform: ["translateY(8px)", "translateY(0px)"],
        duration: 300,
        delay: stagger(14),
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }

    const bars = Array.from(panel.querySelectorAll<HTMLElement>("[data-habit-quiet-bar]"));
    if (bars.length > 0 && canAnimate(bars[0])) {
      waapi.animate(bars, {
        opacity: [0, 1],
        transform: ["scaleX(0.72)", "scaleX(1)"],
        transformOrigin: ["0% 50%", "0% 50%"],
        duration: 420,
        delay: stagger(28),
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      });
    }
  }, [events.length, insights.length]);

  useEffect(() => {
    return () => {
      if (deleteNoticeTimerRef.current) {
        clearTimeout(deleteNoticeTimerRef.current);
      }
    };
  }, []);

  return (
    <section ref={panelRef} className="text-[var(--lt-text)]">
      <header data-habit-motion>
        <h1 className="font-serif text-[42px] font-normal leading-tight">写作习惯</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--lt-muted)]">
          基于你已经确认应用的修改，提炼出长期表达模式和下一步练习重点。
        </p>
      </header>
      {deleteNotice ? (
        <p
          role="status"
          className="mt-6 rounded-md border border-emerald-400/60 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
        >
          {deleteNotice}
        </p>
      ) : null}

      <section
        aria-label="写作习惯简约摘要"
        data-visual-tone="minimal-editorial"
        data-reactbits-reference="simple-graph-reduced"
        data-motion-library="animejs"
        data-habit-motion
        className="mt-8 border-y border-[var(--lt-border)] py-6"
      >
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
          <div aria-label="修正节奏摘要" className="min-w-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">近 7 天修正节奏</h2>
                <p className="mt-1 text-xs text-[var(--lt-muted)]">只统计已应用的修正。</p>
              </div>
              <div className="text-right">
                <span className="block text-2xl font-semibold leading-none">{totalApplied}</span>
                <span className="text-xs text-[var(--lt-muted)]">累计</span>
              </div>
            </div>
            <div
              aria-label="写作习惯趋势图"
              data-habit-chart-state={hasTrendData ? "ready" : "empty"}
              className="mt-6"
            >
              <div className="grid grid-cols-7 items-end gap-3">
                {trendPoints.map((point) => (
                  <div key={point.label} className="grid min-w-0 gap-2">
                    <div className="flex h-16 items-end border-b border-[var(--lt-border)]">
                      <span
                        aria-label={`${point.label} ${point.value} 次`}
                        data-habit-quiet-bar
                        className="block w-full rounded-t-[4px]"
                        style={{
                          height: `${point.value > 0 ? Math.max(8, Math.round((point.value / maxTrendValue) * 52)) : 2}px`,
                          backgroundColor: point.value > 0 ? "var(--lt-accent)" : "var(--lt-border)",
                          opacity: point.value > 0 ? 0.78 : 1,
                        }}
                      />
                    </div>
                    <span className="truncate text-center text-[10px] text-[var(--lt-faint)]">{point.label}</span>
                    <span className="min-h-4 truncate text-center text-[10px] text-[var(--lt-muted)]">
                      {point.value > 0 ? `${point.value} 次` : ""}
                    </span>
                  </div>
                ))}
              </div>
              {!hasTrendData ? (
                <p className="mt-3 text-xs text-[var(--lt-muted)]">还没有近 7 天修正记录。</p>
              ) : null}
            </div>
          </div>

          <div aria-label="习惯频率摘要" className="min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">频率分档</h2>
                <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">1-2 低频，3-4 中频，5 次及以上高频。</p>
              </div>
              <span className="text-xs text-[var(--lt-muted)]">{highPriorityCount} 个高频</span>
            </div>
            <div className="mt-6 space-y-3">
              {insights.length === 0 ? (
                <p className="text-sm leading-7 text-[var(--lt-muted)]">
                  先应用几次当前句建议，这里会出现你的个人表达模式。
                </p>
              ) : (
                insights.slice(0, 4).map((insight) => {
                  const copy = habitCopy(insight);
                  return (
                    <div key={insight.id} data-habit-motion>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="truncate text-[var(--lt-muted)]">{copy.title}</span>
                        <span className="shrink-0 text-[var(--lt-faint)]">{severityLabel(insight.severity)}</span>
                      </div>
                      <div className="h-px bg-[var(--lt-border)]">
                        <div
                          data-habit-quiet-bar
                          className="h-px bg-[var(--lt-text)]"
                          style={{ width: `${Math.max(8, Math.round((insight.count / maxInsightCount) * 100))}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {topInsight ? (
              <p className="mt-6 border-t border-[var(--lt-border)] pt-4 text-sm leading-7 text-[var(--lt-muted)]">
                <span className="font-medium text-[var(--lt-text)]">当前重点：</span>
                {habitCopy(topInsight).suggestion}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-3" data-habit-motion>
        <Metric label="近 7 天修正" value={`${events.length}`} unit="条记录" />
        <Metric label="识别出的习惯" value={`${insights.length}`} unit="类" />
        <Metric label="本周可聚焦" value={`${Math.max(1, insights.length - highPriorityCount)}`} unit="项" />
      </dl>

      {insights.length === 0 ? (
        <p data-habit-motion className="mt-7 text-sm leading-7 text-[var(--lt-muted)]">
          应用当前句建议后，LinguaType 会在本地把修正沉淀为写作习惯，不会自动保存未确认的模型输出。
        </p>
      ) : (
        <section className="mt-10" data-habit-motion>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">高频写作习惯分析</h2>
              <p className="mt-1 text-sm text-[var(--lt-muted)]">按出现次数分档：1-10 低频，11-30 中频，31 次及以上高频。</p>
            </div>
          </div>
          <ul
            aria-label="写作习惯洞察列表"
            data-reactbits-reference="animated-list"
            className="mt-5 divide-y divide-[var(--lt-border)]"
          >
            {insights.map((insight) => {
              const example = insight.examples[0];
              const copy = habitCopy(insight);
              return (
                <li
                  key={insight.id}
                  aria-label="习惯洞察条目"
                  data-habit-row-motion="stagger-rise"
                  data-habit-row-design="editorial-compact"
                  className="py-7"
                >
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.1fr)_minmax(220px,0.7fr)]">
                    <div className={`min-w-0 border-l-2 pl-4 ${severityBorderClassName(insight.severity)}`}>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className="text-base font-semibold">{copy.title}</h3>
                        <span className={severityClassName(insight.severity)} data-severity-tone={severityTone(insight.severity)}>
                          {severityLabel(insight.severity)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-[var(--lt-muted)]">
                        <span data-habit-count="true">{insight.count} 次</span>
                        <span aria-hidden="true">/</span>
                        <span>{severityRangeLabel(insight.severity)}</span>
                      </div>
                      <p className="mt-3 leading-7 text-[var(--lt-muted)]">{copy.summary}</p>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-[var(--lt-muted)]">最新例句</h4>
                      {example ? (
                        <div className="mt-3 text-sm">
                          <BeforeAfterExample before={example.before} after={example.after} reason={example.reason} />
                        </div>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[var(--lt-muted)]">改进建议</h4>
                          <p className="mt-3 text-sm leading-7 text-[var(--lt-muted)]">{copy.suggestion}</p>
                        </div>
                        <button
                          type="button"
                          aria-label="删除此类写作习惯"
                          title="删除此类"
                          data-icon-only="true"
                          onClick={() => {
                            onDeleteType(insight.type);
                            showDeleteNotice(
                              `已清理 ${insight.type} 本地修改记录。表达库不受影响。`,
                            );
                          }}
                          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full text-red-700/75 transition hover:bg-red-500/[0.08] hover:text-red-700 dark:text-red-300"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </section>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="border-l border-[var(--lt-border)] pl-4">
      <dt className="text-xs text-[var(--lt-muted)]">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">
        {value} <span className="text-sm font-normal text-[var(--lt-muted)]">{unit}</span>
      </dd>
    </div>
  );
}

function BeforeAfterExample({ before, after, reason }: { before: string; after: string; reason: string }) {
  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[64px_minmax(0,1fr)]">
        <span className="text-xs font-medium text-[var(--lt-muted)]">修改前</span>
        <p className="break-words leading-6 text-[var(--lt-muted)]">{before}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[64px_minmax(0,1fr)]">
        <span className="text-xs font-medium text-[var(--lt-muted)]">修改后</span>
        <p className="break-words leading-6 text-[var(--lt-text)]">{after}</p>
      </div>
      {reason ? <p className="pl-0 text-xs leading-5 text-[var(--lt-muted)] sm:pl-16">{reason}</p> : null}
    </div>
  );
}

function buildTrendPoints(events: CorrectionEvent[]): TrendPoint[] {
  const anchorTime = events.reduce((latest, event) => {
    const eventTime = Date.parse(event.updatedAt || event.createdAt);
    return Number.isFinite(eventTime) ? Math.max(latest, eventTime) : latest;
  }, Date.now());
  const anchorDate = new Date(anchorTime);
  anchorDate.setHours(0, 0, 0, 0);

  const counts = new Map<string, number>();
  for (const event of events) {
    const eventTime = Date.parse(event.updatedAt || event.createdAt);
    if (!Number.isFinite(eventTime)) {
      continue;
    }
    const date = new Date(eventTime);
    date.setHours(0, 0, 0, 0);
    counts.set(dateKey(date), (counts.get(dateKey(date)) ?? 0) + Math.max(1, event.useCount));
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(anchorDate);
    date.setDate(anchorDate.getDate() - (6 - index));
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      value: counts.get(dateKey(date)) ?? 0,
    };
  });
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function canAnimate(element: Element | undefined): boolean {
  return Boolean(element && typeof (element as Element & { animate?: unknown }).animate === "function");
}

function habitCopy(insight: WritingHabitInsight): { title: string; summary: string; suggestion: string } {
  const copy = HABIT_UI_COPY[insight.type];
  return {
    title: copy?.title ?? insight.titleZh,
    summary: copy?.summary ?? insight.summaryZh,
    suggestion: copy?.suggestion ?? insight.suggestionZh,
  };
}

function severityClassName(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "rounded-full bg-[var(--lt-text)] px-2.5 py-1 text-xs font-semibold text-[var(--lt-bg)]";
  }
  if (severity === "medium") {
    return "rounded-full bg-[#8f4d39] px-2.5 py-1 text-xs font-semibold text-white dark:bg-[#cc785c] dark:text-[#171614]";
  }
  return "rounded-full border border-[var(--lt-border)] px-2.5 py-1 text-xs font-medium text-[var(--lt-muted)]";
}

function severityBorderClassName(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "border-[var(--lt-text)]";
  }
  if (severity === "medium") {
    return "border-[#8f4d39] dark:border-[#cc785c]";
  }
  return "border-[var(--lt-border)]";
}

function severityTone(severity: "low" | "medium" | "high"): string {
  return severity === "high" || severity === "medium" ? "heavy" : "neutral";
}

function severityRangeLabel(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "31 次以上";
  }
  if (severity === "medium") {
    return "11-30 次";
  }
  return "1-10 次";
}

function severityLabel(severity: "low" | "medium" | "high"): string {
  if (severity === "high") {
    return "高频";
  }
  if (severity === "medium") {
    return "需要留意";
  }
  return "轻量";
}

const HABIT_UI_COPY: Partial<
  Record<CorrectionEventType, { title: string; summary: string; suggestion: string }>
> = {
  singular_plural: {
    title: "单复数不稳定",
    summary: "可数名词、泛指表达和数量词之后，单复数形式偶尔会摇摆。",
    suggestion: "写完一句后，先扫一遍 many、several、one of 这类提示词后面的名词形式。",
  },
  tense: {
    title: "时态一致性",
    summary: "描述事实、过去经历或观点时，时态有时会在同一句或相邻句之间跳动。",
    suggestion: "修改前先判断这句话是在讲普遍事实还是过去事件，再统一动词时态。",
  },
  article: {
    title: "冠词遗漏",
    summary: "a、an、the 的使用还不够稳定，尤其是单数可数名词前。",
    suggestion: "遇到单数可数名词时，先问它是泛指、首次出现，还是特指。",
  },
  word_order: {
    title: "语序迁移",
    summary: "中文语序有时会直接带入英文，导致修饰语或核心成分位置不自然。",
    suggestion: "先找到主语、谓语和宾语，再添加修饰语或从句。",
  },
  collocation: {
    title: "搭配不自然",
    summary: "有些动词和名词来自直译，英文搭配感会变弱。",
    suggestion: "写 verb + noun 组合时，优先检查它是不是常见英文搭配。",
  },
  preposition: {
    title: "介词搭配",
    summary: "固定搭配里的介词偶尔不稳定，比如 influence on、reason for 这类结构。",
    suggestion: "把介词当作词组的一部分记忆，而不是逐词翻译。",
  },
  repetition: {
    title: "连接和表达重复",
    summary: "相邻句里会重复同一个连接词、名词或表达方式。",
    suggestion: "段落写完后，扫一遍 repeated connector 和 repeated noun。",
  },
  tone: {
    title: "语气层级切换",
    summary: "正式、学术和口语表达有时会混在一起。",
    suggestion: "先确定写作模式，再让词汇和句式保持同一正式程度。",
  },
  chinese_transfer: {
    title: "中式表达迁移",
    summary: "有些英文句子仍然按照中文表达习惯组织，读起来不够自然。",
    suggestion: "混写后，把意思重新放进常见英文句型和搭配中，而不是逐段直译。",
  },
  coherence: {
    title: "上下文衔接",
    summary: "句子本身可能正确，但和前后句的逻辑连接不够清楚。",
    suggestion: "检查新句是在补充原因、对比、举例，还是给出结果。",
  },
  polishing: {
    title: "表达冗余",
    summary: "意思通常清楚，但有些句子可以更短、更自然。",
    suggestion: "初稿后优先找重复词、直译结构和可以压缩的短语。",
  },
  other: {
    title: "其他表达模式",
    summary: "这些修正暂时不属于更具体类别，但仍然是有用的个人信号。",
    suggestion: "把修改前后例句当作个人提醒，后续同类记录变多后再细分。",
  },
};
