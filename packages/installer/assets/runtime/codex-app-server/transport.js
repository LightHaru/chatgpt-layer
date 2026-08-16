"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractAppServerTransport = void 0;
exports.encodeForStdio = encodeForStdio;
const errors_1 = require("./errors");
const protocol_1 = require("./protocol");
const request_map_1 = require("./request-map");
const types_1 = require("./types");
/**
 * Shared request correlation, listener bounds, and inbound dispatch.
 * Subclasses (stdio / in-memory) only implement send + close.
 */
class AbstractAppServerTransport {
    sessionId;
    requests;
    notificationListeners = new Set();
    serverRequestListeners = new Set();
    closeListeners = new Set();
    maxInboundQueue;
    inboundQueued = 0;
    closed = false;
    sendImpl;
    closeSink;
    constructor(options) {
        this.sessionId = options.sessionId;
        this.requests = new request_map_1.RequestMap({
            timeoutMs: options.timeoutMs ?? types_1.DEFAULT_REQUEST_TIMEOUT_MS,
            maxPending: options.maxPending ?? types_1.MAX_PENDING_REQUESTS,
        });
        this.maxInboundQueue = options.maxInboundQueue ?? types_1.MAX_INBOUND_QUEUE;
        this.sendImpl = options.send;
        this.closeSink = options.closeSink;
    }
    get isClosed() {
        return this.closed;
    }
    async request(method, params, options = {}) {
        this.assertOpen();
        const id = this.requests.allocateId();
        const pending = this.requests.expect(id, options.timeoutMs);
        void Promise.resolve(this.sendImpl({ id, method, params })).catch((error) => {
            this.requests.fail(id, error instanceof Error ? error : new errors_1.CodexAppServerError("internal", String(error), this.sessionId));
        });
        const response = await pending;
        if (response.error) {
            throw new errors_1.CodexAppServerError("protocol", response.error.message, this.sessionId);
        }
        return { id: response.id ?? id, result: response.result, extra: response.extra };
    }
    async notify(method, params) {
        this.assertOpen();
        await this.sendImpl({ method, params });
    }
    onNotification(listener) {
        if (this.notificationListeners.size >= types_1.MAX_NOTIFICATION_LISTENERS) {
            throw new errors_1.CodexAppServerError("internal", "too many notification listeners");
        }
        this.notificationListeners.add(listener);
        return () => {
            this.notificationListeners.delete(listener);
        };
    }
    onServerRequest(listener) {
        if (this.serverRequestListeners.size >= types_1.MAX_NOTIFICATION_LISTENERS) {
            throw new errors_1.CodexAppServerError("internal", "too many server-request listeners");
        }
        this.serverRequestListeners.add(listener);
        return () => {
            this.serverRequestListeners.delete(listener);
        };
    }
    onClose(listener) {
        this.closeListeners.add(listener);
        return () => {
            this.closeListeners.delete(listener);
        };
    }
    async close(error) {
        if (this.closed)
            return;
        this.closed = true;
        this.requests.close(error ?? new errors_1.CodexAppServerError("closed", "app-server transport closed", this.sessionId));
        try {
            await this.closeSink?.();
        }
        catch {
            // close is best-effort
        }
        const closeError = error ?? null;
        for (const listener of [...this.closeListeners]) {
            try {
                listener(closeError);
            }
            catch {
                // listener isolation
            }
        }
        this.notificationListeners.clear();
        this.serverRequestListeners.clear();
        this.closeListeners.clear();
    }
    /** Inbound dispatcher. Isolates listener exceptions. */
    handleInbound(message) {
        if (this.closed)
            return;
        if (this.inboundQueued >= this.maxInboundQueue) {
            void this.close(new errors_1.CodexAppServerError("internal", "inbound queue overflow", this.sessionId));
            return;
        }
        this.inboundQueued += 1;
        try {
            const kind = (0, protocol_1.classifyMessage)(message, "inbound");
            if (kind === "response") {
                if (message.id === undefined)
                    return;
                this.requests.settle(message.id, message);
                return;
            }
            if (kind === "notification") {
                for (const listener of [...this.notificationListeners]) {
                    try {
                        listener(message);
                    }
                    catch {
                        // isolate
                    }
                }
                return;
            }
            if (kind === "server-request") {
                if (this.serverRequestListeners.size === 0) {
                    void this.replyUnsupported(message);
                    return;
                }
                for (const listener of [...this.serverRequestListeners]) {
                    try {
                        const result = listener(message);
                        if (result && typeof result.then === "function") {
                            void result.catch(() => { });
                        }
                    }
                    catch {
                        // isolate
                    }
                }
                return;
            }
            void this.close(new errors_1.CodexAppServerError("malformed", "invalid inbound app-server message", this.sessionId));
        }
        finally {
            this.inboundQueued -= 1;
        }
    }
    async replyUnsupported(message) {
        if (message.id === undefined)
            return;
        try {
            await this.sendImpl({
                id: message.id,
                error: { code: -32601, message: "Method not found" },
            });
        }
        catch {
            void this.close(new errors_1.CodexAppServerError("unsupported", "unhandled server request", this.sessionId));
        }
    }
    assertOpen() {
        if (this.closed) {
            throw new errors_1.CodexAppServerError("closed", "app-server transport is closed", this.sessionId);
        }
    }
}
exports.AbstractAppServerTransport = AbstractAppServerTransport;
function encodeForStdio(message) {
    return `${(0, protocol_1.serializeAppServerMessage)(message)}\n`;
}
//# sourceMappingURL=transport.js.map