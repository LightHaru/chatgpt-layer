import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const installerDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const prefix = String.fromCharCode(35, 33) + "/usr/bin/env " + "node";

test("CLI source starts with a Node interpreter line", () => {
  const source = readFileSync(join(installerDir, "src", "cli.ts"), "utf8");
  assert.equal(source.startsWith(prefix), true);
});

test("built CLI keeps the Node interpreter line when dist exists", () => {
  const cli = join(installerDir, "dist", "cli.js");
  if (!existsSync(cli)) return;
  const source = readFileSync(cli, "utf8");
  assert.equal(source.startsWith(prefix), true);
});

test("bundled SDK does not import unpublished workspace packages", () => {
  const bundled = join(installerDir, "dist", "bundled-sdk.js");
  if (!existsSync(bundled)) return;
  const source = readFileSync(bundled, "utf8");
  assert.equal(source.includes("@codex-plusplus/sdk"), false);
});
