import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  codexPlusPlusPaths,
  detectRuntime,
  parsePsOutput,
  type DataPath,
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
