/**
 * MS-2B1 Desktop spawn-seam types.
 *
 * Observation only. No ChildProcess wrapping, no stdio sniffing, no public API.
 */
export declare const APP_SERVER_PROBE_ENV: "CODEXPP_APP_SERVER_PROBE";
export declare const UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED: readonly ["app-server", "--listen", "stdio://"];
export declare const UPSTREAM_APP_SERVER_STDIO_SHORTHAND: readonly ["app-server", "--stdio"];
export type DesktopSpawnApi = "child_process.spawn";
export type DesktopStdioTransportMode = "listen-stdio" | "stdio-flag";
export interface DesktopSpawnSeamStatus {
    enabled: boolean;
    hookInstalled: boolean;
    spawnApi: DesktopSpawnApi | null;
    candidateObserved: boolean;
    trustedExecutable: boolean;
    appServerArgsObserved: boolean;
    transportMode: DesktopStdioTransportMode | null;
    observationCount: number;
}
export interface SanitizedSpawnObservation {
    timestamp: string;
    processApi: DesktopSpawnApi;
    candidate: boolean;
    executableBasename: string | null;
    trustedResourceRoot: boolean;
    relativeResourcePath: string | null;
    appServerSubcommand: boolean;
    transportMode: DesktopStdioTransportMode | null;
    argumentCount: number | null;
    platform: NodeJS.Platform;
    layerVersion: string;
}
export interface SpawnModule {
    spawn: (...args: never[]) => unknown;
}
export interface PathIo {
    realpathSync: (path: string) => string;
    existsSync?: (path: string) => boolean;
}
export interface ClassifySpawnResult {
    candidate: boolean;
    trustedExecutable: boolean;
    appServerSubcommand: boolean;
    transportMode: DesktopStdioTransportMode | null;
    executableBasename: string | null;
    relativeResourcePath: string | null;
    argumentCount: number | null;
}
