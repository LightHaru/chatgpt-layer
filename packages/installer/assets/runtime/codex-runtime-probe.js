"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.probeRuntimeCompatibility = probeRuntimeCompatibility;
exports.getRuntimeInfo = getRuntimeInfo;
exports.getRuntimeCapabilities = getRuntimeCapabilities;
exports.capabilitiesFromSnapshot = capabilitiesFromSnapshot;
exports.viewsCapabilitiesFromSnapshot = viewsCapabilitiesFromSnapshot;
exports.getCdpStatus = getCdpStatus;
exports.listCdpTargets = listCdpTargets;
exports.selectPreloadRegistration = selectPreloadRegistration;
exports.inspectWindowServices = inspectWindowServices;
exports.inspectViewAttachTargets = inspectViewAttachTargets;
exports.windowSampleFrom = windowSampleFrom;
exports.viewSampleFromConstructor = viewSampleFromConstructor;
exports.createDefaultProbeEnv = createDefaultProbeEnv;
exports.asRecord = asRecord;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function probeRuntimeCompatibility(opts) {
    const env = { ...createDefaultProbeEnv(opts), ...opts.env };
    const getWindowServices = env.getWindowServices ?? opts.getWindowServices;
    const runtimeType = detectRuntimeType(env);
    const appVersion = opts.codexVersion ?? safeCall(() => env.app?.getVersion?.()) ?? null;
    const appPath = safeAppPath(env);
    const buildFlavor = safeBuildFlavor(env, appPath);
    const session = defaultSessionFrom(env);
    const preloadStrategy = selectPreloadRegistration(session);
    const windows = inspectWindowServices(safeCall(getWindowServices) ?? null);
    const windowSample = env.inspectExistingWindow?.() ?? null;
    const viewSample = env.inspectBrowserView?.() ?? viewSampleFromConstructor(env.browserView);
    const attach = inspectViewAttachTargets(windowSampleToParent(windowSample), viewSampleToView(viewSample));
    const browserViewCtor = env.browserView != null || Boolean(viewSample?.present);
    const browserView = attach.addBrowserView || browserViewCtor;
    const webContentsViewObserved = Boolean(viewSample?.webContentsView) || attach.webContentsView;
    const webContentsViewSetBounds = attach.webContentsViewSetBounds ||
        isFn(asRecord(viewSample?.webContentsView)?.setBounds);
    const webContentsView = webContentsViewObserved && webContentsViewSetBounds;
    const privateViewTree = attach.addChildView && attach.removeChildView && webContentsView;
    const electronCompatible = runtimeType === "electron" ||
        runtimeType === "owl" ||
        session != null ||
        env.browserWindow != null ||
        env.browserView != null ||
        env.app != null;
    const owl = runtimeType === "owl";
    const preload = {
        registerPreloadScript: preloadStrategy === "registerPreloadScript",
        setPreloadsFallback: isFn(asRecord(session)?.setPreloads),
    };
    const snapshotWindows = {
        windowServices: windows.present,
        createWindow: windows.canCreate,
        getPrimaryWindow: windows.getPrimaryWindow || windows.getPrimaryWindowFromManager,
        registerWindow: windows.registerWindow,
    };
    const snapshotViews = {
        browserView,
        contentView: attach.contentView,
        webContentsView,
        privateViewTree,
    };
    const shell = { owl, electronCompatible };
    return {
        runtimeType,
        appVersion,
        buildFlavor,
        preload,
        windows: snapshotWindows,
        views: snapshotViews,
        shell,
        support: supportFrom(runtimeType, electronCompatible, preload, snapshotWindows, snapshotViews),
    };
}
function getRuntimeInfo(opts) {
    const snapshot = probeRuntimeCompatibility(opts);
    const env = { ...createDefaultProbeEnv(opts), ...opts.env };
    return {
        type: snapshot.runtimeType,
        codexVersion: snapshot.appVersion,
        channel: opts.channel,
        buildFlavor: snapshot.buildFlavor,
        usesOwlAppShell: null,
        appPath: safeAppPath(env),
        resourcesPath: env.resourcesPath ?? null,
    };
}
function getRuntimeCapabilities(opts) {
    const snapshot = probeRuntimeCompatibility(opts);
    const native = opts.getNativeCapabilities?.() ?? defaultNativeCapabilities(opts.env?.platform ?? process.platform);
    const env = { ...createDefaultProbeEnv(opts), ...opts.env };
    const canFocus = isFn(asRecord(env.browserWindow)?.fromId) || snapshot.shell.electronCompatible;
    return capabilitiesFromSnapshot(snapshot, native, canFocus);
}
function capabilitiesFromSnapshot(snapshot, native, canFocus = true) {
    const cdp = getCdpStatus();
    return {
        windows: {
            create: snapshot.windows.createWindow,
            focus: canFocus,
            primary: snapshot.windows.getPrimaryWindow,
            browserView: snapshot.windows.registerWindow,
        },
        views: viewsCapabilitiesFromSnapshot(snapshot),
        cdp: {
            supported: true,
            enabled: cdp.enabled,
            port: cdp.port,
        },
        native,
    };
}
function viewsCapabilitiesFromSnapshot(snapshot) {
    const privateAttach = snapshot.views.privateViewTree;
    return {
        create: privateAttach || snapshot.views.browserView,
        privateViewTree: privateAttach,
        webContentsView: snapshot.views.webContentsView,
        browserViewFallback: snapshot.views.browserView,
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
function selectPreloadRegistration(sessionLike) {
    const session = asRecord(sessionLike);
    if (isFn(session?.registerPreloadScript))
        return "registerPreloadScript";
    if (isFn(session?.setPreloads))
        return "setPreloads";
    return "unavailable";
}
function inspectWindowServices(services) {
    const rec = asRecord(services);
    const windowManager = asRecord(rec?.windowManager);
    const createWindow = isFn(windowManager?.createWindow);
    const createFreshWindow = isFn(rec?.createFreshWindow);
    const createFreshLocalWindow = isFn(rec?.createFreshLocalWindow);
    const ensureHostWindow = isFn(rec?.ensureHostWindow);
    const getPrimaryWindow = isFn(rec?.getPrimaryWindow);
    const getPrimaryWindowFromManager = isFn(windowManager?.getPrimaryWindow);
    const registerWindow = isFn(windowManager?.registerWindow);
    return {
        present: rec !== null,
        createWindow,
        createFreshWindow,
        createFreshLocalWindow,
        ensureHostWindow,
        getPrimaryWindow,
        getPrimaryWindowFromManager,
        registerWindow,
        canCreate: createWindow || createFreshWindow || createFreshLocalWindow || ensureHostWindow,
    };
}
function inspectViewAttachTargets(parent, view) {
    const parentRecord = asRecord(parent);
    const contentView = asRecord(parentRecord?.contentView);
    const viewRecord = asRecord(view);
    const webContentsView = asRecord(viewRecord?.webContentsView);
    const webContentsViewPresent = Boolean(viewRecord && viewRecord.webContentsView);
    return {
        addBrowserView: isFn(parentRecord?.addBrowserView),
        contentView: contentView !== null,
        addChildView: isFn(contentView?.addChildView),
        removeChildView: isFn(contentView?.removeChildView),
        webContentsView: webContentsViewPresent,
        webContentsViewSetBounds: isFn(webContentsView?.setBounds) || isFn(viewRecord?.setBounds),
    };
}
function windowSampleFrom(win) {
    const rec = asRecord(win);
    if (!rec)
        return null;
    const contentView = asRecord(rec.contentView);
    return {
        addBrowserView: rec.addBrowserView,
        fromId: rec.fromId,
        contentView: rec.contentView,
        addChildView: contentView?.addChildView,
        removeChildView: contentView?.removeChildView,
    };
}
function viewSampleFromConstructor(browserView) {
    if (browserView == null)
        return null;
    const ctor = asRecord(browserView);
    const proto = asRecord(ctor?.prototype) ?? (typeof browserView === "object" ? asRecord(Object.getPrototypeOf(browserView)) : null);
    const webContentsView = proto?.webContentsView ?? ctor?.webContentsView;
    return {
        present: typeof browserView === "function" || proto !== null,
        webContentsView,
        setBounds: asRecord(webContentsView)?.setBounds ?? proto?.setBounds,
    };
}
function createDefaultProbeEnv(opts) {
    const electron = tryRequireElectron();
    const BrowserWindow = electron?.BrowserWindow;
    const BrowserView = electron?.BrowserView;
    return {
        platform: process.platform,
        execPath: process.execPath,
        resourcesPath: process.resourcesPath ?? null,
        existsSync: node_fs_1.existsSync,
        processEnv: process.env,
        app: electron?.app ?? null,
        session: electron?.session ?? null,
        browserWindow: BrowserWindow ?? null,
        browserView: BrowserView ?? null,
        getWindowServices: opts?.getWindowServices,
        inspectExistingWindow: () => {
            try {
                const focused = BrowserWindow?.getFocusedWindow?.();
                if (focused)
                    return windowSampleFrom(focused);
                const windows = BrowserWindow?.getAllWindows?.() ?? [];
                const live = windows.find((win) => {
                    const isDestroyed = asRecord(win)?.isDestroyed;
                    return typeof isDestroyed !== "function" || !isDestroyed.call(win);
                });
                return windowSampleFrom(live ?? null);
            }
            catch {
                return null;
            }
        },
        inspectBrowserView: () => {
            try {
                const fromCtor = viewSampleFromConstructor(BrowserView);
                if (fromCtor?.webContentsView)
                    return fromCtor;
                const windows = BrowserWindow?.getAllWindows?.() ?? [];
                for (const win of windows) {
                    const views = asRecord(win)?.getBrowserViews;
                    if (typeof views !== "function")
                        continue;
                    const listed = views.call(win);
                    if (!Array.isArray(listed))
                        continue;
                    for (const view of listed) {
                        const sample = viewSampleFromInstance(view);
                        if (sample?.webContentsView)
                            return sample;
                    }
                }
                return fromCtor;
            }
            catch {
                return viewSampleFromConstructor(BrowserView);
            }
        },
    };
}
function supportFrom(runtimeType, electronCompatible, preload, windows, views) {
    const reasons = [];
    const hasUsefulCapability = windows.windowServices ||
        windows.createWindow ||
        preload.registerPreloadScript ||
        preload.setPreloadsFallback ||
        views.browserView ||
        views.privateViewTree ||
        electronCompatible;
    if (runtimeType === "unknown" && !hasUsefulCapability) {
        return { level: "unknown", reasons: ["runtime type and capabilities could not be determined"] };
    }
    if (runtimeType === "unknown" && hasUsefulCapability) {
        reasons.push("runtime type could not be determined");
    }
    if (!windows.windowServices)
        reasons.push("window services unavailable");
    if (!windows.createWindow)
        reasons.push("createWindow unavailable");
    if (!preload.registerPreloadScript && preload.setPreloadsFallback) {
        reasons.push("registerPreloadScript missing; using setPreloads fallback");
    }
    else if (!preload.registerPreloadScript && !preload.setPreloadsFallback) {
        reasons.push("no session preload registration API");
    }
    if (!views.privateViewTree && views.browserView) {
        reasons.push("private contentView unavailable; using BrowserView fallback");
    }
    else if (!views.privateViewTree && !views.browserView) {
        reasons.push("no view attachment surface");
    }
    const usingFallback = (!preload.registerPreloadScript && preload.setPreloadsFallback) ||
        (!views.privateViewTree && views.browserView) ||
        runtimeType === "electron" ||
        !windows.windowServices ||
        !windows.createWindow;
    if (runtimeType === "unknown") {
        return { level: "unknown", reasons };
    }
    if (usingFallback) {
        return { level: "degraded", reasons };
    }
    return { level: "supported", reasons: [] };
}
function detectRuntimeType(env) {
    const platform = env.platform ?? process.platform;
    const exists = env.existsSync ?? node_fs_1.existsSync;
    const resourcesPath = env.resourcesPath ?? null;
    if (platform === "darwin") {
        const appRoot = inferMacAppRoot(env.execPath ?? process.execPath);
        if (appRoot && exists((0, node_path_1.join)(appRoot, "Contents", "Frameworks", "Codex Framework.framework"))) {
            return "owl";
        }
        if (appRoot && exists((0, node_path_1.join)(appRoot, "Contents", "Frameworks", "Electron Framework.framework"))) {
            return "electron";
        }
        if (resourcesPath && exists((0, node_path_1.join)(resourcesPath, "app.asar"))) {
            return "electron";
        }
        return "unknown";
    }
    return resourcesPath && exists((0, node_path_1.join)(resourcesPath, "app.asar")) ? "electron" : "unknown";
}
function inferMacAppRoot(execPath) {
    const marker = ".app/Contents/MacOS/";
    const idx = execPath.indexOf(marker);
    return idx >= 0 ? execPath.slice(0, idx + ".app".length) : null;
}
function safeAppPath(env) {
    const fromApp = safeCall(() => env.app?.getAppPath?.());
    if (fromApp)
        return fromApp;
    return env.resourcesPath ? (0, node_path_1.join)(env.resourcesPath, "app.asar") : null;
}
function safeBuildFlavor(env, appPath) {
    if (!appPath)
        return null;
    const parent = (0, node_path_1.dirname)(appPath);
    if (parent.includes("Nightly"))
        return "nightly";
    if (typeof env.app?.isPackaged === "boolean")
        return env.app.isPackaged ? "prod" : "dev";
    return null;
}
function defaultSessionFrom(env) {
    const session = env.session;
    if (!session)
        return null;
    if ("defaultSession" in session)
        return asRecord(session.defaultSession);
    return asRecord(session);
}
function windowSampleToParent(sample) {
    if (!sample)
        return null;
    return {
        addBrowserView: sample.addBrowserView,
        contentView: sample.contentView ?? (sample.addChildView || sample.removeChildView
            ? { addChildView: sample.addChildView, removeChildView: sample.removeChildView }
            : undefined),
    };
}
function viewSampleToView(sample) {
    if (!sample)
        return null;
    return {
        webContentsView: sample.webContentsView ?? (sample.setBounds ? { setBounds: sample.setBounds } : undefined),
        setBounds: sample.setBounds,
    };
}
function viewSampleFromInstance(view) {
    const rec = asRecord(view);
    if (!rec)
        return null;
    return {
        present: true,
        webContentsView: rec.webContentsView,
        setBounds: asRecord(rec.webContentsView)?.setBounds ?? rec.setBounds,
    };
}
function defaultNativeCapabilities(platform) {
    return {
        inProcessModules: true,
        swiftModules: platform === "darwin",
        appKitEmbedding: false,
        childWindowOverlay: false,
        directViewAttach: false,
        metalViews: false,
        nativeHost: false,
        helpers: true,
    };
}
function parseCdpPort(value) {
    const parsed = Number(value ?? "9222");
    return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 9222;
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
function tryRequireElectron() {
    try {
        return require("electron");
    }
    catch {
        return null;
    }
}
function safeCall(fn) {
    try {
        const value = fn();
        return value === undefined ? null : value;
    }
    catch {
        return null;
    }
}
function isFn(value) {
    return typeof value === "function";
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
//# sourceMappingURL=codex-runtime-probe.js.map