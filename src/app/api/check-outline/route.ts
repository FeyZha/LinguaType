import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeOutlineCheckResult } from "@/lib/llm/normalize";
import { resolveServerApiConfig } from "@/lib/llm/serverConfig";
import { checkOutlineWithLLM } from "@/lib/llm/service";
import { outlineCheckRequestSchema, outlineCheckResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = outlineCheckRequestSchema.parse(body);
    const apiConfig = resolveServerApiConfig(input.apiConfig);
    const resolvedInput = { ...input, apiConfig };
    apiKey = apiConfig.apiKey;
    const result = await checkOutlineWithLLM(resolvedInput, apiConfig);
    const normalized = normalizeOutlineCheckResult(result);
    return NextResponse.json(outlineCheckResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "The model returned invalid JSON for outline check.",
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

    const message = error instanceof Error ? error.message : "Outline check failed.";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
