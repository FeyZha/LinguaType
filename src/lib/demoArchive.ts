import {
  createDocumentMapCacheKey,
  createDocumentMapOutlineHash,
  createDocumentMapParagraphFingerprints,
  createStableHash,
  createDocumentMapTextHash,
  documentMapModelKey,
  splitDocumentIntoParagraphs,
} from "./documentMap";
import { createParagraphFingerprint } from "./llm/normalize";
import type {
  ApiConfig,
  DocumentMapCacheRecord,
  DocumentMapResult,
  FastEnhanceResult,
  LearningExtractionResult,
  ParagraphCheckResult,
  ParagraphHealthCacheItem,
  ParagraphHealthResult,
  SelectionExplainResult,
} from "./llm/types";
import { extractChinesePlaceholderSentences } from "./sentence";
import type {
  PlaceholderSuggestionCacheRecord,
  WritingArchiveItem,
  WritingArchivesState,
  WritingSetup,
} from "./storage";

export const DEMO_ARCHIVE_ID = "linguatype-demo-archive";
export const DEMO_ARCHIVE_TITLE = "体验示例：Independent learning habits";
export const DEMO_ESSAY_TOPIC = "How students can build independent learning habits";

export const DEMO_WRITING_SETUP: WritingSetup = {
  topicArea: "education",
  essayTopic: DEMO_ESSAY_TOPIC,
  outlinePoints: [
    "Explain why school pressure makes independent learning difficult.",
    "Show how small routines and feedback loops help students keep learning.",
    "Connect independent learning habits with long-term language growth.",
  ],
  outline: [
    "Explain why school pressure makes independent learning difficult.",
    "Show how small routines and feedback loops help students keep learning.",
    "Connect independent learning habits with long-term language growth.",
  ].join("\n"),
  updatedAt: "2026-05-17T00:00:00.000Z",
};

export const DEMO_WRITING_TEXT = [
  "Many students understand that independent learning is important, but they often do not know how to 把它落实到每天的行动中. In class, they can follow a teacher's plan, finish homework, and prepare for exams, yet their learning may stop as soon as the class ends. This makes English writing feel like a task that only happens under pressure.",
  "A better habit starts with a small and repeatable routine. For example, a student can spend ten minutes after each lesson rewriting one confusing sentence, saving a useful expression, and asking why the revised sentence sounds more natural. This routine is not dramatic, but it turns passive correction into active noticing.",
  "Technology can support this process when it stays close to the writing moment. If a learner writes, I cannot clearly 表达这个观点 in English, an assistant can help convert that mixed sentence into a natural English sentence without replacing the whole paragraph. The learner still owns the idea, compares the difference, and decides whether to apply the suggestion.",
  "Independent learning also needs a broader view of the article. After several paragraphs are drafted, a structure map can show whether the main idea is clear, whether two paragraphs repeat the same point, and which paragraph should be checked first. In this way, students do not simply chase perfect sentences; they learn how sentences, paragraphs, and the whole article work together.",
].join("\n\n");

const DEMO_ARCHIVE_SIGNATURE = `${DEMO_ARCHIVE_TITLE}|${DEMO_ESSAY_TOPIC}|${DEMO_WRITING_TEXT}`;

export function createDemoWritingArchive(
  now = new Date().toISOString(),
  createId?: () => string,
): WritingArchivesState {
  const id = createId?.() ?? DEMO_ARCHIVE_ID;
  const setup: WritingSetup = {
    ...DEMO_WRITING_SETUP,
    updatedAt: now,
  };

  return {
    activeId: id,
    items: [
      {
        id,
        title: DEMO_ARCHIVE_TITLE,
        text: DEMO_WRITING_TEXT,
        setup,
        createdAt: now,
        updatedAt: now,
        lastOpenedAt: now,
      },
    ],
  };
}

export function isDemoWritingArchive(item: WritingArchiveItem | null | undefined): boolean {
  if (!item) {
    return false;
  }
  const signature = `${item.title}|${item.setup?.essayTopic ?? ""}|${item.text}`;
  return signature === DEMO_ARCHIVE_SIGNATURE;
}

export function isDemoArchiveContext(context: {
  archive: WritingArchiveItem | null | undefined;
  text: string;
}): boolean {
  return isDemoWritingArchive(context.archive) && context.text === DEMO_WRITING_TEXT;
}

