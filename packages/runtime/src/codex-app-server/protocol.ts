import { CodexAppServerError } from "./errors";
import type { AppServerMessage, JsonId, MessageKind, RpcError } from "./types";
import { KNOWN_MESSAGE_KEYS } from "./types";

const KNOWN = new Set<string>(KNOWN_MESSAGE_KEYS);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isJsonId(value: unknown): value is JsonId {
  return (typeof value === "string" && value.length > 0 && value.length <= 128) ||
    (typeof value === "number" && Number.isFinite(value));
}

export function requestIdKey(id: JsonId): string {
  return typeof id === "number" ? `#${id}` : id;
}

export function parseAppServerMessage(raw: unknown): AppServerMessage {
  if (!isRecord(raw)) {
    throw new CodexAppServerError("malformed", "app-server message must be a JSON object");
  }
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN.has(key)) extra[key] = value;
  }
  const message: AppServerMessage = {};
  if (raw.id !== undefined) {
    if (!isJsonId(raw.id)) {
      throw new CodexAppServerError("malformed", "app-server id must be a string or number");
    }
    message.id = raw.id;
  }
  if (raw.method !== undefined) {
    if (typeof raw.method !== "string" || raw.method.length === 0 || raw.method.length > 200) {
      throw new CodexAppServerError("malformed", "app-server method must be a non-empty string");
    }
    message.method = raw.method;
  }
  if (raw.params !== undefined) message.params = raw.params;
  if (raw.result !== undefined) message.result = raw.result;
  if (raw.error !== undefined) message.error = parseRpcError(raw.error);
  if (Object.keys(extra).length > 0) message.extra = extra;
  return message;
}

function parseRpcError(raw: unknown): RpcError {
  if (!isRecord(raw) || typeof raw.code !== "number" || typeof raw.message !== "string") {
    throw new CodexAppServerError("malformed", "app-server error must be {code, message}");
  }
  const err: RpcError = { code: raw.code, message: raw.message.slice(0, 2000) };
  if (raw.data !== undefined) err.data = raw.data;
  return err;
}

export function serializeAppServerMessage(message: AppServerMessage): string {
  const out: Record<string, unknown> = {};
  if (message.extra) {
    for (const [key, value] of Object.entries(message.extra)) {
      if (!KNOWN.has(key)) out[key] = value;
    }
  }
  if (message.id !== undefined) out.id = message.id;
  if (message.method !== undefined) out.method = message.method;
  if (message.params !== undefined) out.params = message.params;
  if (message.result !== undefined) out.result = message.result;
  if (message.error !== undefined) out.error = message.error;
  return JSON.stringify(out);
}

/**
 * Classify by shape, not by JSON-RPC 2.0 rules.
 * Direction distinguishes client request vs server-initiated request
 * (both are {id, method}).
 */
export function classifyMessage(message: AppServerMessage, direction: "inbound" | "outbound"): MessageKind {
  const hasId = message.id !== undefined;
  const hasMethod = typeof message.method === "string" && message.method.length > 0;
  if (hasMethod && hasId) return direction === "inbound" ? "server-request" : "request";
  if (hasMethod && !hasId) return "notification";
  if (!hasMethod && hasId) return "response";
  return "invalid";
}

export function parseJsonLine(line: string): AppServerMessage {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    throw new CodexAppServerError("malformed", "app-server line is not JSON");
  }
  return parseAppServerMessage(raw);
}
