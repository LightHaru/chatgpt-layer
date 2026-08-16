import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { install } from "../../src/commands/install";
import { status } from "../../src/commands/status";
import { uninstall } from "../../src/commands/uninstall";
import { readState, writeState } from "../../src/state";
import {
  asarHasLoader,
  backupAsarPath,
  captureLogs,
  headerHash,
  isPatchedAsar,
  readAsarPackage,
  seedTweakAndConfig,
  tweakDataIntact,
  withIsolatedInstaller,
  writeSyntheticAsar,
} from "../helpers/fake-chatgpt-app";

test("uninstall from a healthy install restores upstream and keeps unrelated files plus tweaks", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    writeFileSync(join(h.app.resourcesDir, "extra-keep.txt"), "resources-unrelated\n");
    const originalHash = headerHash(h.app.asarPath);
    await install(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);

    const logs = await captureLogs(() => uninstall({ app: h.app.appRoot }));
    assert.match(logs, /Restored|Cleaned up runtime/);
    assert.doesNotMatch(logs, /Removed Codex\+\+ user data/);
    assert.match(logs, /tweaks remain/);

    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(asarHasLoader(h.app.asarPath), false);
    assert.equal(readAsarPackage(h.app.asarPath).main, "main.js");
    assert.equal(headerHash(h.app.asarPath), originalHash);
    assert.equal(readState(h.paths.stateFile), null);
    assert.equal(existsSync(h.paths.runtime), false);
    assert.equal(tweakDataIntact(h), true);
    assert.equal(readFileSync(h.app.unrelatedAppFile, "utf8"), "app-unrelated\n");
    assert.equal(readFileSync(join(h.app.resourcesDir, "extra-keep.txt"), "utf8"), "resources-unrelated\n");
    assert.equal(existsSync(backupAsarPath(h.paths)), true);
  });
});

test("status after uninstall is not installed", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await uninstall({ app: h.app.appRoot });
    const logs = await captureLogs(() => status());
    assert.match(logs, /Not installed/);
    assert.doesNotMatch(logs, /matches patched/);
  });
});

test("second uninstall is safe and idempotent", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    await uninstall({ app: h.app.appRoot });
    await uninstall({ app: h.app.appRoot });
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(readState(h.paths.stateFile), null);
    assert.equal(tweakDataIntact(h), true);
    assert.equal(readFileSync(h.app.unrelatedAppFile, "utf8"), "app-unrelated\n");
  });
});

test("uninstall --purge removes tweaks; default uninstall does not", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    await uninstall({ app: h.app.appRoot });
    assert.equal(tweakDataIntact(h), true);
    await install(h.installOpts);
    await uninstall({ app: h.app.appRoot, purge: true });
    assert.equal(existsSync(h.paths.root), false);
  });
});

test("partial A: state without patch is fail-safe and does not delete unknown files", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    const originalHash = headerHash(h.app.asarPath);
    writeFileSync(join(h.app.resourcesDir, "unknown-keep.bin"), "secret\n");
    await install(h.installOpts);
    const state = readState(h.paths.stateFile);
    assert.ok(state);
    const backup = backupAsarPath(h.paths);
    writeFileSync(h.app.asarPath, readFileSync(backup));
    writeState(h.paths.stateFile, state);
    assert.equal(isPatchedAsar(h.app.asarPath), false);

    await uninstall({ app: h.app.appRoot });
    assert.equal(existsSync(join(h.app.resourcesDir, "unknown-keep.bin")), true);
    assert.equal(tweakDataIntact(h), true);
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(headerHash(h.app.asarPath), originalHash);
  });
});

test("partial B: patch without runtime still uninstalls the patch", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    rmSync(h.paths.runtime, { recursive: true, force: true });
    await uninstall({ app: h.app.appRoot });
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(readState(h.paths.stateFile), null);
  });
});

test("partial C: backup vs changed app skips restore when the patch is gone", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await writeSyntheticAsar(h.app.asarPath, { version: "9.9.9-changed", extra: "// changed\n" });
    const logs = await captureLogs(() => uninstall({ app: h.app.appRoot }));
    assert.match(logs, /restore skipped|does not appear|Cleaned up runtime/);
    assert.equal(isPatchedAsar(h.app.asarPath), false);
  });
});

test("partial D: state pointing at a missing app fails clearly", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    const state = readState(h.paths.stateFile);
    assert.ok(state);
    state.appRoot = join(h.testRoot, "missing-app");
    writeState(h.paths.stateFile, state);
    await assert.rejects(() => uninstall({}), /Not Found|not found|Ensure/);
  });
});

test("partial E: malformed state is treated as not installed", async () => {
  await withIsolatedInstaller(async (h) => {
    mkdirSync(h.paths.root, { recursive: true });
    writeFileSync(h.paths.stateFile, "{not-json");
    assert.equal(readState(h.paths.stateFile), null);
    const logs = await captureLogs(() => status());
    assert.match(logs, /Not installed/);
    await uninstall({ app: h.app.appRoot });
    assert.equal(isPatchedAsar(h.app.asarPath), false);
  });
});

test("missing backup refuses to uninstall a patched app", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    rmSync(backupAsarPath(h.paths), { force: true });
    await assert.rejects(
      () => uninstall({ app: h.app.appRoot }),
      /No original app\.asar backup found|No backup found/,
    );
    assert.equal(isPatchedAsar(h.app.asarPath), true);
  });
});

test("uninstall does not register host watchers", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await uninstall({ app: h.app.appRoot });
    assert.equal(existsSync(join(h.homeDir, ".config", "systemd", "user", "codex-plusplus-watcher.service")), false);
    assert.equal(existsSync(join(h.homeDir, "Library", "LaunchAgents", "com.codexplusplus.watcher.plist")), false);
  });
});
