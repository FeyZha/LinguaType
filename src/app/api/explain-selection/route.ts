import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeSelectionExplainResult } from "@/lib/llm/normalize";
import { explainSelectionWithLLM } from "@/lib/llm/service";
import { selectionExplainRequestSchema, selectionExplainResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = selectionExplainRequestSchema.parse(body);
    apiKey = input.apiConfig.apiKey;
    const result = await explainSelectionWithLLM(input, input.apiConfig);
    const normalized = normalizeSelectionExplainResult(result, input.selectedText);
    return NextResponse.json(selectionExplainResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "The model returned invalid JSON for selection explanation.",
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

    const message = error instanceof Error ? error.message : "Selection explanation failed.";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
