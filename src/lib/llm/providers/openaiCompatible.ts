import {
  InvalidModelJsonError,
  InvalidModelSchemaError,
  parseModelJson,
  redactApiKey,
} from "@/lib/json";
import { buildEnhancementUserPrompt, LINGUATYPE_SYSTEM_PROMPT } from "../prompts";
import { normalizeEnhancementResult } from "../normalize";
import {
  enhancementResultSchema,
  type ApiConfig,
  type EnhanceLatestSentenceInput,
  type EnhanceLatestSentenceResult,
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
