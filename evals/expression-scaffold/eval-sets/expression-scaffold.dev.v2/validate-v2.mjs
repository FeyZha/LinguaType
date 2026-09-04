import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const casesText = await readFile(join(here, "cases.md"), "utf8");
const schemaText = await readFile(join(here, "model-output.schema.json"), "utf8");
const modelOutputText = await readFile(join(here, "model-output.md"), "utf8");
const rubricText = await readFile(join(here, "rubric.md"), "utf8");
const scoringText = await readFile(join(here, "scoring.md"), "utf8");
const baselinePromptText = await readFile(join(here, "..", "..", "prompts", "baseline-v2.md"), "utf8");
const judgePromptText = await readFile(join(here, "..", "..", "prompts", "judge-v2.md"), "utf8");

const schema = JSON.parse(schemaText);
assert(schema.$id === "expression-scaffold-output.v2", "Unexpected v2 schema id");

const rows = casesText
  .split(/\r?\n/)
  .filter((line) => /^\| LT-ESC-\d{3} \/ \d+ \|/.test(line))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

assert(rows.length === 25, `Expected 25 segment rows, found ${rows.length}`);

const caseIds = new Set();
let directCount = 0;
let requestCount = 0;

for (const [caseItem, sourceZh, action, focusCell, probeFocus] of rows) {
  const caseId = caseItem.split("/")[0].trim();
  caseIds.add(caseId);
  assert(sourceZh.length > 0, `${caseItem}: empty source_zh`);

  if (action === "D") {
    directCount += 1;
    assert(focusCell === "—", `${caseItem}: direct item must not define focus options`);
    assert(probeFocus === sourceZh, `${caseItem}: direct probe must equal source_zh`);
    continue;
  }

  assert(action === "R", `${caseItem}: unknown action ${action}`);
  requestCount += 1;
  const options = focusCell.split("；").map((value) => value.trim()).filter(Boolean);
  assert(options.length >= 2 && options.length <= 4, `${caseItem}: expected 2-4 focus options`);
  assert(new Set(options).size === options.length, `${caseItem}: duplicate focus option`);
  assert(options.includes(probeFocus), `${caseItem}: probe must equal one reference focus option`);

  let previousEnd = -1;
  for (const option of options) {
    assert(option.length < sourceZh.length, `${caseItem}: focus option must be shorter than source`);
    const start = sourceZh.indexOf(option);
    assert(start >= 0, `${caseItem}: focus option is not an exact source substring: ${option}`);
    assert(start >= previousEnd, `${caseItem}: focus options overlap or are out of order`);
    previousEnd = start + option.length;
  }
}

assert(caseIds.size === 20, `Expected 20 unique cases, found ${caseIds.size}`);
assert(directCount === 15, `Expected 15 direct items, found ${directCount}`);
assert(requestCount === 10, `Expected 10 request_focus items, found ${requestCount}`);

for (const requiredToken of ["provide_expression", "request_focus", "focusOptionsZh"]) {
  assert(modelOutputText.includes(requiredToken), `model-output.md missing ${requiredToken}`);
  assert(baselinePromptText.includes(requiredToken), `baseline-v2.md missing ${requiredToken}`);
}

for (const requiredDimension of [
  "semantic_fidelity",
  "scaffold_quality",
  "assistance_calibration",
  "user_continuability"
]) {
  assert(rubricText.includes(requiredDimension), `rubric.md missing ${requiredDimension}`);
  assert(scoringText.includes(requiredDimension), `scoring.md missing ${requiredDimension}`);
  assert(judgePromptText.includes(requiredDimension), `judge-v2.md missing ${requiredDimension}`);
}

console.log("v2 contract validation passed: 20 cases, 25 items, 15 direct, 10 request_focus.");
