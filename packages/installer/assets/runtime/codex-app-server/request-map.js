"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestMap = void 0;
const errors_1 = require("./errors");
const protocol_1 = require("./protocol");
const types_1 = require("./types");
/**
 * Correlates outbound request ids to pending promises.
 * Internal ids are allocated here so child-chosen ids cannot collide with
 * Layer's in-flight map. Duplicate responses are ignored. Child exit rejects
 * every pending entry exactly once.
 */
class RequestMap {
    pending = new Map();
    seq = 0;
    closed = false;
    timeoutMs;
    maxPending;
    constructor(options = {}) {
        this.timeoutMs = options.timeoutMs ?? types_1.DEFAULT_REQUEST_TIMEOUT_MS;
        this.maxPending = options.maxPending ?? types_1.MAX_PENDING_REQUESTS;
    }
    get size() {
        return this.pending.size;
    }
    allocateId() {
        this.seq += 1;
        return `layer:${this.seq}`;
    }
    expect(id, timeoutMs = this.timeoutMs) {
        if (this.closed) {
            return Promise.reject(new errors_1.CodexAppServerError("closed", "app-server transport is closed"));
        }
        const key = (0, protocol_1.requestIdKey)(id);
        if (this.pending.has(key)) {
            return Promise.reject(new errors_1.CodexAppServerError("internal", "duplicate pending request id"));
        }
        if (this.pending.size >= this.maxPending) {
            return Promise.reject(new errors_1.CodexAppServerError("internal", "pending request map is full"));
        }
        return new Promise((resolve, reject) => {
            const entry = {
                settled: false,
                resolve: (message) => {
                    if (entry.settled)
                        return;
                    entry.settled = true;
                    clearTimeout(entry.timer);
                    this.pending.delete(key);
                    resolve(message);
                },
                reject: (error) => {
                    if (entry.settled)
                        return;
                    entry.settled = true;
                    clearTimeout(entry.timer);
                    this.pending.delete(key);
                    reject(error);
                },
                timer: setTimeout(() => {
                    entry.reject(new errors_1.CodexAppServerError("timeout", `app-server request timed out: ${key}`));
                }, timeoutMs),
            };
            this.pending.set(key, entry);
        });
    }
    settle(id, message) {
        const entry = this.pending.get((0, protocol_1.requestIdKey)(id));
        if (!entry || entry.settled)
            return false;
        entry.resolve(message);
        return true;
    }
    fail(id, error) {
        const entry = this.pending.get((0, protocol_1.requestIdKey)(id));
        if (!entry || entry.settled)
            return false;
        entry.reject(error);
        return true;
    }
    rejectAll(error) {
        const entries = [...this.pending.values()];
        this.pending.clear();
        for (const entry of entries)
            entry.reject(error);
    }
    close(error = new errors_1.CodexAppServerError("closed", "app-server transport closed")) {
        this.closed = true;
        this.rejectAll(error);
    }
}
exports.RequestMap = RequestMap;
//# sourceMappingURL=request-map.js.map