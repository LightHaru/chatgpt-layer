import type { DesktopSpawnSeamStatus, PathIo, SanitizedSpawnObservation, SpawnHookInstallError, SpawnModule } from "./types";
export interface CodexDesktopSpawnProbeOptions {
    spawnModule: SpawnModule;
    env?: NodeJS.ProcessEnv;
    trustedRoots: () => readonly string[];
    log?: (observation: SanitizedSpawnObservation) => void;
    onInstallError?: (category: SpawnHookInstallError) => void;
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
    private readonly onInstallError;
    private readonly platform;
    private readonly version;
    private readonly now;
    private readonly io;
    private readonly status;
    private readonly diagnostics;
    private originalSpawn;
    private wrapped;
    private inHook;
    constructor(options: CodexDesktopSpawnProbeOptions);
    getStatus(): DesktopSpawnSeamStatus;
    getDiagnostics(): readonly SanitizedSpawnObservation[];
    install(): void;
    /**
     * Internal test restore. Restores only if `.spawn` is still this probe's wrapper.
     * A stale instance must not overwrite a newer wrapper.
     */
    uninstall(): boolean;
    private makeWrapped;
    private readSpawn;
    private assignSpawn;
    private tryRestore;
    private isMarked;
    private failClosed;
    private observe;
}
