import kleur from "kleur";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, rmSync, renameSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { locateCodex } from "../platform.js";
import { ensureUserPaths } from "../paths.js";
import { readState, type InstallerState } from "../state.js";
import { prepareCodeSigning, signCodexApp } from "../codesign.js";
import { uninstallWatcher } from "../watcher.js";
import { chownForTargetUser } from "../ownership.js";
import { cleanupWindowsManagedArtifacts } from "../windows-cleanup.js";
import { readHeaderHash } from "../asar.js";
import { hasCodexPlusPlusAsarMarker, readCodexVersion } from "./install.js";
import { isCodexRunning } from "../alerts.js";
import type { CodexInstall } from "../platform.js";

interface Opts {
  app?: string;
}

export async function uninstall(opts: Opts = {}): Promise<void> {
  const paths = ensureUserPaths();
  const state = readState(paths.stateFile);
  const codex = locateCodex(opts.app ?? state?.appRoot);

  if (isCodexRunning(codex.appRoot)) {
    throw new Error(
      `[!] Close Codex before uninstalling Codex++\n\n` +
        `Codex is currently running from:\n` +
        `  ${codex.appRoot}\n\n` +
        `Quit Codex completely, then rerun this command. ` +
        `Uninstall needs the app closed so the app on disk and the running process cannot diverge.`,
    );
  }

  const fullAppBackup = codex.platform === "darwin" ? join(paths.backup, "Codex.app") : null;
  const backupAsar = join(paths.backup, "app.asar");
  const backupAsarUnpacked = join(paths.backup, "app.asar.unpacked");
  const backupPlist = codex.metaPath ? join(paths.backup, "Info.plist") : null;
  const backupFramework = join(paths.backup, "Electron Framework");
  const restorePlan = chooseRestorePlan({
    state,
    currentAsarHash: safeReadHeaderHash(codex.asarPath),
    currentCodexVersion: readCodexVersion(codex.metaPath),
    hasPatchMarker: hasCodexPlusPlusAsarMarker(codex.asarPath),
    fullAppBackup,
    partialAsarBackup: backupAsar,
  });

  if (restorePlan.kind === "skip") {
    console.log(kleur.yellow(`Codex.app restore skipped: ${restorePlan.reason}.`));
  } else if (restorePlan.kind === "full-app") {
    restoreFullAppBundle(codex.appRoot, restorePlan.backupPath);
    console.log(kleur.green("Restored full Codex.app bundle from backup."));
  } else {
    restorePartialBackup(codex, {
      backupAsar,
      backupAsarUnpacked,
      backupPlist,
      backupFramework,
      state,
    });
    console.log(kleur.green("Restored Codex.app files from backup."));
  }

  uninstallWatcher();
  cleanupWindowsManagedArtifacts();
  console.log(kleur.green("Removed watcher."));

  // Don't delete user tweaks/config — only installer state + runtime.
  cleanupRuntimeAndState(paths);
  console.log(kleur.green("Cleaned up runtime + state."));
  console.log(
    kleur.dim(`Your tweaks remain at ${paths.tweaks} (delete manually if you want).`),
  );
}

type RestorePlan =
  | { kind: "skip"; reason: string }
  | { kind: "full-app"; backupPath: string }
  | { kind: "partial" };

export function chooseRestorePlan(input: {
  state: InstallerState | null;
  currentAsarHash: string | null;
  currentCodexVersion: string | null;
  hasPatchMarker: boolean;
  fullAppBackup: string | null;
  partialAsarBackup: string;
}): RestorePlan {
  const matchesPatchedHash =
    input.state !== null &&
    input.currentAsarHash !== null &&
    input.currentAsarHash === input.state.patchedAsarHash;
  const matchesOriginalHash =
    input.state !== null &&
    input.currentAsarHash !== null &&
    input.currentAsarHash === input.state.originalAsarHash;
  const appLooksPatched = matchesPatchedHash || input.hasPatchMarker;

  if (!appLooksPatched) {
    if (matchesOriginalHash) {
      return { kind: "skip", reason: "current app already matches the original backup hash" };
    }
    if (input.currentAsarHash === null) {
      return { kind: "skip", reason: "current app.asar could not be inspected and no Codex++ marker was found" };
    }
    return {
      kind: "skip",
      reason: "current app does not appear to contain the Codex++ patch",
    };
  }

  if (input.fullAppBackup && isUsableFullAppBackup(input.fullAppBackup)) {
    return { kind: "full-app", backupPath: input.fullAppBackup };
  }

  if (!existsSync(input.partialAsarBackup)) {
    throw new Error(
      `No backup found at ${input.partialAsarBackup}. Cannot safely uninstall a patched Codex.app.`,
    );
  }

  if (
    input.state?.codexVersion &&
    input.currentCodexVersion &&
    input.state.codexVersion !== input.currentCodexVersion
  ) {
    throw new Error(
      `Cannot safely uninstall with partial backups because Codex changed since Codex++ was installed.\n\n` +
        `Installed against: ${input.state.codexVersion}\n` +
        `Current Codex:     ${input.currentCodexVersion}\n\n` +
        `Update or reinstall Codex from the official app, then remove Codex++ state manually if needed.`,
    );
  }

  return { kind: "partial" };
}

