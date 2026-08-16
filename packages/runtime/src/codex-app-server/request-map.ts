import { CodexAppServerError } from "./errors";
import { requestIdKey } from "./protocol";
import type { AppServerMessage, JsonId } from "./types";
import { DEFAULT_REQUEST_TIMEOUT_MS, MAX_PENDING_REQUESTS } from "./types";

interface PendingEntry {
  resolve: (message: AppServerMessage) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  settled: boolean;
}

export interface RequestMapOptions {
  timeoutMs?: number;
  maxPending?: number;
  now?: () => number;
}

/**
 * Correlates outbound request ids to pending promises.
 * Internal ids are allocated here so child-chosen ids cannot collide with
 * Layer's in-flight map. Duplicate responses are ignored. Child exit rejects
 * every pending entry exactly once.
 */
export class RequestMap {
  private readonly pending = new Map<string, PendingEntry>();
  private seq = 0;
  private closed = false;
  private readonly timeoutMs: number;
  private readonly maxPending: number;

  constructor(options: RequestMapOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
    this.maxPending = options.maxPending ?? MAX_PENDING_REQUESTS;
  }

  get size(): number {
    return this.pending.size;
  }

  allocateId(): string {
    this.seq += 1;
    return `layer:${this.seq}`;
  }

  expect(id: JsonId, timeoutMs = this.timeoutMs): Promise<AppServerMessage> {
    if (this.closed) {
      return Promise.reject(new CodexAppServerError("closed", "app-server transport is closed"));
    }
    const key = requestIdKey(id);
    if (this.pending.has(key)) {
      return Promise.reject(new CodexAppServerError("internal", "duplicate pending request id"));
    }
    if (this.pending.size >= this.maxPending) {
      return Promise.reject(new CodexAppServerError("internal", "pending request map is full"));
    }
    return new Promise((resolve, reject) => {
      const entry: PendingEntry = {
        settled: false,
        resolve: (message) => {
          if (entry.settled) return;
          entry.settled = true;
          clearTimeout(entry.timer);
          this.pending.delete(key);
          resolve(message);
        },
        reject: (error) => {
          if (entry.settled) return;
          entry.settled = true;
          clearTimeout(entry.timer);
          this.pending.delete(key);
          reject(error);
        },
        timer: setTimeout(() => {
          entry.reject(new CodexAppServerError("timeout", `app-server request timed out: ${key}`));
        }, timeoutMs),
      };
      this.pending.set(key, entry);
    });
  }

  settle(id: JsonId, message: AppServerMessage): boolean {
    const entry = this.pending.get(requestIdKey(id));
    if (!entry || entry.settled) return false;
    entry.resolve(message);
    return true;
  }

  fail(id: JsonId, error: Error): boolean {
    const entry = this.pending.get(requestIdKey(id));
    if (!entry || entry.settled) return false;
    entry.reject(error);
    return true;
  }

  rejectAll(error: Error): void {
    const entries = [...this.pending.values()];
    this.pending.clear();
    for (const entry of entries) entry.reject(error);
  }

  close(error: Error = new CodexAppServerError("closed", "app-server transport closed")): void {
    this.closed = true;
    this.rejectAll(error);
  }
}
