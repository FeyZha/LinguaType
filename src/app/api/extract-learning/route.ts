import { InvalidModelJsonError, InvalidModelSchemaError, redactApiKey } from "@/lib/json";
import { normalizeLearningExtractionResult } from "@/lib/llm/normalize";
import { extractLearningWithLLM } from "@/lib/llm/service";
import { learningExtractionRequestSchema, learningExtractionResultSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const input = learningExtractionRequestSchema.parse(body);
    apiKey = input.apiConfig.apiKey;
    const result = await extractLearningWithLLM(input, input.apiConfig);
    const normalized = normalizeLearningExtractionResult(result);
    return NextResponse.json(learningExtractionResultSchema.parse(normalized));
  } catch (error) {
    if (error instanceof InvalidModelJsonError) {
      return NextResponse.json(
        {
          error: "The model returned invalid JSON for learning extraction.",
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

    const message = error instanceof Error ? error.message : "Learning extraction failed.";
    return NextResponse.json({ error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
