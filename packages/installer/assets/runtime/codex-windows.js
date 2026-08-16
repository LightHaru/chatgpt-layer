"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPrimaryCodexWindow = getPrimaryCodexWindow;
exports.getPrimaryCodexWindowRef = getPrimaryCodexWindowRef;
exports.focusCodexWindow = focusCodexWindow;
exports.showCodexWindow = showCodexWindow;
exports.createCodexBrowserView = createCodexBrowserView;
exports.createCodexWindow = createCodexWindow;
exports.makeWindowLikeForView = makeWindowLikeForView;
exports.codexAppUrl = codexAppUrl;
exports.normalizeOwlViewUrl = normalizeOwlViewUrl;
exports.getCodexWindowServices = getCodexWindowServices;
exports.normalizeCodexRoute = normalizeCodexRoute;
exports.asRecord = asRecord;
exports.callObjectMethod = callObjectMethod;
exports.isWindowDestroyed = isWindowDestroyed;
exports.windowIdFor = windowIdFor;
const electron_1 = require("electron");
const runtime_paths_1 = require("./runtime-paths");
const codex_runtime_probe_1 = require("./codex-runtime-probe");
function getPrimaryCodexWindow() {
    const services = getCodexWindowServices();
    const inspected = (0, codex_runtime_probe_1.inspectWindowServices)(services);
    const fromServices = inspected.getPrimaryWindow
        ? services?.getPrimaryWindow?.("local") ?? null
        : null;
    if (fromServices && !fromServices.isDestroyed())
        return fromServices;
    const fromManager = inspected.getPrimaryWindowFromManager
        ? services?.windowManager?.getPrimaryWindow?.call(services.windowManager) ?? null
        : null;
    if (fromManager && !fromManager.isDestroyed())
        return fromManager;
    const focused = electron_1.BrowserWindow.getFocusedWindow();
    if (focused && !focused.isDestroyed())
        return focused;
    return electron_1.BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null;
}
function getPrimaryCodexWindowRef() {
    const win = getPrimaryCodexWindow();
    if (!win || win.isDestroyed())
        return null;
    return { windowId: win.id, webContentsId: win.webContents.id };
}
function focusCodexWindow(windowId) {
    const win = electron_1.BrowserWindow.fromId(windowId);
    if (!win || win.isDestroyed())
        return false;
    if (win.isMinimized())
        win.restore();
    win.show();
    win.focus();
    return true;
}
function showCodexWindow(windowId) {
    const win = electron_1.BrowserWindow.fromId(windowId);
    if (!win || win.isDestroyed())
        return false;
    win.show();
    return true;
}
async function createCodexBrowserView(opts) {
    const services = getCodexWindowServices();
    const windowManager = services?.windowManager;
    const inspected = (0, codex_runtime_probe_1.inspectWindowServices)(services);
    if (!services || !windowManager?.registerWindow || !inspected.registerWindow) {
        throw new Error("Codex embedded view services are not available. Reinstall Codex++ 1.0.0 or later.");
    }
    const route = normalizeCodexRoute(opts.route);
    const hostId = opts.hostId || "local";
    const appearance = opts.appearance || "secondary";
    const view = new electron_1.BrowserView({
        webPreferences: {
            preload: windowManager.options?.preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            spellcheck: false,
            devTools: windowManager.options?.allowDevtools,
        },
    });
    const windowLike = makeWindowLikeForView(view);
    windowManager.registerWindow(windowLike, hostId, false, appearance);
    services.getContext?.(hostId)?.registerWindow?.(windowLike);
    await view.webContents.loadURL(codexAppUrl(route, hostId));
    return view;
}
async function createCodexWindow(opts) {
    const services = getCodexWindowServices();
    const inspected = (0, codex_runtime_probe_1.inspectWindowServices)(services);
    if (!services || !inspected.present) {
        throw new Error("Codex window services are not available. Reinstall Codex++ 1.0.0 or later.");
    }
    const route = normalizeCodexRoute(opts.route);
    const hostId = opts.hostId || "local";
    const parent = typeof opts.parentWindowId === "number"
        ? electron_1.BrowserWindow.fromId(opts.parentWindowId)
        : electron_1.BrowserWindow.getFocusedWindow();
    const createWindow = services.windowManager?.createWindow;
    let win;
    if (inspected.createWindow && typeof createWindow === "function") {
        win = await createWindow.call(services.windowManager, {
            initialRoute: route,
            hostId,
            show: opts.show !== false,
            appearance: opts.appearance || "secondary",
            parent,
        });
    }
    else if (hostId === "local" && inspected.createFreshWindow && typeof services.createFreshWindow === "function") {
        win = await services.createFreshWindow(route);
    }
    else if (hostId === "local" && inspected.createFreshLocalWindow && typeof services.createFreshLocalWindow === "function") {
        win = await services.createFreshLocalWindow(route);
    }
    else if (inspected.ensureHostWindow && typeof services.ensureHostWindow === "function") {
        win = await services.ensureHostWindow(hostId);
    }
    if (!win || win.isDestroyed()) {
        throw new Error("Codex did not return a window for the requested route");
    }
    if (opts.bounds) {
        win.setBounds(opts.bounds);
    }
    if (parent && !parent.isDestroyed()) {
        try {
            win.setParentWindow(parent);
        }
        catch { }
    }
    if (opts.show !== false) {
        win.show();
    }
    return {
        windowId: win.id,
        webContentsId: win.webContents.id,
    };
}
function makeWindowLikeForView(view) {
    const viewBounds = () => view.getBounds();
    return {
        id: view.webContents.id,
        webContents: view.webContents,
        on: (event, listener) => {
            if (event === "closed") {
                view.webContents.once("destroyed", listener);
            }
            else {
                view.webContents.on(event, listener);
            }
            return view;
        },
        once: (event, listener) => {
            view.webContents.once(event, listener);
            return view;
        },
        off: (event, listener) => {
            view.webContents.off(event, listener);
            return view;
        },
        removeListener: (event, listener) => {
            view.webContents.removeListener(event, listener);
            return view;
        },
        isDestroyed: () => view.webContents.isDestroyed(),
        isFocused: () => view.webContents.isFocused(),
        focus: () => view.webContents.focus(),
        show: () => { },
        hide: () => { },
        getBounds: viewBounds,
        getContentBounds: viewBounds,
        getSize: () => {
            const b = viewBounds();
            return [b.width, b.height];
        },
        getContentSize: () => {
            const b = viewBounds();
            return [b.width, b.height];
        },
        setTitle: () => { },
        getTitle: () => "",
        setRepresentedFilename: () => { },
        setDocumentEdited: () => { },
        setWindowButtonVisibility: () => { },
    };
}
function codexAppUrl(route, hostId) {
    const url = new URL("app://-/index.html");
    url.searchParams.set("hostId", hostId);
    if (route !== "/")
        url.searchParams.set("initialRoute", route);
    return url.toString();
}
function normalizeOwlViewUrl(url) {
    if (typeof url !== "string" || url.includes("\n") || url.includes("\r")) {
        throw new Error("Owl view URL must be a string without control characters");
    }
    const parsed = new URL(url);
    if (!["http:", "https:", "app:", "file:", "data:", "about:"].includes(parsed.protocol)) {
        throw new Error(`unsupported Owl view URL protocol: ${parsed.protocol}`);
    }
    return parsed.toString();
}
function getCodexWindowServices() {
    const services = globalThis[runtime_paths_1.CODEX_WINDOW_SERVICES_KEY];
    return services && typeof services === "object" ? services : null;
}
function normalizeCodexRoute(route) {
    if (typeof route !== "string" || !route.startsWith("/")) {
        throw new Error("Codex route must be an absolute app route");
    }
    if (route.includes("://") || route.includes("\n") || route.includes("\r")) {
        throw new Error("Codex route must not include a protocol or control characters");
    }
    return route;
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
function callObjectMethod(target, method, args) {
    const fn = asRecord(target)?.[method];
    if (typeof fn !== "function")
        return undefined;
    return fn.apply(target, args);
}
function isWindowDestroyed(win) {
    if (!win)
        return true;
    const fn = asRecord(win)?.isDestroyed;
    if (typeof fn !== "function")
        return false;
    try {
        return Boolean(fn.call(win));
    }
    catch {
        return true;
    }
}
function windowIdFor(win) {
    const id = asRecord(win)?.id;
    return typeof id === "number" ? id : null;
}
//# sourceMappingURL=codex-windows.js.map