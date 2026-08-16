import type { DesktopSpawnSeamStatus, PathIo, SanitizedSpawnObservation, SpawnModule } from "./types";
export interface CodexDesktopSpawnProbeOptions {
    spawnModule: SpawnModule;
    env?: NodeJS.ProcessEnv;
    trustedRoots: () => readonly string[];
    log?: (observation: SanitizedSpawnObservation) => void;
    platform?: NodeJS.Platform;
    version?: string;
    now?: () => string;
    io?: PathIo;
}
export declare class CodexDesktopSpawnProbe {
    private readonly spawnModule;
    private readonly env;
    private readonly trustedRoots;
    private readonly log;
    private readonly platform;
    private readonly version;
    private readonly now;
    private readonly io;
    private readonly status;
    private readonly diagnostics;
    private originalSpawn;
    private inHook;
    constructor(options: CodexDesktopSpawnProbeOptions);
    getStatus(): DesktopSpawnSeamStatus;
    getDiagnostics(): readonly SanitizedSpawnObservation[];
    install(): void;
    private observe;
}
