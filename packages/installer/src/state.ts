/**
 * Tracks installer state across runs so `repair` and `uninstall` know what
 * we did, and so `doctor` can detect drift.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { chownForTargetUser } from "./ownership.js";

export interface InstallerState {
  version: string;
  installedAt: string;
  /** Absolute path to the patched Codex install. */
  appRoot: string;
  /** Hash of the original asar header (pre-patch). */
  originalAsarHash: string | null;
  /** Hash of the patched asar header (what's currently on disk if intact). */
  patchedAsarHash: string;
  /** Codex version string we patched against (CFBundleShortVersionString). */
  codexVersion: string | null;
  /** Release channel inferred from app metadata. */
  codexChannel?: "stable" | "beta" | "unknown";
  /** macOS bundle id, when available. */
  codexBundleId?: string | null;
  /** Whether we flipped the Electron fuse. */
  fuseFlipped: boolean;
  /** Whether we re-signed the patched app. */
  resigned: boolean;
  /** Signing mode used for the patched app. Older installs may not have this. */
  signingMode?: "local-identity" | "adhoc";
  /** Common name or ad-hoc marker used for the last signing pass. */
  signingIdentity?: string;
  /** SHA-1 hash of the local code signing identity, when applicable. */
  signingIdentityHash?: string;
  /** Original entry point ("main" field) of the asar's package.json. */
  originalEntryPoint: string;
  /** Watcher install method, if any. */
  watcher: "launchd" | "login-item" | "scheduled-task" | "systemd" | "none";
  /** Source tree that owns the installed CLI/runtime. */
  sourceRoot?: string;
  /** Last time the user-dir runtime assets were refreshed by repair. */
  runtimeUpdatedAt?: string;
}

export function readState(stateFile: string): InstallerState | null {
  if (!existsSync(stateFile)) return null;
  try {
    return JSON.parse(readFileSync(stateFile, "utf8")) as InstallerState;
  } catch {
    return null;
  }
}

export function writeState(stateFile: string, state: InstallerState): void {
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
  chownForTargetUser(stateFile);
}
