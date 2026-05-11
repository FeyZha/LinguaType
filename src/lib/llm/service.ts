import { enhanceWithMockProvider } from "./providers/mock";
import {
  enhanceWithOpenAICompatibleProvider,
  testOpenAICompatibleConnection,
} from "./providers/openaiCompatible";
import type { ApiConfig, EnhanceLatestSentenceInput, EnhanceLatestSentenceResult } from "./types";

export async function enhanceLatestSentenceWithLLM(
  input: EnhanceLatestSentenceInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<EnhanceLatestSentenceResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return enhanceWithMockProvider(normalizedInput);
  }

  return enhanceWithOpenAICompatibleProvider(normalizedInput);
}

export async function testProviderConnection(apiConfig: ApiConfig): Promise<boolean> {
  if (apiConfig.mockMode) {
    return true;
  }

  return testOpenAICompatibleConnection(apiConfig);
}
