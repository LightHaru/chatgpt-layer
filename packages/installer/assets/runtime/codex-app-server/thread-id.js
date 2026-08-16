"use strict";
/**
 * Thread ID extraction from known protocol shapes only.
 * Do not recursively search arbitrary JSON for a threadId field.
 *
 * Known shapes (REFERENCE: b-nnett/codex-subscription-router mux.go):
 *   params.threadId | params.thread_id          (top-level only)
 *   result.thread.id                            (thread/start, fork, resume, unarchive)
 *   params.thread.id                            (thread/started notification)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUsableThreadId = isUsableThreadId;
exports.assertThreadId = assertThreadId;
exports.extractThreadIdFromParams = extractThreadIdFromParams;
exports.extractThreadIdFromResult = extractThreadIdFromResult;
exports.extractThreadIdFromNotification = extractThreadIdFromNotification;
const types_1 = require("./types");
function isUsableThreadId(value) {
    if (typeof value !== "string" || value.length === 0 || value.length > types_1.MAX_THREAD_ID_LENGTH) {
        return false;
    }
    if (/\s/.test(value))
        return false;
    if (value.includes("..") || value.includes("/") || value.includes("\\"))
        return false;
    if (value.includes(":") || value.includes("@") || value.includes("\\0"))
        return false;
    if (value.startsWith("\\\\"))
        return false;
    return true;
}
function assertThreadId(value) {
    if (!isUsableThreadId(value)) {
        throw new Error("invalid thread id");
    }
}
function asRecord(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value))
        return null;
    return value;
}
function extractThreadIdFromParams(params) {
    const rec = asRecord(params);
    if (!rec)
        return null;
    for (const key of ["threadId", "thread_id"]) {
        const value = rec[key];
        if (isUsableThreadId(value))
            return value;
    }
    return null;
}
function extractThreadIdFromResult(result) {
    const rec = asRecord(result);
    if (!rec)
        return null;
    const thread = asRecord(rec.thread);
    if (thread && isUsableThreadId(thread.id))
        return thread.id;
    return null;
}
function extractThreadIdFromNotification(params) {
    return extractThreadIdFromResult(params) ?? extractThreadIdFromParams(params);
}
//# sourceMappingURL=thread-id.js.map