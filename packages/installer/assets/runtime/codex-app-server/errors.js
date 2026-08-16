"use strict";
/**
 * Layer-internal Codex app-server errors.
 *
 * Network / spawn / malformed / timeout / internal failures are NEVER
 * classified as quota exhaustion. `usage_limit_exceeded` is out of scope
 * for MS-2A (no auto-failover).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexAppServerError = void 0;
exports.isCodexAppServerError = isCodexAppServerError;
exports.isQuotaExhaustionKind = isQuotaExhaustionKind;
class CodexAppServerError extends Error {
    kind;
    sessionId;
    constructor(kind, message, sessionId) {
        super(message);
        this.name = "CodexAppServerError";
        this.kind = kind;
        this.sessionId = sessionId;
    }
}
exports.CodexAppServerError = CodexAppServerError;
function isCodexAppServerError(value) {
    return value instanceof CodexAppServerError;
}
function isQuotaExhaustionKind(kind) {
    void kind;
    return false;
}
//# sourceMappingURL=errors.js.map