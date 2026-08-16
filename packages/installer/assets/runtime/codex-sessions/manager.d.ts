import type { CodexProcessLauncher } from "./launcher";
import type { CodexSessionMetadata, CodexSessionStatus } from "./types";
export interface CodexSessionManagerOptions {
    userRoot: string;
    launcher: CodexProcessLauncher;
    now?: () => Date;
    log?: (level: "info" | "warn" | "error", ...args: unknown[]) => void;
    stopTimeoutMs?: number;
    killTimeoutMs?: number;
}
export interface CreateCodexSessionInput {
    label?: string;
    id?: string;
}
export interface RemoveCodexSessionOptions {
    forceStop?: boolean;
}
export declare class CodexSessionManager {
    private readonly userRoot;
    private readonly launcher;
    private readonly now;
    private readonly log?;
    private readonly stopTimeoutMs;
    private readonly killTimeoutMs;
    private readonly records;
    private readonly timers;
    constructor(options: CodexSessionManagerOptions);
    listSessions(): CodexSessionMetadata[];
    getSession(id: string): CodexSessionMetadata;
    getSessionStatus(id: string): CodexSessionStatus;
    createSession(input?: CreateCodexSessionInput): CodexSessionMetadata;
    renameSession(id: string, label: string): CodexSessionMetadata;
    enableSession(id: string): CodexSessionMetadata;
    disableSession(id: string): CodexSessionMetadata;
    removeSession(id: string, options?: RemoveCodexSessionOptions): Promise<void>;
    startSession(id: string): Promise<CodexSessionStatus>;
    stopSession(id: string): Promise<CodexSessionStatus>;
    restartSession(id: string): Promise<CodexSessionStatus>;
    shutdownAll(options?: {
        timeoutMs?: number;
    }): Promise<void>;
    hasLiveChildren(): boolean;
    private isLive;
    private setEnabled;
    private launchRecord;
    private stopRecord;
    private onChildExit;
    private detach;
    private require;
    private allocateId;
    private persist;
    private loadFromDisk;
    private isoNow;
    private delay;
    private waitWithTimeout;
    private clearTimers;
}
export declare function stripCredentials(raw: unknown, fallbackId: string): CodexSessionMetadata;
