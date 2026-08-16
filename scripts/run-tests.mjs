import { readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = join(root, "packages");
const files = [];

function collectTestFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const target = join(dir, name);
    let st;
    try {
      st = statSync(target);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      collectTestFiles(target);
    } else if (name.endsWith(".test.ts")) {
      files.push(target);
    }
  }
}

for (const name of readdirSync(packagesDir)) {
  collectTestFiles(join(packagesDir, name, "test"));
}

files.sort();
if (files.length === 0) {
  console.error("[test] no packages/*/test/**/*.test.ts files found");
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
