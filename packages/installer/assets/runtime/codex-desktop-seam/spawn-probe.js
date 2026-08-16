"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexDesktopSpawnProbe = void 0;
const node_fs_1 = require("node:fs");
const candidate_1 = require("./candidate");
const status_1 = require("./status");
const HOOK_MARK = Symbol.for("codexpp.desktopAppServerSpawnProbe");
const MAX_DIAGNOSTICS = 32;
class CodexDesktopSpawnProbe {
    spawnModule;
    env;
    trustedRoots;
    log;
    onInstallError;
    platform;
    version;
    now;
    io;
    status = (0, status_1.emptyDesktopSpawnSeamStatus)();
    diagnostics = [];
    originalSpawn = null;
    wrapped = null;
    inHook = false;
    constructor(options) {
        this.spawnModule = options.spawnModule;
        this.env = options.env;
        this.trustedRoots = options.trustedRoots;
        this.log = options.log;
        this.onInstallError = options.onInstallError;
        this.platform = options.platform ?? process.platform;
        this.version = options.version ?? "1.1.4";
        this.now = options.now ?? (() => new Date().toISOString());
        this.io = options.io ?? { realpathSync: node_fs_1.realpathSync };
        this.status.enabled = (0, candidate_1.isAppServerProbeEnabled)(this.env);
    }
    getStatus() {
        return { ...this.status };
    }
    getDiagnostics() {
        return this.diagnostics.slice();
    }
    install() {
        try {
            this.status.enabled = (0, candidate_1.isAppServerProbeEnabled)(this.env);
            if (!this.status.enabled) {
                this.status.hookInstalled = false;
                this.status.spawnApi = null;
                this.status.hookInstallError = null;
                return;
            }
            const current = this.readSpawn();
            if (this.wrapped && current === this.wrapped) {
                this.status.hookInstalled = true;
                this.status.spawnApi = "child_process.spawn";
                this.status.hookInstallError = null;
                return;
            }
            if (typeof current !== "function") {
                this.failClosed();
                return;
            }
            if (this.isMarked(current) && current !== this.wrapped) {
                this.failClosed();
                return;
            }
            const original = current;
            const wrapped = this.makeWrapped(original);
            this.originalSpawn = original;
            this.wrapped = wrapped;
            if (!this.assignSpawn(wrapped) || this.readSpawn() !== wrapped) {
                this.tryRestore(original);
                this.wrapped = null;
                this.failClosed();
                return;
            }
            this.status.hookInstalled = true;
            this.status.spawnApi = "child_process.spawn";
            this.status.hookInstallError = null;
        }
        catch {
            this.failClosed();
        }
    }
    /**
     * Internal test restore. Restores only if `.spawn` is still this probe's wrapper.
     * A stale instance must not overwrite a newer wrapper.
     */
    uninstall() {
        if (!this.wrapped || !this.originalSpawn)
            return false;
        if (this.readSpawn() !== this.wrapped)
            return false;
        const original = this.originalSpawn;
        if (!this.assignSpawn(original) || this.readSpawn() !== original)
            return false;
        this.wrapped = null;
        this.status.hookInstalled = false;
        this.status.spawnApi = null;
        this.status.hookInstallError = null;
        return true;
    }
    makeWrapped(original) {
        const probe = this;
        const wrapped = function desktopSpawnProbe(...args) {
            if (probe.inHook) {
                return Function.prototype.apply.call(original, this, args);
            }
            probe.inHook = true;
            try {
                try {
                    probe.observe(args);
                }
                catch {
                    // Classification must never block or alter the original spawn.
                }
                return Function.prototype.apply.call(original, this, args);
            }
            finally {
                probe.inHook = false;
            }
        };
        wrapped[HOOK_MARK] = true;
        return wrapped;
    }
    readSpawn() {
        try {
            return this.spawnModule.spawn;
        }
        catch {
            return undefined;
        }
    }
    assignSpawn(value) {
        try {
            this.spawnModule.spawn = value;
            return true;
        }
        catch {
            return false;
        }
    }
    tryRestore(original) {
        try {
            if (this.readSpawn() === this.wrapped)
                this.assignSpawn(original);
        }
        catch {
            // Best-effort restore only.
        }
    }
    isMarked(value) {
        return typeof value === "function" && Boolean(value[HOOK_MARK]);
    }
    failClosed() {
        this.status.hookInstalled = false;
        this.status.spawnApi = null;
        this.status.hookInstallError = "spawn-hook-unavailable";
        try {
            this.onInstallError?.("spawn-hook-unavailable");
        }
        catch {
            // Logging must never abort Layer boot.
        }
    }
    observe(callArgs) {
        const classified = (0, candidate_1.classifySpawnCall)({
            callArgs,
            trustedRoots: this.trustedRoots() ?? [],
            platform: this.platform,
            io: this.io,
        });
        (0, status_1.recordObservation)(this.status, {
            trustedExecutable: classified.trustedExecutable,
            appServerSubcommand: classified.appServerSubcommand,
            candidate: classified.candidate,
            transportMode: classified.transportMode,
            spawnApi: "child_process.spawn",
        });
        const observation = {
            timestamp: this.now(),
            processApi: "child_process.spawn",
            candidate: classified.candidate,
            executableBasename: classified.executableBasename,
            trustedResourceRoot: classified.trustedExecutable,
            relativeResourcePath: classified.relativeResourcePath,
            appServerSubcommand: classified.appServerSubcommand,
            transportMode: classified.transportMode,
            argumentCount: classified.argumentCount,
            platform: this.platform,
            layerVersion: this.version,
        };
        this.diagnostics.push(observation);
        if (this.diagnostics.length > MAX_DIAGNOSTICS)
            this.diagnostics.shift();
        this.log?.(observation);
    }
}
exports.CodexDesktopSpawnProbe = CodexDesktopSpawnProbe;
//# sourceMappingURL=spawn-probe.js.map