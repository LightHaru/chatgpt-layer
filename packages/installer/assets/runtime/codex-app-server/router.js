"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexSessionRouter = void 0;
const ids_1 = require("../codex-sessions/ids");
const errors_1 = require("./errors");
const thread_id_1 = require("./thread-id");
const types_1 = require("./types");
/**
 * SIMPLE sticky-thread policy. No quota scoring, no Smart Routing, no
 * failover migration (thread/read → thread/resume). Ownership is persisted
 * only after a successful new-thread (or explicit recordThreadOwner).
 */
class CodexSessionRouter {
    registry;
    owners;
    selectSession;
    requestTimeoutMs;
    constructor(options) {
        this.registry = options.registry;
        this.owners = options.owners;
        this.selectSession = options.selectSession;
        this.requestTimeoutMs = options.requestTimeoutMs;
    }
    async routeNewThread(input = {}) {
        const sessionId = this.resolveNewSession(input.sessionId);
        const transport = this.requireTransport(sessionId);
        const response = await transport.request(types_1.METHOD_THREAD_START, input.params ?? {}, {
            timeoutMs: this.requestTimeoutMs,
        });
        const threadId = (0, thread_id_1.extractThreadIdFromResult)(response.result);
        if (!threadId) {
            return { sessionId, threadId: null, response, ownerPersisted: false };
        }
        this.owners.setOwner(threadId, sessionId, { overwrite: false });
        return { sessionId, threadId, response, ownerPersisted: true };
    }
    async routeExistingThread(input) {
        const threadId = input.threadId ?? (0, thread_id_1.extractThreadIdFromParams)(input.params);
        if (threadId && !(0, thread_id_1.isUsableThreadId)(threadId)) {
            throw new errors_1.CodexAppServerError("invalid-id", "malformed thread id");
        }
        const owner = threadId ? this.owners.getOwner(threadId) : null;
        let sessionId = null;
        if (owner) {
            if (this.registry.get(owner)) {
                sessionId = owner;
            }
            else if (input.fallbackSessionId) {
                (0, ids_1.assertSessionId)(input.fallbackSessionId);
                sessionId = input.fallbackSessionId;
                // Explicit fallback does NOT migrate ownership.
            }
            else {
                throw new errors_1.CodexAppServerError("unavailable", `owner session ${owner} has no live transport`, owner);
            }
        }
        else if (input.fallbackSessionId) {
            (0, ids_1.assertSessionId)(input.fallbackSessionId);
            sessionId = input.fallbackSessionId;
        }
        else {
            throw new errors_1.CodexAppServerError("fallback-required", "unknown thread owner requires an explicit fallback session");
        }
        const transport = this.requireTransport(sessionId);
        const response = await transport.request(input.method, input.params ?? {}, {
            timeoutMs: this.requestTimeoutMs,
        });
        return { sessionId, threadId: threadId ?? null, response, ownerPersisted: false };
    }
    recordThreadOwner(threadId, sessionId, overwrite = false) {
        this.owners.setOwner(threadId, sessionId, { overwrite });
    }
    maybeRecordFromNotification(sessionId, method, params) {
        if (method !== "thread/started")
            return null;
        const threadId = (0, thread_id_1.extractThreadIdFromNotification)(params);
        if (!threadId)
            return null;
        const existing = this.owners.getOwner(threadId);
        if (existing && existing !== sessionId)
            return existing;
        if (!existing)
            this.owners.setOwner(threadId, sessionId, { overwrite: false });
        return threadId;
    }
    maybeRecordFromSuccess(method, sessionId, result) {
        if (!types_1.OWNER_RECORDING_METHODS.includes(method))
            return null;
        const threadId = (0, thread_id_1.extractThreadIdFromResult)(result);
        if (!threadId)
            return null;
        this.owners.setOwner(threadId, sessionId, { overwrite: false });
        return threadId;
    }
    resolveNewSession(sessionId) {
        if (sessionId) {
            (0, ids_1.assertSessionId)(sessionId);
            return sessionId;
        }
        const selected = this.selectSession?.() ?? null;
        if (!selected) {
            throw new errors_1.CodexAppServerError("fallback-required", "new thread requires a target session");
        }
        (0, ids_1.assertSessionId)(selected);
        return selected;
    }
    requireTransport(sessionId) {
        (0, ids_1.assertSessionId)(sessionId);
        const transport = this.registry.get(sessionId);
        if (!transport) {
            throw new errors_1.CodexAppServerError("unavailable", `no live app-server transport for ${sessionId}`, sessionId);
        }
        return transport;
    }
}
exports.CodexSessionRouter = CodexSessionRouter;
//# sourceMappingURL=router.js.map