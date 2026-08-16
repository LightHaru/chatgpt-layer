"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexSessionTransportRegistry = void 0;
const paths_1 = require("../codex-sessions/paths");
const errors_1 = require("./errors");
const handshake_1 = require("./handshake");
/**
 * sessionId → live transport. Only RUNNING sessions. Failures isolate to
 * that session. Production launcher is fail-closed.
 */
class CodexSessionTransportRegistry {
    userRoot;
    launcher;
    sessionManager;
    initializeParams;
    initializeTimeoutMs;
    records = new Map();
    closed = false;
    constructor(options) {
        this.userRoot = options.userRoot;
        this.launcher = options.launcher;
        this.sessionManager = options.sessionManager;
        this.initializeParams = options.initializeParams ?? {};
        this.initializeTimeoutMs = options.initializeTimeoutMs;
    }
    get(sessionId) {
        return this.records.get(sessionId)?.transport;
    }
    getRecord(sessionId) {
        const record = this.records.get(sessionId);
        return record ? { ...record } : undefined;
    }
    listReadySessionIds() {
        return [...this.records.values()].filter((record) => record.ready).map((record) => record.sessionId);
    }
    /**
     * TEST-ONLY: attach an already-constructed transport. Still requires RUNNING.
     */
    attach(sessionId, transport, ready = true) {
        this.assertOpen();
        this.assertRunning(sessionId);
        if (this.records.has(sessionId)) {
            throw new errors_1.CodexAppServerError("already-attached", "session already has a transport", sessionId);
        }
        this.bind(sessionId, transport, ready, this.initializeParams, undefined);
    }
    async start(sessionId) {
        this.assertOpen();
        this.assertRunning(sessionId);
        if (this.records.has(sessionId)) {
            throw new errors_1.CodexAppServerError("already-attached", "session already has a transport", sessionId);
        }
        this.sessionManager.getSessionStatus(sessionId);
        const transport = await this.launcher.launchAppServer({
            sessionId,
            codexHome: (0, paths_1.sessionCodexHome)(this.userRoot, sessionId),
            sqliteHome: (0, paths_1.sessionSqliteHome)(this.userRoot, sessionId),
        });
        try {
            const handshake = await (0, handshake_1.performInitializeHandshake)(transport, this.initializeParams, this.initializeTimeoutMs);
            this.bind(sessionId, transport, true, handshake.params, handshake.result);
            return this.records.get(sessionId);
        }
        catch (error) {
            await transport.close(error instanceof Error ? error : new errors_1.CodexAppServerError("protocol", String(error), sessionId));
            throw error;
        }
    }
    /**
     * Reject new work, close transport. Does not stop the MS-1 child itself.
     */
    async stop(sessionId) {
        const record = this.records.get(sessionId);
        if (!record)
            return;
        this.records.delete(sessionId);
        await record.transport.close(new errors_1.CodexAppServerError("closed", "session transport stopped", sessionId));
    }
    async closeAll() {
        this.closed = true;
        const records = [...this.records.values()];
        this.records.clear();
        await Promise.all(records.map((record) => record.transport.close(new errors_1.CodexAppServerError("closed", "app-server registry closed", record.sessionId))));
    }
    bind(sessionId, transport, ready, initializeParams, initializeResult) {
        transport.onClose(() => {
            this.records.delete(sessionId);
        });
        this.records.set(sessionId, {
            sessionId,
            transport,
            ready,
            initializeParams,
            initializeResult,
        });
    }
    assertRunning(sessionId) {
        const status = this.sessionManager.getSessionStatus(sessionId);
        if (status.lifecycle !== "RUNNING") {
            throw new errors_1.CodexAppServerError("session-not-running", `session ${sessionId} is ${status.lifecycle}, transport requires RUNNING`, sessionId);
        }
    }
    assertOpen() {
        if (this.closed) {
            throw new errors_1.CodexAppServerError("closed", "app-server registry is closed");
        }
    }
}
exports.CodexSessionTransportRegistry = CodexSessionTransportRegistry;
//# sourceMappingURL=registry.js.map