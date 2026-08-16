"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRecord = isRecord;
exports.isJsonId = isJsonId;
exports.requestIdKey = requestIdKey;
exports.parseAppServerMessage = parseAppServerMessage;
exports.serializeAppServerMessage = serializeAppServerMessage;
exports.classifyMessage = classifyMessage;
exports.parseJsonLine = parseJsonLine;
const errors_1 = require("./errors");
const types_1 = require("./types");
const KNOWN = new Set(types_1.KNOWN_MESSAGE_KEYS);
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function isJsonId(value) {
    return (typeof value === "string" && value.length > 0 && value.length <= 128) ||
        (typeof value === "number" && Number.isFinite(value));
}
function requestIdKey(id) {
    return typeof id === "number" ? `n:${id}` : `s:${id}`;
}
function parseAppServerMessage(raw) {
    if (!isRecord(raw)) {
        throw new errors_1.CodexAppServerError("malformed", "app-server message must be a JSON object");
    }
    const extra = {};
    for (const [key, value] of Object.entries(raw)) {
        if (!KNOWN.has(key))
            extra[key] = value;
    }
    const message = {};
    if (raw.id !== undefined) {
        if (!isJsonId(raw.id)) {
            throw new errors_1.CodexAppServerError("malformed", "app-server id must be a string or number");
        }
        message.id = raw.id;
    }
    if (raw.method !== undefined) {
        if (typeof raw.method !== "string" || raw.method.length === 0 || raw.method.length > 200) {
            throw new errors_1.CodexAppServerError("malformed", "app-server method must be a non-empty string");
        }
        message.method = raw.method;
    }
    if (raw.params !== undefined)
        message.params = raw.params;
    if (raw.result !== undefined)
        message.result = raw.result;
    if (raw.error !== undefined)
        message.error = parseRpcError(raw.error);
    if (Object.keys(extra).length > 0)
        message.extra = extra;
    return message;
}
function parseRpcError(raw) {
    if (!isRecord(raw) || typeof raw.code !== "number" || typeof raw.message !== "string") {
        throw new errors_1.CodexAppServerError("malformed", "app-server error must be {code, message}");
    }
    const err = { code: raw.code, message: raw.message.slice(0, 2000) };
    if (raw.data !== undefined)
        err.data = raw.data;
    return err;
}
function serializeAppServerMessage(message) {
    const out = {};
    if (message.extra) {
        for (const [key, value] of Object.entries(message.extra)) {
            if (!KNOWN.has(key))
                out[key] = value;
        }
    }
    if (message.id !== undefined)
        out.id = message.id;
    if (message.method !== undefined)
        out.method = message.method;
    if (message.params !== undefined)
        out.params = message.params;
    if (message.result !== undefined)
        out.result = message.result;
    if (message.error !== undefined)
        out.error = message.error;
    try {
        return JSON.stringify(out);
    }
    catch {
        throw new errors_1.CodexAppServerError("malformed", "app-server message is not serializable");
    }
}
/**
 * Classify by shape, not by JSON-RPC 2.0 rules.
 * Direction distinguishes client request vs server-initiated request
 * (both are {id, method}).
 */
function classifyMessage(message, direction) {
    const hasId = message.id !== undefined;
    const hasMethod = typeof message.method === "string" && message.method.length > 0;
    if (hasMethod && hasId)
        return direction === "inbound" ? "server-request" : "request";
    if (hasMethod && !hasId)
        return "notification";
    if (!hasMethod && hasId)
        return "response";
    return "invalid";
}
function parseJsonLine(line) {
    let raw;
    try {
        raw = JSON.parse(line);
    }
    catch {
        throw new errors_1.CodexAppServerError("malformed", "app-server line is not JSON");
    }
    return parseAppServerMessage(raw);
}
//# sourceMappingURL=protocol.js.map