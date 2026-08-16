import type { AppServerMessage, JsonId, MessageKind } from "./types";
export declare function isRecord(value: unknown): value is Record<string, unknown>;
export declare function isJsonId(value: unknown): value is JsonId;
export declare function requestIdKey(id: JsonId): string;
export declare function parseAppServerMessage(raw: unknown): AppServerMessage;
export declare function serializeAppServerMessage(message: AppServerMessage): string;
/**
 * Classify by shape, not by JSON-RPC 2.0 rules.
 * Direction distinguishes client request vs server-initiated request
 * (both are {id, method}).
 */
export declare function classifyMessage(message: AppServerMessage, direction: "inbound" | "outbound"): MessageKind;
export declare function parseJsonLine(line: string): AppServerMessage;
