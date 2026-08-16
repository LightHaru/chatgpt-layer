import { randomBytes } from "node:crypto";

export const SESSION_ID_RE = /^session_[a-f0-9]{24}$/;

export function generateSessionId(): string {
  return `session_${randomBytes(12).toString("hex")}`;
}

export function isSessionId(value: unknown): value is string {
  return typeof value === "string" && SESSION_ID_RE.test(value);
}

export function assertSessionId(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("invalid session id");
  }
  if (
    value.includes("..") ||
    value.includes("/") ||
    value.includes("\\") ||
    value.includes(":") ||
    value.includes("@") ||
    value.includes(" ") ||
    value.startsWith("\\\\") ||
    /^[A-Za-z]:/.test(value)
  ) {
    throw new Error("invalid session id");
  }
  if (!SESSION_ID_RE.test(value)) {
    throw new Error("invalid session id");
  }
}
