import { CodexAppServerError } from "./errors";
import { assertOutboundMessage } from "./framing";
import { classifyMessage } from "./protocol";
import { RequestMap } from "./request-map";
import type { AppServerMessage, JsonRpcResponse, RpcError } from "./types";
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_INBOUND_QUEUE,
  MAX_NOTIFICATION_LISTENERS,
  MAX_PENDING_REQUESTS,
  MAX_SERVER_REQUESTS_IN_FLIGHT,
} from "./types";

export type NotificationListener = (message: AppServerMessage) => void;
export type CloseListener = (error: Error | null) => void;

/** Option A: a single handler that must return exactly one result or error. */
export type ServerRequestResult =
  | { result: unknown; error?: undefined }
  | { error: RpcError; result?: undefined };

export type ServerRequestHandler = (
  request: AppServerMessage,
) => ServerRequestResult | Promise<ServerRequestResult>;

/** @deprecated Use ServerRequestHandler. Kept as an alias for the single-handler API. */
export type ServerRequestListener = ServerRequestHandler;

export interface TransportRequestOptions {
  timeoutMs?: number;
}

/**
 * Layer-internal app-server transport. Tweaks never see stdin/stdout,
 * ChildProcess, pid, env, or exe path.
 */
export interface CodexAppServerTransport {
  readonly sessionId: string;
  request(method: string, params?: unknown, options?: TransportRequestOptions): Promise<JsonRpcResponse>;
  notify(method: string, params?: unknown): Promise<void>;
  onNotification(listener: NotificationListener): () => void;
  /**
   * Register the ONE server-request handler. A second registration without
   * unsubscribing the first is rejected. The handler must return
   * `{ result }` or `{ error }`; the transport sends exactly one response.
   */
  onServerRequest(handler: ServerRequestHandler): () => void;
  setServerRequestHandler(handler: ServerRequestHandler | null): void;
  onClose(listener: CloseListener): () => void;
  close(error?: Error): Promise<void>;
}

export interface AbstractTransportOptions {
  sessionId: string;
  timeoutMs?: number;
  maxPending?: number;
  maxInboundQueue?: number;
  maxServerRequestsInFlight?: number;
  send: (message: AppServerMessage) => Promise<void> | void;
  closeSink?: () => Promise<void> | void;
}

/**
 * Shared request correlation, listener bounds, and inbound dispatch.
 * Subclasses (stdio / in-memory) only implement send + close.
 */
export class AbstractAppServerTransport implements CodexAppServerTransport {
  readonly sessionId: string;
  protected readonly requests: RequestMap;
  private readonly notificationListeners = new Set<NotificationListener>();
  private serverRequestHandler: ServerRequestHandler | null = null;
  private readonly closeListeners = new Set<CloseListener>();
  private readonly maxInboundQueue: number;
  private readonly maxServerRequestsInFlight: number;
  private inboundQueued = 0;
  private serverRequestsInFlight = 0;
  private closed = false;
  private readonly sendImpl: AbstractTransportOptions["send"];
  private readonly closeSink?: AbstractTransportOptions["closeSink"];

