import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeParagraphCheckResult } from "@/lib/llm/normalize";
import { resolveServerApiConfig } from "@/lib/llm/serverConfig";
import { checkParagraphFlowWithLLM } from "@/lib/llm/service";
import { paragraphCheckRequestSchema, paragraphCheckResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = paragraphCheckRequestSchema.parse(body);
    const apiConfig = resolveServerApiConfig(input.apiConfig);
    const resolvedInput = { ...input, apiConfig };
    apiKey = apiConfig.apiKey;
    const result = await checkParagraphFlowWithLLM(resolvedInput, apiConfig);
    const normalized = normalizeParagraphCheckResult(result, input.currentParagraph);
    return NextResponse.json(paragraphCheckResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "The model returned invalid JSON for paragraph flow check.",
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

    const message = error instanceof Error ? error.message : "Paragraph flow check failed.";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
