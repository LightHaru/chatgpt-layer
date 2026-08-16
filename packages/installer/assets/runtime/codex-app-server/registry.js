"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexSessionTransportRegistry = void 0;
const ids_1 = require("../codex-sessions/ids");
const errors_1 = require("./errors");
const handshake_1 = require("./handshake");
/**
 * sessionId → live transport.
 *
 * Attach-only. Does not spawn a Codex child and does not require an MS-1
 * lifecycle child to already be RUNNING. One session owns at most one
 * transport; a future unified MS-2B process supplies both lifecycle and
 * stdio. Production invocation stays BLOCKED outside this registry.
 *
 * Ownership:
 * - Before the registry accepts a transport (mismatch, duplicate, in-progress):
 *   reject without closing or rewriting that transport.
 * - After reservation / bind: the registry owns registration lifecycle and
 *   closes the transport on handshake failure, stop, or closeAll.
 */
class CodexSessionTransportRegistry {
    sessionManager;
    initializeParams;
    initializeTimeoutMs;
    records = new Map();
    attaching = new Set();
    closed = false;
    constructor(options) {
        void options.userRoot;
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
     * Register a transport that already belongs to this session.
     * Tests inject fakes/fixtures. Does not launch a process.
     */
    attach(sessionId, transport, ready = true) {
        this.assertOpen();
        this.assertKnownSession(sessionId);
        this.assertTransportIdentity(sessionId, transport);
        this.assertNotOccupied(sessionId);
        this.bind(sessionId, transport, ready, this.initializeParams, undefined);
    }
    /**
     * Attach then run initialize / initialized on that same transport.
     * Still does not spawn a child. Handshake runs only after identity checks
     * and an exclusive reservation.
     */
    async attachAndInitialize(sessionId, transport) {
        this.assertOpen();
        this.assertKnownSession(sessionId);
        this.assertTransportIdentity(sessionId, transport);
        this.assertNotOccupied(sessionId);
        this.attaching.add(sessionId);
        try {
            const handshake = await (0, handshake_1.performInitializeHandshake)(transport, this.initializeParams, this.initializeTimeoutMs);
            if (this.closed) {
                await transport.close(new errors_1.CodexAppServerError("closed", "app-server registry closed", sessionId));
                throw new errors_1.CodexAppServerError("closed", "app-server registry closed", sessionId);
            }
            this.assertNotBound(sessionId);
            this.bind(sessionId, transport, true, handshake.params, handshake.result);
            return this.records.get(sessionId);
        }
        catch (error) {
            if (this.records.get(sessionId)?.transport !== transport) {
                await transport.close(error instanceof Error ? error : new errors_1.CodexAppServerError("protocol", String(error), sessionId));
            }
            throw error;
        }
        finally {
            this.attaching.delete(sessionId);
        }
    }
    /**
     * Reject new work, close transport. Does not stop any MS-1 lifecycle child.
     * Future MS-2B: stop is one operation on the unified session process.
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
            const current = this.records.get(sessionId);
            if (current?.transport === transport) {
                this.records.delete(sessionId);
            }
        });
        this.records.set(sessionId, {
            sessionId,
            transport,
            ready,
            initializeParams,
            initializeResult,
        });
    }
    assertKnownSession(sessionId) {
        (0, ids_1.assertSessionId)(sessionId);
        this.sessionManager.getSessionStatus(sessionId);
    }
    assertTransportIdentity(sessionId, transport) {
        if (transport.sessionId !== sessionId) {
            throw new errors_1.CodexAppServerError("session-mismatch", `transport session ${transport.sessionId} does not match registry session ${sessionId}`, sessionId);
        }
    }
    assertNotOccupied(sessionId) {
        if (this.records.has(sessionId)) {
            throw new errors_1.CodexAppServerError("already-attached", "session already has a transport", sessionId);
        }
        if (this.attaching.has(sessionId)) {
            throw new errors_1.CodexAppServerError("attach-in-progress", "session attach already in progress", sessionId);
        }
    }
    assertNotBound(sessionId) {
        if (this.records.has(sessionId)) {
            throw new errors_1.CodexAppServerError("already-attached", "session already has a transport", sessionId);
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