export function createDemoPlaceholderSuggestionCache(
  archiveId = DEMO_ARCHIVE_ID,
  now = new Date().toISOString(),
): PlaceholderSuggestionCacheRecord[] {
  const records: PlaceholderSuggestionCacheRecord[] = [];
  extractChinesePlaceholderSentences(DEMO_WRITING_TEXT).forEach((range, index) => {
    const result = getDemoEnhancementResult(range.sentence);
    if (!result) {
      return;
    }
    const sourceText = range.placeholders.map((placeholder) => placeholder.text.trim()).join(" / ");
    records.push({
      id: `demo-placeholder-${index + 1}`,
      requestKey: createDemoPlaceholderRequestKey(range.sentence, archiveId),
      requestInputSnapshot: {
        writingMode: "natural",
        enhancementLevel: "balanced",
        domain: "education",
      },
      archiveId,
      originalSentence: range.sentence,
      finalSentence: result.finalSentence,
      explanationZh: result.explanationZh,
      taskType: result.taskType,
      hasChinese: result.hasChinese,
      markerState: "available",
      reviewed: false,
      latestSentenceRange: { start: range.start, end: range.end, sentence: range.sentence },
      reviewedRange: { start: range.start, end: range.end, sentence: range.sentence },
      placeholderRange: {
        sentence: range.sentence,
        start: range.start,
        end: range.end,
        placeholders: range.placeholders,
      },
      placeholderHint: {
        sourceText,
        targetText: sourceText.includes("落实") ? "put it into practice in their daily actions" : "express this point clearly",
        structure: sourceText.includes("落实")
          ? "结构：put something into practice 表示把想法落实到行动"
          : "结构：express this point clearly 表示清楚表达这个观点",
      },
      updatedAt: now,
    });
  });
  return records;
}

export function createDemoDocumentMapCache(
  apiConfig: ApiConfig,
  archiveId = DEMO_ARCHIVE_ID,
  now = new Date().toISOString(),
): DocumentMapCacheRecord {
  const paragraphs = splitDocumentIntoParagraphs(DEMO_WRITING_TEXT);
  const outlinePoints = DEMO_WRITING_SETUP.outlinePoints;
  const textHash = createDocumentMapTextHash(DEMO_WRITING_TEXT);
  const outlineHash = createDocumentMapOutlineHash(outlinePoints);
  const model = documentMapModelKey(apiConfig);
  const cacheKey = createDocumentMapCacheKey({
    archiveId,
    textHash,
    essayTopic: DEMO_ESSAY_TOPIC,
    outlinePoints,
    domain: "education",
    model,
  });

  return {
    cacheKey,
    archiveId,
    textHash,
    essayTopic: DEMO_ESSAY_TOPIC,
    essayTopicHash: createStableHash(DEMO_ESSAY_TOPIC.trim()),
    outlinePointsHash: outlineHash,
    outlineHash,
    paragraphFingerprints: createDocumentMapParagraphFingerprints(paragraphs),
    domain: "education",
    model,
    createdAt: now,
    generatedAt: now,
    freshness: "ready",
    autoCheckCountInSession: 0,
    result: createDemoDocumentMapResult(),
  };
}

export function createDemoParagraphHealthCache(now = new Date().toISOString()): ParagraphHealthCacheItem[] {
  return demoParagraphs().map((paragraph, index) => {
    const result = createDemoParagraphHealthResult(paragraph, index + 1);
    return {
      paragraphFingerprint: result.paragraphFingerprint,
      result,
      checkedAt: now,
    };
  });
}

export function getDemoEnhancementResult(sentence: string): FastEnhanceResult | null {
  const normalized = normalizeSentence(sentence);
  const mapped = DEMO_SENTENCE_ENHANCEMENTS.get(normalized);
  if (mapped) {
    return mapped;
  }
  if (DEMO_WRITING_TEXT.includes(sentence.trim())) {
    return {
      originalSentence: sentence,
      finalSentence: sentence,
      explanationZh: "这句话已经比较自然，可以保留原句。",
      taskType: "unchanged",
      hasChinese: /[\u3400-\u9fff]/u.test(sentence),
    };
  }
  return null;
}

