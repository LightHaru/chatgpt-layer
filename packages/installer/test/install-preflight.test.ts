import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  preflightWritableTargets,
  shouldBackupUnpatchedApp,
  shouldFlipElectronFuse,
} from "../src/commands/install";

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

function withTempDir(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "codexpp-install-preflight-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
