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

export const KNOWN_MESSAGE_KEYS = ["id", "method", "params", "result", "error"] as const;

/** Conservative bounds. Fail the child/session, never the Electron main process. */
export const MAX_MESSAGE_BYTES = 256 * 1024;
export const MAX_BUFFER_BYTES = 512 * 1024;
export const MAX_PENDING_REQUESTS = 256;
export const MAX_NOTIFICATION_LISTENERS = 16;
export const MAX_INBOUND_QUEUE = 256;
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const MAX_THREAD_ID_LENGTH = 200;
export const MAX_THREAD_OWNERS = 4096;
export const MAX_OWNER_STORE_BYTES = 512 * 1024;
export const THREAD_OWNER_STORE_VERSION = 1;

export const THREAD_OWNER_STORE_RELATIVE = ["codex-sessions", "thread-owners.json"] as const;

/** Known methods used by MS-2A routing / handshake. */
export const METHOD_INITIALIZE = "initialize";
export const METHOD_INITIALIZED = "initialized";
export const METHOD_THREAD_START = "thread/start";
export const METHOD_THREAD_READ = "thread/read";
export const METHOD_THREAD_RESUME = "thread/resume";
export const METHOD_THREAD_FORK = "thread/fork";
export const METHOD_THREAD_UNARCHIVE = "thread/unarchive";
export const METHOD_THREAD_STARTED = "thread/started";
export const METHOD_TURN_START = "turn/start";

export const OWNER_RECORDING_METHODS = [
  METHOD_THREAD_START,
  METHOD_THREAD_FORK,
  METHOD_THREAD_RESUME,
  METHOD_THREAD_UNARCHIVE,
] as const;
