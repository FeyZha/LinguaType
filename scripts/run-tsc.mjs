import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);
const passthroughArgs = process.argv.slice(2);
const commentIndex = passthroughArgs.findIndex((arg) => arg.startsWith("#"));
const safeArgs = commentIndex === -1 ? passthroughArgs : passthroughArgs.slice(0, commentIndex);
const result = spawnSync(command, ["--noEmit", ...safeArgs], {
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
