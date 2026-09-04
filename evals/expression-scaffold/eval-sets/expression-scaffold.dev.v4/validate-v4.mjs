import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const casesText = await readFile(join(here, "cases.md"), "utf8");
const schema = JSON.parse(await readFile(join(here, "model-output.schema.json"), "utf8"));
const outputText = await readFile(join(here, "model-output.md"), "utf8");
const rubricText = await readFile(join(here, "rubric.md"), "utf8");
const scoringText = await readFile(join(here, "scoring.md"), "utf8");
const promptText = await readFile(join(here, "..", "..", "prompts", "baseline-v4.md"), "utf8");

assert(schema.$id === "expression-scaffold-output.v4", "Unexpected v4 schema id");

const rows = casesText
  .split(/\r?\n/)
  .filter((line) => /^\| LT-ESC-\d{3} \/ \d+ \|/.test(line))
  .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

assert(rows.length === 25, `Expected 25 segment rows, found ${rows.length}`);
const caseIds = new Set();
let direct = 0;
let scaffoldSets = 0;
let semanticRows = 0;

for (const cells of rows) {
  assert(cells.length === 6, `Unexpected v4 column count: ${cells.length}`);
  const [caseItem, sourceZh, action, focusCell, tracePolicy] = cells;
  caseIds.add(caseItem.split("/")[0].trim());
  assert(sourceZh.length > 0, `${caseItem}: empty sourceZh`);
  if (action === "D") {
    direct += 1;
    assert(focusCell === "—" && tracePolicy === "—", `${caseItem}: direct item has focus data`);
    continue;
  }
  assert(action === "S", `${caseItem}: unknown action ${action}`);
  scaffoldSets += 1;
  assert(["exact_spans", "semantic_units"].includes(tracePolicy), `${caseItem}: invalid trace policy`);
  const units = focusCell.split("；").map((value) => value.trim()).filter(Boolean);
  assert(units.length >= 2 && units.length <= 4, `${caseItem}: expected 2-4 units`);
  assert(new Set(units).size === units.length, `${caseItem}: duplicate unit`);
  for (const unit of units) {
    assert(unit.length < sourceZh.length, `${caseItem}: unit must be shorter than source`);
    if (tracePolicy === "exact_spans") assert(sourceZh.includes(unit), `${caseItem}: exact unit missing from source`);
  }
  if (tracePolicy === "semantic_units") {
    semanticRows += 1;
    assert(units.some((unit) => !sourceZh.includes(unit)), `${caseItem}: semantic row must exercise non-contiguous unit`);
  }
}

assert(caseIds.size === 20, `Expected 20 cases, found ${caseIds.size}`);
assert(direct === 14 && scaffoldSets === 11, `Expected 14 direct/11 scaffold, found ${direct}/${scaffoldSets}`);
assert(semanticRows === 1, `Expected 1 semantic row, found ${semanticRows}`);

for (const token of ["offer_scaffolds", "scaffoldId", "recommendedExpression"]) {
  assert(outputText.includes(token) || promptText.includes(token), `Missing ${token}`);
}
for (const forbidden of ["interaction_phase", "selected_focus"]) {
  assert(!promptText.includes(forbidden), `v4 prompt must not include ${forbidden}`);
}
for (const dimension of ["semantic_fidelity", "scaffold_quality", "assistance_calibration", "user_composability"]) {
  assert(rubricText.includes(dimension) && scoringText.includes(dimension), `Missing ${dimension}`);
}
assert(scoringText.includes("0 次模型调用"), "Scoring must lock zero-call reveal");

console.log("v4 contract validation passed: 20 calls, 25 items, 14 direct, 11 progressive-reveal scaffold sets.");