export function getDemoLearningExtractionResult(
  originalSentence: string,
  finalSentence: string,
): LearningExtractionResult | null {
  const original = normalizeSentence(originalSentence);
  if (original.includes("把它落实到每天的行动中")) {
    return {
      learningItems: [
        {
          type: "phrase",
          content: "put it into practice",
          chineseMeaning: "把想法、计划落实到实际行动中",
          usageNote: "常用于说明从理解或计划走向执行。",
          difficultyLevel: 3,
          tags: ["demo", "learning habits"],
          topic: "education",
        },
      ],
      correctionEvents: [
        {
          before: "把它落实到每天的行动中",
          after: "put it into practice in their daily actions",
          type: "chinese_transfer",
          reason: "将中文动作表达改成英语中更自然的动宾结构。",
        },
      ],
    };
  }
  if (original.includes("表达这个观点")) {
    return {
      learningItems: [
        {
          type: "collocation",
          content: "express this point clearly",
          chineseMeaning: "清楚表达这个观点",
          usageNote: "适合说明观点表达是否明确。",
          difficultyLevel: 2,
          tags: ["demo", "clarity"],
          topic: "education",
        },
      ],
      correctionEvents: [
        {
          before: "I cannot clearly 表达这个观点 in English",
          after: "I cannot express this point clearly in English",
          type: "word_order",
          reason: "英语中宾语通常放在 express 后，副词 clearly 可以放在宾语之后让表达更顺。",
        },
      ],
    };
  }
  if (finalSentence.trim()) {
    return { learningItems: [], correctionEvents: [] };
  }
  return null;
}

export function getDemoParagraphHealthResult(paragraph: string): ParagraphHealthResult | null {
  const index = demoParagraphs().findIndex((candidate) => normalizeParagraph(candidate) === normalizeParagraph(paragraph));
  return index >= 0 ? createDemoParagraphHealthResult(demoParagraphs()[index], index + 1) : null;
}

export function getDemoParagraphFlowResult(paragraph: string): ParagraphCheckResult | null {
  const index = demoParagraphs().findIndex((candidate) => normalizeParagraph(candidate) === normalizeParagraph(paragraph));
  if (index < 0) {
    return null;
  }
  return DEMO_PARAGRAPH_FLOW_RESULTS[index];
}

export function getDemoSelectionExplainResult(
  selectedText: string,
  fullText = DEMO_WRITING_TEXT,
): SelectionExplainResult | null {
  const text = selectedText.trim();
  if (!text || !fullText.includes(text)) {
    return null;
  }

  const lower = text.toLowerCase();
  if (lower.includes("independent learning")) {
    return {
      selectedText: text,
      meaningZh: "自主学习，强调学习者主动安排、复盘和调整学习过程。",
      usageNoteZh: "适合教育、个人成长类文章，用来讨论学习习惯和学习责任。",
      contextRoleZh: "这里是全文核心概念，后文的 routine、feedback loop 和 article map 都在服务这个概念。",
      structureNotesZh: "independent + learning 组成名词短语，可直接作主语、宾语或修饰 habits。",
      expressionType: "phrase",
    };
  }
  if (lower.includes("put it into practice")) {
    return {
      selectedText: text,
      meaningZh: "把某个想法或计划落实到实际行动中。",
      usageNoteZh: "常用于从“知道”过渡到“做到”的语境。",
      contextRoleZh: "这里解释学生知道自主学习重要，却不知道怎样每天执行。",
      structureNotesZh: "put + idea/plan/it + into practice 是固定搭配。",
      expressionType: "collocation",
    };
  }
  if (lower.includes("express this point clearly")) {
    return {
      selectedText: text,
      meaningZh: "清楚地表达这个观点。",
      usageNoteZh: "适合描述观点表达是否准确、清晰。",
      contextRoleZh: "这是示例中的中英混合输入被改写后的目标表达。",
      structureNotesZh: "express + object + clearly 比直译中文语序更自然。",
      expressionType: "collocation",
    };
  }

  return {
    selectedText: text,
    meaningZh: "这是示例文档中的英文表达，可结合上下文理解其功能。",
    usageNoteZh: "选中文本解释已预置，方便体验用户不用等待模型返回。",
    contextRoleZh: "它服务于“独立学习习惯如何建立”的论述。",
    structureNotesZh: "可保存到表达库，后续在写作时复用。",
    expressionType: text.split(/\s+/u).length > 4 ? "sentence" : "phrase",
  };
}

