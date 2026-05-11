import { describe, expect, it } from "vitest";
import { parseModelJson, redactApiKey } from "./json";

describe("model JSON parsing", () => {
  it("parses direct JSON", () => {
    expect(parseModelJson('{"ok": true}')).toEqual({ ok: true });
  });

  it("strips Markdown code fences", () => {
    expect(parseModelJson('```json\n{"ok": true}\n```')).toEqual({ ok: true });
  });

  it("extracts the first valid JSON object", () => {
    expect(parseModelJson('Here is the result: {"ok": true} thanks')).toEqual({ ok: true });
  });

  it("does not treat a nested object as valid when the outer JSON is truncated", () => {
    const truncated = `{
      "taskType": "mixed_sentence_enhancement",
      "insertedExpressions": [
        {
          "before": "正式程序",
          "after": "formal program"
        }
      ],
      "corrections": [
        {
          "before": "this",
    `;

    expect(() => parseModelJson(truncated)).toThrow(/invalid JSON/i);
  });

  it("throws an invalid JSON error with raw response", () => {
    expect(() => parseModelJson("not json")).toThrow(/invalid JSON/i);
  });
});

describe("API key redaction", () => {
  it("redacts API keys from messages", () => {
    expect(redactApiKey("bad key sk-test-1234567890 leaked", "sk-test-1234567890")).toContain(
      "[REDACTED_API_KEY]",
    );
  });

  it("does not redact long enum values that are not API keys", () => {
    const message = "Expected mixed_sentence_enhancement | english_sentence_polishing";
    expect(redactApiKey(message)).toBe(message);
  });
});
