import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const installerDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(installerDir, "..", "..");

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

test("installer package metadata is registry-ready", () => {
  const pkg = readJson(join(installerDir, "package.json"));
  assert.equal(pkg.name, "chatgpt-layer");
  assert.equal(pkg.version, "1.1.4");
  assert.equal(pkg.private, undefined);
  assert.equal((pkg.engines as { node?: string }).node, ">=20");
  assert.equal((pkg.publishConfig as { access?: string }).access, "public");
  assert.match(String(pkg.description), /Unofficial/i);
});

test("installer files allowlist ships dist, assets, README, and LICENSE", () => {
  const pkg = readJson(join(installerDir, "package.json"));
  const files = pkg.files as string[];
  assert.deepEqual(files, ["dist", "assets", "README.md", "LICENSE"]);
  assert.equal(existsSync(join(installerDir, ".npmignore")), false);
  assert.equal(existsSync(join(installerDir, "LICENSE")), true);
  assert.equal(existsSync(join(installerDir, "README.md")), true);
});

test("installer has no unpublished workspace runtime dependencies", () => {
  const pkg = readJson(join(installerDir, "package.json"));
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  for (const [name, version] of Object.entries(deps)) {
    assert.equal(name.startsWith("@codex-plusplus/"), false, name);
    assert.notEqual(version, "*", name);
  }
  assert.equal("@codex-plusplus/sdk" in deps, false);
});

test("root package stays private", () => {
  const pkg = readJson(join(repoRoot, "package.json"));
  assert.equal(pkg.private, true);
});

test("SDK and runtime stay private workspace packages", () => {
  const sdk = readJson(join(repoRoot, "packages", "sdk", "package.json"));
  const runtime = readJson(join(repoRoot, "packages", "runtime", "package.json"));
  assert.equal(sdk.private, true);
  assert.equal(runtime.private, true);
});

test("published assets include loader stub", () => {
  assert.equal(existsSync(join(installerDir, "assets", "loader.cjs")), true);
});
