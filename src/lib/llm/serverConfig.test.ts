import { afterEach, describe, expect, it } from "vitest";
import type { ApiConfig } from "./types";
import { resolveServerApiConfig } from "./serverConfig";

const ENV_KEYS = [
  "LINGUATYPE_API_PROVIDER",
  "LINGUATYPE_API_BASE_URL",
  "LINGUATYPE_API_ENDPOINT_PATH",
  "LINGUATYPE_API_KEY",
  "LINGUATYPE_API_MODEL",
  "LINGUATYPE_API_TEMPERATURE",
  "LINGUATYPE_API_MAX_TOKENS",
  "LINGUATYPE_API_SUPPORTS_JSON_MODE",
];

const baseConfig: ApiConfig = {
  provider: "openai-compatible",
  baseUrl: "",
  endpointPath: "/v1/chat/completions",
  apiKey: "",
  model: "",
  temperature: 0.2,
  maxTokens: 900,
  supportsJsonMode: false,
  mockMode: false,
  useServerApiKey: false,
};

describe("server API config", () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it("fills public-demo requests from server environment variables", () => {
    process.env.LINGUATYPE_API_BASE_URL = "https://api.example.test";
    process.env.LINGUATYPE_API_KEY = "server-secret";
    process.env.LINGUATYPE_API_MODEL = "demo-model";
    process.env.LINGUATYPE_API_SUPPORTS_JSON_MODE = "true";
    process.env.LINGUATYPE_API_MAX_TOKENS = "1200";

    const resolved = resolveServerApiConfig({ ...baseConfig, useServerApiKey: true });

    expect(resolved).toMatchObject({
      baseUrl: "https://api.example.test",
      apiKey: "server-secret",
      model: "demo-model",
      supportsJsonMode: true,
      maxTokens: 1200,
      useServerApiKey: true,
    });
  });

  it("keeps explicit browser settings unless server key mode is requested", () => {
    process.env.LINGUATYPE_API_KEY = "server-secret";
    const browserConfig = {
      ...baseConfig,
      baseUrl: "https://browser.example.test",
      apiKey: "browser-key",
      model: "browser-model",
    };

    expect(resolveServerApiConfig(browserConfig)).toEqual(browserConfig);
  });
});
