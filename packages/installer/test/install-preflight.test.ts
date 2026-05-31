import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertCodexNotRunning,
  prepareCodexForPatching,
  preflightWritableTargets,
  shouldBackupUnpatchedApp,
  shouldFlipElectronFuse,
} from "../src/commands/install";
import type { OpenReport } from "../src/commands/debug";
import type { CodexInstall } from "../src/platform";

test("install preflight checks Info.plist before patching", { skip: process.platform === "win32" }, () => {
  withTempDir((root) => {
    const resourcesDir = join(root, "Contents", "Resources");
    const frameworkDir = join(
      root,
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
      "Versions",
      "A",
    );
    mkdirSync(resourcesDir, { recursive: true });
    mkdirSync(frameworkDir, { recursive: true });

    const asarPath = join(resourcesDir, "app.asar");
    const metaPath = join(root, "Contents", "Info.plist");
    const electronBinary = join(frameworkDir, "Electron Framework");
    writeFileSync(asarPath, "");
    writeFileSync(metaPath, "");
    writeFileSync(electronBinary, "");
    chmodSync(metaPath, 0o444);

    try {
      let error: unknown;
      assert.throws(
        () => {
          try {
            preflightWritableTargets(
              {
                resourcesDir,
                asarPath,
                metaPath,
                electronBinary,
                platform: "darwin",
              },
              { fuseFlip: true },
            );
          } catch (e) {
            error = e;
            throw e;
          }
        },
        /Cannot write to .*Info\.plist/,
      );
      assert.match(String(error), /codexplusplus repair/);
    } finally {
      chmodSync(metaPath, 0o644);
    }
  });
});

test("install preflight checks Electron Framework when fuse flip is enabled", { skip: process.platform === "win32" }, () => {
  withTempDir((root) => {
    const resourcesDir = join(root, "Contents", "Resources");
    const frameworkDir = join(
      root,
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
      "Versions",
      "A",
    );
    mkdirSync(resourcesDir, { recursive: true });
    mkdirSync(frameworkDir, { recursive: true });

    const asarPath = join(resourcesDir, "app.asar");
    const metaPath = join(root, "Contents", "Info.plist");
    const electronBinary = join(frameworkDir, "Electron Framework");
    writeFileSync(asarPath, "");
    writeFileSync(metaPath, "");
    writeFileSync(electronBinary, "");
    chmodSync(electronBinary, 0o444);

    try {
      assert.throws(
        () =>
          preflightWritableTargets(
            {
              resourcesDir,
              asarPath,
              metaPath,
              electronBinary,
              platform: "darwin",
            },
            { fuseFlip: true },
          ),
        /Cannot write to .*Electron Framework/,
      );
    } finally {
      chmodSync(electronBinary, 0o644);
    }
  });
});

test("install refreshes full app backup only for unpatched apps", () => {
  assert.equal(
    shouldBackupUnpatchedApp({
      hasPatchMarker: false,
      signature: {
        ok: true,
        adHoc: false,
        teamIdentifier: "TEAM",
        authority: ["Developer ID Application"],
        output: "",
      },
    }),
    true,
  );

  assert.equal(
    shouldBackupUnpatchedApp({
      hasPatchMarker: true,
      signature: {
        ok: true,
        adHoc: false,
        teamIdentifier: "TEAM",
        authority: ["Developer ID Application"],
        output: "",
      },
    }),
    false,
  );

  assert.equal(
    shouldBackupUnpatchedApp({
      hasPatchMarker: false,
      signature: {
        ok: false,
        adHoc: false,
        teamIdentifier: null,
        authority: [],
        output: "invalid signature",
      },
    }),
    false,
  );
});

test("install skips Electron fuse flipping when the framework binary is missing", () => {
  withTempDir((root) => {
    const electronBinary = join(root, "Electron Framework");
    assert.equal(shouldFlipElectronFuse({ electronBinary }, true), false);
    writeFileSync(electronBinary, "");
    assert.equal(shouldFlipElectronFuse({ electronBinary }, true), true);
    assert.equal(shouldFlipElectronFuse({ electronBinary }, false), false);
  });
});

test("install preflight allows patching when Codex is closed", () => {
  assert.doesNotThrow(() => {
    assertCodexNotRunning(fakeCodex(), {
      status: "closed",
      pid: null,
      relatedPids: [],
      openedAt: null,
      openedAtRaw: null,
      detail: null,
    });
  });
});

test("install preflight ignores helper-only Codex processes", () => {
  const helperOnly = {
    status: "background",
    pid: 123,
    relatedPids: [123, 456],
    hasMainProcess: false,
    openedAt: "2026-05-23T09:17:22.000Z",
    openedAtRaw: null,
    detail: "Only helper/background processes were found.",
  } satisfies OpenReport;

  assert.doesNotThrow(() => {
    assertCodexNotRunning(fakeCodex(), helperOnly);
  });

  assert.equal(
    prepareCodexForPatching(fakeCodex(), {
      getOpenReport: () => helperOnly,
    }),
    false,
  );
});

test("install preflight blocks patching while Codex is running", () => {
  assert.throws(
    () => {
      assertCodexNotRunning(fakeCodex(), {
        status: "inactive",
        pid: 123,
        relatedPids: [123, 456],
        openedAt: "2026-05-31T11:35:54.000Z",
        openedAtRaw: null,
        detail: "Main Codex process is running but not frontmost.",
      } satisfies OpenReport);
    },
    /Close Codex before patching[\s\S]*Changing the bundle underneath an active process/,
  );
});

test("install preflight restarts a running macOS Codex before patching", () => {
  const reports: OpenReport[] = [
    {
      status: "inactive",
      pid: 123,
      relatedPids: [123, 456],
      openedAt: "2026-05-31T11:35:54.000Z",
      openedAtRaw: null,
      detail: "Main Codex process is running but not frontmost.",
    },
    {
      status: "closed",
      pid: null,
      relatedPids: [],
      openedAt: null,
      openedAtRaw: null,
      detail: null,
    },
  ];
  let prompted = false;
  let reportIndex = 0;

  const shouldReopen = prepareCodexForPatching(fakeCodex(), {
    getOpenReport: () => reports[Math.min(reportIndex++, reports.length - 1)]!,
    quitCodex: () => {
      prompted = true;
    },
  });

  assert.equal(prompted, true);
  assert.equal(shouldReopen, true);
});

test("install preflight fails if Codex does not quit for restart patching", () => {
  assert.throws(
    () => {
      prepareCodexForPatching(fakeCodex(), {
        getOpenReport: () => ({
          status: "inactive",
          pid: 123,
          relatedPids: [123],
          openedAt: "2026-05-31T11:35:54.000Z",
          openedAtRaw: null,
          detail: "Main Codex process is running but not frontmost.",
        }),
        quitCodex: () => {},
      });
    },
    /Close Codex before patching/,
  );
});

function withTempDir(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "codexpp-install-preflight-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fakeCodex(): CodexInstall {
  return {
    appRoot: "/Applications/Codex.app",
    resourcesDir: "/Applications/Codex.app/Contents/Resources",
    asarPath: "/Applications/Codex.app/Contents/Resources/app.asar",
    metaPath: "/Applications/Codex.app/Contents/Info.plist",
    electronBinary: "/Applications/Codex.app/Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework",
    executable: "/Applications/Codex.app/Contents/MacOS/Codex",
    appName: "Codex",
    bundleId: "com.openai.codex",
    channel: "stable",
    platform: "darwin",
  };
}