function createDemoDocumentMapResult(): DocumentMapResult {
  const paragraphs = splitDocumentIntoParagraphs(DEMO_WRITING_TEXT);
  return {
    overallMainIdeaZh: "文章主张：独立学习不是单靠意志力，而是靠可重复的小习惯、即时反馈和对全文结构的持续观察建立起来。",
    structureSummaryZh: "文章按“问题背景 -> 习惯方法 -> 写作辅助 -> 全文结构视角”推进，论证方向清楚。",
    paragraphs: [
      {
        paragraphId: "p1",
        index: 1,
        range: paragraphs[0].range,
        roleZh: "问题背景",
        mainPointZh: "说明学生理解自主学习重要，但常停留在课堂和考试压力之内。",
        status: "healthy",
        healthSummaryZh: "开头能明确问题，读者容易进入主题。",
        relationToPreviousZh: null,
        issueRefs: [],
      },
      {
        paragraphId: "p2",
        index: 2,
        range: paragraphs[1].range,
        roleZh: "方法展开",
        mainPointZh: "提出可重复的小习惯，把被动改错转成主动 noticing。",
        status: "healthy",
        healthSummaryZh: "例子具体，和第一段形成自然承接。",
        relationToPreviousZh: "承接第一段的问题，给出更可执行的学习路径。",
        issueRefs: [],
      },
      {
        paragraphId: "p3",
        index: 3,
        range: paragraphs[2].range,
        roleZh: "工具连接",
        mainPointZh: "说明贴近写作时刻的辅助工具如何帮助中英混合表达变自然。",
        status: "has_suggestions",
        healthSummaryZh: "示例清楚，但和自主学习习惯之间的连接可以再点明。",
        relationToPreviousZh: "从学习 routine 转到技术支持，过渡略快。",
        issueRefs: ["demo_issue_tool_bridge"],
      },
      {
        paragraphId: "p4",
        index: 4,
        range: paragraphs[3].range,
        roleZh: "结构收束",
        mainPointZh: "把句子层面的修改提升到段落和全文结构的观察。",
        status: "healthy",
        healthSummaryZh: "结尾能把文章地图和长期写作能力连接起来。",
        relationToPreviousZh: "补足第三段的工具视角，回到全文结构。",
        issueRefs: [],
      },
    ],
    globalIssues: [
      {
        id: "demo_issue_tool_bridge",
        type: "weak_transition",
        severity: "low",
        titleZh: "第 3 段从学习习惯转到工具时，过渡可以更明确",
        paragraphIds: ["p2", "p3"],
        explanationZh: "第 2 段讲学习 routine，第 3 段突然进入技术辅助，读者能理解但连接词还可以更清楚。",
        suggestionZh: "在第 3 段开头补一句说明：工具的价值在于帮助学生把 routine 坚持在真实写作场景里。",
      },
    ],
    nextActions: [
      {
        targetParagraphIds: ["p3"],
        actionZh: "优先检查第 3 段，让“技术辅助”和“独立学习习惯”之间的关系更紧。",
      },
      {
        targetParagraphIds: ["p1", "p4"],
        actionZh: "确认开头的问题和结尾的结构视角互相呼应。",
      },
    ],
  };
}

function createDemoParagraphHealthResult(paragraph: string, index: number): ParagraphHealthResult {
  const base = {
    paragraphFingerprint: createParagraphFingerprint(paragraph),
  };
  if (index === 3) {
    return {
      ...base,
      hasIssues: true,
      issueCount: 1,
      issueTypes: ["weak_development"],
      shortSummaryZh: "这一段的例子清楚，但需要再说明技术辅助如何服务于独立学习习惯。",
    };
  }
  return {
    ...base,
    hasIssues: false,
    issueCount: 0,
    issueTypes: [],
    shortSummaryZh: "这一段结构清楚，暂未发现明显轻量问题。",
  };
}

function demoParagraphs(): string[] {
  return DEMO_WRITING_TEXT.split(/\n\n/u);
}

function normalizeSentence(sentence: string): string {
  return sentence.trim().replace(/\s+/gu, " ");
}

