import kleur from "kleur";
import { ensureUserPaths } from "../paths.js";
import { readState } from "../state.js";
import { locateCodex } from "../platform.js";
import { readHeaderHash } from "../asar.js";
import { verifySignature } from "../codesign.js";
import { existsSync, accessSync, constants } from "node:fs";
import { integrityWriterReport } from "../integrity.js";

interface Check {
  name: string;
  ok: boolean | "warn";
  detail: string;
}

export async function doctor(): Promise<void> {
  const checks: Check[] = [];
  const paths = ensureUserPaths();
  const state = readState(paths.stateFile);

  checks.push({
    name: "user dir writable",
    ok: tryWrite(paths.root),
    detail: paths.root,
  });

  if (!state) {
    checks.push({
      name: "installed",
      ok: false,
      detail: "no state file — run `codex-plusplus install`",
    });
    print(checks);
    return;
  }

  let codex;
  try {
    codex = locateCodex(state.appRoot);
    checks.push({ name: "Codex.app present", ok: true, detail: codex.appRoot });
  } catch (e) {
    checks.push({
      name: "Codex.app present",
      ok: false,
      detail: (e as Error).message,
    });
    print(checks);
    return;
  }

  if (existsSync(codex.asarPath)) {
    const { headerHash } = readHeaderHash(codex.asarPath);
    checks.push({
      name: "asar header hash",
      ok: headerHash === state.patchedAsarHash || "warn",
      detail:
        headerHash === state.patchedAsarHash
          ? "matches patched"
          : headerHash === state.originalAsarHash
            ? "matches ORIGINAL — Codex updated; run `codex-plusplus repair`"
            : "drift from both original and patched",
    });
  }

  if (codex.platform === "darwin") {
    const sig = verifySignature(codex.appRoot);
    checks.push({
      name: "code signature",
      ok: sig.ok,
      detail: sig.ok ? "valid (ad-hoc)" : sig.output.split("\n")[0],
    });
  }

  for (const dir of [paths.runtime, paths.tweaks, paths.logDir]) {
    checks.push({
      name: `${dir.split("/").slice(-1)} dir`,
      ok: existsSync(dir),
      detail: dir,
    });
  }

  const integrity = integrityWriterReport(codex.platform);
  checks.push({
    name: "asar integrity writer",
    ok: integrity.ok,
    detail: integrity.detail,
  });

  print(checks);
}

function tryWrite(p: string): boolean {
  try {
    accessSync(p, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function print(checks: Check[]): void {
  console.log(kleur.bold("codex-plusplus doctor\n"));
  for (const c of checks) {
    const mark =
      c.ok === true
        ? kleur.green("✓")
        : c.ok === "warn"
          ? kleur.yellow("!")
          : kleur.red("✗");
    console.log(`  ${mark} ${c.name.padEnd(24)} ${kleur.dim(c.detail)}`);
  }
  const failed = checks.filter((c) => c.ok === false).length;
  console.log();
  if (failed === 0) {
    console.log(kleur.green("All checks passed."));
  } else {
    console.log(kleur.red(`${failed} check(s) failed.`));
    process.exitCode = 1;
  }
}
