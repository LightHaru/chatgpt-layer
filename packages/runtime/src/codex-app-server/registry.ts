import type { CodexSessionManager } from "../codex-sessions/manager";
import { sessionCodexHome, sessionSqliteHome } from "../codex-sessions/paths";
import { CodexAppServerError } from "./errors";
import { performInitializeHandshake } from "./handshake";
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
export class CodexSessionTransportRegistry {
  private readonly userRoot: string;
  private readonly launcher: CodexAppServerLauncher;
  private readonly sessionManager: Pick<CodexSessionManager, "getSessionStatus">;
  private readonly initializeParams: unknown;
  private readonly initializeTimeoutMs?: number;
  private readonly records = new Map<string, SessionTransportRecord>();
  private closed = false;

  constructor(options: CodexSessionTransportRegistryOptions) {
    this.userRoot = options.userRoot;
    this.launcher = options.launcher;
    this.sessionManager = options.sessionManager;
    this.initializeParams = options.initializeParams ?? {};
    this.initializeTimeoutMs = options.initializeTimeoutMs;
  }

  get(sessionId: string): CodexAppServerTransport | undefined {
    return this.records.get(sessionId)?.transport;
  }

  getRecord(sessionId: string): SessionTransportRecord | undefined {
    const record = this.records.get(sessionId);
    return record ? { ...record } : undefined;
  }

  listReadySessionIds(): string[] {
    return [...this.records.values()].filter((record) => record.ready).map((record) => record.sessionId);
  }

  /**
   * TEST-ONLY: attach an already-constructed transport. Still requires RUNNING.
   */
  attach(sessionId: string, transport: CodexAppServerTransport, ready = true): void {
    this.assertOpen();
    this.assertRunning(sessionId);
    if (this.records.has(sessionId)) {
      throw new CodexAppServerError("already-attached", "session already has a transport", sessionId);
    }
    this.bind(sessionId, transport, ready, this.initializeParams, undefined);
  }

  async start(sessionId: string): Promise<SessionTransportRecord> {
    this.assertOpen();
    this.assertRunning(sessionId);
    if (this.records.has(sessionId)) {
      throw new CodexAppServerError("already-attached", "session already has a transport", sessionId);
    }
    this.sessionManager.getSessionStatus(sessionId);
    const transport = await this.launcher.launchAppServer({
      sessionId,
      codexHome: sessionCodexHome(this.userRoot, sessionId),
      sqliteHome: sessionSqliteHome(this.userRoot, sessionId),
    });
    try {
      const handshake = await performInitializeHandshake(
        transport,
        this.initializeParams,
        this.initializeTimeoutMs,
      );
      this.bind(sessionId, transport, true, handshake.params, handshake.result);
      return this.records.get(sessionId)!;
    } catch (error) {
      await transport.close(
        error instanceof Error ? error : new CodexAppServerError("protocol", String(error), sessionId),
      );
      throw error;
    }
  }

  /**
   * Reject new work, close transport. Does not stop the MS-1 child itself.
   */
  async stop(sessionId: string): Promise<void> {
    const record = this.records.get(sessionId);
    if (!record) return;
    this.records.delete(sessionId);
    await record.transport.close(new CodexAppServerError("closed", "session transport stopped", sessionId));
  }

  async closeAll(): Promise<void> {
    this.closed = true;
    const records = [...this.records.values()];
    this.records.clear();
    await Promise.all(
      records.map((record) =>
        record.transport.close(new CodexAppServerError("closed", "app-server registry closed", record.sessionId)),
      ),
    );
  }

  private bind(
    sessionId: string,
    transport: CodexAppServerTransport,
    ready: boolean,
    initializeParams: unknown,
    initializeResult: unknown,
  ): void {
    transport.onClose(() => {
      this.records.delete(sessionId);
    });
    this.records.set(sessionId, {
      sessionId,
      transport,
      ready,
      initializeParams,
      initializeResult,
    });
  }

  private assertRunning(sessionId: string): void {
    const status = this.sessionManager.getSessionStatus(sessionId);
    if (status.lifecycle !== "RUNNING") {
      throw new CodexAppServerError(
        "session-not-running",
        `session ${sessionId} is ${status.lifecycle}, transport requires RUNNING`,
        sessionId,
      );
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new CodexAppServerError("closed", "app-server registry is closed");
    }
  }
}
