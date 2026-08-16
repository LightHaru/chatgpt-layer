"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodexDesktopSpawnProbe = exports.emptyDesktopSpawnSeamStatus = exports.skipConfigPrefixes = exports.resolveTrustedCommandPath = exports.looksLikeCodexRuntimeBasename = exports.isPathInsideRoot = exports.isAppServerProbeEnabled = exports.extractSpawnCommandAndArgv = exports.detectStdioTransport = exports.detectAppServerSubcommand = exports.commandBasename = exports.classifySpawnCall = exports.asStringArgv = exports.UPSTREAM_APP_SERVER_STDIO_SHORTHAND = exports.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED = exports.APP_SERVER_PROBE_ENV = void 0;
exports.installDesktopAppServerSpawnProbe = installDesktopAppServerSpawnProbe;
exports.getDesktopSpawnSeamStatus = getDesktopSpawnSeamStatus;
exports.collectDesktopTrustedRoots = collectDesktopTrustedRoots;
var types_1 = require("./types");
Object.defineProperty(exports, "APP_SERVER_PROBE_ENV", { enumerable: true, get: function () { return types_1.APP_SERVER_PROBE_ENV; } });
Object.defineProperty(exports, "UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED", { enumerable: true, get: function () { return types_1.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED; } });
Object.defineProperty(exports, "UPSTREAM_APP_SERVER_STDIO_SHORTHAND", { enumerable: true, get: function () { return types_1.UPSTREAM_APP_SERVER_STDIO_SHORTHAND; } });
var candidate_1 = require("./candidate");
Object.defineProperty(exports, "asStringArgv", { enumerable: true, get: function () { return candidate_1.asStringArgv; } });
Object.defineProperty(exports, "classifySpawnCall", { enumerable: true, get: function () { return candidate_1.classifySpawnCall; } });
Object.defineProperty(exports, "commandBasename", { enumerable: true, get: function () { return candidate_1.commandBasename; } });
Object.defineProperty(exports, "detectAppServerSubcommand", { enumerable: true, get: function () { return candidate_1.detectAppServerSubcommand; } });
Object.defineProperty(exports, "detectStdioTransport", { enumerable: true, get: function () { return candidate_1.detectStdioTransport; } });
Object.defineProperty(exports, "extractSpawnCommandAndArgv", { enumerable: true, get: function () { return candidate_1.extractSpawnCommandAndArgv; } });
Object.defineProperty(exports, "isAppServerProbeEnabled", { enumerable: true, get: function () { return candidate_1.isAppServerProbeEnabled; } });
Object.defineProperty(exports, "isPathInsideRoot", { enumerable: true, get: function () { return candidate_1.isPathInsideRoot; } });
Object.defineProperty(exports, "looksLikeCodexRuntimeBasename", { enumerable: true, get: function () { return candidate_1.looksLikeCodexRuntimeBasename; } });
Object.defineProperty(exports, "resolveTrustedCommandPath", { enumerable: true, get: function () { return candidate_1.resolveTrustedCommandPath; } });
Object.defineProperty(exports, "skipConfigPrefixes", { enumerable: true, get: function () { return candidate_1.skipConfigPrefixes; } });
var status_1 = require("./status");
Object.defineProperty(exports, "emptyDesktopSpawnSeamStatus", { enumerable: true, get: function () { return status_1.emptyDesktopSpawnSeamStatus; } });
var spawn_probe_1 = require("./spawn-probe");
Object.defineProperty(exports, "CodexDesktopSpawnProbe", { enumerable: true, get: function () { return spawn_probe_1.CodexDesktopSpawnProbe; } });
const spawn_probe_2 = require("./spawn-probe");
const status_2 = require("./status");
const launcher_1 = require("../codex-sessions/launcher");
let productionProbe = null;
function installDesktopAppServerSpawnProbe(options) {
    if (!productionProbe) {
        productionProbe = new spawn_probe_2.CodexDesktopSpawnProbe(options);
    }
    productionProbe.install();
    return productionProbe;
}
/** Internal getter only. Not exposed to tweaks or renderer IPC. */
function getDesktopSpawnSeamStatus() {
    return productionProbe?.getStatus() ?? (0, status_2.emptyDesktopSpawnSeamStatus)();
}
function collectDesktopTrustedRoots(opts) {
    return (0, launcher_1.trustedCodexSearchRoots)(opts);
}
//# sourceMappingURL=index.js.map