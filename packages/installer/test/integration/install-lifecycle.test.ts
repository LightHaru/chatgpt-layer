import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { patchAsar, uncacheAsar } from "../../src/asar";
import { install, stageAssets } from "../../src/commands/install";
import { repair } from "../../src/commands/repair";
import { status } from "../../src/commands/status";
import { uninstall } from "../../src/commands/uninstall";
import { readState } from "../../src/state";
import { userPaths } from "../../src/paths";
import {
  asarHasFile,
  asarHasLoader,
  backupAsarPath,
  builtCliPath,
  builtRuntimePresent,
  captureLogs,
  headerHash,
  isPatchedAsar,
  readAsarPackage,
  runtimeIntact,
  seedTweakAndConfig,
  tweakDataIntact,
  windowServicesPatched,
  withIsolatedInstaller,
} from "../helpers/fake-chatgpt-app";

test("integration tests use built installer runtime assets, not a hand-copied tree", () => {
  assert.equal(builtRuntimePresent(), true);
});

test("CODEX_PLUSPLUS_HOME is the user-data override (internal, existing)", async () => {
  await withIsolatedInstaller(async (h) => {
    const paths = userPaths();
    assert.equal(paths.root, h.userData);
    assert.equal(paths.root.startsWith(h.testRoot), true);
  });
});

test("fresh install backup, patch, loader/runtime, state, unrelated files, path safety", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    const originalHash = headerHash(h.app.asarPath);
    await install(h.installOpts);

    assert.equal(existsSync(backupAsarPath(h.paths)), true);
    assert.equal(headerHash(backupAsarPath(h.paths)), originalHash);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(asarHasLoader(h.app.asarPath), true);
    const pkg = readAsarPackage(h.app.asarPath);
    assert.equal(pkg.main, "codex-plusplus-loader.cjs");
    assert.equal(pkg.__codexpp?.originalMain, "main.js");
    assert.equal(pkg.__codexpp?.userRoot, h.userData);
    assert.equal(windowServicesPatched(h.app.asarPath), true);
    assert.equal(runtimeIntact(h.paths), true);
    assert.equal(existsSync(join(h.paths.runtime, "main.js")), true);
    assert.equal(asarHasFile(h.app.asarPath, "unrelated-keep.txt"), true);
    assert.equal(readFileSync(h.app.unrelatedAppFile, "utf8"), "app-unrelated\n");
    assert.equal(tweakDataIntact(h), true);

    const state = readState(h.paths.stateFile);
    assert.ok(state);
    assert.equal(state.appRoot, h.app.appRoot);
    assert.equal(state.originalAsarHash, originalHash);
    assert.equal(state.patchedAsarHash, headerHash(h.app.asarPath));
    assert.notEqual(state.patchedAsarHash, state.originalAsarHash);
    assert.equal(state.originalEntryPoint, "main.js");
    assert.equal(state.watcher, "none");
    assert.equal(h.paths.root, h.userData);
  });
});

test("status after install reports patched integrity without a full-string snapshot", async () => {
  await withIsolatedInstaller(async (h) => {
    const before = await captureLogs(() => status());
    assert.match(before, /Not installed/);
    assert.doesNotMatch(before, /matches patched/);

    await install(h.installOpts);
    const after = await captureLogs(() => status());
    assert.match(after, /install/);
    assert.match(after, /matches patched/);
    assert.match(after, new RegExp(h.app.appRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(after, /Not installed/);
    assert.doesNotMatch(after, /drift!/);
  });
});

test("install is idempotent: no nested backups, duplicate loader, or path drift", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    const first = readState(h.paths.stateFile);
    const firstBackupHash = headerHash(backupAsarPath(h.paths));
    await install(h.installOpts);
    const second = readState(h.paths.stateFile);
    assert.ok(first && second);
    assert.equal(headerHash(backupAsarPath(h.paths)), firstBackupHash);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(asarHasLoader(h.app.asarPath), true);
    assert.equal(readAsarPackage(h.app.asarPath).main, "codex-plusplus-loader.cjs");
    assert.equal(second.appRoot, first.appRoot);
    assert.equal(second.originalAsarHash, first.originalAsarHash);
    assert.equal(existsSync(join(h.paths.backup, "app.asar", "app.asar")), false);
  });
});

test("install refuses to poison the only asar backup with a patched copy", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    assert.equal(isPatchedAsar(backupAsarPath(h.paths)), false);
    rmSync(backupAsarPath(h.paths), { force: true });
    await install(h.installOpts);
    assert.equal(existsSync(backupAsarPath(h.paths)), false);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
  });
});

test("install -> repair -> repair keeps a single loader and stable paths", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await repair({ ...h.installOpts, force: true });
    await repair({ ...h.installOpts, force: true });
    const state = readState(h.paths.stateFile);
    assert.ok(state);
    assert.equal(readAsarPackage(h.app.asarPath).main, "codex-plusplus-loader.cjs");
    assert.equal(asarHasLoader(h.app.asarPath), true);
    assert.equal(state.appRoot, h.app.appRoot);
    assert.equal(runtimeIntact(h.paths), true);
  });
});

