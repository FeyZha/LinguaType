"use client";

import { useState } from "react";
import type { Change } from "diff";
import type {
  DocumentMapParagraph,
  DocumentMapResult,
  ParagraphCheckResult,
  ParagraphDetailIssue,
  ParagraphDetailIssueType,
  ParagraphHealthResult,
  ParagraphIssueType,
} from "@/lib/llm/types";
import { DiffViewer } from "./DiffViewer";

export type DocumentMapParagraphHealthViewState =
  | { status: "loading" }
  | { status: "ready"; result: ParagraphHealthResult }
  | { status: "empty"; message: string }
  | { status: "error"; message: string };

export type DocumentMapParagraphCheckView = {
  title: string;
  subtitle: string;
  isLoading: boolean;
  result?: ParagraphCheckResult;
  diffParts: Change[];
  message?: string;
  conflictMessage?: string;
};

type DocumentMapPanelProps = {
  result?: DocumentMapResult | null;
  paragraphHealthById?: Record<string, DocumentMapParagraphHealthViewState>;
  paragraphCheckView?: DocumentMapParagraphCheckView | null;
  isLoading: boolean;
  isStale: boolean;
  message?: string;
  onCheck: (force?: boolean) => void;
  onClose: () => void;
  onBackToMap: () => void;
  onViewHealth: (paragraph: DocumentMapParagraph) => void;
  onCheckParagraph: (paragraph: DocumentMapParagraph) => void;
  onLocateParagraph: (paragraph: DocumentMapParagraph) => void;
  onApplyParagraph: () => void;
  onCancelParagraph: () => void;
};

const STATUS_LABELS: Record<DocumentMapParagraph["status"], string> = {
  healthy: "健康",
  has_suggestions: "有建议",
  needs_attention: "需关注",
  weak_connection: "与前文连接弱",
  repeated: "与其他段落重复",
  insufficient_response: "回应题目不足",
};

const PARAGRAPH_HEALTH_ISSUE_LABELS: Record<ParagraphIssueType, string> = {
  repetition: "表达重复",
  transition: "过渡不足",
  pronoun_reference: "指代不清",
  logic_gap: "逻辑跳跃",
  sentence_order: "句序不顺",
  tone_consistency: "语气不一致",
  weak_development: "展开不足",
};

const PARAGRAPH_FLOW_ISSUE_LABELS: Record<ParagraphIssueType, string> = {
  repetition: "重复",
  transition: "过渡",
  pronoun_reference: "指代",
  logic_gap: "逻辑跳跃",
  sentence_order: "句序",
  tone_consistency: "语气",
  weak_development: "展开不足",
};

const PARAGRAPH_DETAIL_ISSUE_LABELS: Record<ParagraphDetailIssueType, string> = {
  grammar: "语法",
  spelling: "拼写",
  punctuation: "标点",
  article: "冠词",
  tense: "时态",
  word_form: "词形",
  preposition: "介词",
  collocation: "搭配",
  spacing: "空格",
};

const MAX_VISIBLE_DETAIL_ISSUES = 4;

function isWhitespaceOnlyChange(issue: ParagraphDetailIssue) {
  const original = issue.original.trim();
  const suggestion = issue.suggestion.trim();
  if (!original || !suggestion) {
    return true;
  }
  return original.replace(/\s+/gu, "") === suggestion.replace(/\s+/gu, "");
}

function shouldDisplayDetailIssue(issue: ParagraphDetailIssue) {
  if (issue.type === "spacing") {
    return false;
  }
  return !isWhitespaceOnlyChange(issue);
}

