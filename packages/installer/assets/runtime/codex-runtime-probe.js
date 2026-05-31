"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntimeInfo = getRuntimeInfo;
exports.getRuntimeCapabilities = getRuntimeCapabilities;
exports.getCdpStatus = getCdpStatus;
exports.listCdpTargets = listCdpTargets;
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function getRuntimeInfo(opts) {
    return {
        type: detectRuntimeType(),
        codexVersion: opts.codexVersion ?? safeAppVersion(),
        channel: opts.channel,
        buildFlavor: safeBuildFlavor(),
        usesOwlAppShell: null,
        appPath: safeAppPath(),
        resourcesPath: process.resourcesPath ?? null,
    };
}
function getRuntimeCapabilities(opts) {
    const services = asRecord(opts.getWindowServices());
    const windowManager = asRecord(services?.windowManager);
    const cdp = getCdpStatus();
    const native = opts.getNativeCapabilities?.() ?? defaultNativeCapabilities();
    const views = opts.getViewCapabilities?.() ?? defaultViewCapabilities();
    const canCreateWindow = typeof windowManager?.createWindow === "function" ||
        typeof services?.createFreshWindow === "function" ||
        typeof services?.createFreshLocalWindow === "function" ||
        typeof services?.ensureHostWindow === "function";
    return {
        windows: {
            create: canCreateWindow,
            focus: true,
            primary: typeof services?.getPrimaryWindow === "function" ||
                typeof windowManager?.getPrimaryWindow === "function",
            browserView: typeof windowManager?.registerWindow === "function",
        },
        views,
        cdp: {
            supported: true,
            enabled: cdp.enabled,
            port: cdp.port,
        },
        native,
    };
}
function getCdpStatus() {
    const enabled = process.env.CODEXPP_REMOTE_DEBUG === "1";
    const port = parseCdpPort(process.env.CODEXPP_REMOTE_DEBUG_PORT);
    return {
        supported: true,
        enabled,
        port: enabled ? port : null,
        url: enabled ? `http://127.0.0.1:${port}` : null,
    };
}
async function listCdpTargets() {
    const status = getCdpStatus();
    if (!status.enabled || !status.url)
        return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);
    try {
        const res = await fetch(`${status.url}/json`, { signal: controller.signal });
        if (!res.ok)
            return [];
        const rows = await res.json();
        if (!Array.isArray(rows))
            return [];
        return rows
            .map((row) => normalizeCdpTarget(row))
            .filter((row) => row !== null);
    }
    catch {
        return [];
    }
    finally {
        clearTimeout(timeout);
    }
}
function detectRuntimeType() {
    if (process.platform === "darwin") {
        const appRoot = inferMacAppRoot();
        if (appRoot && (0, node_fs_1.existsSync)((0, node_path_1.join)(appRoot, "Contents", "Frameworks", "Codex Framework.framework"))) {
            return "owl";
        }
        if (appRoot &&
            (0, node_fs_1.existsSync)((0, node_path_1.join)(appRoot, "Contents", "Frameworks", "Electron Framework.framework"))) {
            return "electron";
        }
        if (process.resourcesPath && (0, node_fs_1.existsSync)((0, node_path_1.join)(process.resourcesPath, "app.asar"))) {
            return "electron";
        }
        return "unknown";
    }
    return process.resourcesPath && (0, node_fs_1.existsSync)((0, node_path_1.join)(process.resourcesPath, "app.asar"))
        ? "electron"
        : "unknown";
}
function inferMacAppRoot() {
    const marker = ".app/Contents/MacOS/";
    const idx = process.execPath.indexOf(marker);
    return idx >= 0 ? process.execPath.slice(0, idx + ".app".length) : null;
}
function safeAppVersion() {
    try {
        return electron_1.app.getVersion();
    }
    catch {
        return null;
    }
}
function safeAppPath() {
    try {
        return electron_1.app.getAppPath();
    }
    catch {
        return process.resourcesPath ? (0, node_path_1.join)(process.resourcesPath, "app.asar") : null;
    }
}
function safeBuildFlavor() {
    const appPath = safeAppPath();
    if (!appPath)
        return null;
    const parent = (0, node_path_1.dirname)(appPath);
    if (parent.includes("Nightly"))
        return "nightly";
    return electron_1.app.isPackaged ? "prod" : "dev";
}
function parseCdpPort(value) {
    const parsed = Number(value ?? "9222");
    return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 9222;
}
function hasNativeWindowHandles() {
    const focused = electron_1.BrowserWindow.getFocusedWindow();
    if (focused && typeof focused.getNativeWindowHandle === "function")
        return true;
    return typeof electron_1.BrowserWindow.fromId === "function";
}
function defaultNativeCapabilities() {
    return {
        inProcessModules: true,
        swiftModules: process.platform === "darwin",
        appKitEmbedding: false,
        childWindowOverlay: false,
        directViewAttach: false,
        metalViews: false,
        nativeHost: false,
        helpers: true,
    };
}
function defaultViewCapabilities() {
    return {
        create: false,
        privateViewTree: false,
        webContentsView: false,
        browserViewFallback: typeof electron_1.BrowserWindow.fromId === "function",
    };
}
function normalizeCdpTarget(row) {
    const value = asRecord(row);
    if (!value || typeof value.id !== "string" || typeof value.type !== "string" || typeof value.url !== "string") {
        return null;
    }
    return {
        id: value.id,
        type: value.type,
        url: value.url,
        ...(typeof value.title === "string" ? { title: value.title } : {}),
        ...(typeof value.webSocketDebuggerUrl === "string"
            ? { webSocketDebuggerUrl: value.webSocketDebuggerUrl }
            : {}),
    };
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
//# sourceMappingURL=codex-runtime-probe.js.map