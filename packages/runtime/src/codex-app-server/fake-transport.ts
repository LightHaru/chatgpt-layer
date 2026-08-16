import { CodexAppServerError } from "./errors";
import { AbstractAppServerTransport } from "./transport";
import type { AppServerMessage } from "./types";
import {
  METHOD_INITIALIZE,
  METHOD_INITIALIZED,
  METHOD_THREAD_READ,
  METHOD_THREAD_START,
  METHOD_THREAD_STARTED,
  METHOD_TURN_START,
} from "./types";

export type FakeHandlerResult =
  | { result?: unknown; extra?: Record<string, unknown> }
  | { error: { code: number; message: string; data?: unknown } }
  | { notification: AppServerMessage; result?: unknown }
  | { crash: true }
  | { malformed: string }
  | { delayMs: number; then: Exclude<FakeHandlerResult, { delayMs: number; then: unknown }> };

export type FakeRequestHandler = (
  method: string,
  params: unknown,
  id: string | number,
) => FakeHandlerResult | void | Promise<FakeHandlerResult | void>;

export interface FakeAppServerOptions {
  sessionId: string;
  timeoutMs?: number;
  onRequest?: FakeRequestHandler;
  onNotify?: (method: string, params: unknown) => void;
  threadIdPrefix?: string;
}

/**
 * In-process fake Codex app-server. No network, no ~/.codex, no real auth.
 */
export class FakeAppServer {
  readonly sessionId: string;
  private initialized = false;
  private initParams: unknown;
  private seq = 0;
  private crashed = false;
  private readonly onRequest?: FakeRequestHandler;
  private readonly onNotify?: FakeAppServerOptions["onNotify"];
  private readonly threadIdPrefix: string;
  readonly startedThreadIds: string[] = [];

  constructor(options: FakeAppServerOptions) {
    this.sessionId = options.sessionId;
    this.onRequest = options.onRequest;
    this.onNotify = options.onNotify;
    this.threadIdPrefix = options.threadIdPrefix ?? `thread_${options.sessionId.slice(-8)}_`;
  }

  get didInitialize(): boolean {
    return this.initialized;
  }

  get lastInitializeParams(): unknown {
    return this.initParams;
  }

  get isCrashed(): boolean {
    return this.crashed;
  }

  crash(): void {
    this.crashed = true;
  }

  async handle(message: AppServerMessage): Promise<AppServerMessage[]> {
    if (this.crashed) throw new CodexAppServerError("child-exit", "fake app-server crashed", this.sessionId);
    if (message.method && message.id === undefined) {
      this.onNotify?.(message.method, message.params);
      if (message.method === METHOD_INITIALIZED) this.initialized = true;
      return [];
    }
    if (!message.method || message.id === undefined) {
      return [{ id: message.id, error: { code: -32600, message: "Invalid Request" } }];
    }
    const custom = this.onRequest ? await this.onRequest(message.method, message.params, message.id) : undefined;
    if (custom) return this.materialize(message, custom);
    return this.materialize(message, this.defaultHandle(message.method, message.params));
  }

  private defaultHandle(method: string, params: unknown): FakeHandlerResult {
    if (method === METHOD_INITIALIZE) {
      this.initParams = params;
      return { result: { protocolVersion: "test", sessionId: this.sessionId } };
    }
    if (method === METHOD_THREAD_START) {
      this.seq += 1;
      const threadId = `${this.threadIdPrefix}${this.seq}`;
      this.startedThreadIds.push(threadId);
      return {
        result: { thread: { id: threadId } },
        notification: { method: METHOD_THREAD_STARTED, params: { thread: { id: threadId } } },
      };
    }
    if (method === METHOD_THREAD_READ) {
      const threadId = threadIdFrom(params);
      return {
        result: {
          thread: { id: threadId, path: `/tmp/fake/${threadId}.jsonl`, cwd: "/tmp", modelProvider: "test" },
        },
      };
    }
    if (method === METHOD_TURN_START) {
      this.seq += 1;
      return { result: { turn: { id: `turn_${this.seq}` } } };
    }
    return { error: { code: -32601, message: `Method not found: ${method}` } };
  }

  private async materialize(request: AppServerMessage, result: FakeHandlerResult): Promise<AppServerMessage[]> {
    if ("delayMs" in result) {
      await delay(result.delayMs);
      return this.materialize(request, result.then);
    }
    if ("crash" in result) {
      this.crashed = true;
      throw new CodexAppServerError("child-exit", "fake app-server crashed", this.sessionId);
    }
    if ("malformed" in result) {
      throw new CodexAppServerError("malformed", result.malformed, this.sessionId);
    }
    const outbound: AppServerMessage[] = [];
    if ("notification" in result && result.notification) outbound.push(result.notification);
    if ("error" in result && result.error) {
      outbound.push({ id: request.id, error: result.error });
      return outbound;
    }
    const extra = "extra" in result ? result.extra : undefined;
    outbound.unshift({
      id: request.id,
      result: "result" in result ? result.result : {},
      extra,
    });
    return outbound;
  }
}

export class InProcessAppServerTransport extends AbstractAppServerTransport {
  readonly server: FakeAppServer;

  constructor(server: FakeAppServer, timeoutMs?: number) {
    super({
      sessionId: server.sessionId,
      timeoutMs,
      send: (message) => this.dispatch(message),
    });
    this.server = server;
  }

  private async dispatch(message: AppServerMessage): Promise<void> {
    let outbound: AppServerMessage[];
    try {
      outbound = await this.server.handle(message);
    } catch (error) {
      await this.close(
        error instanceof Error ? error : new CodexAppServerError("child-exit", String(error), this.sessionId),
      );
      throw error;
    }
    for (const item of outbound) this.handleInbound(item);
  }
}

export function createFakeTransport(
  sessionId: string,
  options: Omit<FakeAppServerOptions, "sessionId"> = {},
): InProcessAppServerTransport {
  return new InProcessAppServerTransport(new FakeAppServer({ ...options, sessionId }), options.timeoutMs);
}

function threadIdFrom(params: unknown): string {
  if (params && typeof params === "object" && !Array.isArray(params)) {
    const rec = params as Record<string, unknown>;
    if (typeof rec.threadId === "string") return rec.threadId;
    if (typeof rec.thread_id === "string") return rec.thread_id;
  }
  return "thread_unknown";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
