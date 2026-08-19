import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evalDir = dirname(fileURLToPath(import.meta.url));
const validateOnly = process.argv.includes("--validate-only");

function readArg(name) {
  const direct = process.argv.find((arg) => arg.startsWith(name + "="));
  if (direct) return direct.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function verifyFreeze() {
  const manifestPath = resolve(evalDir, "freeze-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

  for (const file of manifest.canonicalFiles) {
    const content = await readFile(resolve(evalDir, file.path));
    const actual = sha256(content);
    if (actual !== file.sha256) {
      throw new Error(
        "Frozen file mismatch for " + file.path + ": expected " + file.sha256 + ", received " + actual,
      );
    }
  }

  return manifest;
}

function extractFencedSection(markdown, heading) {
  const headingIndex = markdown.indexOf("## " + heading);
  if (headingIndex < 0) throw new Error("Missing prompt section: " + heading);

  const fenceIndex = markdown.indexOf("```", headingIndex);
  const contentStart = markdown.indexOf("\n", fenceIndex);
  const contentEnd = markdown.indexOf("\n```", contentStart);

  if (fenceIndex < 0 || contentStart < 0 || contentEnd < 0) {
    throw new Error("Invalid fenced prompt section: " + heading);
  }

  return markdown.slice(contentStart + 1, contentEnd).trim();
}

async function loadPrompt() {
  const promptPath = resolve(evalDir, "prompts", "baseline-v1.md");
  const content = await readFile(promptPath, "utf8");
  const versionMatch = content.match(/- `prompt_version`：`([^`]+)`/);

  if (!versionMatch) throw new Error("Missing prompt_version in baseline-v1.md");

  return {
    version: versionMatch[1],
    sha256: sha256(content),
    systemPrompt: extractFencedSection(content, "System prompt"),
    userTemplate: extractFencedSection(content, "User message template"),
  };
}

function requiredMatch(block, pattern, field, caseId) {
  const match = block.match(pattern);
  if (!match) throw new Error(caseId + " is missing " + field);
  return match[1].trim();
}

function parseFullEssay(block, caseId) {
  const fieldStart = block.indexOf("- `full_essay`：");
  const targetStart = block.indexOf("- `target_sentence`：");
  if (fieldStart < 0 || targetStart < 0 || targetStart <= fieldStart) {
    throw new Error(caseId + " has an invalid full_essay block");
  }

  const fieldBlock = block.slice(fieldStart, targetStart);
  const lines = fieldBlock
    .split(/\r?\n/)
    .filter((line) => line.startsWith("> "))
    .map((line) => line.slice(2));

  if (lines.length === 0) throw new Error(caseId + " has an empty full_essay");
  return lines.join("\n");
}

async function loadCases(manifest) {
  const content = await readFile(resolve(evalDir, "cases.md"), "utf8");
  const headers = [...content.matchAll(/^### (LT-ESC-\d{3})[^\r\n]*$/gm)];
  const cases = [];

  for (let index = 0; index < headers.length; index += 1) {
    const header = headers[index];
    const caseId = header[1];
    const start = header.index;
    const end = index + 1 < headers.length ? headers[index + 1].index : content.length;
    const block = content.slice(start, end);

    const taskPrompt = requiredMatch(block, /^- `task_prompt`：(.*)$/m, "task_prompt", caseId);
    const targetSentence = requiredMatch(block, /^- `target_sentence`：(.*)$/m, "target_sentence", caseId);
    const sourceZh = [...block.matchAll(/^  - `source_zh`：`(.+)`$/gm)].map((match) => match[1]);

    if (sourceZh.length === 0) throw new Error(caseId + " has no source_zh segments");

    cases.push({
      caseId,
      taskPrompt,
      fullEssay: parseFullEssay(block, caseId),
      targetSentence,
      sourceZh,
    });
  }

  const actualIds = [...cases.map((item) => item.caseId)].sort();
  const expectedIds = [...manifest.caseIds].sort();
  const actualSegments = cases.reduce((sum, item) => sum + item.sourceZh.length, 0);

  if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
    throw new Error("Case IDs do not match freeze-manifest.json");
  }
  if (cases.length !== manifest.counts.cases) {
    throw new Error("Case count does not match freeze-manifest.json");
  }
  if (actualSegments !== manifest.counts.chineseSegments) {
    throw new Error("Chinese segment count does not match freeze-manifest.json");
  }

  return cases;
}

function renderUserMessage(template, testCase) {
  return template
    .replaceAll("{{task_prompt}}", testCase.taskPrompt)
    .replaceAll("{{full_essay}}", testCase.fullEssay)
    .replaceAll("{{target_sentence}}", testCase.targetSentence);
}

function validateSystemOutput(output, expectedSources) {
  const errors = [];

  if (!output || typeof output !== "object" || Array.isArray(output)) {
    return ["Top-level output must be a JSON object."];
  }

  const topKeys = Object.keys(output);
  if (topKeys.length !== 1 || topKeys[0] !== "items") {
    errors.push("Top-level output must contain only items.");
  }
  if (!Array.isArray(output.items)) {
    errors.push("items must be an array.");
    return errors;
  }
  if (output.items.length !== expectedSources.length) {
    errors.push(
      "items length must be " + expectedSources.length + ", received " + output.items.length + ".",
    );
  }

  output.items.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      errors.push("items[" + index + "] must be an object.");
      return;
    }

    const keys = Object.keys(item).sort();
    if (JSON.stringify(keys) !== JSON.stringify(["recommendedExpression", "sourceZh"])) {
      errors.push("items[" + index + "] must contain only sourceZh and recommendedExpression.");
    }
    if (typeof item.sourceZh !== "string") {
      errors.push("items[" + index + "].sourceZh must be a string.");
    } else if (item.sourceZh !== expectedSources[index]) {
      errors.push(
        "items[" + index + "].sourceZh must equal " + JSON.stringify(expectedSources[index]) + ".",
      );
    }
    if (typeof item.recommendedExpression !== "string" || !item.recommendedExpression.trim()) {
      errors.push("items[" + index + "].recommendedExpression must be a non-empty string.");
    }
  });

  return errors;
}

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === "") return defaultValue;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("Expected true or false, received " + JSON.stringify(value));
}

function parseNumber(value, defaultValue, name) {
  if (value === undefined || value === "") return defaultValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(name + " must be a finite number.");
  return parsed;
}

function buildEndpoint(baseUrl, endpointPath) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  return new URL(endpointPath.replace(/^\/+/, ""), normalizedBase).toString();
}

function redact(value, apiKey) {
  const text = String(value ?? "");
  return apiKey ? text.split(apiKey).join("[REDACTED]") : text;
}

async function main() {
  const manifest = await verifyFreeze();
  const prompt = await loadPrompt();
  const cases = await loadCases(manifest);

  if (validateOnly) {
    console.log(
      "Validated " +
        manifest.evalSetId +
        ": " +
        cases.length +
        " cases, " +
        manifest.counts.chineseSegments +
        " Chinese segments, prompt " +
        prompt.version +
        ".",
    );
    return;
  }

  const baseUrl = process.env.LINGUATYPE_EVAL_BASE_URL ?? "";
  const apiKey = process.env.LINGUATYPE_EVAL_API_KEY ?? "";
  const model = process.env.LINGUATYPE_EVAL_MODEL ?? "";
  const endpointPath = process.env.LINGUATYPE_EVAL_ENDPOINT_PATH ?? "/v1/chat/completions";
  const temperature = parseNumber(process.env.LINGUATYPE_EVAL_TEMPERATURE, 0, "temperature");
  const maxTokens = parseNumber(process.env.LINGUATYPE_EVAL_MAX_TOKENS, 800, "maxTokens");
  const jsonMode = parseBoolean(process.env.LINGUATYPE_EVAL_JSON_MODE, false);
  const runId = readArg("--run-id");

  if (!runId) throw new Error("Provide an explicit --run-id before calling a model.");
  if (!/^[a-zA-Z0-9._-]+$/.test(runId)) {
    throw new Error("run_id may contain only letters, numbers, dots, underscores, and hyphens.");
  }
  if (!baseUrl || !apiKey || !model) {
    throw new Error(
      "LINGUATYPE_EVAL_BASE_URL, LINGUATYPE_EVAL_API_KEY, and LINGUATYPE_EVAL_MODEL are required.",
    );
  }
  if (temperature < 0 || temperature > 2) throw new Error("temperature must be between 0 and 2.");
  if (!Number.isInteger(maxTokens) || maxTokens <= 0) {
    throw new Error("maxTokens must be a positive integer.");
  }

  const endpoint = buildEndpoint(baseUrl, endpointPath);
  const runDir = resolve(evalDir, "runs", runId);
  if (existsSync(runDir)) throw new Error("Run directory already exists: " + runId);

  await mkdir(runDir, { recursive: false });
  const outputPath = resolve(runDir, "model-outputs.jsonl");
  const runManifestPath = resolve(runDir, "manifest.json");
  const startedAt = new Date().toISOString();
  const runManifest = {
    eval_set_id: manifest.evalSetId,
    run_id: runId,
    started_at: startedAt,
    finished_at: null,
    status: "running",
    provider: "openai-compatible",
    model,
    model_parameters: {
      temperature,
      max_tokens: maxTokens,
      json_mode: jsonMode,
    },
    prompt_version: prompt.version,
    prompt_sha256: prompt.sha256,
    judge_prompt_version: null,
    judge_prompt_sha256: null,
    judge_model: null,
    change_summary: "Initial model capability baseline.",
  };
  await writeFile(runManifestPath, JSON.stringify(runManifest, null, 2) + "\n", "utf8");

  let requestErrors = 0;
  let invalidOutputs = 0;

  for (const testCase of cases) {
    let rawResponse = "";
    let record;

    try {
      const requestBody = {
        model,
        messages: [
          { role: "system", content: prompt.systemPrompt },
          { role: "user", content: renderUserMessage(prompt.userTemplate, testCase) },
        ],
        temperature,
        max_tokens: maxTokens,
      };
      if (jsonMode) requestBody.response_format = { type: "json_object" };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      const providerText = await response.text();

      if (!response.ok) {
        throw new Error("Provider request failed: " + response.status + " " + providerText);
      }

      const providerJson = JSON.parse(providerText);
      rawResponse = providerJson.choices?.[0]?.message?.content ?? "";
      if (!rawResponse) throw new Error("Provider response did not include message content.");

      let systemOutput = null;
      let validationErrors = [];

      try {
        systemOutput = JSON.parse(rawResponse);
        validationErrors = validateSystemOutput(systemOutput, testCase.sourceZh);
      } catch {
        validationErrors = ["Model content must be valid JSON without Markdown fences."];
      }

      if (validationErrors.length > 0) invalidOutputs += 1;

      record = {
        case_id: testCase.caseId,
        request_status: "success",
        output_status: validationErrors.length === 0 ? "valid" : "invalid",
        system_output: systemOutput,
        raw_response: rawResponse,
        validation_errors: validationErrors,
        error: null,
      };
    } catch (error) {
      requestErrors += 1;
      record = {
        case_id: testCase.caseId,
        request_status: "error",
        output_status: "unavailable",
        system_output: null,
        raw_response: redact(rawResponse, apiKey),
        validation_errors: [],
        error: redact(error instanceof Error ? error.message : error, apiKey),
      };
    }

    await appendFile(outputPath, JSON.stringify(record) + "\n", "utf8");
    console.log(testCase.caseId + " " + record.request_status + "/" + record.output_status);
  }

  runManifest.finished_at = new Date().toISOString();
  runManifest.status = requestErrors > 0 ? "completed_with_request_errors" : "model_outputs_complete";
  runManifest.summary = {
    cases: cases.length,
    request_errors: requestErrors,
    structurally_invalid_outputs: invalidOutputs,
  };
  await writeFile(runManifestPath, JSON.stringify(runManifest, null, 2) + "\n", "utf8");

  if (requestErrors > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
