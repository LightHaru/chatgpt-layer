import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");
const files = [];

for (const name of readdirSync(packagesDir)) {
  const testDir = join(packagesDir, name, "test");
  try {
    if (!statSync(testDir).isDirectory()) continue;
  } catch {
    continue;
  }
  for (const file of readdirSync(testDir)) {
    if (file.endsWith(".test.ts")) files.push(join(testDir, file));
  }
}

files.sort();
if (files.length === 0) {
  console.error("[test] no packages/*/test/*.test.ts files found");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...files],
  { cwd: root, stdio: "inherit" },
);

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