test("install -> uninstall -> install restores a clean patched layout", async () => {
  await withIsolatedInstaller(async (h) => {
    seedTweakAndConfig(h);
    await install(h.installOpts);
    await uninstall({ app: h.app.appRoot });
    assert.equal(isPatchedAsar(h.app.asarPath), false);
    assert.equal(readState(h.paths.stateFile), null);
    await install(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(runtimeIntact(h.paths), true);
    assert.equal(tweakDataIntact(h), true);
  });
});

test("partial F: patch already present on re-install is fail-safe", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    await install(h.installOpts);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
    assert.equal(isPatchedAsar(backupAsarPath(h.paths)), false);
  });
});

test("already patched with no state and no backup does not record a patched original hash", async () => {
  await withIsolatedInstaller(async (h) => {
    await install(h.installOpts);
    rmSync(h.paths.stateFile, { force: true });
    rmSync(backupAsarPath(h.paths), { force: true });
    rmSync(join(h.paths.backup, "app.asar.unpacked"), { recursive: true, force: true });
    rmSync(join(h.paths.backup, "Codex.app"), { recursive: true, force: true });
    await install(h.installOpts);
    const state = readState(h.paths.stateFile);
    assert.ok(state);
    assert.equal(state.originalAsarHash, null);
    assert.notEqual(state.originalAsarHash, state.patchedAsarHash);
    assert.equal(existsSync(backupAsarPath(h.paths)), false);
    await assert.rejects(() => uninstall({ app: h.app.appRoot }), /backup|original|unknown|Refusing/i);
    assert.equal(isPatchedAsar(h.app.asarPath), true);
  });
});

test("malformed ASAR fails clearly and does not report success", async () => {
  await withIsolatedInstaller(async (h) => {
    writeFileSync(h.app.asarPath, "this is not an asar archive");
    await assert.rejects(() => install(h.installOpts), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.doesNotMatch(err.message, /ChatGPT Layer installed/);
      return true;
    });
    assert.equal(readState(h.paths.stateFile), null);
  });
});

test("unwritable asar fails preflight without a false success", async () => {
  await withIsolatedInstaller(async (h) => {
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    chmodSync(h.app.asarPath, 0o444);
    try {
      await assert.rejects(() => install(h.installOpts), /Cannot write to /);
      assert.equal(readState(h.paths.stateFile), null);
    } finally {
      chmodSync(h.app.asarPath, 0o644);
    }
  });
});

test("runtime copy failure is not a false success", async () => {
  await withIsolatedInstaller(async (h) => {
    const dest = join(h.tmpDir, "runtime-as-file");
    writeFileSync(dest, "not-a-directory");
    assert.throws(() => stageAssets(dest), Error);
  });
});

test("write failure during patchAsar is not a false success", async () => {
  await withIsolatedInstaller(async (h) => {
    if (process.platform === "win32" || process.getuid?.() === 0) return;
    chmodSync(h.app.resourcesDir, 0o555);
    try {
      await assert.rejects(
        () => patchAsar(h.app.asarPath, () => {}),
        Error,
      );
    } finally {
      chmodSync(h.app.resourcesDir, 0o755);
    }
  });
});

test("CLI smoke: built installer status/doctor/install/repair/uninstall stay on the fixture", async () => {
  await withIsolatedInstaller(async (h) => {
    const cli = builtCliPath();
    assert.equal(existsSync(cli), true, "packages/installer/dist/cli.js missing; run workspace build first");

    const run = (args: string[]) => {
      try { uncacheAsar(h.app.asarPath); } catch { /* parent must not keep the asar mapped */ }
      return spawnSync(process.execPath, [cli, ...args], {
        env: h.env,
        encoding: "utf8",
        timeout: 60_000,
      });
    };

    const notInstalled = run(["status"]);
    assert.equal(notInstalled.status, 0, notInstalled.stderr);
    assert.match(notInstalled.stdout, /Not installed/);
    assert.doesNotMatch(notInstalled.stdout, /\/Applications\/ChatGPT\.app/);
    assert.doesNotMatch(notInstalled.stdout, /Program Files/);

    const doctorBefore = run(["doctor"]);
    assert.match(doctorBefore.stdout, /no state file|installed/);

    const installed = run([
      "install",
      "--app",
      h.app.appRoot,
      "--no-watcher",
      "--no-fuse",
      "--no-resign",
    ]);
    assert.equal(installed.status, 0, `${installed.stdout}\n${installed.stderr}`);
    assert.equal(isPatchedAsar(h.app.asarPath), true);

    const statusAfter = run(["status"]);
    assert.equal(statusAfter.status, 0, statusAfter.stderr);
    assert.match(statusAfter.stdout, /matches patched/);

    const doctorAfter = run(["doctor"]);
    assert.match(doctorAfter.stdout, /asar header hash|matches patched|All checks passed|check\(s\) failed/);

    const repaired = run(["repair", "--app", h.app.appRoot, "--force", "--quiet"]);
    assert.equal(repaired.status, 0, `${repaired.stdout}\n${repaired.stderr}`);

    const uninstalled = run(["uninstall", "--app", h.app.appRoot]);
    assert.equal(uninstalled.status, 0, `${uninstalled.stdout}\n${uninstalled.stderr}`);
    assert.equal(isPatchedAsar(h.app.asarPath), false);
  });
});
