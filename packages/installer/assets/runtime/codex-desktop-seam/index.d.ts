export { APP_SERVER_PROBE_ENV, UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED, UPSTREAM_APP_SERVER_STDIO_SHORTHAND, } from "./types";
export type { ClassifySpawnResult, DesktopSpawnApi, DesktopSpawnSeamStatus, DesktopStdioTransportMode, PathIo, SanitizedSpawnObservation, SpawnHookInstallError, SpawnModule, } from "./types";
export { getSharedChildProcessModule } from "./child-process-module";
export { asStringArgv, classifySpawnCall, commandBasename, detectAppServerSubcommand, detectStdioTransport, extractSpawnCommandAndArgv, isAppServerProbeEnabled, isPathInsideRoot, looksLikeCodexRuntimeBasename, resolveTrustedCommandPath, skipConfigPrefixes, } from "./candidate";
export { emptyDesktopSpawnSeamStatus } from "./status";
export { CodexDesktopSpawnProbe } from "./spawn-probe";
export type { CodexDesktopSpawnProbeOptions } from "./spawn-probe";
import type { DesktopSpawnSeamStatus } from "./types";
import { CodexDesktopSpawnProbe, type CodexDesktopSpawnProbeOptions } from "./spawn-probe";
export declare function installDesktopAppServerSpawnProbe(options: CodexDesktopSpawnProbeOptions): CodexDesktopSpawnProbe | null;
/** Internal test restore for the production singleton. Not a tweak API. */
export declare function uninstallDesktopAppServerSpawnProbe(): boolean;
/** Internal getter only. Not exposed to tweaks or renderer IPC. */
export declare function getDesktopSpawnSeamStatus(): DesktopSpawnSeamStatus;
export declare function collectDesktopTrustedRoots(opts: {
    platform?: NodeJS.Platform;
    resourcesPath?: string | null;
    appPath?: string | null;
}): string[];
