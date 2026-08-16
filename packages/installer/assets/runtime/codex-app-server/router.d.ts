import type { CodexSessionTransportRegistry } from "./registry";
import type { ThreadOwnerStore } from "./thread-owner-store";
import type { JsonRpcResponse } from "./types";
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
export declare class CodexSessionRouter {
    private readonly registry;
    private readonly owners;
    private readonly selectSession?;
    private readonly requestTimeoutMs?;
    constructor(options: CodexSessionRouterOptions);
    routeNewThread(input?: RouteNewThreadInput): Promise<RoutedRequest>;
    routeExistingThread(input: RouteExistingThreadInput): Promise<RoutedRequest>;
    recordThreadOwner(threadId: string, sessionId: string, overwrite?: boolean): void;
    maybeRecordFromNotification(sessionId: string, method: string, params: unknown): string | null;
    maybeRecordFromSuccess(method: string, sessionId: string, result: unknown): string | null;
    private resolveNewSession;
    private requireTransport;
}
