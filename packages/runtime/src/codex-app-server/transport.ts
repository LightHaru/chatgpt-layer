import { CodexAppServerError } from "./errors";
import { classifyMessage, serializeAppServerMessage } from "./protocol";
import { RequestMap } from "./request-map";
import type { AppServerMessage, JsonRpcResponse } from "./types";
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_INBOUND_QUEUE,
  MAX_NOTIFICATION_LISTENERS,
  MAX_PENDING_REQUESTS,
} from "./types";

export type NotificationListener = (message: AppServerMessage) => void;
export type ServerRequestListener = (message: AppServerMessage) => void | Promise<void>;
export type CloseListener = (error: Error | null) => void;

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
  onServerRequest(listener: ServerRequestListener): () => void;
  onClose(listener: CloseListener): () => void;
  close(error?: Error): Promise<void>;
}

export interface AbstractTransportOptions {
  sessionId: string;
  timeoutMs?: number;
  maxPending?: number;
  maxInboundQueue?: number;
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
  private readonly serverRequestListeners = new Set<ServerRequestListener>();
  private readonly closeListeners = new Set<CloseListener>();
  private readonly maxInboundQueue: number;
  private inboundQueued = 0;
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
    this.sendImpl = options.send;
    this.closeSink = options.closeSink;
  }

  get isClosed(): boolean {
    return this.closed;
  }

  async request(method: string, params?: unknown, options: TransportRequestOptions = {}): Promise<JsonRpcResponse> {
    this.assertOpen();
    const id = this.requests.allocateId();
    const pending = this.requests.expect(id, options.timeoutMs);
    void Promise.resolve(this.sendImpl({ id, method, params })).catch((error) => {
      this.requests.fail(
        id,
        error instanceof Error ? error : new CodexAppServerError("internal", String(error), this.sessionId),
      );
    });
    const response = await pending;
    if (response.error) {
      throw new CodexAppServerError("protocol", response.error.message, this.sessionId);
    }
    return { id: response.id ?? id, result: response.result, extra: response.extra };
  }

  async notify(method: string, params?: unknown): Promise<void> {
    this.assertOpen();
    await this.sendImpl({ method, params });
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

  onServerRequest(listener: ServerRequestListener): () => void {
    if (this.serverRequestListeners.size >= MAX_NOTIFICATION_LISTENERS) {
      throw new CodexAppServerError("internal", "too many server-request listeners");
    }
    this.serverRequestListeners.add(listener);
    return () => {
      this.serverRequestListeners.delete(listener);
    };
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
    this.serverRequestListeners.clear();
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
        if (this.serverRequestListeners.size === 0) {
          void this.replyUnsupported(message);
          return;
        }
        for (const listener of [...this.serverRequestListeners]) {
          try {
            const result = listener(message);
            if (result && typeof (result as Promise<void>).then === "function") {
              void (result as Promise<void>).catch(() => {});
            }
          } catch {
            // isolate
          }
        }
        return;
      }
      void this.close(new CodexAppServerError("malformed", "invalid inbound app-server message", this.sessionId));
    } finally {
      this.inboundQueued -= 1;
    }
  }

  private async replyUnsupported(message: AppServerMessage): Promise<void> {
    if (message.id === undefined) return;
    try {
      await this.sendImpl({
        id: message.id,
        error: { code: -32601, message: "Method not found" },
      });
    } catch {
      void this.close(new CodexAppServerError("unsupported", "unhandled server request", this.sessionId));
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new CodexAppServerError("closed", "app-server transport is closed", this.sessionId);
    }
  }
}

export function encodeForStdio(message: AppServerMessage): string {
  return `${serializeAppServerMessage(message)}\n`;
}
