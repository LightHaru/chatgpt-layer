import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { analyzeWatcherLogTail, getWatcherHealth } from "../src/watcher-health";

test("watcher health reports missing install state as not ready", () => {
  withTempDir((root) => {
    const health = getWatcherHealth(root);

    assert.equal(health.status, "error");
    assert.equal(health.watcher, "none");
    assert.equal(health.checks[0]?.name, "Install state");
    assert.equal(health.checks[0]?.status, "error");
  });
});

test("watcher health treats missing Layer self-update as disabled", () => {
  withTempDir((root) => {
    writeInstallState(root);

    const check = layerSelfUpdateCheck(root);
    assert.equal(check?.status, "warn");
    assert.equal(check?.detail, "disabled (opt-in; default off)");
  });
});

test("watcher health treats Layer self-update false as disabled", () => {
  withTempDir((root) => {
    writeInstallState(root, { autoUpdate: false });

    const health = getWatcherHealth(root);
    const check = health.checks.find((item) => item.name === "Layer self-update");
    assert.equal(check?.status, "warn");
    assert.equal(check?.detail, "disabled (opt-in; default off)");
    assert.equal(
      health.checks.find((item) => item.name === "Watcher kind")?.status,
      "error",
    );
  });
});

test("watcher health treats Layer self-update true as enabled", () => {
  withTempDir((root) => {
    writeInstallState(root, { autoUpdate: true });

    const check = layerSelfUpdateCheck(root);
    assert.equal(check?.status, "ok");
    assert.equal(check?.detail, "enabled");
  });
});

test("watcher log health points privileged repair failures to terminal repair", () => {
  const check = analyzeWatcherLogTail(`
✗ codex-plusplus failed
Cannot write to /Applications/Codex.app/Contents/Info.plist.

macOS App Management or file ownership is blocking modification of /Applications/Codex.app/Contents/Info.plist.
Fix:
  Open Terminal and run: codexplusplus repair
`);

  assert.equal(check.name, "watcher log");
  assert.equal(check.status, "warn");
  assert.equal(check.detail, "auto-repair needs app permissions; run `codexplusplus repair` from Terminal");
});

function writeInstallState(root: string, codexPlusPlus?: { autoUpdate?: boolean }): void {
  writeFileSync(
    join(root, "state.json"),
    JSON.stringify({ version: "0.1.2", watcher: "none", appRoot: "/missing" }),
  );
  if (codexPlusPlus) {
    writeFileSync(join(root, "config.json"), JSON.stringify({ codexPlusPlus }));
  }
}

function layerSelfUpdateCheck(root: string) {
  return getWatcherHealth(root).checks.find((check) => check.name === "Layer self-update");
}

function withTempDir(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "codexpp-watcher-health-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
