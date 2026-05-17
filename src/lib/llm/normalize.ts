import { containsChinese } from "@/lib/sentence";
import type {
  ClassifyWritingDomainResult,
  DocumentMapInput,
  DocumentMapResult,
  FastEnhanceModelResult,
  FastEnhanceResult,
  LearningExtractionResult,
  ParagraphCheckResult,
  ParagraphHealthResult,
  OutlineCheckResult,
  SelectionExplainResult,
} from "./types";
import type { EnhanceLatestSentenceResult } from "./types";

export function normalizeEnhancementResult(
  result: EnhanceLatestSentenceResult,
  latestSentence: string,
): EnhanceLatestSentenceResult {
  const hasChinese = containsChinese(latestSentence);
  const finalSentence = result.finalSentence || latestSentence;
  const changed = finalSentence !== latestSentence;
  return {
    ...result,
    originalSentence: latestSentence,
    finalSentence,
    explanationZh: result.explanationZh ?? "",
    hasChinese,
    taskType: hasChinese ? "mixed_chinese_rewrite" : changed ? "english_polish" : "unchanged",
    hasCorrection: changed || result.corrections.length > 0,
    corrections: result.corrections.filter(
      (correction) =>
        correction.before.trim() &&
        correction.after.trim() &&
        correction.before.trim().toLowerCase() !== correction.after.trim().toLowerCase(),
    ),
    learningItems: result.learningItems.filter(
      (item) => item.content.trim() && (item.chineseMeaning.trim() || item.usageNote.trim()),
    ),
  };
}

export function normalizeFastEnhanceResult(
  result: FastEnhanceModelResult,
  latestSentence: string,
): FastEnhanceResult {
  const hasChinese = containsChinese(latestSentence);
  const finalSentence = result.finalSentence || latestSentence;
  const changed = finalSentence !== latestSentence;
  return {
    originalSentence: latestSentence,
    finalSentence,
    explanationZh: result.explanationZh ?? "",
    hasChinese,
    taskType: hasChinese ? "mixed_chinese_rewrite" : changed ? "english_polish" : "unchanged",
  };
}

export function normalizeLearningExtractionResult(
  result: LearningExtractionResult,
): LearningExtractionResult {
  return {
    learningItems: result.learningItems.filter(
      (item) => item.content.trim() && (item.chineseMeaning.trim() || item.usageNote.trim()),
    ),
    correctionEvents: result.correctionEvents.filter((event) => {
      const before = event.before.trim();
      const after = event.after.trim();
      return before.length > 0 && after.length > 0 && before.toLowerCase() !== after.toLowerCase();
    }),
  };
}

export function normalizeParagraphCheckResult(
  result: ParagraphCheckResult,
  currentParagraph: string,
): ParagraphCheckResult {
  const revisedParagraph = result.revisedParagraph || currentParagraph;
  const detailIssues = result.detailIssues ?? [];
  return {
    originalParagraph: currentParagraph,
    revisedParagraph,
    hasIssues: result.issues.length > 0 || detailIssues.length > 0 || revisedParagraph !== currentParagraph,
    issues: result.issues,
    detailIssues,
    summary: result.summary || "No paragraph flow issues found.",
  };
}

export function normalizeParagraphHealthResult(
  result: ParagraphHealthResult,
  currentParagraph: string,
): ParagraphHealthResult {
  const issueTypes = Array.from(new Set(result.issueTypes));
  const issueCount = result.hasIssues ? Math.max(result.issueCount, issueTypes.length) : 0;
  return {
    paragraphFingerprint: result.paragraphFingerprint || createParagraphFingerprint(currentParagraph),
    hasIssues: result.hasIssues && issueCount > 0,
    issueCount,
    issueTypes: result.hasIssues ? issueTypes : [],
    shortSummaryZh: result.shortSummaryZh || (result.hasIssues ? "Paragraph flow may need attention." : "Paragraph looks okay."),
  };
}

