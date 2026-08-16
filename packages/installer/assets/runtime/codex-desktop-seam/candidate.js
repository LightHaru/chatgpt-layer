"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAppServerProbeEnabled = isAppServerProbeEnabled;
exports.looksLikeCodexRuntimeBasename = looksLikeCodexRuntimeBasename;
exports.commandBasename = commandBasename;
exports.skipConfigPrefixes = skipConfigPrefixes;
exports.detectAppServerSubcommand = detectAppServerSubcommand;
exports.detectStdioTransport = detectStdioTransport;
exports.isPathInsideRoot = isPathInsideRoot;
exports.resolveTrustedCommandPath = resolveTrustedCommandPath;
exports.extractSpawnCommandAndArgv = extractSpawnCommandAndArgv;
exports.asStringArgv = asStringArgv;
exports.classifySpawnCall = classifySpawnCall;
const posix_1 = require("node:path/posix");
const win32_1 = require("node:path/win32");
const CODEX_BASENAME_RE = /^(codex)(\.exe)?$/i;
function isAppServerProbeEnabled(env) {
    return env?.CODEXPP_APP_SERVER_PROBE === "1";
}
function looksLikeCodexRuntimeBasename(name) {
    if (typeof name !== "string" || name.length === 0)
        return false;
    return CODEX_BASENAME_RE.test(name);
}
function commandBasename(command, platform) {
    return platform === "win32" ? (0, win32_1.basename)(command) : (0, posix_1.basename)(command);
}
/**
 * Skip Layer-recognized config prefixes. Values are discarded and must never
 * be logged. Discovery only; Desktop argv is not rewritten.
 */
function skipConfigPrefixes(argv) {
    const rest = [];
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (token === "--config" || token === "-c") {
            i += 1;
            continue;
        }
        rest.push(token);
    }
    return rest;
}
function detectAppServerSubcommand(argv) {
    return skipConfigPrefixes(argv).includes("app-server");
}
function detectStdioTransport(argv) {
    const tokens = skipConfigPrefixes(argv);
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === "--stdio")
            return "stdio-flag";
        if (token === "--listen") {
            const value = tokens[i + 1];
            if (typeof value === "string" && value.toLowerCase() === "stdio://") {
                return "listen-stdio";
            }
        }
    }
    return null;
}
function isPathInsideRoot(parent, target, platform) {
    const relative = platform === "win32" ? win32_1.relative : posix_1.relative;
    const isAbs = platform === "win32" ? win32_1.isAbsolute : posix_1.isAbsolute;
    const from = platform === "win32" ? parent.toLowerCase() : parent;
    const to = platform === "win32" ? target.toLowerCase() : target;
    const rel = relative(from, to);
    if (rel === "")
        return true;
    if (!rel || rel.startsWith("..") || isAbs(rel))
        return false;
    return !rel.split(/[/\\]/).includes("..");
}
function resolveTrustedCommandPath(command, trustedRoots, platform, io) {
    if (typeof command !== "string" || command.length === 0) {
        return { trusted: false, relativeResourcePath: null };
    }
    let resolved;
    try {
        resolved = io.realpathSync(command);
    }
    catch {
        return { trusted: false, relativeResourcePath: null };
    }
    const relative = platform === "win32" ? win32_1.relative : posix_1.relative;
    for (const root of trustedRoots) {
        if (typeof root !== "string" || root.length === 0)
            continue;
        let resolvedRoot;
        try {
            resolvedRoot = io.realpathSync(root);
        }
        catch {
            continue;
        }
        if (!isPathInsideRoot(resolvedRoot, resolved, platform))
            continue;
        const rel = relative(platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot, platform === "win32" ? resolved.toLowerCase() : resolved);
        if (!rel || rel.startsWith("..") || rel.includes("..")) {
            return { trusted: true, relativeResourcePath: null };
        }
        return { trusted: true, relativeResourcePath: rel.replace(/\\/g, "/") };
    }
    return { trusted: false, relativeResourcePath: null };
}
function extractSpawnCommandAndArgv(callArgs) {
    const command = callArgs[0];
    const second = callArgs[1];
    if (Array.isArray(second))
        return { command, argv: second };
    return { command, argv: [] };
}
function asStringArgv(argv) {
    if (!Array.isArray(argv))
        return null;
    const out = [];
    for (const item of argv) {
        if (typeof item !== "string")
            return null;
        out.push(item);
    }
    return out;
}
function classifySpawnCall(opts) {
    const empty = {
        candidate: false,
        trustedExecutable: false,
        appServerSubcommand: false,
        transportMode: null,
        executableBasename: null,
        relativeResourcePath: null,
        argumentCount: null,
    };
    const { command, argv } = extractSpawnCommandAndArgv(opts.callArgs);
    const strings = asStringArgv(argv);
    const argumentCount = strings ? strings.length : Array.isArray(argv) ? argv.length : null;
    if (typeof command !== "string" || command.length === 0) {
        return { ...empty, argumentCount };
    }
    const executableBasename = commandBasename(command, opts.platform);
    const looksCodex = looksLikeCodexRuntimeBasename(executableBasename);
    const { trusted, relativeResourcePath } = looksCodex
        ? resolveTrustedCommandPath(command, opts.trustedRoots, opts.platform, opts.io)
        : { trusted: false, relativeResourcePath: null };
    const appServerSubcommand = strings ? detectAppServerSubcommand(strings) : false;
    const transportMode = strings && appServerSubcommand ? detectStdioTransport(strings) : null;
    const candidate = Boolean(looksCodex && trusted && appServerSubcommand && transportMode !== null);
    return {
        candidate,
        trustedExecutable: trusted,
        appServerSubcommand,
        transportMode,
        executableBasename,
        relativeResourcePath: trusted ? relativeResourcePath : null,
        argumentCount,
    };
}
//# sourceMappingURL=candidate.js.map