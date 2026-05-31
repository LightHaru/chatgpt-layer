import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const runtimeRoot = resolve(here, "..");
const repoRoot = resolve(runtimeRoot, "..", "..");
const src = resolve(repoRoot, "packages/native-host/dist/codexpp_native_host.node");
const outDir = resolve(runtimeRoot, "dist/native");
const out = resolve(outDir, "codexpp_native_host.node");

if (!existsSync(src)) {
  console.warn("[runtime] native host not found; native AppKit/Metal host will be unavailable");
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
cpSync(src, out);
console.log(`[runtime] native host -> ${out}`);
