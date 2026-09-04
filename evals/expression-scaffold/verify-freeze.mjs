import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const evalDir = dirname(fileURLToPath(import.meta.url));

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function parseManifestPath(argv) {
  if (argv.length === 0) {
    return resolve(evalDir, "freeze-manifest.json");
  }

  if (argv.length === 2 && argv[0] === "--manifest" && argv[1].trim()) {
    return resolve(process.cwd(), argv[1]);
  }

  throw new Error(
    "Usage: node evals/expression-scaffold/verify-freeze.mjs [--manifest <path>]",
  );
}

function normalizedPathKey(path) {
  return process.platform === "win32" ? path.toLowerCase() : path;
}

async function main() {
  const manifestPath = parseManifestPath(process.argv.slice(2));
  const manifestDir = dirname(manifestPath);
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  let failed = false;

  function report(message) {
    failed = true;
    console.error(message);
  }

  if (manifest.status !== "frozen") {
    report(`INVALID status: expected frozen, received ${JSON.stringify(manifest.status)}`);
  }

  if (typeof manifest.evalSetId !== "string" || !manifest.evalSetId.trim()) {
    report("INVALID evalSetId: expected a non-empty string");
  }

  if (!Array.isArray(manifest.caseIds)) {
    report("INVALID caseIds: expected an array");
  } else {
    const seenCaseIds = new Set();
    for (const caseId of manifest.caseIds) {
      if (typeof caseId !== "string" || !caseId.trim()) {
        report(`INVALID caseId: ${JSON.stringify(caseId)}`);
        continue;
      }
      if (seenCaseIds.has(caseId)) {
        report(`DUPLICATE caseId: ${caseId}`);
      }
      seenCaseIds.add(caseId);
    }
  }

  if (!Array.isArray(manifest.canonicalFiles) || manifest.canonicalFiles.length === 0) {
    report("INVALID canonicalFiles: expected a non-empty array");
  } else {
    const seenCanonicalPaths = new Set();

    for (const file of manifest.canonicalFiles) {
      if (!file || typeof file.path !== "string" || !file.path.trim()) {
        report(`INVALID canonical path: ${JSON.stringify(file?.path)}`);
        continue;
      }

      const canonicalPath = resolve(manifestDir, file.path);
      const pathKey = normalizedPathKey(canonicalPath);
      if (seenCanonicalPaths.has(pathKey)) {
        report(`DUPLICATE canonical path: ${file.path}`);
        continue;
      }
      seenCanonicalPaths.add(pathKey);

      if (typeof file.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(file.sha256)) {
        report(`INVALID SHA256 ${file.path}: ${JSON.stringify(file.sha256)}`);
        continue;
      }

      try {
        const actual = sha256(await readFile(canonicalPath));
        if (actual !== file.sha256.toLowerCase()) {
          report(
            `MISMATCH ${file.path}: expected ${file.sha256.toLowerCase()}, received ${actual}`,
          );
        } else {
          console.log(`OK ${file.path}`);
        }
      } catch (error) {
        report(`UNREADABLE ${file.path}: ${error.message}`);
      }
    }
  }

  const hasParentPath = Object.hasOwn(manifest, "parentManifestPath");
  const hasParentSha = Object.hasOwn(manifest, "parentManifestSha256");

  if (hasParentPath !== hasParentSha) {
    report("INVALID parent manifest: parentManifestPath and parentManifestSha256 must appear together");
  } else if (hasParentPath) {
    if (
      typeof manifest.parentManifestPath !== "string" ||
      !manifest.parentManifestPath.trim()
    ) {
      report("INVALID parentManifestPath: expected a non-empty string");
    } else if (
      typeof manifest.parentManifestSha256 !== "string" ||
      !/^[a-f0-9]{64}$/i.test(manifest.parentManifestSha256)
    ) {
      report(
        `INVALID parentManifestSha256: ${JSON.stringify(manifest.parentManifestSha256)}`,
      );
    } else {
      const parentPath = resolve(manifestDir, manifest.parentManifestPath);
      try {
        const actual = sha256(await readFile(parentPath));
        const expected = manifest.parentManifestSha256.toLowerCase();
        if (actual !== expected) {
          report(
            `MISMATCH parent manifest ${manifest.parentManifestPath}: expected ${expected}, received ${actual}`,
          );
        } else {
          console.log(`OK parent manifest ${manifest.parentManifestPath}`);
        }
      } catch (error) {
        report(`UNREADABLE parent manifest ${manifest.parentManifestPath}: ${error.message}`);
      }
    }
  }

  if (failed) {
    process.exitCode = 1;
  } else {
    console.log(`Freeze verified: ${manifest.evalSetId}`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
