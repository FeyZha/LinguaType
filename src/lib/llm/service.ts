import {
  checkParagraphFlowWithMockProvider,
  checkParagraphHealthWithMockProvider,
  enhanceFastWithMockProvider,
  enhanceWithMockProvider,
  extractLearningWithMockProvider,
} from "./providers/mock";
import {
  checkParagraphFlowWithOpenAICompatibleProvider,
  checkParagraphHealthWithOpenAICompatibleProvider,
  enhanceFastWithOpenAICompatibleProvider,
  enhanceWithOpenAICompatibleProvider,
  extractLearningWithOpenAICompatibleProvider,
  testOpenAICompatibleConnection,
} from "./providers/openaiCompatible";
import type {
  ApiConfig,
  EnhanceLatestSentenceInput,
  EnhanceLatestSentenceResult,
  FastEnhanceInput,
  FastEnhanceResult,
  LearningExtractionInput,
  LearningExtractionResult,
  ParagraphCheckInput,
  ParagraphCheckResult,
  ParagraphHealthInput,
  ParagraphHealthResult,
} from "./types";

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

export async function enhanceFastWithLLM(
  input: FastEnhanceInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<FastEnhanceResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return enhanceFastWithMockProvider(normalizedInput);
  }

  return enhanceFastWithOpenAICompatibleProvider(normalizedInput);
}

export async function extractLearningWithLLM(
  input: LearningExtractionInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<LearningExtractionResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return extractLearningWithMockProvider(normalizedInput);
  }

  return extractLearningWithOpenAICompatibleProvider(normalizedInput);
}

export async function testProviderConnection(apiConfig: ApiConfig): Promise<boolean> {
  if (apiConfig.mockMode) {
    return true;
  }

  return testOpenAICompatibleConnection(apiConfig);
}

export async function checkParagraphFlowWithLLM(
  input: ParagraphCheckInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<ParagraphCheckResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return checkParagraphFlowWithMockProvider(normalizedInput);
  }

  return checkParagraphFlowWithOpenAICompatibleProvider(normalizedInput);
}

export async function checkParagraphHealthWithLLM(
  input: ParagraphHealthInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<ParagraphHealthResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return checkParagraphHealthWithMockProvider(normalizedInput);
  }

  return checkParagraphHealthWithOpenAICompatibleProvider(normalizedInput);
}