export function normalizeSelectionExplainResult(
  result: SelectionExplainResult,
  selectedText: string,
): SelectionExplainResult {
  return {
    selectedText,
    meaningZh: result.meaningZh || `Selected expression: ${selectedText}`,
    usageNoteZh: result.usageNoteZh || "Save this expression if it is useful for future writing.",
    contextRoleZh: result.contextRoleZh || "结合当前上下文理解这个表达的作用。",
    structureNotesZh: result.structureNotesZh,
    expressionType: result.expressionType,
  };
}

export function normalizeOutlineCheckResult(result: OutlineCheckResult): OutlineCheckResult {
  const suggestionsZh = result.suggestionsZh.map((item) => item.trim()).filter(Boolean).slice(0, 3);
  return {
    hasIssues: result.hasIssues && suggestionsZh.length > 0,
    suggestionsZh: result.hasIssues ? suggestionsZh : [],
  };
}

export function normalizeDocumentMapResult(
  result: DocumentMapResult,
  input?: Pick<DocumentMapInput, "paragraphs">,
): DocumentMapResult {
  const inputParagraphs = input?.paragraphs ?? [];
  const inputById = new Map(inputParagraphs.map((paragraph) => [paragraph.paragraphId, paragraph]));
  const knownIssueIds = new Set(result.globalIssues.map((issue) => issue.id));
  const paragraphs = result.paragraphs
    .map((paragraph) => {
      const source = inputById.get(paragraph.paragraphId);
      return {
        ...paragraph,
        index: source?.index ?? paragraph.index,
        range: source?.range ?? paragraph.range,
        roleZh: paragraph.roleZh.trim() || "段落",
        mainPointZh: paragraph.mainPointZh.trim() || "这一段的主旨还不够明确。",
        healthSummaryZh: paragraph.healthSummaryZh.trim() || "未发现明显结构问题。",
        relationToPreviousZh: paragraph.index <= 1 ? null : paragraph.relationToPreviousZh ?? null,
        issueRefs: paragraph.issueRefs.filter((issueId) => knownIssueIds.has(issueId)),
      };
    })
    .sort((first, second) => first.index - second.index);

  const paragraphIds = new Set(paragraphs.map((paragraph) => paragraph.paragraphId));
  const globalIssues = result.globalIssues
    .map((issue) => ({
      ...issue,
      paragraphIds: issue.paragraphIds.filter((paragraphId) => paragraphIds.has(paragraphId)),
      titleZh: issue.titleZh.trim(),
      explanationZh: issue.explanationZh.trim(),
      suggestionZh: issue.suggestionZh.trim(),
    }))
    .filter((issue) => issue.titleZh && issue.paragraphIds.length > 0)
    .slice(0, 6);

  return {
    overallMainIdeaZh: result.overallMainIdeaZh.trim() || "文章主旨还不够明确。",
    structureSummaryZh: result.structureSummaryZh.trim() || "结构关系还需要进一步确认。",
    paragraphs,
    globalIssues,
    nextActions: result.nextActions
      .map((action) => ({
        targetParagraphIds: action.targetParagraphIds.filter((paragraphId) => paragraphIds.has(paragraphId)),
        actionZh: action.actionZh.trim(),
      }))
      .filter((action) => action.actionZh)
      .slice(0, 5),
  };
}

export function normalizeWritingDomainResult(result: ClassifyWritingDomainResult): ClassifyWritingDomainResult {
  return {
    topicArea: result.topicArea,
    confidence:
      typeof result.confidence === "number" && Number.isFinite(result.confidence)
        ? Math.max(0, Math.min(result.confidence, 1))
        : 0.5,
  };
}

export function createParagraphFingerprint(paragraph: string): string {
  let hash = 0;
  const normalized = paragraph.trim().replace(/\s+/gu, " ").toLowerCase();
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return `paragraph-${hash.toString(16)}`;
}
