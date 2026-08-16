import assert from "node:assert/strict";
import test from "node:test";
import { install } from "../src/commands/install";
import { repair } from "../src/commands/repair";
import { readState } from "../src/state";
import {
  asarHasLoader,
  backupAsarPath,
  headerHash,
  isPatchedAsar,
  readAsarPackage,
  runtimeIntact,
  withIsolatedInstaller,
} from "./helpers/fake-chatgpt-app";
import { asarHasReadablePackageJson } from "../src/asar";

const reps = Math.max(1, Number(process.env.ASAR_REPLACE_STRESS_REPS ?? "5") || 5);

test(`install -> repair -> repair stays healthy across ${reps} isolated fixtures`, async () => {
  for (let i = 0; i < reps; i++) {
    await withIsolatedInstaller(async (h) => {
      await install(h.installOpts);
      await repair({ ...h.installOpts, force: true });
      await repair({ ...h.installOpts, force: true });
      const state = readState(h.paths.stateFile);
      assert.ok(state, `rep ${i + 1}: missing state`);
      assert.equal(isPatchedAsar(h.app.asarPath), true, `rep ${i + 1}: not patched`);
      assert.equal(asarHasLoader(h.app.asarPath), true, `rep ${i + 1}: missing loader`);
      assert.equal(readAsarPackage(h.app.asarPath).main, "codex-plusplus-loader.cjs", `rep ${i + 1}: main`);
      assert.equal(asarHasReadablePackageJson(h.app.asarPath), true, `rep ${i + 1}: dest package.json`);
      assert.equal(asarHasReadablePackageJson(backupAsarPath(h.paths)), true, `rep ${i + 1}: backup package.json`);
      assert.equal(isPatchedAsar(backupAsarPath(h.paths)), false, `rep ${i + 1}: backup poisoned`);
      assert.equal(headerHash(backupAsarPath(h.paths)), state.originalAsarHash, `rep ${i + 1}: backup hash`);
      assert.equal(runtimeIntact(h.paths), true, `rep ${i + 1}: runtime`);
    });
  }
});
