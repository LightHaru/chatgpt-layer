/**
 * Layer-internal Codex app-server errors.
 *
 * Network / spawn / malformed / timeout / internal failures are NEVER
 * classified as quota exhaustion. `usage_limit_exceeded` is out of scope
 * for MS-2A (no auto-failover).
 */
export type CodexAppServerErrorKind = "malformed" | "oversized" | "timeout" | "child-exit" | "spawn" | "internal" | "unavailable" | "not-proven" | "closed" | "unsupported" | "invalid-id" | "protocol" | "store-corrupt" | "session-not-running" | "already-attached" | "attach-in-progress" | "session-mismatch" | "not-running" | "owner-exists" | "missing-thread-id" | "fallback-required";
export declare class CodexAppServerError extends Error {
    readonly kind: CodexAppServerErrorKind;
    readonly sessionId?: string;
    constructor(kind: CodexAppServerErrorKind, message: string, sessionId?: string);
}
export declare function isCodexAppServerError(value: unknown): value is CodexAppServerError;
export declare function isQuotaExhaustionKind(kind: CodexAppServerErrorKind): boolean;