function normalizeParagraph(paragraph: string): string {
  return paragraph.trim().replace(/\s+/gu, " ");
}

function createDemoPlaceholderRequestKey(sentence: string, archiveId: string): string {
  return `${archiveId}|natural|balanced|education|${sentence.trim()}`;
}

const DEMO_SENTENCE_ENHANCEMENT_ITEMS: FastEnhanceResult[] = [
    {
      originalSentence: "Many students understand that independent learning is important, but they often do not know how to 把它落实到每天的行动中.",
      finalSentence: "Many students understand that independent learning is important, but they often do not know how to put it into practice in their daily actions.",
      explanationZh: "把“落实到每天的行动中”改成 put it into practice in their daily actions，保留原意并让动作关系更符合英文表达。",
      taskType: "mixed_chinese_rewrite",
      hasChinese: true,
    },
    {
      originalSentence: "In class, they can follow a teacher's plan, finish homework, and prepare for exams, yet their learning may stop as soon as the class ends.",
      finalSentence: "In class, they can follow a teacher's plan, finish homework, and prepare for exams, yet their learning may stop once the class ends.",
      explanationZh: "用 once the class ends 收紧句尾，语气更简洁。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "This makes English writing feel like a task that only happens under pressure.",
      finalSentence: "This makes English writing feel like something students do only under pressure.",
      explanationZh: "把抽象的 task 改成 something students do，主语关系更清楚。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "A better habit starts with a small and repeatable routine.",
      finalSentence: "A better habit starts with a small, repeatable routine.",
      explanationZh: "用并列形容词 small, repeatable routine 让表达更紧凑。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "For example, a student can spend ten minutes after each lesson rewriting one confusing sentence, saving a useful expression, and asking why the revised sentence sounds more natural.",
      finalSentence: "For example, a student can spend ten minutes after each lesson rewriting one confusing sentence, saving a useful expression, and asking why the revision sounds more natural.",
      explanationZh: "用 the revision 替代重复的 revised sentence，句子更轻。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "This routine is not dramatic, but it turns passive correction into active noticing.",
      finalSentence: "This routine is not dramatic, but it turns passive correction into active noticing.",
      explanationZh: "这句话已经简洁自然，可以保留原句。",
      taskType: "unchanged",
      hasChinese: false,
    },
    {
      originalSentence: "Technology can support this process when it stays close to the writing moment.",
      finalSentence: "Technology can support this process when it stays close to the moment of writing.",
      explanationZh: "the moment of writing 比 writing moment 更自然正式。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "If a learner writes, I cannot clearly 表达这个观点 in English, an assistant can help convert that mixed sentence into a natural English sentence without replacing the whole paragraph.",
      finalSentence: "If a learner writes, “I cannot express this point clearly in English,” an assistant can help turn that mixed sentence into natural English without replacing the whole paragraph.",
      explanationZh: "把中文片段改成 express this point clearly，并用引号标出示例句，读者更容易识别。",
      taskType: "mixed_chinese_rewrite",
      hasChinese: true,
    },
    {
      originalSentence: "The learner still owns the idea, compares the difference, and decides whether to apply the suggestion.",
      finalSentence: "The learner still owns the idea, compares the difference, and decides whether to apply the suggestion.",
      explanationZh: "这句话准确概括了用户确认后再应用的边界，可以保留原句。",
      taskType: "unchanged",
      hasChinese: false,
    },
    {
      originalSentence: "Independent learning also needs a broader view of the article.",
      finalSentence: "Independent learning also needs a broader view of the whole article.",
      explanationZh: "补充 whole article，让全文结构视角更明确。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "After several paragraphs are drafted, a structure map can show whether the main idea is clear, whether two paragraphs repeat the same point, and which paragraph should be checked first.",
      finalSentence: "After several paragraphs are drafted, a structure map can show whether the main idea is clear, whether any paragraphs repeat the same point, and which paragraph should be checked first.",
      explanationZh: "any paragraphs 比 two paragraphs 更开放，适合泛指全文检查。",
      taskType: "english_polish",
      hasChinese: false,
    },
    {
      originalSentence: "In this way, students do not simply chase perfect sentences; they learn how sentences, paragraphs, and the whole article work together.",
      finalSentence: "In this way, students do not simply chase perfect sentences; they learn how sentences, paragraphs, and the whole article work together.",
      explanationZh: "结尾层次清楚，可以保留原句。",
      taskType: "unchanged",
      hasChinese: false,
    },
];

