"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InProcessAppServerTransport = exports.FakeAppServer = void 0;
exports.createFakeTransport = createFakeTransport;
const errors_1 = require("./errors");
const transport_1 = require("./transport");
const types_1 = require("./types");
/**
 * In-process fake Codex app-server. No network, no ~/.codex, no real auth.
 */
class FakeAppServer {
    sessionId;
    initialized = false;
    initParams;
    seq = 0;
    crashed = false;
    onRequest;
    onNotify;
    threadIdPrefix;
    startedThreadIds = [];
    constructor(options) {
        this.sessionId = options.sessionId;
        this.onRequest = options.onRequest;
        this.onNotify = options.onNotify;
        this.threadIdPrefix = options.threadIdPrefix ?? `thread_${options.sessionId.slice(-8)}_`;
    }
    get didInitialize() {
        return this.initialized;
    }
    get lastInitializeParams() {
        return this.initParams;
    }
    get isCrashed() {
        return this.crashed;
    }
    crash() {
        this.crashed = true;
    }
    async handle(message) {
        if (this.crashed)
            throw new errors_1.CodexAppServerError("child-exit", "fake app-server crashed", this.sessionId);
        if (message.method && message.id === undefined) {
            this.onNotify?.(message.method, message.params);
            if (message.method === types_1.METHOD_INITIALIZED)
                this.initialized = true;
            return [];
        }
        if (!message.method || message.id === undefined) {
            return [{ id: message.id, error: { code: -32600, message: "Invalid Request" } }];
        }
        const custom = this.onRequest ? await this.onRequest(message.method, message.params, message.id) : undefined;
        if (custom)
            return this.materialize(message, custom);
        return this.materialize(message, this.defaultHandle(message.method, message.params));
    }
    defaultHandle(method, params) {
        if (method === types_1.METHOD_INITIALIZE) {
            this.initParams = params;
            return { result: { protocolVersion: "test", sessionId: this.sessionId } };
        }
        if (method === types_1.METHOD_THREAD_START) {
            this.seq += 1;
            const threadId = `${this.threadIdPrefix}${this.seq}`;
            this.startedThreadIds.push(threadId);
            return {
                result: { thread: { id: threadId } },
                notification: { method: types_1.METHOD_THREAD_STARTED, params: { thread: { id: threadId } } },
            };
        }
        if (method === types_1.METHOD_THREAD_READ) {
            const threadId = threadIdFrom(params);
            return {
                result: {
                    thread: { id: threadId, path: `/tmp/fake/${threadId}.jsonl`, cwd: "/tmp", modelProvider: "test" },
                },
            };
        }
        if (method === types_1.METHOD_TURN_START) {
            this.seq += 1;
            return { result: { turn: { id: `turn_${this.seq}` } } };
        }
        return { error: { code: -32601, message: `Method not found: ${method}` } };
    }
    async materialize(request, result) {
        if ("delayMs" in result) {
            await delay(result.delayMs);
            return this.materialize(request, result.then);
        }
        if ("crash" in result) {
            this.crashed = true;
            throw new errors_1.CodexAppServerError("child-exit", "fake app-server crashed", this.sessionId);
        }
        if ("malformed" in result) {
            throw new errors_1.CodexAppServerError("malformed", result.malformed, this.sessionId);
        }
        const outbound = [];
        if ("notification" in result && result.notification)
            outbound.push(result.notification);
        if ("error" in result && result.error) {
            outbound.push({ id: request.id, error: result.error });
            return outbound;
        }
        const extra = "extra" in result ? result.extra : undefined;
        outbound.unshift({
            id: request.id,
            result: "result" in result ? result.result : {},
            extra,
        });
        return outbound;
    }
}
exports.FakeAppServer = FakeAppServer;
class InProcessAppServerTransport extends transport_1.AbstractAppServerTransport {
    server;
    constructor(server, timeoutMs) {
        super({
            sessionId: server.sessionId,
            timeoutMs,
            send: (message) => this.dispatch(message),
        });
        this.server = server;
    }
    async dispatch(message) {
        let outbound;
        try {
            outbound = await this.server.handle(message);
        }
        catch (error) {
            await this.close(error instanceof Error ? error : new errors_1.CodexAppServerError("child-exit", String(error), this.sessionId));
            throw error;
        }
        for (const item of outbound)
            this.handleInbound(item);
    }
}
exports.InProcessAppServerTransport = InProcessAppServerTransport;
function createFakeTransport(sessionId, options = {}) {
    return new InProcessAppServerTransport(new FakeAppServer({ ...options, sessionId }), options.timeoutMs);
}
function threadIdFrom(params) {
    if (params && typeof params === "object" && !Array.isArray(params)) {
        const rec = params;
        if (typeof rec.threadId === "string")
            return rec.threadId;
        if (typeof rec.thread_id === "string")
            return rec.thread_id;
    }
    return "thread_unknown";
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=fake-transport.js.map