import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeParagraphHealthResult } from "@/lib/llm/normalize";
import { resolveServerApiConfig } from "@/lib/llm/serverConfig";
import { checkParagraphHealthWithLLM } from "@/lib/llm/service";
import { paragraphHealthRequestSchema, paragraphHealthResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = paragraphHealthRequestSchema.parse(body);
    const apiConfig = resolveServerApiConfig(input.apiConfig);
    const resolvedInput = { ...input, apiConfig };
    apiKey = apiConfig.apiKey;
    const result = await checkParagraphHealthWithLLM(resolvedInput, apiConfig);
    const normalized = normalizeParagraphHealthResult(result, input.currentParagraph);
    return NextResponse.json(paragraphHealthResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "The model returned invalid JSON for.",
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

    const message = error instanceof Error ? error.message : "Paragraph health check failed.";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
