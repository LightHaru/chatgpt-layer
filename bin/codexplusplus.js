#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const cli = join(root, "packages", "installer", "dist", "cli.js");

if (!existsSync(cli)) {
  bootstrap();
}

const run = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});

if (run.error) {
  console.error(`[!] Could not start ChatGPT Layer: ${run.error.message}`);
  process.exit(1);
}
process.exit(run.status ?? 1);

function bootstrap() {
  console.error("[chatgpt-layer] First run from source install; building CLI...");
  runOrExit(npmCommand(), installArgs(), "install ChatGPT Layer dependencies");
  runOrExit(npmCommand(), ["run", "build"], "build ChatGPT Layer");
}

function installArgs() {
  return existsSync(join(root, "package-lock.json"))
    ? ["ci", "--workspaces", "--include-workspace-root", "--ignore-scripts"]
    : ["install", "--workspaces", "--include-workspace-root", "--ignore-scripts"];
}

function runOrExit(command, args, label) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status === 0) return;
  const detail = result.error ? `: ${result.error.message}` : "";
  console.error(`[!] Failed to ${label}${detail}`);
  process.exit(result.status ?? 1);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}
