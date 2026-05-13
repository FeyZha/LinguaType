import {
  InvalidModelJsonError,
  InvalidModelSchemaError,
  parseModelJson,
  redactApiKey,
} from "@/lib/json";
import {
  buildFastEnhancementUserPrompt,
  buildEnhancementUserPrompt,
  buildLearningExtractionUserPrompt,
  buildOutlineCheckUserPrompt,
  buildParagraphHealthUserPrompt,
  buildParagraphFlowUserPrompt,
  buildSelectionExplainUserPrompt,
  FAST_ENHANCEMENT_SYSTEM_PROMPT,
  LINGUATYPE_SYSTEM_PROMPT,
  LEARNING_EXTRACTION_SYSTEM_PROMPT,
  OUTLINE_CHECK_SYSTEM_PROMPT,
  PARAGRAPH_HEALTH_SYSTEM_PROMPT,
  PARAGRAPH_FLOW_SYSTEM_PROMPT,
  SELECTION_EXPLAIN_SYSTEM_PROMPT,
} from "../prompts";
import {
  normalizeEnhancementResult,
  normalizeFastEnhanceResult,
  normalizeLearningExtractionResult,
  normalizeOutlineCheckResult,
  normalizeParagraphCheckResult,
  normalizeParagraphHealthResult,
  normalizeSelectionExplainResult,
} from "../normalize";
import {
  enhancementResultSchema,
  fastEnhanceModelResultSchema,
  fastEnhanceResultSchema,
  learningExtractionResultSchema,
  outlineCheckResultSchema,
  paragraphCheckResultSchema,
  paragraphHealthResultSchema,
  selectionExplainResultSchema,
  type ApiConfig,
  type EnhanceLatestSentenceInput,
  type EnhanceLatestSentenceResult,
  type FastEnhanceInput,
  type FastEnhanceResult,
  type LearningExtractionInput,
  type LearningExtractionResult,
  type OutlineCheckInput,
  type OutlineCheckResult,
  type ParagraphCheckInput,
  type ParagraphCheckResult,
  type ParagraphHealthInput,
  type ParagraphHealthResult,
  type SelectionExplainInput,
  type SelectionExplainResult,
} from "../types";

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function enhanceWithOpenAICompatibleProvider(
  input: EnhanceLatestSentenceInput,
): Promise<EnhanceLatestSentenceResult> {
  const apiConfig = input.apiConfig;
  assertRealProviderConfig(apiConfig);

  const body: Record<string, unknown> = {
    model: apiConfig.model,
    temperature: apiConfig.temperature,
    max_tokens: apiConfig.maxTokens,
    messages: [
      { role: "system", content: LINGUATYPE_SYSTEM_PROMPT },
      { role: "user", content: buildEnhancementUserPrompt(input) },
    ],
  };

  if (apiConfig.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(providerUrl(apiConfig), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(redactApiKey(`Provider request failed: ${response.status} ${responseText}`, apiConfig.apiKey));
  }

  const completion = JSON.parse(responseText) as ChatCompletionResponse;
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Provider response did not include message content.");
  }

  const parsed = parseModelJson(content);
  const validated = enhancementResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeEnhancementResult(validated.data, input.latestSentence);
}

export async function enhanceFastWithOpenAICompatibleProvider(
  input: FastEnhanceInput,
): Promise<FastEnhanceResult> {
  const content = await requestOpenAICompatibleJson(
    input.apiConfig,
    FAST_ENHANCEMENT_SYSTEM_PROMPT,
    buildFastEnhancementUserPrompt(input),
  );
  const parsed = parseModelJson(content);
  const validated = fastEnhanceModelResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid fast enhancement response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeFastEnhanceResult(validated.data, input.latestSentence);
}

export async function extractLearningWithOpenAICompatibleProvider(
  input: LearningExtractionInput,
): Promise<LearningExtractionResult> {
  const content = await requestOpenAICompatibleJson(
    input.apiConfig,
    LEARNING_EXTRACTION_SYSTEM_PROMPT,
    buildLearningExtractionUserPrompt(input),
  );
  const parsed = parseModelJson(content);
  const validated = learningExtractionResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid learning extraction response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeLearningExtractionResult(validated.data);
}

