/**
 * JSON-RPC-like app-server envelope.
 *
 * Codex app-server (REFERENCE: b-nnett/codex-subscription-router
 * internal/protocol) uses {id, method, params, result, error} and
 * intentionally omits the JSON-RPC 2.0 `jsonrpc` field. Do not require it.
 * Unknown fields are preserved when forwarding internally.
 */
export type JsonId = string | number;
export interface RpcError {
    code: number;
    message: string;
    data?: unknown;
}
export type MessageKind = "request" | "response" | "notification" | "server-request" | "invalid";
export interface AppServerMessage {
    id?: JsonId;
    method?: string;
    params?: unknown;
    result?: unknown;
    error?: RpcError;
    extra?: Record<string, unknown>;
}
export interface JsonRpcRequest {
    id: JsonId;
    method: string;
    params?: unknown;
    extra?: Record<string, unknown>;
}
export interface JsonRpcNotification {
    method: string;
    params?: unknown;
    extra?: Record<string, unknown>;
}
export interface JsonRpcResponse {
    id: JsonId;
    result?: unknown;
    error?: RpcError;
    extra?: Record<string, unknown>;
}
export declare const KNOWN_MESSAGE_KEYS: readonly ["id", "method", "params", "result", "error"];
/** Conservative bounds. Fail the child/session, never the Electron main process. */
export declare const MAX_MESSAGE_BYTES: number;
export declare const MAX_BUFFER_BYTES: number;
export declare const MAX_PENDING_REQUESTS = 256;
export declare const MAX_NOTIFICATION_LISTENERS = 16;
export declare const MAX_INBOUND_QUEUE = 256;
export declare const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
export declare const MAX_THREAD_ID_LENGTH = 200;
export declare const MAX_THREAD_OWNERS = 4096;
export declare const MAX_OWNER_STORE_BYTES: number;
export declare const THREAD_OWNER_STORE_VERSION = 1;
export declare const THREAD_OWNER_STORE_RELATIVE: readonly ["codex-sessions", "thread-owners.json"];
/** Known methods used by MS-2A routing / handshake. */
export declare const METHOD_INITIALIZE = "initialize";
export declare const METHOD_INITIALIZED = "initialized";
export declare const METHOD_THREAD_START = "thread/start";
export declare const METHOD_THREAD_READ = "thread/read";
export declare const METHOD_THREAD_RESUME = "thread/resume";
export declare const METHOD_THREAD_FORK = "thread/fork";
export declare const METHOD_THREAD_UNARCHIVE = "thread/unarchive";
export declare const METHOD_THREAD_STARTED = "thread/started";
export declare const METHOD_TURN_START = "turn/start";
export declare const OWNER_RECORDING_METHODS: readonly ["thread/start", "thread/fork", "thread/resume", "thread/unarchive"];
