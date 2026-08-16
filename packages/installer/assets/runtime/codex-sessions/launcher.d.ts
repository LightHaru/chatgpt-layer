import { spawn } from "node:child_process";
export interface CodexSessionLaunchIntent {
    sessionId: string;
    codexHome: string;
    sqliteHome: string;
}
export interface CodexManagedChild {
    kill(signal?: NodeJS.Signals): boolean;
    onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void;
}
export interface CodexProcessLauncher {
    launch(intent: CodexSessionLaunchIntent): Promise<CodexManagedChild>;
}
export declare const ISOLATED_ENV_ALLOWLIST: readonly ["PATH", "HOME", "USERPROFILE", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "LANG", "LC_ALL"];
export declare function isolatedSessionEnv(intent: CodexSessionLaunchIntent, sourceEnv?: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
export declare function resolveTrustedCodexExecutable(opts: {
    platform?: NodeJS.Platform;
    resourcesPath?: string | null;
    appPath?: string | null;
    existsSync?: (path: string) => boolean;
}): string | null;
export interface NodeCodexProcessLauncherOptions {
    resolveExecutable: () => string | null;
    spawnImpl?: typeof spawn;
}
export declare function createNodeCodexProcessLauncher(options: NodeCodexProcessLauncherOptions): CodexProcessLauncher;
