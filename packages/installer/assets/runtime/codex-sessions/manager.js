"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexSessionManager = void 0;
exports.stripCredentials = stripCredentials;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ids_1 = require("./ids");
const paths_1 = require("./paths");
// MS-2 may add transport/routing over these process primitives.
class CodexSessionManager {
    userRoot;
    launcher;
    now;
    log;
    stopTimeoutMs;
    killTimeoutMs;
    records = new Map();
    timers = new Set();
    constructor(options) {
        this.userRoot = options.userRoot;
        this.launcher = options.launcher;
        this.now = options.now ?? (() => new Date());
        this.log = options.log;
        this.stopTimeoutMs = options.stopTimeoutMs ?? 2000;
        this.killTimeoutMs = options.killTimeoutMs ?? 1000;
        this.loadFromDisk();
    }
    listSessions() {
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        return [...this.records.values()]
            .map((record) => cloneMetadata(record.metadata))
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    }
    getSession(id) {
        return cloneMetadata(this.require(id).metadata);
    }
    getSessionStatus(id) {
        const record = this.require(id);
        return {
            id: record.metadata.id,
            lifecycle: record.lifecycle,
            metadata: cloneMetadata(record.metadata),
        };
    }
    createSession(input = {}) {
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const id = input.id === undefined ? this.allocateId() : ((0, ids_1.assertSessionId)(input.id), input.id);
        if (this.records.has(id) || (0, node_fs_1.existsSync)((0, paths_1.sessionDir)(this.userRoot, id))) {
            throw new Error("session already exists");
        }
        const createdAt = this.isoNow();
        const metadata = {
            id,
            label: normalizeLabel(input.label),
            enabled: true,
            createdAt,
        };
        (0, paths_1.ensureSafeSessionLayout)(this.userRoot);
        const dir = (0, paths_1.sessionDir)(this.userRoot, id);
        try {
            (0, node_fs_1.mkdirSync)(dir);
        }
        catch (error) {
            const code = error.code;
            if (code === "EEXIST")
                throw new Error("session already exists");
            throw error;
        }
        (0, node_fs_1.mkdirSync)((0, paths_1.sessionCodexHome)(this.userRoot, id), { recursive: true });
        (0, node_fs_1.mkdirSync)((0, paths_1.sessionSqliteHome)(this.userRoot, id), { recursive: true });
        writeJsonAtomic((0, paths_1.sessionMetaPath)(this.userRoot, id), metadata);
        this.records.set(id, {
            metadata,
            lifecycle: "STOPPED",
            child: null,
            unsubExit: null,
            inFlight: null,
        });
        this.log?.("info", `created session ${id}`);
        return cloneMetadata(metadata);
    }
    renameSession(id, label) {
        const record = this.require(id);
        record.metadata.label = normalizeLabel(label);
        record.metadata.updatedAt = this.isoNow();
        this.persist(record);
        return cloneMetadata(record.metadata);
    }
    enableSession(id) {
        return this.setEnabled(id, true);
    }
    disableSession(id) {
        return this.setEnabled(id, false);
    }
    async removeSession(id, options = {}) {
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const record = this.require(id);
        if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING") {
            if (!options.forceStop) {
                throw new Error("session is running");
            }
            await this.stopSession(id);
        }
        this.detach(record);
        this.records.delete(id);
        (0, paths_1.rmSessionDir)(this.userRoot, id);
        this.log?.("info", `removed session ${id}`);
    }
    async startSession(id) {
        const record = this.require(id);
        if (!record.metadata.enabled)
            throw new Error("session is disabled");
        if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING") {
            throw new Error("session already starting/running");
        }
        if (record.lifecycle === "STOPPING")
            throw new Error("session is stopping");
        record.lifecycle = "STARTING";
        const work = this.launchRecord(record);
        record.inFlight = work;
        try {
            await work;
        }
        finally {
            if (record.inFlight === work)
                record.inFlight = null;
        }
        return this.getSessionStatus(id);
    }
    async stopSession(id) {
        const record = this.require(id);
        if (record.lifecycle === "STOPPED")
            return this.getSessionStatus(id);
        if (record.lifecycle === "FAILED" && !record.child)
            return this.getSessionStatus(id);
        if (record.lifecycle === "STOPPING" && record.inFlight) {
            await record.inFlight.catch(() => { });
            return this.getSessionStatus(id);
        }
        record.lifecycle = "STOPPING";
        const work = this.stopRecord(record);
        record.inFlight = work;
        try {
            await work;
        }
        finally {
            if (record.inFlight === work)
                record.inFlight = null;
        }
        return this.getSessionStatus(id);
    }
    async restartSession(id) {
        await this.stopSession(id);
        return this.startSession(id);
    }
    async shutdownAll(options = {}) {
        const timeoutMs = options.timeoutMs ?? this.stopTimeoutMs + this.killTimeoutMs;
        const live = [...this.records.values()].filter((record) => this.isLive(record));
        const stopping = Promise.all(live.map((record) => this.stopSession(record.metadata.id).catch(() => { })));
        await Promise.race([stopping, this.delay(timeoutMs)]);
        for (const record of this.records.values()) {
            this.detach(record);
            if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING") {
                record.lifecycle = "STOPPED";
            }
        }
        this.clearTimers();
    }
    hasLiveChildren() {
        for (const record of this.records.values()) {
            if (this.isLive(record))
                return true;
        }
        return false;
    }
    isLive(record) {
        return (record.child !== null ||
            record.lifecycle === "STARTING" ||
            record.lifecycle === "RUNNING" ||
            record.lifecycle === "STOPPING");
    }
    setEnabled(id, enabled) {
        const record = this.require(id);
        record.metadata.enabled = enabled;
        record.metadata.updatedAt = this.isoNow();
        this.persist(record);
        return cloneMetadata(record.metadata);
    }
    async launchRecord(record) {
        try {
            const child = await this.launcher.launch({
                sessionId: record.metadata.id,
                codexHome: (0, paths_1.sessionCodexHome)(this.userRoot, record.metadata.id),
                sqliteHome: (0, paths_1.sessionSqliteHome)(this.userRoot, record.metadata.id),
            });
            record.child = child;
            record.unsubExit = child.onExit((code, signal) => {
                this.onChildExit(record, code, signal);
            });
            record.lifecycle = "RUNNING";
            record.metadata.lastStartedAt = this.isoNow();
            record.metadata.updatedAt = record.metadata.lastStartedAt;
            this.persist(record);
        }
        catch (error) {
            record.lifecycle = "FAILED";
            record.child = null;
            record.unsubExit = null;
            record.metadata.lastExit = {
                at: this.isoNow(),
                code: null,
                signal: null,
                reason: "launch-failed",
            };
            record.metadata.updatedAt = record.metadata.lastExit.at;
            this.persist(record);
            throw error;
        }
    }
    async stopRecord(record) {
        const child = record.child;
        if (!child) {
            record.lifecycle = "STOPPED";
            record.metadata.lastStoppedAt = this.isoNow();
            record.metadata.updatedAt = record.metadata.lastStoppedAt;
            this.persist(record);
            return;
        }
        let exitCode = null;
        let exitSignal = null;
        const waitExit = new Promise((resolve) => {
            const unsub = child.onExit((code, signal) => {
                exitCode = code;
                exitSignal = signal;
                unsub();
                resolve();
            });
        });
        child.kill("SIGTERM");
        const termExited = await this.waitWithTimeout(waitExit, this.stopTimeoutMs);
        if (!termExited) {
            child.kill("SIGKILL");
            await this.waitWithTimeout(waitExit, this.killTimeoutMs);
        }
        this.detach(record);
        record.lifecycle = "STOPPED";
        record.metadata.lastStoppedAt = this.isoNow();
        record.metadata.lastExit = {
            at: record.metadata.lastStoppedAt,
            code: exitCode,
            signal: exitSignal,
            reason: "requested",
        };
        record.metadata.updatedAt = record.metadata.lastStoppedAt;
        this.persist(record);
    }
    onChildExit(record, code, signal) {
        if (record.lifecycle === "STOPPING")
            return;
        if (record.lifecycle !== "RUNNING" && record.lifecycle !== "STARTING")
            return;
        this.detach(record);
        record.lifecycle = "FAILED";
        record.metadata.lastExit = {
            at: this.isoNow(),
            code,
            signal,
            reason: "unexpected",
        };
        record.metadata.updatedAt = record.metadata.lastExit.at;
        this.persist(record);
        this.log?.("warn", `session ${record.metadata.id} exited unexpectedly`);
    }
    detach(record) {
        record.unsubExit?.();
        record.unsubExit = null;
        if (record.child) {
            try {
                record.child.kill("SIGKILL");
            }
            catch { }
            record.child = null;
        }
    }
    require(id) {
        (0, ids_1.assertSessionId)(id);
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const record = this.records.get(id);
        if (!record)
            throw new Error(`unknown session: ${id}`);
        return record;
    }
    allocateId() {
        const layout = (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        for (let i = 0; i < 8; i++) {
            const id = (0, ids_1.generateSessionId)();
            if (!this.records.has(id) && !(0, node_fs_1.existsSync)((0, node_path_1.join)(layout.realAccountsRoot, id)))
                return id;
        }
        throw new Error("failed to allocate session id");
    }
    persist(record) {
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        writeJsonAtomic((0, paths_1.sessionMetaPath)(this.userRoot, record.metadata.id), record.metadata);
    }
    loadFromDisk() {
        const layout = (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const root = layout.realAccountsRoot;
        if (!(0, node_fs_1.existsSync)(root))
            return;
        let entries = [];
        try {
            entries = (0, node_fs_1.readdirSync)(root);
        }
        catch {
            return;
        }
        for (const name of entries) {
            if (!(0, ids_1.isSessionId)(name))
                continue;
            try {
                const metaPath = (0, paths_1.sessionMetaPath)(this.userRoot, name);
                if (!(0, node_fs_1.existsSync)(metaPath))
                    continue;
                const raw = JSON.parse((0, node_fs_1.readFileSync)(metaPath, "utf8"));
                const metadata = stripCredentials(raw, name);
                this.records.set(name, {
                    metadata,
                    lifecycle: "STOPPED",
                    child: null,
                    unsubExit: null,
                    inFlight: null,
                });
            }
            catch (error) {
                this.log?.("warn", `failed to load session ${name}`);
            }
        }
    }
    isoNow() {
        return this.now().toISOString();
    }
    delay(ms) {
        return new Promise((resolve) => {
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                resolve();
            }, ms);
            this.timers.add(timer);
        });
    }
    async waitWithTimeout(promise, timeoutMs) {
        let settled = false;
        const timeout = this.delay(timeoutMs).then(() => {
            if (settled)
                return false;
            return false;
        });
        const winner = await Promise.race([
            promise.then(() => {
                settled = true;
                return true;
            }),
            timeout,
        ]);
        return winner;
    }
    clearTimers() {
        for (const timer of this.timers)
            clearTimeout(timer);
        this.timers.clear();
    }
}
exports.CodexSessionManager = CodexSessionManager;
function normalizeLabel(label) {
    if (label === undefined || label === null)
        return "";
    if (typeof label !== "string")
        throw new Error("session label must be a string");
    return label.slice(0, 200);
}
function cloneMetadata(metadata) {
    return {
        ...metadata,
        ...(metadata.lastExit ? { lastExit: { ...metadata.lastExit } } : {}),
    };
}
function stripCredentials(raw, fallbackId) {
    const rec = isRecord(raw) ? raw : {};
    const lastExitRaw = isRecord(rec.lastExit) ? rec.lastExit : undefined;
    let reason = "unexpected";
    if (lastExitRaw &&
        (lastExitRaw.reason === "requested" ||
            lastExitRaw.reason === "unexpected" ||
            lastExitRaw.reason === "launch-failed")) {
        reason = lastExitRaw.reason;
    }
    const lastExit = lastExitRaw
        ? {
            at: typeof lastExitRaw.at === "string" ? lastExitRaw.at : new Date(0).toISOString(),
            code: typeof lastExitRaw.code === "number" ? lastExitRaw.code : null,
            signal: typeof lastExitRaw.signal === "string" ? lastExitRaw.signal : null,
            reason,
        }
        : undefined;
    const metadata = {
        id: fallbackId,
        label: typeof rec.label === "string" ? rec.label : "",
        enabled: rec.enabled !== false,
        createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date(0).toISOString(),
    };
    if (typeof rec.updatedAt === "string")
        metadata.updatedAt = rec.updatedAt;
    if (typeof rec.lastStartedAt === "string")
        metadata.lastStartedAt = rec.lastStartedAt;
    if (typeof rec.lastStoppedAt === "string")
        metadata.lastStoppedAt = rec.lastStoppedAt;
    if (lastExit)
        metadata.lastExit = lastExit;
    return metadata;
}
function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function writeJsonAtomic(filePath, data) {
    const dir = (0, node_path_1.dirname)(filePath);
    (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    const tmp = (0, node_path_1.join)(dir, `.${(0, node_path_1.basename)(filePath)}.${process.pid}.tmp`);
    (0, node_fs_1.writeFileSync)(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    try {
        (0, node_fs_1.renameSync)(tmp, filePath);
    }
    catch {
        try {
            (0, node_fs_1.unlinkSync)(filePath);
        }
        catch { }
        (0, node_fs_1.renameSync)(tmp, filePath);
    }
}
//# sourceMappingURL=manager.js.map