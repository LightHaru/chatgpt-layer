/**
 * Thread ID extraction from known protocol shapes only.
 * Do not recursively search arbitrary JSON for a threadId field.
 *
 * Known shapes (REFERENCE: b-nnett/codex-subscription-router mux.go):
 *   params.threadId | params.thread_id          (top-level only)
 *   result.thread.id                            (thread/start, fork, resume, unarchive)
 *   params.thread.id                            (thread/started notification)
 */
export declare function isUsableThreadId(value: unknown): value is string;
export declare function assertThreadId(value: unknown): asserts value is string;
export declare function extractThreadIdFromParams(params: unknown): string | null;
export declare function extractThreadIdFromResult(result: unknown): string | null;
export declare function extractThreadIdFromNotification(params: unknown): string | null;
