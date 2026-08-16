export {
  APP_SERVER_PROBE_ENV,
  UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED,
  UPSTREAM_APP_SERVER_STDIO_SHORTHAND,
} from "./types";
export type {
  ClassifySpawnResult,
  DesktopSpawnApi,
  DesktopSpawnSeamStatus,
  DesktopStdioTransportMode,
  PathIo,
  SanitizedSpawnObservation,
  SpawnModule,
} from "./types";
export {
  asStringArgv,
  classifySpawnCall,
  commandBasename,
  detectAppServerSubcommand,
  detectStdioTransport,
  extractSpawnCommandAndArgv,
  isAppServerProbeEnabled,
  isPathInsideRoot,
  looksLikeCodexRuntimeBasename,
  resolveTrustedCommandPath,
  skipConfigPrefixes,
} from "./candidate";
export { emptyDesktopSpawnSeamStatus } from "./status";
export { CodexDesktopSpawnProbe } from "./spawn-probe";
export type { CodexDesktopSpawnProbeOptions } from "./spawn-probe";

import type { DesktopSpawnSeamStatus } from "./types";
import { CodexDesktopSpawnProbe, type CodexDesktopSpawnProbeOptions } from "./spawn-probe";
import { emptyDesktopSpawnSeamStatus } from "./status";
import { trustedCodexSearchRoots } from "../codex-sessions/launcher";

let productionProbe: CodexDesktopSpawnProbe | null = null;

export function installDesktopAppServerSpawnProbe(
  options: CodexDesktopSpawnProbeOptions,
): CodexDesktopSpawnProbe {
  if (!productionProbe) {
    productionProbe = new CodexDesktopSpawnProbe(options);
  }
  productionProbe.install();
  return productionProbe;
}

/** Internal getter only. Not exposed to tweaks or renderer IPC. */
export function getDesktopSpawnSeamStatus(): DesktopSpawnSeamStatus {
  return productionProbe?.getStatus() ?? emptyDesktopSpawnSeamStatus();
}

export function collectDesktopTrustedRoots(opts: {
  platform?: NodeJS.Platform;
  resourcesPath?: string | null;
  appPath?: string | null;
}): string[] {
  return trustedCodexSearchRoots(opts);
}
