import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { install } from "../../src/commands/install";
import { repair } from "../../src/commands/repair";
import { status } from "../../src/commands/status";
import { readState, writeState } from "../../src/state";
import {
  asarHasLoader,
  backupAsarPath,
  captureLogs,
  headerHash,
  isPatchedAsar,
  readAsarPackage,
  removeRuntime,
  replaceAsarWithOriginal,
  replaceAsarWithUpdatedPackage,
  runtimeIntact,
  seedTweakAndConfig,
  stripLoaderFromAsarAsync,
  tweakDataIntact,
  windowServicesPatched,
  withIsolatedInstaller,
} from "../helpers/fake-chatgpt-app";

test("repair restores a replaced original asar and keeps tweaks/config", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    const backupHash = headerHash(backupAsarPath(h.paths));
    await replaceAsarWithOriginal(h);
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(headerHash(h.app.asarPath), backupHash);

    await repair(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(asarHasLoader(h.app.asarPath), true);
    assert.equal(windowServicesPatched(h.app.asarPath), true);
    assert.equal(tweakDataIntact(h), true);
    const logs = await captureLogs(() => status());
    assert.match(logs, /matches patched/);
  });
});

test("repair restores a stripped loader/partial patch", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    await stripLoaderFromAsarAsync(h);
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    await repair(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(asarHasLoader(h.app.asarPath), true);
    assert.equal(tweakDataIntact(h), true);
  });
});

test("repair restages a missing runtime without deleting tweaks", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    removeRuntime(h);
    assert.equal(runtimeIntact(h.paths), false);
    await repair(h.installOpts);
    assert.equal(runtimeIntact(h.paths), true);
    assert.equal(existsSync(join(h.paths.runtime, "main.js")), true);
    assert.equal(tweakDataIntact(h), true);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
  });
});

test("second repair is idempotent and status stays healthy", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await repair(h.installOpts);
    const first = readState(h.paths.stateFile);
    const firstHash = headerHash(h.app.asarPath);
    const logs = await captureLogs(() => repair({ ...h.installOpts, quiet: false }));
    assert.match(logs, /Patch already intact|Repair complete|Updated/);
    const second = readState(h.paths.stateFile);
    assert.ok(first && second);
    assert.equal(headerHash(h.app.asarPath), firstHash);
    assert.equal(second.appRoot, first.appRoot);
    assert.equal(readAsarPackage(h.app.asarPath).main, "codex-plusplus-loader.cjs");
    const statusLogs = await captureLogs(() => status());
    assert.match(statusLogs, /matches patched/);
  });
});

test("app update simulation: upstream replaces asar, repair patches the new package", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    const stateBefore = readState(h.paths.stateFile);
    const originalBackup = headerHash(backupAsarPath(h.paths));
    assert.ok(stateBefore);

    await replaceAsarWithUpdatedPackage(h, "2.0.0-fixture");
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(existsSync(h.paths.stateFile), true);
    assert.equal(headerHash(backupAsarPath(h.paths)), originalBackup);

    await repair(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(asarHasLoader(h.app.asarPath), true);
    assert.equal(tweakDataIntact(h), true);
    const stateAfter = readState(h.paths.stateFile);
    assert.ok(stateAfter);
    assert.equal(stateAfter.appRoot, stateBefore.appRoot);
    assert.notEqual(stateAfter.patchedAsarHash, stateBefore.patchedAsarHash);
    assert.equal(headerHash(backupAsarPath(h.paths)), originalBackup);
    assert.equal(isPatchedAsar(backupAsarPath(h.paths)), false);
    const logs = await captureLogs(() => status());
    assert.match(logs, /matches patched/);
  });
});

test("repair with state but no patch re-applies against the current asar", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    await replaceAsarWithOriginal(h);
    await repair(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(tweakDataIntact(h), true);
  });
});

test("repair does not create host watcher units", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await repair({ ...h.installOpts, force: true });
    assert.equal(existsSync(join(h.homeDir, ".config", "systemd", "user", "codex-plusplus-watcher.service")), false);
    assert.equal(existsSync(join(h.homeDir, "Library", "LaunchAgents", "com.codexplusplus.watcher.plist")), false);
  });
});
