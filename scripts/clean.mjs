import { readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function rm(path) {
  rmSync(path, { recursive: true, force: true });
}

const packagesDir = join(root, "packages");
for (const name of readdirSync(packagesDir)) {
  const pkg = join(packagesDir, name);
  try {
    if (!statSync(pkg).isDirectory()) continue;
  } catch {
    continue;
  }
  rm(join(pkg, "dist"));
}
rm(join(root, "packages", "installer", "assets", "runtime"));
