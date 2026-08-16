import type { CodexSessionManager } from "../codex-sessions/manager";
import { CodexSessionTransportRegistry } from "./registry";
import { CodexSessionRouter } from "./router";
import { ThreadOwnerStore } from "./thread-owner-store";
export interface CodexAppServerHost {
    readonly owners: ThreadOwnerStore;
    readonly registry: CodexSessionTransportRegistry;
    readonly router: CodexSessionRouter;
    closeAll(): Promise<void>;
}
export interface CreateAppServerHostOptions {
    userRoot: string;
    sessionManager: Pick<CodexSessionManager, "getSessionStatus">;
    initializeParams?: unknown;
    initializeTimeoutMs?: number;
    selectSession?: () => string | null;
    log?: (level: "info" | "warn" | "error", ...args: unknown[]) => void;
}
/**
 * Dormant host. No production launcher: invocation is BLOCKED, so MS-2A
 * never spawns an app-server child (and never a second child beside MS-1).
 * Tests attach fake/fixture transports. No public IPC. No session auto-start.
 */
export declare function createCodexAppServerHost(options: CreateAppServerHostOptions): CodexAppServerHost;
export declare function setCodexAppServerHost(next: CodexAppServerHost | null): void;
export declare function getCodexAppServerHost(): CodexAppServerHost | null;
