import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ensureTweakDataDir, resolveTweakDataPath, tweakDataDir } from "../src/tweak-fs-sandbox";

test("tweak data paths stay under tweak-data/<id>", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-tweak-fs-"));
  try {
    const dir = ensureTweakDataDir(root, "com.example.foo");
    assert.equal(dir, join(root, "tweak-data", "com.example.foo"));
    const resolved = resolveTweakDataPath(root, "com.example.foo", "notes.txt");
    assert.equal(resolved.dir, dir);
    assert.equal(resolved.full, join(dir, "notes.txt"));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("tweak data paths reject traversal and the data dir itself", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-tweak-fs-"));
  try {
    assert.throws(
      () => resolveTweakDataPath(root, "com.example.foo", "../other/secrets.txt"),
      /path traversal/,
    );
    assert.throws(
      () => resolveTweakDataPath(root, "com.example.foo", "."),
      /path traversal/,
    );
    assert.throws(() => tweakDataDir(root, "../evil"), /bad tweak id/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
