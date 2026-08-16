import { RequestMap } from "./request-map";
import type { AppServerMessage, JsonRpcResponse } from "./types";
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
export declare class AbstractAppServerTransport implements CodexAppServerTransport {
    readonly sessionId: string;
    protected readonly requests: RequestMap;
    private readonly notificationListeners;
    private readonly serverRequestListeners;
    private readonly closeListeners;
    private readonly maxInboundQueue;
    private inboundQueued;
    private closed;
    private readonly sendImpl;
    private readonly closeSink?;
    constructor(options: AbstractTransportOptions);
    get isClosed(): boolean;
    request(method: string, params?: unknown, options?: TransportRequestOptions): Promise<JsonRpcResponse>;
    notify(method: string, params?: unknown): Promise<void>;
    onNotification(listener: NotificationListener): () => void;
    onServerRequest(listener: ServerRequestListener): () => void;
    onClose(listener: CloseListener): () => void;
    close(error?: Error): Promise<void>;
    /** Inbound dispatcher. Isolates listener exceptions. */
    handleInbound(message: AppServerMessage): void;
    private replyUnsupported;
    private assertOpen;
}
export declare function encodeForStdio(message: AppServerMessage): string;
