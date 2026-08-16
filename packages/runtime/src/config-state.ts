import { readFileSync, writeFileSync } from "node:fs";
import { isLayerAutoUpdateEnabled } from "./ipc-guard";
import {
  CONFIG_FILE,
  INSTALLER_STATE_FILE,
  SELF_UPDATE_STATE_FILE,
  log,
} from "./runtime-paths";

export interface PersistedState {
  codexPlusPlus?: {
    autoUpdate?: boolean;
    safeMode?: boolean;
    updateChannel?: SelfUpdateChannel;
    updateRepo?: string;
    updateRef?: string;
    updateCheck?: CodexPlusPlusUpdateCheck;
  };
  /** Per-tweak enable flags. Missing entries default to enabled. */
  tweaks?: Record<string, { enabled?: boolean }>;
  /** Cached GitHub release checks. Runtime never auto-installs; the user can click Update on the Tweaks page. */
  tweakUpdateChecks?: Record<string, TweakUpdateCheck>;
}

export interface CodexPlusPlusUpdateCheck {
  checkedAt: string;
  currentVersion: string;
  latestVersion: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  updateAvailable: boolean;
  error?: string;
}

export type SelfUpdateChannel = "stable" | "prerelease" | "custom";
export type SelfUpdateStatus = "checking" | "up-to-date" | "updated" | "failed" | "disabled";

export interface SelfUpdateState {
  checkedAt: string;
  completedAt?: string;
  status: SelfUpdateStatus;
  currentVersion: string;
  latestVersion: string | null;
  targetRef: string | null;
  releaseUrl: string | null;
  repo: string;
  channel: SelfUpdateChannel;
  sourceRoot: string;
  installationSource?: InstallationSource;
  error?: string;
}

export interface InstallationSource {
  kind: "github-source" | "homebrew" | "local-dev" | "source-archive" | "unknown";
  label: string;
  detail: string;
}

export interface TweakUpdateCheck {
  checkedAt: string;
  repo: string;
  currentVersion: string;
  latestVersion: string | null;
  latestTag: string | null;
  releaseUrl: string | null;
  updateAvailable: boolean;
  pinnedSha?: string;
  error?: string;
}

export function readState(): PersistedState {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf8")) as PersistedState;
  } catch {
    return {};
  }
}
export function writeState(s: PersistedState): void {
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(s, null, 2));
  } catch (e) {
    log("warn", "writeState failed:", String((e as Error).message));
  }
}
export function isCodexPlusPlusAutoUpdateEnabled(): boolean {
  return isLayerAutoUpdateEnabled(readState().codexPlusPlus?.autoUpdate);
}
export function setCodexPlusPlusAutoUpdate(enabled: boolean): void {
  const s = readState();
  s.codexPlusPlus ??= {};
  s.codexPlusPlus.autoUpdate = enabled;
  writeState(s);
}
export function setCodexPlusPlusUpdateConfig(config: {
  updateChannel?: SelfUpdateChannel;
  updateRepo?: string;
  updateRef?: string;
}): void {
  const s = readState();
  s.codexPlusPlus ??= {};
  if (config.updateChannel) s.codexPlusPlus.updateChannel = config.updateChannel;
  if ("updateRepo" in config) s.codexPlusPlus.updateRepo = cleanOptionalString(config.updateRepo);
  if ("updateRef" in config) s.codexPlusPlus.updateRef = cleanOptionalString(config.updateRef);
  writeState(s);
}
export function isCodexPlusPlusSafeModeEnabled(): boolean {
  return readState().codexPlusPlus?.safeMode === true;
}
export function isTweakEnabled(id: string): boolean {
  const s = readState();
  if (s.codexPlusPlus?.safeMode === true) return false;
  return s.tweaks?.[id]?.enabled !== false;
}
export function setTweakEnabled(id: string, enabled: boolean): void {
  const s = readState();
  s.tweaks ??= {};
  s.tweaks[id] = { ...s.tweaks[id], enabled };
  writeState(s);
}

export interface InstallerState {
  appRoot: string;
  codexVersion: string | null;
  sourceRoot?: string;
}

export function readInstallerState(): InstallerState | null {
  try {
    return JSON.parse(readFileSync(INSTALLER_STATE_FILE, "utf8")) as InstallerState;
  } catch {
    return null;
  }
}

export function readSelfUpdateState(): SelfUpdateState | null {
  try {
    return JSON.parse(readFileSync(SELF_UPDATE_STATE_FILE, "utf8")) as SelfUpdateState;
  } catch {
    return null;
  }
}
export function writeSelfUpdateState(state: SelfUpdateState): void {
  try {
    writeFileSync(SELF_UPDATE_STATE_FILE, JSON.stringify(state, null, 2));
  } catch (e) {
    log("warn", "writeSelfUpdateState failed:", String((e as Error).message));
  }
}

export function cleanOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
