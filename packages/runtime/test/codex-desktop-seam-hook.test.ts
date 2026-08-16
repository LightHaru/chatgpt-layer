import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build } from "esbuild";
import { CodexDesktopSpawnProbe } from "../src/codex-desktop-seam";
import type { SpawnModule } from "../src/codex-desktop-seam";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "fixtures", "desktop-spawn-probe");
const mainSrc = join(here, "..", "src", "main.ts");

function runNodeScript(
  script: string,
  options: { execArgv: string[]; env?: NodeJS.ProcessEnv },
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...options.execArgv, script], {
      stdio: ["ignore", "pipe", "pipe"],
      env: options.env ?? process.env,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`timed out running ${script}`));
    }, 20000);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

test("production main acquires child_process via createRequire helper, not import *", () => {
  const source = readFileSync(mainSrc, "utf8");
  assert.match(source, /getSharedChildProcessModule/);
  assert.doesNotMatch(source, /import\s+\*\s+as\s+\w+\s+from\s+["']node:child_process["']/);
});

test("getter-only spawn is fail-closed and does not abort install", () => {
  const original = (..._args: unknown[]) => ({ original: true });
  const spawnModule = {} as SpawnModule;
  Object.defineProperty(spawnModule, "spawn", {
    get: () => original,
    enumerable: true,
    configurable: true,
  });
  const errors: string[] = [];
  const probe = new CodexDesktopSpawnProbe({
    spawnModule,
    env: { CODEXPP_APP_SERVER_PROBE: "1" },
    trustedRoots: () => ["/trusted"],
    onInstallError: (category) => errors.push(category),
  });
  assert.doesNotThrow(() => probe.install());
  assert.equal(spawnModule.spawn, original);
  assert.equal(probe.getStatus().hookInstalled, false);
  assert.equal(probe.getStatus().hookInstallError, "spawn-hook-unavailable");
  assert.equal(probe.getStatus().candidateObserved, false);
  assert.deepEqual(errors, ["spawn-hook-unavailable"]);
  assert.equal(probe.uninstall(), false);
});

test("stale uninstall does not overwrite a newer wrapper", () => {
  const calls: unknown[][] = [];
  const original = (...args: unknown[]) => {
    calls.push(args);
    return { original: true };
  };
  const spawnModule: SpawnModule = { spawn: original };
  const first = new CodexDesktopSpawnProbe({
    spawnModule,
    env: { CODEXPP_APP_SERVER_PROBE: "1" },
    trustedRoots: () => ["/trusted"],
  });
  first.install();
  const wrapped = spawnModule.spawn;
  assert.notEqual(wrapped, original);
  const second = new CodexDesktopSpawnProbe({
    spawnModule,
    env: { CODEXPP_APP_SERVER_PROBE: "1" },
    trustedRoots: () => ["/trusted"],
  });
  assert.doesNotThrow(() => second.install());
  assert.equal(second.getStatus().hookInstalled, false);
  assert.equal(spawnModule.spawn, wrapped);
  assert.equal(second.uninstall(), false);
  assert.equal(spawnModule.spawn, wrapped);
  assert.equal(first.uninstall(), true);
  assert.equal(spawnModule.spawn, original);
});

test("isolated process: fresh require sees the shared CJS spawn hook and restore", async () => {
  const result = await runNodeScript(join(fixtures, "isolated-shared-require.ts"), {
    execArgv: ["--import", "tsx"],
  });
  assert.equal(result.code, 0, result.stderr);
  const payload = JSON.parse(result.stdout) as Record<string, unknown>;
  assert.equal(payload.threw, false);
  assert.equal(payload.hookInstalled, true);
  assert.equal(payload.sameModule, true);
  assert.equal(payload.freshSeesWrapper, true);
  assert.equal(payload.restored, true);
  assert.equal(payload.originalRestored, true);
});

test("bundled createRequire wiring patches the shared CJS export", async () => {
  const dir = mkdtempSync(join(tmpdir(), "codexpp-seam-bundle-"));
  const outfile = join(dir, "create-require-bundle.cjs");
  try {
    await build({
      entryPoints: [join(fixtures, "bundle-create-require-entry.ts")],
      bundle: true,
      outfile,
      platform: "node",
      target: "node20",
      format: "cjs",
      minify: false,
      sourcemap: false,
      logLevel: "silent",
      write: true,
    });
    const bundled = readFileSync(outfile, "utf8");
    assert.match(bundled, /createRequire/);
    assert.doesNotMatch(bundled, /__toESM\(\s*require\(\s*["']node:child_process["']\s*\)\s*\)/);
    const result = await runNodeScript(outfile, { execArgv: [] });
    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(payload.threw, false);
    assert.equal(payload.hookInstalled, true);
    assert.equal(payload.sameModule, true);
    assert.equal(payload.freshSeesWrapper, true);
    assert.equal(payload.restored, true);
    assert.equal(payload.originalRestored, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bundled ESM namespace mutation fails closed and does not patch shared export", async () => {
  const dir = mkdtempSync(join(tmpdir(), "codexpp-seam-esm-"));
  const outfile = join(dir, "esm-namespace-bundle.cjs");
  try {
    await build({
      entryPoints: [join(fixtures, "bundle-esm-namespace-entry.ts")],
      bundle: true,
      outfile,
      platform: "node",
      target: "node20",
      format: "cjs",
      minify: false,
      sourcemap: false,
      logLevel: "silent",
      write: true,
    });
    const bundled = readFileSync(outfile, "utf8");
    assert.match(bundled, /__toESM\(\s*require\(\s*["']node:child_process["']\s*\)\s*\)/);
    const result = await runNodeScript(outfile, { execArgv: [] });
    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout) as Record<string, unknown>;
    assert.equal(payload.threw, false);
    assert.equal(payload.hookInstalled, false);
    assert.equal(payload.hookInstallError, "spawn-hook-unavailable");
    assert.equal(payload.freshUnchanged, true);
    const live = createRequire(outfile)("node:child_process") as { spawn: unknown };
    assert.equal(typeof live.spawn, "function");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
