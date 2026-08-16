import type { CodexSessionManager } from "../codex-sessions/manager";
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
    sessionManager: Pick<CodexSessionManager, "getSessionStatus">;
    initializeParams?: unknown;
    initializeTimeoutMs?: number;
}
/**
 * sessionId → live transport.
 *
 * Attach-only. Does not spawn a Codex child and does not require an MS-1
 * lifecycle child to already be RUNNING. One session owns at most one
 * transport; a future unified MS-2B process supplies both lifecycle and
 * stdio. Production invocation stays BLOCKED outside this registry.
 */
export declare class CodexSessionTransportRegistry {
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
     * Register a transport that already belongs to this session.
     * Tests inject fakes/fixtures. Does not launch a process.
     */
    attach(sessionId: string, transport: CodexAppServerTransport, ready?: boolean): void;
    /**
     * Attach then run initialize / initialized on that same transport.
     * Still does not spawn a child.
     */
    attachAndInitialize(sessionId: string, transport: CodexAppServerTransport): Promise<SessionTransportRecord>;
    /**
     * Reject new work, close transport. Does not stop any MS-1 lifecycle child.
     * Future MS-2B: stop is one operation on the unified session process.
     */
    stop(sessionId: string): Promise<void>;
    closeAll(): Promise<void>;
    private bind;
    private assertKnownSession;
    private assertOpen;
}
