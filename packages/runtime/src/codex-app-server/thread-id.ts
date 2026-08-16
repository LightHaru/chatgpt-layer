/**
 * Thread ID extraction from known protocol shapes only.
 * Do not recursively search arbitrary JSON for a threadId field.
 *
 * Known shapes (REFERENCE: b-nnett/codex-subscription-router mux.go):
 *   params.threadId | params.thread_id          (top-level only)
 *   result.thread.id                            (thread/start, fork, resume, unarchive)
 *   params.thread.id                            (thread/started notification)
 */

import { MAX_THREAD_ID_LENGTH } from "./types";

export function isUsableThreadId(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_THREAD_ID_LENGTH) {
    return false;
  }
  if (/\s/.test(value)) return false;
  if (value.includes("..") || value.includes("/") || value.includes("\\")) return false;
  if (value.includes(":") || value.includes("@") || value.includes("\\0")) return false;
  if (value.startsWith("\\\\")) return false;
  return true;
}

export function assertThreadId(value: unknown): asserts value is string {
  if (!isUsableThreadId(value)) {
    throw new Error("invalid thread id");
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function extractThreadIdFromParams(params: unknown): string | null {
  const rec = asRecord(params);
  if (!rec) return null;
  for (const key of ["threadId", "thread_id"] as const) {
    const value = rec[key];
    if (isUsableThreadId(value)) return value;
  }
  return null;
}

export function extractThreadIdFromResult(result: unknown): string | null {
  const rec = asRecord(result);
  if (!rec) return null;
  const thread = asRecord(rec.thread);
  if (thread && isUsableThreadId(thread.id)) return thread.id;
  return null;
}

export function extractThreadIdFromNotification(params: unknown): string | null {
  return extractThreadIdFromResult(params) ?? extractThreadIdFromParams(params);
}