export async function checkParagraphFlowWithOpenAICompatibleProvider(
  input: ParagraphCheckInput,
): Promise<ParagraphCheckResult> {
  const apiConfig = input.apiConfig;
  assertRealProviderConfig(apiConfig);

  const body: Record<string, unknown> = {
    model: apiConfig.model,
    temperature: apiConfig.temperature,
    max_tokens: apiConfig.maxTokens,
    messages: [
      { role: "system", content: PARAGRAPH_FLOW_SYSTEM_PROMPT },
      { role: "user", content: buildParagraphFlowUserPrompt(input) },
    ],
  };

  if (apiConfig.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(providerUrl(apiConfig), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(redactApiKey(`Provider request failed: ${response.status} ${responseText}`, apiConfig.apiKey));
  }

  const completion = JSON.parse(responseText) as ChatCompletionResponse;
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Provider response did not include message content.");
  }

  const parsed = parseModelJson(content);
  const validated = paragraphCheckResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid paragraph flow response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeParagraphCheckResult(validated.data, input.currentParagraph);
}

export async function checkParagraphHealthWithOpenAICompatibleProvider(
  input: ParagraphHealthInput,
): Promise<ParagraphHealthResult> {
  const content = await requestOpenAICompatibleJson(
    input.apiConfig,
    PARAGRAPH_HEALTH_SYSTEM_PROMPT,
    buildParagraphHealthUserPrompt(input),
  );
  const parsed = parseModelJson(content);
  const validated = paragraphHealthResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeParagraphHealthResult(validated.data, input.currentParagraph);
}

export async function checkOutlineWithOpenAICompatibleProvider(
  input: OutlineCheckInput,
): Promise<OutlineCheckResult> {
  const content = await requestOpenAICompatibleJson(
    input.apiConfig,
    OUTLINE_CHECK_SYSTEM_PROMPT,
    buildOutlineCheckUserPrompt(input),
  );
  const parsed = parseModelJson(content);
  const validated = outlineCheckResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid outline check response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeOutlineCheckResult(validated.data);
}

export async function explainSelectionWithOpenAICompatibleProvider(
  input: SelectionExplainInput,
): Promise<SelectionExplainResult> {
  const content = await requestOpenAICompatibleJson(
    input.apiConfig,
    SELECTION_EXPLAIN_SYSTEM_PROMPT,
    buildSelectionExplainUserPrompt(input),
  );
  const parsed = parseModelJson(content);
  const validated = selectionExplainResultSchema.safeParse(extractEnhancementCandidate(parsed));
  if (!validated.success) {
    throw new InvalidModelSchemaError(
      `Provider returned an invalid selection explanation response shape: ${validated.error.message}`,
      content,
    );
  }

  return normalizeSelectionExplainResult(validated.data, input.selectedText);
}

export async function testOpenAICompatibleConnection(apiConfig: ApiConfig): Promise<boolean> {
  assertRealProviderConfig(apiConfig);

  const body: Record<string, unknown> = {
    model: apiConfig.model,
    temperature: 0,
    max_tokens: 20,
    messages: [
      { role: "system", content: "Return valid JSON only." },
      { role: "user", content: 'Return exactly {"ok": true}.' },
    ],
  };

  if (apiConfig.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(providerUrl(apiConfig), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(redactApiKey(`Provider test failed: ${response.status} ${responseText}`, apiConfig.apiKey));
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = parseModelJson(content);
    return typeof parsed === "object" && parsed !== null && "ok" in parsed;
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return content.trim().length > 0;
    }
    throw error;
  }
}

async function requestOpenAICompatibleJson(
  apiConfig: ApiConfig,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  assertRealProviderConfig(apiConfig);

  const body: Record<string, unknown> = {
    model: apiConfig.model,
    temperature: apiConfig.temperature,
    max_tokens: apiConfig.maxTokens,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  };

  if (apiConfig.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch(providerUrl(apiConfig), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(redactApiKey(`Provider request failed: ${response.status} ${responseText}`, apiConfig.apiKey));
  }

  const completion = JSON.parse(responseText) as ChatCompletionResponse;
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Provider response did not include message content.");
  }

  return content;
}

function assertRealProviderConfig(apiConfig: ApiConfig): void {
  if (!apiConfig.baseUrl || !apiConfig.apiKey || !apiConfig.model) {
    throw new Error("除非启用 Mock 模式，否则需要填写 API Base URL、API Key 和模型名称。");
  }
}

function providerUrl(apiConfig: ApiConfig): string {
  const baseUrl = apiConfig.baseUrl.replace(/\/+$/u, "");
  const endpointPath = apiConfig.endpointPath.startsWith("/")
    ? apiConfig.endpointPath
    : `/${apiConfig.endpointPath}`;
  return `${baseUrl}${endpointPath}`;
}

function extractEnhancementCandidate(parsed: unknown): unknown {
  if (!isRecord(parsed)) {
    return parsed;
  }

  for (const key of ["result", "data", "response", "output", "enhancement", "enhancementResult"]) {
    const value = parsed[key];
    if (isRecord(value)) {
      return value;
    }
    if (typeof value === "string") {
      try {
        return parseModelJson(value);
      } catch {
        continue;
      }
    }
  }

  return parsed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