export function DocumentMapPanel({
  result,
  paragraphHealthById = {},
  paragraphCheckView,
  isLoading,
  isStale,
  message = "",
  onCheck,
  onClose,
  onBackToMap,
  onViewHealth,
  onCheckParagraph,
  onLocateParagraph,
  onApplyParagraph,
  onCancelParagraph,
}: DocumentMapPanelProps) {
  const [expandedParagraphIds, setExpandedParagraphIds] = useState<Set<string>>(() => new Set());

  function toggleParagraph(paragraphId: string) {
    setExpandedParagraphIds((current) => {
      const next = new Set(current);
      if (next.has(paragraphId)) {
        next.delete(paragraphId);
      } else {
        next.add(paragraphId);
      }
      return next;
    });
  }

  if (paragraphCheckView) {
    return (
      <section
        aria-label="文章地图"
        className="mx-auto w-full max-w-[980px] rounded-md border border-[var(--lt-border)] bg-[var(--lt-surface)] px-5 py-4 text-[var(--lt-text)] shadow-[0_18px_46px_var(--lt-shadow)]"
      >
        <ParagraphCheckSubView
          view={paragraphCheckView}
          onBack={onBackToMap}
          onApply={onApplyParagraph}
          onCancel={onCancelParagraph}
        />
      </section>
    );
  }

  return (
    <section
      aria-label="文章地图"
      className="mx-auto w-full max-w-[980px] rounded-md border border-[var(--lt-border)] bg-[var(--lt-surface)] px-5 py-4 text-[var(--lt-text)] shadow-[0_18px_46px_var(--lt-shadow)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">文章地图</h2>
          <p className="mt-1 text-sm text-[var(--lt-muted)]">
            {isLoading
              ? "正在整理文章结构……"
              : result
                ? `已生成文章地图，发现 ${result.globalIssues.length} 个需要关注的结构问题。`
                : "生成可折叠的全文结构检查大纲。"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCheck(true)}
            disabled={isLoading}
            className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-1.5 text-sm font-medium text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            重新检查
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1.5 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
          >
            收起
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-3 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-[var(--lt-text)]">{message}</p>
      ) : null}

      {isStale ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-[var(--lt-text)]">
          <span>正文已修改，当前文章地图可能不是最新结果。</span>
          <button
            type="button"
            onClick={() => onCheck(true)}
            className="font-medium underline underline-offset-4"
          >
            重新检查
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 grid gap-5">
          <section aria-label="全文概览" className="grid gap-3">
            <div>
              <h3 className="text-sm font-semibold">全文主旨</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">{result.overallMainIdeaZh}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">结构判断</h3>
              <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">{result.structureSummaryZh}</p>
            </div>
          </section>

          <section aria-label="全文问题" className="grid gap-2">
            <h3 className="text-sm font-semibold">全文问题 {result.globalIssues.length}</h3>
            {result.globalIssues.length > 0 ? (
              result.globalIssues.map((issue) => (
                <article key={issue.id} className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold">{issue.titleZh}</h4>
                    <button
                      type="button"
                      onClick={() => {
                        const target = result.paragraphs.find((paragraph) => issue.paragraphIds.includes(paragraph.paragraphId));
                        if (target) {
                          onLocateParagraph(target);
                        }
                      }}
                      className="text-xs font-medium text-[var(--lt-accent)] underline-offset-4 hover:underline"
                    >
                      定位相关段落
                    </button>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">{issue.explanationZh}</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--lt-text)]">建议：{issue.suggestionZh}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--lt-muted)]">暂未发现明显全文结构问题。</p>
            )}
          </section>

          <section aria-label="段落地图" className="grid gap-2">
            <h3 className="text-sm font-semibold">段落地图</h3>
            {result.paragraphs.map((paragraph) => {
              const expanded = expandedParagraphIds.has(paragraph.paragraphId);
              return (
                <article
                  key={paragraph.paragraphId}
                  role="group"
                  aria-label={`第 ${paragraph.index} 段 ${paragraph.roleZh}`}
                  className="rounded-md border border-[var(--lt-border)] bg-[var(--lt-bg)]"
                >
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      aria-label={`${expanded ? "收起" : "展开"}第 ${paragraph.index} 段`}
                      onClick={() => toggleParagraph(paragraph.paragraphId)}
                      className="h-7 w-7 rounded-md text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
                    >
                      {expanded ? "▾" : "▸"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleParagraph(paragraph.paragraphId)}
                      className="min-w-0 flex-1 text-left text-sm font-medium text-[var(--lt-text)]"
                    >
                      第 {paragraph.index} 段｜{paragraph.roleZh}｜{STATUS_LABELS[paragraph.status]}
                    </button>
                    <button
                      type="button"
                      onClick={() => onLocateParagraph(paragraph)}
                      className="rounded-md px-2 py-1 text-xs text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
                    >
                      定位段落
                    </button>
                  </div>
                  {expanded ? (
                    <div className="grid gap-3 border-t border-[var(--lt-border)] px-4 py-3 text-sm">
                      <InfoRow label="段落主旨" value={paragraph.mainPointZh} />
                      <InfoRow label="与全文关系" value={paragraph.relationToPreviousZh ?? "这是文章的起始段。"} />
                      <InfoRow label="段落健康" value={paragraph.healthSummaryZh} />
                      <ParagraphHealthInlineView state={paragraphHealthById[paragraph.paragraphId]} />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onViewHealth(paragraph)}
                          className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-1.5 text-xs font-medium text-[var(--lt-text)] transition hover:bg-[var(--lt-surface-hover)]"
                        >
                          查看建议
                        </button>
                        <button
                          type="button"
                          onClick={() => onCheckParagraph(paragraph)}
                          className="rounded-md bg-[var(--lt-accent-soft)] px-3 py-1.5 text-xs font-medium text-[var(--lt-accent)] transition hover:bg-[var(--lt-accent-soft-strong)]"
                        >
                          检查本段
                        </button>
                        <button
                          type="button"
                          onClick={() => onLocateParagraph(paragraph)}
                          className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
                        >
                          定位段落
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section aria-label="优先修改建议">
            <h3 className="text-sm font-semibold">建议优先处理</h3>
            <ol className="mt-2 grid gap-1 text-sm leading-6 text-[var(--lt-muted)]">
              {result.nextActions.map((action, index) => (
                <li key={`${action.actionZh}-${index}`}>{index + 1}. {action.actionZh}</li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--lt-text)]">{label}</p>
      <p className="mt-1 leading-6 text-[var(--lt-muted)]">{value}</p>
    </div>
  );
}

function ParagraphHealthInlineView({ state }: { state?: DocumentMapParagraphHealthViewState }) {
  if (!state) {
    return null;
  }

  if (state.status === "loading") {
    return (
      <div
        aria-label="段落健康检查运行中"
        data-running-state="paragraph-health"
        className="flex items-center gap-2 rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-xs text-[var(--lt-muted)]"
      >
        <span className="h-2 w-2 animate-ping rounded-full bg-[var(--lt-accent)]" />
        正在整理轻量建议...
      </div>
    );
  }

  if (state.status === "empty" || state.status === "error") {
    return (
      <div className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-xs leading-5 text-[var(--lt-muted)]">
        {state.message}
      </div>
    );
  }

  return (
    <div className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-xs leading-5 text-[var(--lt-muted)]">
      <p className="font-medium text-[var(--lt-text)]">轻量建议</p>
      <p className="mt-1">{state.result.shortSummaryZh}</p>
      {state.result.issueTypes.length > 0 ? (
        <p className="mt-1">
          风险类型：
          {state.result.issueTypes.map((issueType) => PARAGRAPH_HEALTH_ISSUE_LABELS[issueType]).join("、")}
        </p>
      ) : null}
    </div>
  );
}

function ParagraphCheckSubView({
  view,
  onBack,
  onApply,
  onCancel,
}: {
  view: DocumentMapParagraphCheckView;
  onBack: () => void;
  onApply: () => void;
  onCancel: () => void;
}) {
  const flowIssues = view.result?.issues ?? [];
  const detailIssues = view.result?.detailIssues ?? [];
  const meaningfulDetailIssues = detailIssues.filter(shouldDisplayDetailIssue);
  const visibleDetailIssues = meaningfulDetailIssues.slice(0, MAX_VISIBLE_DETAIL_ISSUES);
  const hiddenTrivialDetailIssueCount = detailIssues.length - meaningfulDetailIssues.length;
  const hiddenOverflowDetailIssueCount = Math.max(
    0,
    meaningfulDetailIssues.length - visibleDetailIssues.length,
  );

  return (
    <section aria-label="文章地图二级检查" className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-3 rounded-md px-2 py-1 text-xs text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
          >
            返回文章地图
          </button>
          <h2 className="text-base font-semibold">本段检查</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">{view.title}</p>
          <p className="text-xs leading-5 text-[var(--lt-faint)]">{view.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1.5 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
        >
          关闭
        </button>
      </div>

      {view.message ? (
        <div className="rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-[var(--lt-text)]">{view.message}</div>
      ) : null}
      {view.conflictMessage ? (
        <div className="rounded-md bg-amber-500/[0.1] px-3 py-2 text-sm text-[var(--lt-text)]">{view.conflictMessage}</div>
      ) : null}

      {view.isLoading ? (
        <div
          aria-label="段落检查运行中"
          data-running-state="paragraph-flow"
          className="rounded-md border border-[var(--lt-border)] bg-[var(--lt-bg)] px-4 py-5"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--lt-accent-soft)]">
              <span className="h-3 w-3 animate-ping rounded-full bg-[var(--lt-accent)]" />
            </span>
            <div>
              <p className="text-sm font-medium text-[var(--lt-text)]">正在检查本段...</p>
              <p className="mt-1 text-xs text-[var(--lt-muted)]">正在分析衔接、流畅度和语法拼写等细节。</p>
            </div>
          </div>
        </div>
      ) : null}

      {view.result ? (
        <div className="grid gap-4">
          <section className="rounded-md border border-[var(--lt-border)] bg-[var(--lt-bg)] px-4 py-3">
            <h3 className="text-sm font-semibold">结构与流畅度</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--lt-muted)]">{view.result.summary}</p>
            {flowIssues.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {flowIssues.map((issue, index) => (
                  <li key={`${issue.type}-${index}`} className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm">
                    <div className="font-medium text-[var(--lt-text)]">{PARAGRAPH_FLOW_ISSUE_LABELS[issue.type]}</div>
                    <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">{issue.reason}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--lt-faint)]">
                      {issue.original} -&gt; {issue.suggestion}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-muted)]">
                没有发现明显结构或流畅度问题。
              </p>
            )}
          </section>

          <section className="rounded-md border border-[var(--lt-border)] bg-[var(--lt-bg)] px-4 py-3">
            <h3 className="text-sm font-semibold">细节问题</h3>
            {visibleDetailIssues.length > 0 ? (
              <ul className="mt-3 grid gap-2">
                {visibleDetailIssues.map((issue, index) => (
                  <li key={`${issue.type}-${index}`} className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm">
                    <div className="font-medium text-[var(--lt-text)]">{PARAGRAPH_DETAIL_ISSUE_LABELS[issue.type]}</div>
                    <p className="mt-1 text-xs leading-5 text-[var(--lt-muted)]">{issue.reason}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--lt-faint)]">
                      {issue.original} -&gt; {issue.suggestion}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-md bg-[var(--lt-surface-soft)] px-3 py-2 text-sm text-[var(--lt-muted)]">
                暂未发现需要单独处理的语法、拼写或标点问题。
              </p>
            )}
            {hiddenTrivialDetailIssueCount > 0 ? (
              <p className="mt-2 text-xs leading-5 text-[var(--lt-faint)]">
                已收起 {hiddenTrivialDetailIssueCount} 个空格或排版类小提示，可在最终润色时统一处理。
              </p>
            ) : null}
            {hiddenOverflowDetailIssueCount > 0 ? (
              <p className="mt-2 text-xs leading-5 text-[var(--lt-faint)]">
                还有 {hiddenOverflowDetailIssueCount} 个细节问题未展开，建议先处理上方重点问题。
              </p>
            ) : null}
          </section>

          <section className="rounded-md border border-[var(--lt-border)] bg-[var(--lt-bg)] px-4 py-3">
            <h3 className="text-sm font-semibold">建议改写</h3>
            <DiffViewer parts={view.diffParts} />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onApply}
                className="rounded-md bg-[var(--lt-text)] px-3 py-1.5 text-sm font-medium text-[var(--lt-bg)] transition opacity-95 hover:opacity-85"
              >
                应用段落
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md bg-[var(--lt-surface-soft)] px-3 py-1.5 text-sm text-[var(--lt-muted)] transition hover:bg-[var(--lt-surface-hover)] hover:text-[var(--lt-text)]"
              >
                取消
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
