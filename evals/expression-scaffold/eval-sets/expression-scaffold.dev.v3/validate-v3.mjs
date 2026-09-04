import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const casesText = await readFile(join(here, "cases.md"), "utf8");
const schema = JSON.parse(await readFile(join(here, "model-output.schema.json"), "utf8"));
const modelOutputText = await readFile(join(here, "model-output.md"), "utf8");
const rubricText = await readFile(join(here, "rubric.md"), "utf8");
const scoringText = await readFile(join(here, "scoring.md"), "utf8");
const promptText = await readFile(join(here, "..", "..", "prompts", "baseline-v3.md"), "utf8");

assert(schema.$id === "expression-scaffold-output.v3", "Unexpected v3 schema id");

const rows = casesText
  .split(/\r?\n/)
  .filter((line) => /^\| LT-ESC-\d{3} \/ \d+ \|/.test(line))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

assert(rows.length === 25, `Expected 25 segment rows, found ${rows.length}`);

const caseIds = new Set();
let directCount = 0;
let requestCount = 0;
let semanticUnitRows = 0;

for (const cells of rows) {
  assert(cells.length === 6, `Unexpected v3 column count: ${cells.length}`);
  const [caseItem, sourceZh, action, focusCell, tracePolicy] = cells;
  caseIds.add(caseItem.split("/")[0].trim());
  assert(sourceZh.length > 0, `${caseItem}: empty source_zh`);

  if (action === "D") {
    directCount += 1;
    assert(focusCell === "—", `${caseItem}: direct item must not define focus units`);
    assert(tracePolicy === "—", `${caseItem}: direct item must not define trace policy`);
    continue;
  }

  assert(action === "R", `${caseItem}: unknown action ${action}`);
  requestCount += 1;
  assert(["exact_spans", "semantic_units"].includes(tracePolicy), `${caseItem}: invalid trace policy`);
  const options = focusCell.split("；").map((value) => value.trim()).filter(Boolean);
  assert(options.length >= 2 && options.length <= 4, `${caseItem}: expected 2-4 focus units`);
  assert(new Set(options).size === options.length, `${caseItem}: duplicate focus unit`);
  for (const option of options) {
    assert(option.length < sourceZh.length, `${caseItem}: focus unit must be shorter than source`);
    if (tracePolicy === "exact_spans") {
      assert(sourceZh.includes(option), `${caseItem}: exact focus unit not found in source: ${option}`);
    }
  }
  if (tracePolicy === "semantic_units") {
    semanticUnitRows += 1;
    assert(options.some((option) => !sourceZh.includes(option)), `${caseItem}: semantic row must exercise a non-contiguous unit`);
  }
}

assert(caseIds.size === 20, `Expected 20 unique cases, found ${caseIds.size}`);
assert(directCount === 14, `Expected 14 direct items, found ${directCount}`);
assert(requestCount === 11, `Expected 11 request_focus items, found ${requestCount}`);
assert(semanticUnitRows === 1, `Expected 1 semantic_units row, found ${semanticUnitRows}`);

for (const token of ["provide_expression", "request_focus", "focusOptionsZh", "actual_initial_output", "first_focus_option"]) {
  assert(modelOutputText.includes(token) || scoringText.includes(token) || promptText.includes(token), `v3 files missing ${token}`);
}

for (const dimension of ["semantic_fidelity", "scaffold_quality", "assistance_calibration", "user_continuability"]) {
  assert(rubricText.includes(dimension), `rubric.md missing ${dimension}`);
  assert(scoringText.includes(dimension), `scoring.md missing ${dimension}`);
}

console.log("v3 contract validation passed: 20 cases, 25 items, 14 direct, 11 request_focus, actual-path follow-up.");
