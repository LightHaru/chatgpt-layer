import { RequestMap } from "./request-map";
import type { AppServerMessage, JsonRpcResponse, RpcError } from "./types";
export type NotificationListener = (message: AppServerMessage) => void;
export type CloseListener = (error: Error | null) => void;
/** Option A: a single handler that must return exactly one result or error. */
export type ServerRequestResult = {
    result: unknown;
    error?: undefined;
} | {
    error: RpcError;
    result?: undefined;
};
export type ServerRequestHandler = (request: AppServerMessage) => ServerRequestResult | Promise<ServerRequestResult>;
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
export declare class AbstractAppServerTransport implements CodexAppServerTransport {
    readonly sessionId: string;
    protected readonly requests: RequestMap;
    private readonly notificationListeners;
    private serverRequestHandler;
    private readonly closeListeners;
    private readonly maxInboundQueue;
    private readonly maxServerRequestsInFlight;
    private inboundQueued;
    private serverRequestsInFlight;
    private closed;
    private readonly sendImpl;
    private readonly closeSink?;
    constructor(options: AbstractTransportOptions);
    get isClosed(): boolean;
    get inFlightServerRequests(): number;
    request(method: string, params?: unknown, options?: TransportRequestOptions): Promise<JsonRpcResponse>;
    notify(method: string, params?: unknown): Promise<void>;
    onNotification(listener: NotificationListener): () => void;
    onServerRequest(handler: ServerRequestHandler): () => void;
    setServerRequestHandler(handler: ServerRequestHandler | null): void;
    onClose(listener: CloseListener): () => void;
    close(error?: Error): Promise<void>;
    /** Inbound dispatcher. Isolates listener exceptions. */
    handleInbound(message: AppServerMessage): void;
    private dispatchServerRequest;
    private sendServerResponse;
    private assertOpen;
}
export declare function encodeForStdio(message: AppServerMessage): Buffer;
