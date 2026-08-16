import { chmodSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "..", "dist", "bundled-sdk.js");
const cli = join(here, "..", "dist", "cli.js");

if (!existsSync(entry)) {
  console.error("[bundle-sdk] missing " + entry);
  process.exit(1);
}

await build({
  entryPoints: [entry],
  outfile: entry,
  bundle: true,
  format: "esm",
  platform: "node",
  packages: "bundle",
  allowOverwrite: true,
  logLevel: "info",
});

if (existsSync(cli)) {
  try {
    chmodSync(cli, 0o755);
  } catch {
    // ignore chmod failures
  }
  const src = readFileSync(cli, "utf8");
  const prefix = String.fromCharCode(35, 33) + "/usr/bin/env " + "node";
  if (!src.startsWith(prefix)) {
    console.error("[bundle-sdk] dist/cli.js is missing the Node interpreter line");
    process.exit(1);
  }
}
