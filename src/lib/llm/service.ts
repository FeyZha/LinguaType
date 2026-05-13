import {
  checkParagraphFlowWithMockProvider,
  checkParagraphHealthWithMockProvider,
  checkOutlineWithMockProvider,
  enhanceFastWithMockProvider,
  enhanceWithMockProvider,
  explainSelectionWithMockProvider,
  extractLearningWithMockProvider,
} from "./providers/mock";
import {
  checkParagraphFlowWithOpenAICompatibleProvider,
  checkParagraphHealthWithOpenAICompatibleProvider,
  checkOutlineWithOpenAICompatibleProvider,
  enhanceFastWithOpenAICompatibleProvider,
  enhanceWithOpenAICompatibleProvider,
  explainSelectionWithOpenAICompatibleProvider,
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
  OutlineCheckInput,
  OutlineCheckResult,
  ParagraphCheckInput,
  ParagraphCheckResult,
  ParagraphHealthInput,
  ParagraphHealthResult,
  SelectionExplainInput,
  SelectionExplainResult,
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

export async function checkOutlineWithLLM(
  input: OutlineCheckInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<OutlineCheckResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return checkOutlineWithMockProvider(normalizedInput);
  }

  return checkOutlineWithOpenAICompatibleProvider(normalizedInput);
}

export async function explainSelectionWithLLM(
  input: SelectionExplainInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<SelectionExplainResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return explainSelectionWithMockProvider(normalizedInput);
  }

  return explainSelectionWithOpenAICompatibleProvider(normalizedInput);
}
