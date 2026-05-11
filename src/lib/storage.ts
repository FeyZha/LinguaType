import type { ApiConfig, LearningHistoryItem, LearningItem, WritingMode } from "./llm/types";

export const API_SETTINGS_STORAGE_KEY = "linguatype.apiSettings.v1";
export const LEARNING_HISTORY_STORAGE_KEY = "linguatype.learningHistory.v1";
export const DRAFT_STORAGE_KEY = "linguatype.writingDraft.v1";

export type UpsertLearningItemsOptions = {
  sourceSentence: string;
  writingMode: WritingMode;
  now?: string;
  createId?: () => string;
};

export function defaultApiSettings(): ApiConfig {
  return {
    provider: "openai-compatible",
    baseUrl: "",
    endpointPath: "/v1/chat/completions",
    apiKey: "",
    model: "",
    temperature: 0.2,
    maxTokens: 1800,
    supportsJsonMode: false,
    mockMode: true,
  };
}

export function upsertLearningItems(
  existing: LearningHistoryItem[],
  incoming: LearningItem[],
  options: UpsertLearningItemsOptions,
): LearningHistoryItem[] {
  const now = options.now ?? new Date().toISOString();
  const createId = options.createId ?? (() => crypto.randomUUID());
  const byKey = new Map(existing.map((item) => [learningKey(item), item]));

  for (const item of incoming) {
    const key = learningKey(item);
    const match = byKey.get(key);
    if (match) {
      byKey.set(key, { ...match, useCount: match.useCount + 1 });
      continue;
    }

    byKey.set(key, {
      ...item,
      id: createId(),
      sourceSentence: options.sourceSentence,
      writingMode: options.writingMode,
      createdAt: now,
      useCount: 1,
    });
  }

  return Array.from(byKey.values());
}

export function learningKey(item: Pick<LearningItem, "type" | "content">): string {
  return `${item.type}:${item.content.trim().toLowerCase()}`;
}
