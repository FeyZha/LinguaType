import { describe, expect, it } from "vitest";
import { checkDocumentMapWithLLM } from "./service";
import {
  documentMapRequestSchema,
  documentMapResultSchema,
  type DocumentMapInput,
} from "./types";

const apiConfig = {
  provider: "openai-compatible",
  baseUrl: "",
  endpointPath: "/v1/chat/completions",
  apiKey: "",
  model: "",
  temperature: 0.2,
  maxTokens: 1800,
  supportsJsonMode: false,
  mockMode: true,
};

const input: DocumentMapInput = {
  text: [
    "Exam pressure changes how students learn. It pushes them to chase scores.",
    "Exam pressure also weakens independent learning. Students repeat short-term drills.",
  ].join("\n\n"),
  essayTopic: "How exam pressure affects students",
  outlinePoints: ["Background", "Cause and impact"],
  domain: "education",
  writingMode: "natural",
  paragraphs: [
    {
      paragraphId: "p1",
      index: 1,
      range: { start: 0, end: 78 },
      text: "Exam pressure changes how students learn. It pushes them to chase scores.",
    },
    {
      paragraphId: "p2",
      index: 2,
      range: { start: 80, end: 161 },
      text: "Exam pressure also weakens independent learning. Students repeat short-term drills.",
    },
  ],
  apiConfig,
  trigger: "manual",
};

describe("checkDocumentMapWithLLM", () => {
  it("parses request trigger as manual by default", () => {
    const parsed = documentMapRequestSchema.parse({
      text: "A short text to check.\n\nMore detail here and there.",
      writingMode: "natural",
      paragraphs: [
        { paragraphId: "p1", index: 1, range: { start: 0, end: 24 }, text: "A short text to check.", hash: "h1", wordCount: 4 },
        { paragraphId: "p2", index: 2, range: { start: 26, end: 48 }, text: "More detail here and there.", hash: "h2", wordCount: 5 },
      ],
      apiConfig,
    });

    expect(parsed.trigger).toBe("manual");
  });

  it("accepts auto_idle trigger and still returns valid document map schema", async () => {
    const autoIdleResult = await checkDocumentMapWithLLM(
      { ...input, trigger: "auto_idle" },
      apiConfig,
    );

    expect(autoIdleResult.overallMainIdeaZh).toContain("How exam pressure affects students");
    expect(autoIdleResult.globalIssues).toBeDefined();
    expect("revisedDocument" in autoIdleResult).toBe(false);
  });

  it("returns a deterministic mock document map without rewrite fields", async () => {
    const result = await checkDocumentMapWithLLM(input, apiConfig);

    expect(result.overallMainIdeaZh).toContain("How exam pressure affects students");
    expect(result.paragraphs.map((paragraph) => paragraph.index)).toEqual([1, 2]);
    expect(result.paragraphs[0]).toMatchObject({
      paragraphId: "p1",
      roleZh: "背景 + 立场",
      status: "healthy",
    });
    expect(result.globalIssues[0]).toMatchObject({
      type: "repetition",
      paragraphIds: ["p1", "p2"],
    });
    expect(result.nextActions[0].targetParagraphIds).toEqual(["p1", "p2"]);
    expect("revisedDocument" in result).toBe(false);
  });

  it("rejects model output that tries to return a full-document rewrite", () => {
    const parsed = documentMapResultSchema.safeParse({
      overallMainIdeaZh: "主旨",
      structureSummaryZh: "结构",
      paragraphs: [],
      globalIssues: [],
      nextActions: [],
      revisedDocument: "A rewritten essay.",
    });

    expect(parsed.success).toBe(false);
  });
});