const DEMO_SENTENCE_ENHANCEMENTS = new Map<string, FastEnhanceResult>(
  DEMO_SENTENCE_ENHANCEMENT_ITEMS.map((item) => [normalizeSentence(item.originalSentence), item]),
);

const DEMO_PARAGRAPH_FLOW_RESULTS: ParagraphCheckResult[] = [
  {
    originalParagraph: demoParagraphs()[0],
    revisedParagraph: "Many students understand that independent learning is important, but they often do not know how to put it into practice in their daily actions. In class, they can follow a teacher's plan, finish homework, and prepare for exams, yet their learning may stop once the class ends. This makes English writing feel like something students do only under pressure.",
    hasIssues: true,
    issues: [
      {
        type: "weak_development",
        original: "they often do not know how to 把它落实到每天的行动中",
        suggestion: "they often do not know how to put it into practice in their daily actions",
        reason: "中文片段需要转换成自然英文，段落开头才更顺。",
      },
    ],
    detailIssues: [
      {
        type: "collocation",
        original: "落实到每天的行动中",
        suggestion: "put it into practice in their daily actions",
        reason: "put something into practice 更符合英文搭配。",
      },
    ],
    summary: "这一段的问题意识清楚，主要建议是把中英混合句改成自然英文，并收紧最后一句。",
  },
  {
    originalParagraph: demoParagraphs()[1],
    revisedParagraph: "A better habit starts with a small, repeatable routine. For example, a student can spend ten minutes after each lesson rewriting one confusing sentence, saving a useful expression, and asking why the revision sounds more natural. This routine is not dramatic, but it turns passive correction into active noticing.",
    hasIssues: true,
    issues: [
      {
        type: "repetition",
        original: "the revised sentence",
        suggestion: "the revision",
        reason: "减少 sentence 的重复，句子更轻。",
      },
    ],
    detailIssues: [
      {
        type: "punctuation",
        original: "small and repeatable routine",
        suggestion: "small, repeatable routine",
        reason: "并列形容词用逗号连接更紧凑。",
      },
    ],
    summary: "这一段例子具体，只需要轻微压缩重复表达。",
  },
  {
    originalParagraph: demoParagraphs()[2],
    revisedParagraph: "Technology can support this process when it stays close to the moment of writing. If a learner writes, “I cannot express this point clearly in English,” an assistant can help turn that mixed sentence into natural English without replacing the whole paragraph. The learner still owns the idea, compares the difference, and decides whether to apply the suggestion.",
    hasIssues: true,
    issues: [
      {
        type: "transition",
        original: "Technology can support this process",
        suggestion: "Technology can support this routine when it stays close to the moment of writing",
        reason: "把 this process 指回上一段的 routine，段落衔接更明确。",
      },
      {
        type: "weak_development",
        original: "I cannot clearly 表达这个观点 in English",
        suggestion: "I cannot express this point clearly in English",
        reason: "示例句应完整展示混合输入如何变成自然英文。",
      },
    ],
    detailIssues: [
      {
        type: "grammar",
        original: "I cannot clearly 表达这个观点 in English",
        suggestion: "I cannot express this point clearly in English",
        reason: "英语里 express 后接宾语 this point，clearly 放在宾语后更自然。",
      },
    ],
    summary: "这一段最值得检查：它展示产品能力，但需要把技术辅助和独立学习习惯连接得更紧。",
  },
  {
    originalParagraph: demoParagraphs()[3],
    revisedParagraph: "Independent learning also needs a broader view of the whole article. After several paragraphs are drafted, a structure map can show whether the main idea is clear, whether any paragraphs repeat the same point, and which paragraph should be checked first. In this way, students do not simply chase perfect sentences; they learn how sentences, paragraphs, and the whole article work together.",
    hasIssues: true,
    issues: [
      {
        type: "weak_development",
        original: "a broader view of the article",
        suggestion: "a broader view of the whole article",
        reason: "补充 whole 可以更明确地引出全文结构。",
      },
    ],
    detailIssues: [],
    summary: "结尾能把句子、段落和全文结构连起来，建议只做轻微措辞强化。",
  },
];
