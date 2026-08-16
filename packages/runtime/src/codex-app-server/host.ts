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
export function createCodexAppServerHost(options: CreateAppServerHostOptions): CodexAppServerHost {
  const owners = new ThreadOwnerStore(options.userRoot);
  const registry = new CodexSessionTransportRegistry({
    userRoot: options.userRoot,
    sessionManager: options.sessionManager,
    initializeParams: options.initializeParams,
    initializeTimeoutMs: options.initializeTimeoutMs,
  });
  const router = new CodexSessionRouter({
    registry,
    owners,
    selectSession: options.selectSession,
    requestTimeoutMs: options.initializeTimeoutMs,
  });
  void options.log;
  return {
    owners,
    registry,
    router,
    closeAll: () => registry.closeAll(),
  };
}

let host: CodexAppServerHost | null = null;

export function setCodexAppServerHost(next: CodexAppServerHost | null): void {
  host = next;
}

export function getCodexAppServerHost(): CodexAppServerHost | null {
  return host;
}
