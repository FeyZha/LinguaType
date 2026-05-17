import type { ApiConfig } from "./types";

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

export function resolveServerApiConfig(apiConfig: ApiConfig): ApiConfig {
  if (apiConfig.mockMode) {
    return apiConfig;
  }

  const serverApiKey = env("LINGUATYPE_API_KEY");
  const shouldUseServerKey = Boolean(apiConfig.useServerApiKey || (!apiConfig.apiKey && serverApiKey));
  if (!shouldUseServerKey) {
    return apiConfig;
  }

  return {
    ...apiConfig,
    useServerApiKey: true,
    provider: env("LINGUATYPE_API_PROVIDER") || apiConfig.provider || "openai-compatible",
    baseUrl: env("LINGUATYPE_API_BASE_URL") || apiConfig.baseUrl,
    endpointPath: env("LINGUATYPE_API_ENDPOINT_PATH") || apiConfig.endpointPath || "/v1/chat/completions",
    apiKey: serverApiKey || apiConfig.apiKey,
    model: env("LINGUATYPE_API_MODEL") || apiConfig.model,
    temperature: numberEnv("LINGUATYPE_API_TEMPERATURE", apiConfig.temperature),
    maxTokens: integerEnv("LINGUATYPE_API_MAX_TOKENS", apiConfig.maxTokens),
    supportsJsonMode: booleanEnv("LINGUATYPE_API_SUPPORTS_JSON_MODE", apiConfig.supportsJsonMode),
  };
}

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function booleanEnv(name: string, fallback: boolean): boolean {
  const value = env(name);
  if (!value) {
    return fallback;
  }
  return TRUE_VALUES.has(value.toLowerCase());
}

function numberEnv(name: string, fallback: number): number {
  const value = Number(env(name));
  return Number.isFinite(value) ? value : fallback;
}

function integerEnv(name: string, fallback: number): number {
  const value = Number.parseInt(env(name), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
