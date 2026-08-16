import "./bundle-sdk.mjs";
import { cpSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Copies the loader stub + bundled runtime into installer/assets so the
// published package can extract them at install time.
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..", "..");
const out = resolve(here, "..", "assets");

mkdirSync(out, { recursive: true });

const copies = [
  ["packages/loader/loader.cjs", "loader.cjs"],
  ["packages/runtime/dist", "runtime"],
];

for (const [from, to] of copies) {
  const src = resolve(root, from);
  if (!existsSync(src)) {
    console.warn(`[copy-assets] skip (missing): ${from}`);
    continue;
  }
  cpSync(src, resolve(out, to), { recursive: true });
  console.log(`[copy-assets] ${from} -> assets/${to}`);
}
