import type { CodexSessionManager } from "../codex-sessions/manager";
import { assertSessionId } from "../codex-sessions/ids";
import { CodexAppServerError } from "./errors";
import { performInitializeHandshake } from "./handshake";
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
 *
 * Ownership:
 * - Before the registry accepts a transport (mismatch, duplicate, in-progress):
 *   reject without closing or rewriting that transport.
 * - After reservation / bind: the registry owns registration lifecycle and
 *   closes the transport on handshake failure, stop, or closeAll.
 */
export class CodexSessionTransportRegistry {
  private readonly sessionManager: Pick<CodexSessionManager, "getSessionStatus">;
  private readonly initializeParams: unknown;
  private readonly initializeTimeoutMs?: number;
  private readonly records = new Map<string, SessionTransportRecord>();
  private readonly attaching = new Set<string>();
  private closed = false;

  constructor(options: CodexSessionTransportRegistryOptions) {
    void options.userRoot;
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
   * Register a transport that already belongs to this session.
   * Tests inject fakes/fixtures. Does not launch a process.
   */
  attach(sessionId: string, transport: CodexAppServerTransport, ready = true): void {
    this.assertOpen();
    this.assertKnownSession(sessionId);
    this.assertTransportIdentity(sessionId, transport);
    this.assertNotOccupied(sessionId);
    this.bind(sessionId, transport, ready, this.initializeParams, undefined);
  }

  /**
   * Attach then run initialize / initialized on that same transport.
   * Still does not spawn a child. Handshake runs only after identity checks
   * and an exclusive reservation.
   */
  async attachAndInitialize(
    sessionId: string,
    transport: CodexAppServerTransport,
  ): Promise<SessionTransportRecord> {
    this.assertOpen();
    this.assertKnownSession(sessionId);
    this.assertTransportIdentity(sessionId, transport);
    this.assertNotOccupied(sessionId);
    this.attaching.add(sessionId);
    try {
      const handshake = await performInitializeHandshake(
        transport,
        this.initializeParams,
        this.initializeTimeoutMs,
      );
      if (this.closed) {
        await transport.close(new CodexAppServerError("closed", "app-server registry closed", sessionId));
        throw new CodexAppServerError("closed", "app-server registry closed", sessionId);
      }
      this.assertNotBound(sessionId);
      this.bind(sessionId, transport, true, handshake.params, handshake.result);
      return this.records.get(sessionId)!;
    } catch (error) {
      if (this.records.get(sessionId)?.transport !== transport) {
        await transport.close(
          error instanceof Error ? error : new CodexAppServerError("protocol", String(error), sessionId),
        );
      }
      throw error;
    } finally {
      this.attaching.delete(sessionId);
    }
  }

  /**
   * Reject new work, close transport. Does not stop any MS-1 lifecycle child.
   * Future MS-2B: stop is one operation on the unified session process.
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
      const current = this.records.get(sessionId);
      if (current?.transport === transport) {
        this.records.delete(sessionId);
      }
    });
    this.records.set(sessionId, {
      sessionId,
      transport,
      ready,
      initializeParams,
      initializeResult,
    });
  }

  private assertKnownSession(sessionId: string): void {
    assertSessionId(sessionId);
    this.sessionManager.getSessionStatus(sessionId);
  }

  private assertTransportIdentity(sessionId: string, transport: CodexAppServerTransport): void {
    if (transport.sessionId !== sessionId) {
      throw new CodexAppServerError(
        "session-mismatch",
        `transport session ${transport.sessionId} does not match registry session ${sessionId}`,
        sessionId,
      );
    }
  }

  private assertNotOccupied(sessionId: string): void {
    if (this.records.has(sessionId)) {
      throw new CodexAppServerError("already-attached", "session already has a transport", sessionId);
    }
    if (this.attaching.has(sessionId)) {
      throw new CodexAppServerError("attach-in-progress", "session attach already in progress", sessionId);
    }
  }

  private assertNotBound(sessionId: string): void {
    if (this.records.has(sessionId)) {
      throw new CodexAppServerError("already-attached", "session already has a transport", sessionId);
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new CodexAppServerError("closed", "app-server registry is closed");
    }
  }
}
