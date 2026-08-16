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
 * - After reservation / bind: the registry owns the concrete transport and
 *   closes it on handshake failure, stop, closeAll, session-removed, or
 *   closed-during-handshake.
 */
export class CodexSessionTransportRegistry {
  private readonly sessionManager: Pick<CodexSessionManager, "getSessionStatus">;
  private readonly initializeParams: unknown;
  private readonly initializeTimeoutMs?: number;
  private readonly records = new Map<string, SessionTransportRecord>();
  /** In-flight attachAndInitialize: sessionId → the reserved transport. */
  private readonly attaching = new Map<string, CodexAppServerTransport>();
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
   * and an exclusive reservation that owns this transport.
   */
  async attachAndInitialize(
    sessionId: string,
    transport: CodexAppServerTransport,
  ): Promise<SessionTransportRecord> {
    this.assertOpen();
    this.assertKnownSession(sessionId);
    this.assertTransportIdentity(sessionId, transport);
    this.assertNotOccupied(sessionId);
    this.attaching.set(sessionId, transport);
    try {
      const handshake = await performInitializeHandshake(
        transport,
        this.initializeParams,
        this.initializeTimeoutMs,
      );
      if (this.attaching.get(sessionId) !== transport) {
        const error = new CodexAppServerError("closed", "session transport stopped", sessionId);
        await transport.close(error);
        throw error;
      }
      if (this.closed) {
        const error = new CodexAppServerError("closed", "app-server registry closed", sessionId);
        await transport.close(error);
        throw error;
      }
      if (!this.sessionStillExists(sessionId)) {
        const error = new CodexAppServerError("invalid-id", `unknown session: ${sessionId}`, sessionId);
        this.releaseReservation(sessionId, transport);
        await transport.close(error);
        throw error;
      }
      this.assertNotBound(sessionId);
      this.releaseReservation(sessionId, transport);
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
      this.releaseReservation(sessionId, transport);
    }
  }

  /**
   * Reject new work, close bound and/or in-flight handshake transport.
   * Does not stop any MS-1 lifecycle child.
   * Future MS-2B: stop is one operation on the unified session process.
   */
  async stop(sessionId: string): Promise<void> {
    const reserved = this.attaching.get(sessionId);
    if (reserved) this.attaching.delete(sessionId);
    const record = this.records.get(sessionId);
    if (record) this.records.delete(sessionId);
    if (!reserved && !record) return;
    const error = new CodexAppServerError("closed", "session transport stopped", sessionId);
    await this.closeOwned([reserved, record?.transport], error);
  }

  async closeAll(): Promise<void> {
    this.closed = true;
    const bound = [...this.records.values()].map((record) => record.transport);
    const reserved = [...this.attaching.values()];
    this.records.clear();
    this.attaching.clear();
    await this.closeOwned([...bound, ...reserved], new CodexAppServerError("closed", "app-server registry closed"));
  }

  private async closeOwned(
    transports: Array<CodexAppServerTransport | undefined>,
    error: CodexAppServerError,
  ): Promise<void> {
    const seen = new Set<CodexAppServerTransport>();
    const unique: CodexAppServerTransport[] = [];
    for (const transport of transports) {
      if (!transport || seen.has(transport)) continue;
      seen.add(transport);
      unique.push(transport);
    }
    await Promise.all(
      unique.map((transport) =>
        transport.close(
          error.sessionId ? error : new CodexAppServerError(error.kind, error.message, transport.sessionId),
        ),
      ),
    );
  }

  private releaseReservation(sessionId: string, transport: CodexAppServerTransport): void {
    if (this.attaching.get(sessionId) === transport) {
      this.attaching.delete(sessionId);
    }
  }

  private sessionStillExists(sessionId: string): boolean {
    try {
      this.sessionManager.getSessionStatus(sessionId);
      return true;
    } catch {
      return false;
    }
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
