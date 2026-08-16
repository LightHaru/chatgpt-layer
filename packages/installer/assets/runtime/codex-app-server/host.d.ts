import type { CodexSessionManager } from "../codex-sessions/manager";
import { type CodexAppServerLauncher } from "./launcher";
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
    launcher?: CodexAppServerLauncher;
    initializeParams?: unknown;
    initializeTimeoutMs?: number;
    selectSession?: () => string | null;
    log?: (level: "info" | "warn" | "error", ...args: unknown[]) => void;
}
/**
 * Dormant host. Production uses the fail-closed launcher so no child is
 * spawned. No public IPC. No session auto-start.
 */
export declare function createCodexAppServerHost(options: CreateAppServerHostOptions): CodexAppServerHost;
export declare function setCodexAppServerHost(next: CodexAppServerHost | null): void;
export declare function getCodexAppServerHost(): CodexAppServerHost | null;
