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
    platform;
    version;
    now;
    io;
    status = (0, status_1.emptyDesktopSpawnSeamStatus)();
    diagnostics = [];
    originalSpawn = null;
    inHook = false;
    constructor(options) {
        this.spawnModule = options.spawnModule;
        this.env = options.env;
        this.trustedRoots = options.trustedRoots;
        this.log = options.log;
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
        this.status.enabled = (0, candidate_1.isAppServerProbeEnabled)(this.env);
        if (!this.status.enabled) {
            this.status.hookInstalled = false;
            this.status.spawnApi = null;
            return;
        }
        const current = this.spawnModule.spawn;
        if (current?.[HOOK_MARK]) {
            this.status.hookInstalled = true;
            this.status.spawnApi = "child_process.spawn";
            return;
        }
        if (this.originalSpawn) {
            this.status.hookInstalled = true;
            this.status.spawnApi = "child_process.spawn";
            return;
        }
        const original = this.spawnModule.spawn;
        this.originalSpawn = original;
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
        this.spawnModule.spawn = wrapped;
        this.status.hookInstalled = true;
        this.status.spawnApi = "child_process.spawn";
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