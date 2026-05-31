import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { resolveNativeTweakPath } from "../src/native-paths";

test("resolveNativeTweakPath allows paths inside the tweak directory", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-native-paths-"));
  try {
    mkdirSync(join(root, "native"), { recursive: true });
    writeFileSync(join(root, "native", "addon.node"), "");
    assert.equal(
      resolveNativeTweakPath(root, "native/addon.node"),
      realpathSync(join(root, "native", "addon.node")),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("resolveNativeTweakPath rejects traversal outside the tweak directory", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-native-paths-"));
  const outside = mkdtempSync(join(tmpdir(), "codexpp-native-outside-"));
  try {
    writeFileSync(join(outside, "addon.node"), "");
    assert.throws(
      () => resolveNativeTweakPath(root, relative(root, join(outside, "addon.node"))),
      /native path must stay inside the tweak directory/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("resolveNativeTweakPath rejects symlinks that escape the tweak directory", (t) => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-native-paths-"));
  const outside = mkdtempSync(join(tmpdir(), "codexpp-native-outside-"));
  try {
    writeFileSync(join(outside, "addon.node"), "");
    try {
      symlinkSync(join(outside, "addon.node"), join(root, "linked.node"));
    } catch {
      t.skip("symlink creation is not available");
      return;
    }
    assert.throws(
      () => resolveNativeTweakPath(root, "linked.node"),
      /native path must stay inside the tweak directory/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("resolveNativeTweakPath rejects the tweak directory itself", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-native-paths-"));
  try {
    assert.throws(
      () => resolveNativeTweakPath(root, "."),
      /native path must stay inside the tweak directory/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
