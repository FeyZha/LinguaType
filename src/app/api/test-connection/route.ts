import { redactApiKey } from "@/lib/json";
import { resolveServerApiConfig } from "@/lib/llm/serverConfig";
import { testProviderConnection } from "@/lib/llm/service";
import { apiConfigSchema } from "@/lib/llm/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let apiKey = "";

  try {
    const body = await request.json();
    const apiConfig = resolveServerApiConfig(apiConfigSchema.parse(body.apiConfig ?? body));
    apiKey = apiConfig.apiKey;
    const ok = await testProviderConnection(apiConfig);
    return NextResponse.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "连接测试失败。";
    return NextResponse.json({ ok: false, error: redactApiKey(message, apiKey) }, { status: 400 });
  }
}
