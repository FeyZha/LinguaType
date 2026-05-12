import { afterEach, describe, expect, it, vi } from "vitest";
import {
  enhanceFastWithOpenAICompatibleProvider,
  enhanceWithOpenAICompatibleProvider,
  testOpenAICompatibleConnection,
} from "./openaiCompatible";
import type { ApiConfig, EnhanceLatestSentenceInput, FastEnhanceInput } from "../types";

const baseConfig: ApiConfig = {
  provider: "openai-compatible",
  baseUrl: "https://llm.example.com",
  endpointPath: "/v1/chat/completions",
  apiKey: "sk-secret-1234567890",
  model: "demo-model",
  temperature: 0.2,
  maxTokens: 900,
  supportsJsonMode: false,
  mockMode: false,
};

const baseInput: EnhanceLatestSentenceInput = {
  fullText: "Many student believe that AI tools can 提高学习效率.",
  latestSentence: "Many student believe that AI tools can 提高学习效率.",
  previousContext: "",
  currentParagraph: "Many student believe that AI tools can 提高学习效率.",
  writingMode: "natural",
  enhancementLevel: "balanced",
  apiConfig: baseConfig,
};

const fastInput: FastEnhanceInput = {
  fullText: "This may 影响 young people's values.",
  latestSentence: "This may 影响 young people's values.",
  previousContext: "",
  currentParagraph: "This may 影响 young people's values.",
  writingMode: "natural",
  enhancementLevel: "balanced",
  apiConfig: baseConfig,
};

const modelJson = {
  taskType: "english_sentence_polishing",
  originalSentence: "wrong",
  finalSentence: "Many students believe that AI tools can improve learning efficiency.",
  hasChinese: false,
  insertedExpressions: [{ before: "提高学习效率", after: "improve learning efficiency" }],
  hasCorrection: true,
  corrections: [],
  coherenceRisk: { hasRisk: false, message: "" },
  learningItems: [],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("openai compatible provider", () => {
  it("omits response_format when supportsJsonMode defaults to false", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(modelJson) } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await enhanceWithOpenAICompatibleProvider(baseInput);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;

    expect(body.response_format).toBeUndefined();
    expect(result.hasChinese).toBe(true);
    expect(result.taskType).toBe("mixed_chinese_rewrite");
  });

  it("adds response_format only when JSON mode is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(modelJson) } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await enhanceWithOpenAICompatibleProvider({
      ...baseInput,
      apiConfig: { ...baseConfig, supportsJsonMode: true },
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;

    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("redacts API keys from provider errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad sk-secret-1234567890", { status: 401 })),
    );

    await expect(enhanceWithOpenAICompatibleProvider(baseInput)).rejects.toThrow(
      "[REDACTED_API_KEY]",
    );
  });

  it("throws when model content is invalid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "not json" } }],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(enhanceWithOpenAICompatibleProvider(baseInput)).rejects.toThrow(
      "The model returned invalid JSON.",
    );
  });

  it("throws when model JSON has an invalid schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"finalSentence":"Missing required fields"}' } }],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(enhanceWithOpenAICompatibleProvider(baseInput)).rejects.toThrow(
      "Provider returned an invalid response shape",
    );
  });

  it("accepts a provider response wrapped in a result object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ result: modelJson }) } }],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await enhanceWithOpenAICompatibleProvider(baseInput);

    expect(result.finalSentence).toBe("Many students believe that AI tools can improve learning efficiency.");
    expect(result.taskType).toBe("mixed_chinese_rewrite");
  });

  it("normalizes fast enhancement when the model echoes the prompt taskType union", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    finalSentence: "This may affect young people's values.",
                    explanationZh: "将中文片段转换为自然英文。",
                    taskType: "mixed_chinese_rewrite | english_polish | unchanged",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await enhanceFastWithOpenAICompatibleProvider(fastInput);

    expect(result.originalSentence).toBe(fastInput.latestSentence);
    expect(result.finalSentence).toBe("This may affect young people's values.");
    expect(result.hasChinese).toBe(true);
    expect(result.taskType).toBe("mixed_chinese_rewrite");
  });

  it("uses a minimal connection-test prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"ok": true}' } }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(testOpenAICompatibleConnection(baseConfig)).resolves.toBe(true);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as {
      messages: Array<{ content: string }>;
    };

    expect(body.messages.map((message) => message.content).join("\n")).toContain('{"ok": true}');
    expect(body.messages.map((message) => message.content).join("\n")).not.toContain(
      "Latest sentence:",
    );
  });
});
