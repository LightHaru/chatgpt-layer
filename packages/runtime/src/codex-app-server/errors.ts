/**
 * Layer-internal Codex app-server errors.
 *
 * Network / spawn / malformed / timeout / internal failures are NEVER
 * classified as quota exhaustion. `usage_limit_exceeded` is out of scope
 * for MS-2A (no auto-failover).
 */

export type CodexAppServerErrorKind =
  | "malformed"
  | "oversized"
  | "timeout"
  | "child-exit"
  | "spawn"
  | "internal"
  | "unavailable"
  | "not-proven"
  | "closed"
  | "unsupported"
  | "invalid-id"
  | "protocol"
  | "store-corrupt"
  | "session-not-running"
  | "already-attached"
  | "not-running"
  | "owner-exists"
  | "missing-thread-id"
  | "fallback-required";

export class CodexAppServerError extends Error {
  readonly kind: CodexAppServerErrorKind;
  readonly sessionId?: string;

  constructor(kind: CodexAppServerErrorKind, message: string, sessionId?: string) {
    super(message);
    this.name = "CodexAppServerError";
    this.kind = kind;
    this.sessionId = sessionId;
  }
}

export function isCodexAppServerError(value: unknown): value is CodexAppServerError {
  return value instanceof CodexAppServerError;
}

export function isQuotaExhaustionKind(kind: CodexAppServerErrorKind): boolean {
  void kind;
  return false;
}
