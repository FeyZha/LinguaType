export class InvalidModelJsonError extends Error {
  rawResponse: string;

  constructor(rawResponse: string) {
    super("The model returned invalid JSON.");
    this.name = "InvalidModelJsonError";
    this.rawResponse = rawResponse;
  }
}

export class InvalidModelSchemaError extends Error {
  rawResponse: string;

  constructor(message: string, rawResponse: string) {
    super(message);
    this.name = "InvalidModelSchemaError";
    this.rawResponse = rawResponse;
  }
}

export function parseModelJson(rawResponse: string): unknown {
  const direct = tryParse(rawResponse);
  if (direct.ok) {
    return direct.value;
  }

  const unfenced = stripMarkdownCodeFence(rawResponse);
  if (unfenced !== rawResponse) {
    const parsed = tryParse(unfenced);
    if (parsed.ok) {
      return parsed.value;
    }

    const repaired = repairUnescapedQuotesInJsonStrings(unfenced);
    if (repaired !== unfenced) {
      const repairedParsed = tryParse(repaired);
      if (repairedParsed.ok) {
        return repairedParsed.value;
      }
    }
  }

  const repaired = repairUnescapedQuotesInJsonStrings(rawResponse);
  if (repaired !== rawResponse) {
    const repairedParsed = tryParse(repaired);
    if (repairedParsed.ok) {
      return repairedParsed.value;
    }
  }

  const extracted = extractFirstJsonObject(rawResponse);
  if (extracted) {
    return extracted;
  }

  throw new InvalidModelJsonError(rawResponse);
}

export function redactApiKey(message: string, apiKey?: string): string {
  let redacted = message;
  if (apiKey) {
    redacted = redacted.split(apiKey).join("[REDACTED_API_KEY]");
  }
  return redacted.replace(/\bsk-[A-Za-z0-9_\-]{8,}\b/gu, "[REDACTED_API_KEY]");
}

function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/iu);
  return match ? match[1].trim() : text;
}

function tryParse(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function repairUnescapedQuotesInJsonStrings(text: string): string {
  let repaired = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (!inString) {
      repaired += char;
      if (char === "\"") {
        inString = true;
      }
      continue;
    }

    if (escaped) {
      repaired += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      repaired += char;
      escaped = true;
      continue;
    }

    if (char !== "\"") {
      repaired += char;
      continue;
    }

    if (isLikelyStringTerminator(text, index)) {
      repaired += char;
      inString = false;
    } else {
      repaired += "\\\"";
    }
  }

  return repaired;
}

function isLikelyStringTerminator(text: string, quoteIndex: number): boolean {
  let index = quoteIndex + 1;
  while (index < text.length && /\s/u.test(text[index])) {
    index += 1;
  }

  return index >= text.length || [",", "}", "]", ":"].includes(text[index]);
}

function extractFirstJsonObject(text: string): unknown | null {
  const firstObjectStart = text.indexOf("{");
  if (firstObjectStart === -1) {
    return null;
  }

  const firstObject = parseBalancedObjectFrom(text, firstObjectStart);
  if (firstObject.status === "unclosed") {
    return null;
  }
  if (firstObject.status === "candidate") {
    const parsed = tryParse(firstObject.value);
    if (parsed.ok) {
      return parsed.value;
    }
  }

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== "{") {
      continue;
    }
    if (start === firstObjectStart) {
      continue;
    }

    const candidate = parseBalancedObjectFrom(text, start);
    if (candidate.status === "unclosed") {
      return null;
    }
    const parsed = tryParse(candidate.value);
    if (parsed.ok) {
      return parsed.value;
    }
  }

  return null;
}

function parseBalancedObjectFrom(
  text: string,
  start: number,
): { status: "candidate"; value: string } | { status: "unclosed" } {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return { status: "candidate", value: text.slice(start, index + 1) };
      }
    }
  }

  return { status: "unclosed" };
}
