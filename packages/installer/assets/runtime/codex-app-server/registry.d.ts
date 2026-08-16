import type { CodexSessionManager } from "../codex-sessions/manager";
import type { CodexAppServerLauncher } from "./launcher";
import type { CodexAppServerTransport } from "./transport";
export interface SessionTransportRecord {
    sessionId: string;
    transport: CodexAppServerTransport;
    ready: boolean;
    initializeParams: unknown;
    initializeResult: unknown;
}
export interface CodexSessionTransportRegistryOptions {
    userRoot: string;
    launcher: CodexAppServerLauncher;
    sessionManager: Pick<CodexSessionManager, "getSessionStatus">;
    initializeParams?: unknown;
    initializeTimeoutMs?: number;
}
/**
 * sessionId → live transport. Only RUNNING sessions. Failures isolate to
 * that session. Production launcher is fail-closed.
 */
export declare class CodexSessionTransportRegistry {
    private readonly userRoot;
    private readonly launcher;
    private readonly sessionManager;
    private readonly initializeParams;
    private readonly initializeTimeoutMs?;
    private readonly records;
    private closed;
    constructor(options: CodexSessionTransportRegistryOptions);
    get(sessionId: string): CodexAppServerTransport | undefined;
    getRecord(sessionId: string): SessionTransportRecord | undefined;
    listReadySessionIds(): string[];
    /**
     * TEST-ONLY: attach an already-constructed transport. Still requires RUNNING.
     */
    attach(sessionId: string, transport: CodexAppServerTransport, ready?: boolean): void;
    start(sessionId: string): Promise<SessionTransportRecord>;
    /**
     * Reject new work, close transport. Does not stop the MS-1 child itself.
     */
    stop(sessionId: string): Promise<void>;
    closeAll(): Promise<void>;
    private bind;
    private assertRunning;
    private assertOpen;
}
