import assert from "node:assert/strict";
import asar from "@electron/asar";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collectOwlBridgeReport,
  codexPlusPlusPaths,
  detectRuntime,
  parsePsOutput,
  type DataPath,
  type OpenReport,
  type RuntimeReport,
} from "../src/commands/debug";
import type { CodexInstall } from "../src/platform";
import type { UserPaths } from "../src/paths";

test("detectRuntime reports owl when the Codex framework is present", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-debug-"));
  try {
    const codex = fakeMacCodex(root);
    mkdirSync(join(codex.appRoot, "Contents", "Frameworks", "Codex Framework.framework"), {
      recursive: true,
    });
    mkdirSync(
      join(codex.appRoot, "Contents", "Frameworks", "Electron Framework.framework"),
      { recursive: true },
    );
    writeFileSync(codex.asarPath, "");

    const runtime = detectRuntime(codex);
    assert.equal(runtime.type, "owl");
    assert.ok(runtime.evidence.some((item) => item.includes("Codex Framework.framework")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("detectRuntime reports electron for an asar Electron app", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-debug-"));
  try {
    const codex = fakeMacCodex(root);
    mkdirSync(
      join(codex.appRoot, "Contents", "Frameworks", "Electron Framework.framework"),
      { recursive: true },
    );
    writeFileSync(codex.asarPath, "");

    const runtime = detectRuntime(codex);
    assert.equal(runtime.type, "electron");
    assert.ok(runtime.evidence.some((item) => item.includes("Electron Framework.framework")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parsePsOutput extracts pids, start times, and commands", () => {
  const rows = parsePsOutput(
    [
      " 123 1 Sun May 31 12:03:58 2026 /Applications/Codex.app/Contents/MacOS/Codex",
      " 124 123 Sun May 31 12:04:01 2026 /Applications/Codex.app/Contents/Resources/codex --agent",
    ].join("\n"),
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.pid, 123);
  assert.equal(rows[0]?.ppid, 1);
  assert.equal(rows[0]?.startedAtRaw, "Sun May 31 12:03:58 2026");
  assert.equal(rows[0]?.command, "/Applications/Codex.app/Contents/MacOS/Codex");
  assert.equal(rows[1]?.command, "/Applications/Codex.app/Contents/Resources/codex --agent");
});

test("codexPlusPlusPaths reports paths without creating them", () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-debug-"));
  const home = join(root, "clean-home");
  const paths: UserPaths = {
    root: home,
    runtime: join(home, "runtime"),
    tweaks: join(home, "tweaks"),
    backup: join(home, "backup"),
    configFile: join(home, "config.json"),
    stateFile: join(home, "state.json"),
    updateModeFile: join(home, "update-mode.json"),
    selfUpdateStateFile: join(home, "self-update-state.json"),
    binDir: join(home, "bin"),
    logDir: join(home, "log"),
  };

  try {
    const reported = codexPlusPlusPaths(paths);
    assert.equal(reported.some((item: DataPath) => item.exists), false);
    assert.equal(reported.find((item) => item.label === "Root")?.path, home);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("collectOwlBridgeReport reports install-time Owl bridge capabilities while Codex is closed", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-debug-"));
  const previousPort = process.env.CODEXPP_REMOTE_DEBUG_PORT;
  process.env.CODEXPP_REMOTE_DEBUG_PORT = "9";
  try {
    const codex = fakeMacCodex(root);
    const src = join(root, "asar-src");
    mkdirSync(join(src, ".vite", "build"), { recursive: true });
    writeFileSync(
      join(src, ".vite", "build", "main.js"),
      "globalThis.__codexpp_window_services__ = services;",
    );
    await asar.createPackageWithOptions(src, codex.asarPath, {
      globOptions: { dot: true },
    });

    const paths = fakeUserPaths(join(root, "user"));
    mkdirSync(paths.runtime, { recursive: true });
    mkdirSync(join(paths.runtime, "native"), { recursive: true });
    writeFileSync(join(paths.runtime, "native", "codexpp_native_host.node"), "");
    writeFileSync(
      join(paths.runtime, "main.js"),
      [
        "codexpp:native-load-module",
        "codexpp:codex-view-create",
        "codexpp:native-create-panel",
        "codexpp:native-attach-view",
        "codexpp:native-launch-helper",
      ].join("\n"),
    );

    const runtime: RuntimeReport = { type: "owl", evidence: [] };
    const open: OpenReport = {
      status: "closed",
      pid: null,
      relatedPids: [],
      hasMainProcess: false,
      openedAt: null,
      openedAtRaw: null,
      detail: null,
    };
    const report = collectOwlBridgeReport(codex, runtime, open, paths);

    assert.equal(report.runtimeProbe, "ok (owl)");
    assert.equal(report.rendererBridge, "unavailable (Codex closed)");
    assert.equal(report.windowServices, "available");
    assert.equal(report.windowsCreate, "available");
    assert.equal(report.windowsPrimary, "available");
    assert.equal(report.owlViews, "available");
    assert.equal(report.cdp, "supported, disabled");
    assert.equal(report.nativeModules, "available");
    assert.equal(report.nativeHelpers, "available");
    assert.equal(report.nativePanels, process.platform === "darwin" ? "available" : "unavailable");
    assert.equal(report.metalViews, process.platform === "darwin" ? "available" : "unavailable");
  } finally {
    if (previousPort === undefined) delete process.env.CODEXPP_REMOTE_DEBUG_PORT;
    else process.env.CODEXPP_REMOTE_DEBUG_PORT = previousPort;
    rmSync(root, { recursive: true, force: true });
  }
});

function fakeMacCodex(root: string): CodexInstall {
  const appRoot = join(root, "Codex.app");
  const resourcesDir = join(appRoot, "Contents", "Resources");
  mkdirSync(resourcesDir, { recursive: true });
  return {
    appRoot,
    resourcesDir,
    asarPath: join(resourcesDir, "app.asar"),
    metaPath: join(appRoot, "Contents", "Info.plist"),
    electronBinary: join(
      appRoot,
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
      "Versions",
      "A",
      "Electron Framework",
    ),
    executable: join(appRoot, "Contents", "MacOS", "Codex"),
    appName: "Codex",
    bundleId: "com.openai.codex",
    channel: "stable",
    platform: "darwin",
  };
}

function fakeUserPaths(root: string): UserPaths {
  return {
    root,
    runtime: join(root, "runtime"),
    tweaks: join(root, "tweaks"),
    backup: join(root, "backup"),
    configFile: join(root, "config.json"),
    stateFile: join(root, "state.json"),
    updateModeFile: join(root, "update-mode.json"),
    selfUpdateStateFile: join(root, "self-update-state.json"),
    binDir: join(root, "bin"),
    logDir: join(root, "log"),
  };
}
