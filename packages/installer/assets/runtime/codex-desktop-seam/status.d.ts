import type { DesktopSpawnSeamStatus, DesktopStdioTransportMode, DesktopSpawnApi } from "./types";
export declare function emptyDesktopSpawnSeamStatus(): DesktopSpawnSeamStatus;
export declare function recordObservation(status: DesktopSpawnSeamStatus, update: {
    trustedExecutable: boolean;
    appServerSubcommand: boolean;
    candidate: boolean;
    transportMode: DesktopStdioTransportMode | null;
    spawnApi: DesktopSpawnApi;
}): void;
