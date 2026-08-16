import type { AppServerMessage, JsonId } from "./types";
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
export declare class RequestMap {
    private readonly pending;
    private seq;
    private closed;
    private readonly timeoutMs;
    private readonly maxPending;
    constructor(options?: RequestMapOptions);
    get size(): number;
    allocateId(): string;
    expect(id: JsonId, timeoutMs?: number): Promise<AppServerMessage>;
    settle(id: JsonId, message: AppServerMessage): boolean;
    fail(id: JsonId, error: Error): boolean;
    rejectAll(error: Error): void;
    close(error?: Error): void;
}
