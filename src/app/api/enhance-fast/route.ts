import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeFastEnhanceResult } from "@/lib/llm/normalize";
import { resolveServerApiConfig } from "@/lib/llm/serverConfig";
import { enhanceFastWithLLM } from "@/lib/llm/service";
import { fastEnhanceRequestSchema, fastEnhanceResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = fastEnhanceRequestSchema.parse(body);
    const apiConfig = resolveServerApiConfig(input.apiConfig);
    const resolvedInput = { ...input, apiConfig };
    apiKey = apiConfig.apiKey;
    const result = await enhanceFastWithLLM(resolvedInput, apiConfig);
    const normalized = normalizeFastEnhanceResult(result, input.latestSentence);
    return NextResponse.json(fastEnhanceResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "The model returned invalid JSON for fast enhancement.",
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

    const message = error instanceof Error ? error.message : "Fast enhancement failed.";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
