import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  allowUnpinnedInstall,
  assertPinnedInstallRef,
  isFloatingGitRef,
  isLayerAutoUpdateEnabled,
  lockfileFallbackPolicy,
} from "../src/release-pin";
import { watcherShellScript } from "../src/watcher";
import { canWriteAsarIntegrity, integrityWriterReport } from "../src/integrity";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");

test("production installs refuse floating main/master/HEAD", () => {
  assert.equal(isFloatingGitRef("main"), true);
  assert.equal(isFloatingGitRef("MASTER"), true);
  assert.equal(isFloatingGitRef("HEAD"), true);
  assert.equal(isFloatingGitRef("v1.1.2"), false);
  assert.throws(() => assertPinnedInstallRef("main"), /floating git ref/);
  assert.doesNotThrow(() => assertPinnedInstallRef("main", true));
  assert.doesNotThrow(() => assertPinnedInstallRef("v1.1.2"));
  assert.equal(allowUnpinnedInstall({}), false);
  assert.equal(allowUnpinnedInstall({ CODEX_PLUSPLUS_ALLOW_UNPINNED: "1" }), true);
});

test("lockfile policy is fail-closed", () => {
  assert.equal(lockfileFallbackPolicy(), "fail-closed");
});

test("Layer auto-update defaults off", () => {
  assert.equal(isLayerAutoUpdateEnabled(undefined), false);
  assert.equal(isLayerAutoUpdateEnabled(false), false);
  assert.equal(isLayerAutoUpdateEnabled(true), true);
});

test("watcher repairs the ChatGPT patch only", () => {
  const script = watcherShellScript("/tmp/watcher.log");
  assert.match(script, /\brepair\b/);
  assert.equal(script.includes("update --watcher"), false);
  const watcherSrc = readFileSync(join(repoRoot, "packages/installer/src/watcher.ts"), "utf8");
  assert.equal(watcherSrc.includes("windowsCommand(\"update\""), false);
});

test("Win/Linux integrity writers stay no-op and validation fuse stays on", () => {
  assert.equal(canWriteAsarIntegrity("darwin"), true);
  assert.equal(canWriteAsarIntegrity("win32"), false);
  assert.equal(canWriteAsarIntegrity("linux"), false);
  assert.equal(integrityWriterReport("darwin").ok, true);
  assert.equal(integrityWriterReport("win32").ok, "warn");
  assert.match(integrityWriterReport("linux").detail, /unimplemented/);
});
