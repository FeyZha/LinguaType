import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeEnhancementResult } from "@/lib/llm/normalize";
import { resolveServerApiConfig } from "@/lib/llm/serverConfig";
import { enhanceLatestSentenceWithLLM } from "@/lib/llm/service";
import { enhanceRequestSchema, enhancementResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = enhanceRequestSchema.parse(body);
    const apiConfig = resolveServerApiConfig(input.apiConfig);
    const resolvedInput = { ...input, apiConfig };
    apiKey = apiConfig.apiKey;
    const result = await enhanceLatestSentenceWithLLM(resolvedInput, apiConfig);
    const normalized = normalizeEnhancementResult(result, input.latestSentence);
    return NextResponse.json(enhancementResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "模型返回的内容不是有效 JSON。",
          rawResponse: redactApiKey(error.rawResponse, apiKey),
        },
        { status: 422 },
      );
    }

    if (error instanceof InvalidModelSchemaError) {
      return NextResponse.json(
        {
          error: redactApiKey(error.message, apiKey),
          rawResponse: redactApiKey(error.rawResponse, apiKey),
        },
        { status: 422 },
      );
    }

    const message = error instanceof Error ? error.message : "润色失败。";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