  constructor(options: AbstractTransportOptions) {
    this.sessionId = options.sessionId;
    this.requests = new RequestMap({
      timeoutMs: options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      maxPending: options.maxPending ?? MAX_PENDING_REQUESTS,
    });
    this.maxInboundQueue = options.maxInboundQueue ?? MAX_INBOUND_QUEUE;
    this.maxServerRequestsInFlight = options.maxServerRequestsInFlight ?? MAX_SERVER_REQUESTS_IN_FLIGHT;
    this.sendImpl = options.send;
    this.closeSink = options.closeSink;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  get inFlightServerRequests(): number {
    return this.serverRequestsInFlight;
  }

  async request(method: string, params?: unknown, options: TransportRequestOptions = {}): Promise<JsonRpcResponse> {
    this.assertOpen();
    const id = this.requests.allocateId();
    const message: AppServerMessage = { id, method, params };
    assertOutboundMessage(message);
    const pending = this.requests.expect(id, options.timeoutMs);
    // Await the correlation promise immediately so a timeout or send failure
    // cannot reject `pending` while nobody is listening (unhandledRejection).
    void Promise.resolve()
      .then(() => this.sendImpl(message))
      .then(
        () => undefined,
        (error) => {
          const wrapped =
            error instanceof Error ? error : new CodexAppServerError("internal", String(error), this.sessionId);
          this.requests.fail(id, wrapped);
          void this.close(wrapped);
        },
      );
    const response = await pending;
    if (response.error) {
      throw new CodexAppServerError("protocol", response.error.message, this.sessionId);
    }
    return { id: response.id ?? id, result: response.result, extra: response.extra };
  }

  async notify(method: string, params?: unknown): Promise<void> {
    this.assertOpen();
    const message: AppServerMessage = { method, params };
    assertOutboundMessage(message);
    try {
      await this.sendImpl(message);
    } catch (error) {
      const wrapped =
        error instanceof Error ? error : new CodexAppServerError("internal", String(error), this.sessionId);
      void this.close(wrapped);
      throw wrapped;
    }
  }

  onNotification(listener: NotificationListener): () => void {
    if (this.notificationListeners.size >= MAX_NOTIFICATION_LISTENERS) {
      throw new CodexAppServerError("internal", "too many notification listeners");
    }
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  onServerRequest(handler: ServerRequestHandler): () => void {
    if (this.serverRequestHandler) {
      throw new CodexAppServerError("internal", "server request handler already set");
    }
    this.serverRequestHandler = handler;
    return () => {
      if (this.serverRequestHandler === handler) this.serverRequestHandler = null;
    };
  }

  setServerRequestHandler(handler: ServerRequestHandler | null): void {
    this.serverRequestHandler = handler;
  }

  onClose(listener: CloseListener): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  async close(error?: Error): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    this.requests.close(error ?? new CodexAppServerError("closed", "app-server transport closed", this.sessionId));
    try {
      await this.closeSink?.();
    } catch {
      // close is best-effort
    }
    const closeError = error ?? null;
    for (const listener of [...this.closeListeners]) {
      try {
        listener(closeError);
      } catch {
        // listener isolation
      }
    }
    this.notificationListeners.clear();
    this.serverRequestHandler = null;
    this.closeListeners.clear();
  }

  /** Inbound dispatcher. Isolates listener exceptions. */
  handleInbound(message: AppServerMessage): void {
    if (this.closed) return;
    if (this.inboundQueued >= this.maxInboundQueue) {
      void this.close(new CodexAppServerError("internal", "inbound queue overflow", this.sessionId));
      return;
    }
    this.inboundQueued += 1;
    try {
      const kind = classifyMessage(message, "inbound");
      if (kind === "response") {
        if (message.id === undefined) return;
        this.requests.settle(message.id, message);
        return;
      }
      if (kind === "notification") {
        for (const listener of [...this.notificationListeners]) {
          try {
            listener(message);
          } catch {
            // isolate
          }
        }
        return;
      }
      if (kind === "server-request") {
        void this.dispatchServerRequest(message);
        return;
      }
      void this.close(new CodexAppServerError("malformed", "invalid inbound app-server message", this.sessionId));
    } finally {
      this.inboundQueued -= 1;
    }
  }

  private async dispatchServerRequest(message: AppServerMessage): Promise<void> {
    if (this.closed || message.id === undefined) return;
    if (this.serverRequestsInFlight >= this.maxServerRequestsInFlight) {
      await this.sendServerResponse(message.id, {
        error: { code: -32000, message: "too many in-flight server requests" },
      });
      return;
    }
    this.serverRequestsInFlight += 1;
    try {
      const handler = this.serverRequestHandler;
      if (!handler) {
        await this.sendServerResponse(message.id, {
          error: { code: -32601, message: "Method not found" },
        });
        return;
      }
      let outcome: ServerRequestResult;
      try {
        outcome = await handler(message);
      } catch {
        outcome = { error: { code: -32603, message: "Internal error" } };
      }
      if (outcome && typeof outcome === "object" && "error" in outcome && outcome.error) {
        await this.sendServerResponse(message.id, { error: outcome.error });
      } else {
        await this.sendServerResponse(message.id, { result: outcome?.result });
      }
    } finally {
      this.serverRequestsInFlight -= 1;
    }
  }

  private async sendServerResponse(
    id: AppServerMessage["id"],
    body: { result?: unknown; error?: RpcError },
  ): Promise<void> {
    if (id === undefined || this.closed) return;
    const message: AppServerMessage = { id, ...body };
    try {
      assertOutboundMessage(message);
      await this.sendImpl(message);
    } catch (error) {
      const wrapped =
        error instanceof Error ? error : new CodexAppServerError("internal", String(error), this.sessionId);
      void this.close(wrapped);
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new CodexAppServerError("closed", "app-server transport is closed", this.sessionId);
    }
  }
}

export function encodeForStdio(message: AppServerMessage): Buffer {
  return assertOutboundMessage(message);
}

