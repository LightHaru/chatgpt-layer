/**
 * Read/write the ElectronAsarIntegrity entry inside Info.plist (macOS).
 * On Windows/Linux, Electron stores integrity in a sidecar `resources/integrity`
 * JSON-ish blob — we read it from a known location at the package root.
 */
import { readPlist, writePlist } from "./plist.js";
import type { CodexInstall } from "./platform.js";

export interface IntegrityEntry {
  algorithm: "SHA256";
  hash: string;
}

export function getIntegrity(install: CodexInstall): IntegrityEntry | null {
  if (install.platform !== "darwin" || !install.metaPath) return null; // see TODO below
  const pl = readPlist(install.metaPath);
  const block = pl["ElectronAsarIntegrity"] as Record<string, IntegrityEntry> | undefined;
  if (!block) return null;
  return block["Resources/app.asar"] ?? null;
}

export function canWriteAsarIntegrity(platform: CodexInstall["platform"] | string): boolean {
  return platform === "darwin";
}

export function integrityWriterReport(platform: CodexInstall["platform"] | string): {
  ok: true | "warn";
  detail: string;
} {
  if (canWriteAsarIntegrity(platform)) {
    return { ok: true, detail: "macOS Info.plist ElectronAsarIntegrity writer available" };
  }
  return {
    ok: "warn",
    detail:
      "Win/Linux asar integrity writer is unimplemented; EnableEmbeddedAsarIntegrityValidation is left ON. PE/Linux sidecar writer deferred.",
  };
}

export function setIntegrity(install: CodexInstall, hash: string): void {
  if (!canWriteAsarIntegrity(install.platform) || !install.metaPath) {
    // TODO(win/linux): PE resource / electron-asar-integrity sidecar writers.
    // Do not disable EnableEmbeddedAsarIntegrityValidation as a substitute.
    return;
  }
  const pl = readPlist(install.metaPath);
  const existing = (pl["ElectronAsarIntegrity"] as Record<string, IntegrityEntry>) ?? {};
  existing["Resources/app.asar"] = { algorithm: "SHA256", hash };
  pl["ElectronAsarIntegrity"] = existing;
  writePlist(install.metaPath, pl);
}