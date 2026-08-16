import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const installerDir = join(dirname(fileURLToPath(import.meta.url)), "..");

test("installer bins preserve all four CLI names", () => {
  const pkg = JSON.parse(readFileSync(join(installerDir, "package.json"), "utf8")) as {
    bin: Record<string, string>;
  };
  assert.equal(pkg.bin["chatgpt-layer"], "dist/cli.js");
  assert.equal(pkg.bin.cgl, "dist/cli.js");
  assert.equal(pkg.bin.codexplusplus, "dist/cli.js");
  assert.equal(pkg.bin["codex-plusplus"], "dist/cli.js");
});
