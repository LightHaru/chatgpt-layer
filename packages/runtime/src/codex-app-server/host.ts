import type { CodexSessionManager } from "../codex-sessions/manager";
import { createFailClosedAppServerLauncher, type CodexAppServerLauncher } from "./launcher";
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
export function createCodexAppServerHost(options: CreateAppServerHostOptions): CodexAppServerHost {
  const launcher = options.launcher ?? createFailClosedAppServerLauncher();
  const owners = new ThreadOwnerStore(options.userRoot);
  const registry = new CodexSessionTransportRegistry({
    userRoot: options.userRoot,
    launcher,
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
