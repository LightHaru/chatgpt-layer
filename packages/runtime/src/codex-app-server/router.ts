import { assertSessionId } from "../codex-sessions/ids";
import { CodexAppServerError } from "./errors";
import type { CodexSessionTransportRegistry } from "./registry";
import {
  extractThreadIdFromNotification,
  extractThreadIdFromParams,
  extractThreadIdFromResult,
  isUsableThreadId,
} from "./thread-id";
import type { ThreadOwnerStore } from "./thread-owner-store";
import type { CodexAppServerTransport } from "./transport";
import type { JsonRpcResponse } from "./types";
import { METHOD_THREAD_START, OWNER_RECORDING_METHODS } from "./types";

export interface RouteNewThreadInput {
  params?: unknown;
  /** Internally selected session. Required unless selectSession is configured. */
  sessionId?: string;
}

export interface RouteExistingThreadInput {
  threadId?: string;
  method: string;
  params?: unknown;
  /** Explicit caller-selected fallback when owner is missing or unavailable. */
  fallbackSessionId?: string;
}

export interface RoutedRequest {
  sessionId: string;
  threadId: string | null;
  response: JsonRpcResponse;
  ownerPersisted: boolean;
}

export interface CodexSessionRouterOptions {
  registry: CodexSessionTransportRegistry;
  owners: ThreadOwnerStore;
  /**
   * TEST-ONLY deterministic session picker for new threads when sessionId is
   * omitted. Production should pass sessionId explicitly.
   */
  selectSession?: () => string | null;
  requestTimeoutMs?: number;
}

/**
 * SIMPLE sticky-thread policy. No quota scoring, no Smart Routing, no
 * failover migration (thread/read → thread/resume). Ownership is persisted
 * only after a successful new-thread (or explicit recordThreadOwner).
 */
export class CodexSessionRouter {
  private readonly registry: CodexSessionTransportRegistry;
  private readonly owners: ThreadOwnerStore;
  private readonly selectSession?: () => string | null;
  private readonly requestTimeoutMs?: number;

  constructor(options: CodexSessionRouterOptions) {
    this.registry = options.registry;
    this.owners = options.owners;
    this.selectSession = options.selectSession;
    this.requestTimeoutMs = options.requestTimeoutMs;
  }

  async routeNewThread(input: RouteNewThreadInput = {}): Promise<RoutedRequest> {
    const sessionId = this.resolveNewSession(input.sessionId);
    const transport = this.requireTransport(sessionId);
    const response = await transport.request(METHOD_THREAD_START, input.params ?? {}, {
      timeoutMs: this.requestTimeoutMs,
    });
    const threadId = extractThreadIdFromResult(response.result);
    if (!threadId) {
      return { sessionId, threadId: null, response, ownerPersisted: false };
    }
    this.owners.setOwner(threadId, sessionId, { overwrite: false });
    return { sessionId, threadId, response, ownerPersisted: true };
  }

  async routeExistingThread(input: RouteExistingThreadInput): Promise<RoutedRequest> {
    const threadId = input.threadId ?? extractThreadIdFromParams(input.params);
    if (threadId && !isUsableThreadId(threadId)) {
      throw new CodexAppServerError("invalid-id", "malformed thread id");
    }
    const owner = threadId ? this.owners.getOwner(threadId) : null;
    let sessionId: string | null = null;
    if (owner) {
      if (this.registry.get(owner)) {
        sessionId = owner;
      } else if (input.fallbackSessionId) {
        assertSessionId(input.fallbackSessionId);
        sessionId = input.fallbackSessionId;
        // Explicit fallback does NOT migrate ownership.
      } else {
        throw new CodexAppServerError(
          "unavailable",
          `owner session ${owner} has no live transport`,
          owner,
        );
      }
    } else if (input.fallbackSessionId) {
      assertSessionId(input.fallbackSessionId);
      sessionId = input.fallbackSessionId;
    } else {
      throw new CodexAppServerError("fallback-required", "unknown thread owner requires an explicit fallback session");
    }
    const transport = this.requireTransport(sessionId);
    const response = await transport.request(input.method, input.params ?? {}, {
      timeoutMs: this.requestTimeoutMs,
    });
    return { sessionId, threadId: threadId ?? null, response, ownerPersisted: false };
  }

  recordThreadOwner(threadId: string, sessionId: string, overwrite = false): void {
    this.owners.setOwner(threadId, sessionId, { overwrite });
  }

  maybeRecordFromNotification(sessionId: string, method: string, params: unknown): string | null {
    if (method !== "thread/started") return null;
    const threadId = extractThreadIdFromNotification(params);
    if (!threadId) return null;
    const existing = this.owners.getOwner(threadId);
    if (existing && existing !== sessionId) return existing;
    if (!existing) this.owners.setOwner(threadId, sessionId, { overwrite: false });
    return threadId;
  }

  maybeRecordFromSuccess(method: string, sessionId: string, result: unknown): string | null {
    if (!(OWNER_RECORDING_METHODS as readonly string[]).includes(method)) return null;
    const threadId = extractThreadIdFromResult(result);
    if (!threadId) return null;
    this.owners.setOwner(threadId, sessionId, { overwrite: false });
    return threadId;
  }

  private resolveNewSession(sessionId: string | undefined): string {
    if (sessionId) {
      assertSessionId(sessionId);
      return sessionId;
    }
    const selected = this.selectSession?.() ?? null;
    if (!selected) {
      throw new CodexAppServerError("fallback-required", "new thread requires a target session");
    }
    assertSessionId(selected);
    return selected;
  }

  private requireTransport(sessionId: string): CodexAppServerTransport {
    assertSessionId(sessionId);
    const transport = this.registry.get(sessionId);
    if (!transport) {
      throw new CodexAppServerError("unavailable", `no live app-server transport for ${sessionId}`, sessionId);
    }
    return transport;
  }
}