function restoreFullAppBundle(appRoot: string, backupPath: string): void {
  const parent = dirname(appRoot);
  const appName = basename(appRoot);
  const suffix = `${process.pid}-${Date.now()}`;
  const staged = join(parent, `.${appName}.codexpp-restore-${suffix}`);
  const replaced = join(parent, `.${appName}.codexpp-replaced-${suffix}`);

  rmSync(staged, { recursive: true, force: true });
  rmSync(replaced, { recursive: true, force: true });
  execFileSync("ditto", [backupPath, staged], { stdio: "ignore" });

  try {
    if (existsSync(appRoot)) renameSync(appRoot, replaced);
    renameSync(staged, appRoot);
    rmSync(replaced, { recursive: true, force: true });
  } catch (error) {
    try {
      rmSync(appRoot, { recursive: true, force: true });
    } catch {}
    try {
      if (existsSync(replaced)) renameSync(replaced, appRoot);
    } catch {}
    try {
      rmSync(staged, { recursive: true, force: true });
    } catch {}
    throw error;
  }
}

function restorePartialBackup(
  codex: CodexInstall,
  opts: {
    backupAsar: string;
    backupAsarUnpacked: string;
    backupPlist: string | null;
    backupFramework: string;
    state: InstallerState | null;
  },
): void {
  let useLocalIdentity = opts.state?.signingMode === "local-identity";
  let preparedSigning: ReturnType<typeof prepareCodeSigning> = null;
  if (codex.platform === "darwin") {
    try {
      preparedSigning = prepareCodeSigning({ useLocalIdentity });
    } catch (e) {
      if (!useLocalIdentity) throw e;
      useLocalIdentity = false;
      console.warn(
        kleur.yellow(
          `Local signing setup failed; falling back to ad-hoc signing.\n${(e as Error).message}`,
        ),
      );
    }
  }

  cpSync(opts.backupAsar, codex.asarPath);
  if (existsSync(opts.backupAsarUnpacked)) {
    rmSync(`${codex.asarPath}.unpacked`, { recursive: true, force: true });
    cpSync(opts.backupAsarUnpacked, `${codex.asarPath}.unpacked`, { recursive: true });
  }
  if (codex.metaPath && opts.backupPlist && existsSync(opts.backupPlist)) {
    cpSync(opts.backupPlist, codex.metaPath);
  }
  if (existsSync(opts.backupFramework)) {
    if (!existsSync(codex.electronBinary)) {
      throw new Error(
        `Cannot safely restore Electron Framework backup because the current Codex layout has no Electron Framework at:\n` +
          `  ${codex.electronBinary}\n\n` +
          `Use a full Codex.app backup or reinstall Codex from the official app.`,
      );
    }
    cpSync(opts.backupFramework, codex.electronBinary);
  }

  if (codex.platform === "darwin") {
    signCodexApp(codex.appRoot, { useLocalIdentity, preparedIdentity: preparedSigning });
    console.log(kleur.green("Re-signed restored bundle."));
  }
}

function safeReadHeaderHash(asarPath: string): string | null {
  try {
    return readHeaderHash(asarPath).headerHash;
  } catch {
    return null;
  }
}

function isUsableFullAppBackup(path: string): boolean {
  return (
    existsSync(path) &&
    existsSync(join(path, "Contents", "Info.plist")) &&
    existsSync(join(path, "Contents", "Resources", "app.asar"))
  );
}

export function cleanupRuntimeAndState(paths: Pick<ReturnType<typeof ensureUserPaths>, "runtime" | "stateFile">): void {
  chownForTargetUser(paths.runtime, { recursive: true });

  try {
    rmSync(paths.runtime, { recursive: true, force: true });
  } catch (error) {
    throw cleanupPermissionError(error, paths.runtime, "runtime directory");
  }

  try {
    rmSync(paths.stateFile, { force: true });
  } catch (error) {
    throw cleanupPermissionError(error, paths.stateFile, "state file");
  }
}

function cleanupPermissionError(error: unknown, path: string, label: string): Error {
  if (!isCleanupPermissionError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  return new Error(
    `Cannot remove Codex++ ${label} at ${path}.\n` +
      "This usually means files were left owned by root from a previous sudo install or repair.\n" +
      `Fix ownership with:\n  sudo chown -R "$(id -u)":"$(id -g)" ${shellQuote(path)}\n` +
      "Then run:\n  codexplusplus uninstall",
  );
}

function isCleanupPermissionError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as NodeJS.ErrnoException).code === "EACCES" ||
      (error as NodeJS.ErrnoException).code === "EPERM" ||
      (error as NodeJS.ErrnoException).code === "ENOTEMPTY")
  );
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
