import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evalDir = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(evalDir, "freeze-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

let failed = false;

for (const file of manifest.canonicalFiles) {
  const content = await readFile(resolve(evalDir, file.path));
  const actual = createHash("sha256").update(content).digest("hex");

  if (actual !== file.sha256) {
    failed = true;
    console.error(`MISMATCH ${file.path}: expected ${file.sha256}, received ${actual}`);
  } else {
    console.log(`OK ${file.path}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log(`Freeze verified: ${manifest.evalSetId}`);
}
