import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { describeInstallationSource, findSourceRoot } from "../src/source-root";

const installerDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(installerDir, "..", "..");

test("findSourceRoot prefers the monorepo root when workspaces exist", () => {
  const start = join(installerDir, "src", "commands");
  assert.equal(findSourceRoot(start), repoRoot);
});

test("findSourceRoot uses the installer package directory outside a workspace", () => {
  const root = mkdtempSync(join(tmpdir(), "cgl-reg-root-"));
  try {
    const pkgDir = join(root, "chatgpt-layer");
    mkdirSync(join(pkgDir, "dist", "commands"), { recursive: true });
    writeFileSync(
      join(pkgDir, "package.json"),
      JSON.stringify({ name: "chatgpt-layer" }),
    );
    assert.equal(findSourceRoot(join(pkgDir, "dist", "commands")), pkgDir);
    assert.equal(describeInstallationSource(pkgDir).kind, "registry");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
