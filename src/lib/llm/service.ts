import {
  checkParagraphFlowWithMockProvider,
  checkParagraphHealthWithMockProvider,
  checkOutlineWithMockProvider,
  checkDocumentMapWithMockProvider,
  classifyWritingDomainWithMockProvider,
  enhanceFastWithMockProvider,
  enhanceWithMockProvider,
  explainSelectionWithMockProvider,
  extractLearningWithMockProvider,
} from "./providers/mock";
import {
  checkParagraphFlowWithOpenAICompatibleProvider,
  checkParagraphHealthWithOpenAICompatibleProvider,
  checkOutlineWithOpenAICompatibleProvider,
  checkDocumentMapWithOpenAICompatibleProvider,
  classifyWritingDomainWithOpenAICompatibleProvider,
  enhanceFastWithOpenAICompatibleProvider,
  enhanceWithOpenAICompatibleProvider,
  explainSelectionWithOpenAICompatibleProvider,
  extractLearningWithOpenAICompatibleProvider,
  testOpenAICompatibleConnection,
} from "./providers/openaiCompatible";
import type {
  ApiConfig,
  ClassifyWritingDomainInput,
  ClassifyWritingDomainResult,
  DocumentMapInput,
  DocumentMapResult,
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

export async function checkDocumentMapWithLLM(
  input: DocumentMapInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<DocumentMapResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return checkDocumentMapWithMockProvider(normalizedInput);
  }

  return checkDocumentMapWithOpenAICompatibleProvider(normalizedInput);
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

export async function classifyWritingDomainWithLLM(
  input: ClassifyWritingDomainInput,
  apiConfig: ApiConfig = input.apiConfig,
): Promise<ClassifyWritingDomainResult> {
  const normalizedInput = { ...input, apiConfig };

  if (apiConfig.mockMode) {
    return classifyWritingDomainWithMockProvider(normalizedInput);
  }

  return classifyWritingDomainWithOpenAICompatibleProvider(normalizedInput);
}
