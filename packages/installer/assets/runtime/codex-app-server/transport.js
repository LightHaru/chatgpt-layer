"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractAppServerTransport = void 0;
exports.encodeForStdio = encodeForStdio;
const errors_1 = require("./errors");
const framing_1 = require("./framing");
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
    serverRequestHandler = null;
    closeListeners = new Set();
    maxInboundQueue;
    maxServerRequestsInFlight;
    inboundQueued = 0;
    serverRequestsInFlight = 0;
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
        this.maxServerRequestsInFlight = options.maxServerRequestsInFlight ?? types_1.MAX_SERVER_REQUESTS_IN_FLIGHT;
        this.sendImpl = options.send;
        this.closeSink = options.closeSink;
    }
    get isClosed() {
        return this.closed;
    }
    get inFlightServerRequests() {
        return this.serverRequestsInFlight;
    }
    async request(method, params, options = {}) {
        this.assertOpen();
        const id = this.requests.allocateId();
        const message = { id, method, params };
        (0, framing_1.assertOutboundMessage)(message);
        const pending = this.requests.expect(id, options.timeoutMs);
        // Await the correlation promise immediately so a timeout or send failure
        // cannot reject `pending` while nobody is listening (unhandledRejection).
        void Promise.resolve()
            .then(() => this.sendImpl(message))
            .then(() => undefined, (error) => {
            const wrapped = error instanceof Error ? error : new errors_1.CodexAppServerError("internal", String(error), this.sessionId);
            this.requests.fail(id, wrapped);
            void this.close(wrapped);
        });
        const response = await pending;
        if (response.error) {
            throw new errors_1.CodexAppServerError("protocol", response.error.message, this.sessionId);
        }
        return { id: response.id ?? id, result: response.result, extra: response.extra };
    }
    async notify(method, params) {
        this.assertOpen();
        const message = { method, params };
        (0, framing_1.assertOutboundMessage)(message);
        try {
            await this.sendImpl(message);
        }
        catch (error) {
            const wrapped = error instanceof Error ? error : new errors_1.CodexAppServerError("internal", String(error), this.sessionId);
            void this.close(wrapped);
            throw wrapped;
        }
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
    onServerRequest(handler) {
        if (this.serverRequestHandler) {
            throw new errors_1.CodexAppServerError("internal", "server request handler already set");
        }
        this.serverRequestHandler = handler;
        return () => {
            if (this.serverRequestHandler === handler)
                this.serverRequestHandler = null;
        };
    }
    setServerRequestHandler(handler) {
        this.serverRequestHandler = handler;
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
        this.serverRequestHandler = null;
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
                void this.dispatchServerRequest(message);
                return;
            }
            void this.close(new errors_1.CodexAppServerError("malformed", "invalid inbound app-server message", this.sessionId));
        }
        finally {
            this.inboundQueued -= 1;
        }
    }
    async dispatchServerRequest(message) {
        if (this.closed || message.id === undefined)
            return;
        if (this.serverRequestsInFlight >= this.maxServerRequestsInFlight) {
            await this.sendServerResponse(message.id, {
                error: { code: -32000, message: "too many in-flight server requests" },
            });
            return;
        }
        this.serverRequestsInFlight += 1;
        try {
            const handler = this.serverRequestHandler;
            if (!handler) {
                await this.sendServerResponse(message.id, {
                    error: { code: -32601, message: "Method not found" },
                });
                return;
            }
            let outcome;
            try {
                outcome = await handler(message);
            }
            catch {
                outcome = { error: { code: -32603, message: "Internal error" } };
            }
            if (outcome && typeof outcome === "object" && "error" in outcome && outcome.error) {
                await this.sendServerResponse(message.id, { error: outcome.error });
            }
            else {
                await this.sendServerResponse(message.id, { result: outcome?.result });
            }
        }
        finally {
            this.serverRequestsInFlight -= 1;
        }
    }
    async sendServerResponse(id, body) {
        if (id === undefined || this.closed)
            return;
        const message = { id, ...body };
        try {
            (0, framing_1.assertOutboundMessage)(message);
            await this.sendImpl(message);
        }
        catch (error) {
            const wrapped = error instanceof Error ? error : new errors_1.CodexAppServerError("internal", String(error), this.sessionId);
            void this.close(wrapped);
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
    return (0, framing_1.assertOutboundMessage)(message);
}
//# sourceMappingURL=transport.js.map