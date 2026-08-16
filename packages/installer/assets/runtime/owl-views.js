"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.untrustedWebContentsIds = void 0;
exports.markUntrustedWebContents = markUntrustedWebContents;
exports.getOwlViewCapabilities = getOwlViewCapabilities;
exports.createOwlView = createOwlView;
exports.callOwlView = callOwlView;
exports.owlViewRef = owlViewRef;
exports.attachOwlView = attachOwlView;
exports.bringOwlViewToFront = bringOwlViewToFront;
exports.setOwlViewBounds = setOwlViewBounds;
exports.setOwlViewVisible = setOwlViewVisible;
exports.disposeOwlViewById = disposeOwlViewById;
exports.disposeOwlViewsForTweak = disposeOwlViewsForTweak;
exports.disposeAllOwlViews = disposeAllOwlViews;
exports.disposeOwlView = disposeOwlView;
exports.owlViewFor = owlViewFor;
exports.owlViewKey = owlViewKey;
exports.addOwlChildView = addOwlChildView;
exports.removeOwlChildView = removeOwlChildView;
exports.bindWindowEvent = bindWindowEvent;
exports.assertBridgeId = assertBridgeId;
exports.assertBounds = assertBounds;
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_crypto_1 = require("node:crypto");
const runtime_paths_1 = require("./runtime-paths");
const codex_windows_1 = require("./codex-windows");
const codex_runtime_probe_1 = require("./codex-runtime-probe");
exports.untrustedWebContentsIds = new Set();
const owlViews = new Map();
function markUntrustedWebContents(wc) {
    exports.untrustedWebContentsIds.add(wc.id);
    wc.once("destroyed", () => { exports.untrustedWebContentsIds.delete(wc.id); });
}
function getOwlViewCapabilities() {
    const snapshot = (0, codex_runtime_probe_1.probeRuntimeCompatibility)({
        userRoot: "",
        runtimeDir: "",
        codexVersion: null,
        channel: null,
        getWindowServices: codex_windows_1.getCodexWindowServices,
        env: {
            browserView: electron_1.BrowserView,
            browserWindow: electron_1.BrowserWindow,
            inspectExistingWindow: () => (0, codex_runtime_probe_1.windowSampleFrom)((0, codex_windows_1.getPrimaryCodexWindow)() ?? electron_1.BrowserWindow.getFocusedWindow()),
            inspectBrowserView: () => (0, codex_runtime_probe_1.viewSampleFromConstructor)(electron_1.BrowserView),
        },
    });
    return (0, codex_runtime_probe_1.viewsCapabilitiesFromSnapshot)(snapshot);
}
async function createOwlView(ctx, opts) {
    const id = assertBridgeId(opts.id ?? (0, node_crypto_1.randomUUID)(), "Codex view id");
    const key = owlViewKey(ctx.id, id);
    if (owlViews.has(key))
        throw new Error(`Codex view already exists: ${ctx.id}:${id}`);
    const parent = typeof opts.parentWindowId === "number"
        ? electron_1.BrowserWindow.fromId(opts.parentWindowId)
        : (0, codex_windows_1.getPrimaryCodexWindow)();
    if (!parent || (0, codex_windows_1.isWindowDestroyed)(parent)) {
        throw new Error("Codex view needs an active parent window");
    }
    const services = (0, codex_windows_1.getCodexWindowServices)();
    const windowManager = services?.windowManager;
    const route = opts.route === undefined ? null : (0, codex_windows_1.normalizeCodexRoute)(opts.route);
    const hostId = opts.hostId || "local";
    const view = new electron_1.BrowserView({
        webPreferences: {
            preload: opts.registerWithCodex === false
                ? ((0, node_fs_1.existsSync)(runtime_paths_1.GUEST_PRELOAD_PATH) ? runtime_paths_1.GUEST_PRELOAD_PATH : undefined)
                : windowManager?.options?.preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            spellcheck: false,
            devTools: windowManager?.options?.allowDevtools,
        },
    });
    markUntrustedWebContents(view.webContents);
    if (opts.backgroundColor) {
        (0, codex_windows_1.callObjectMethod)(view, "setBackgroundColor", [opts.backgroundColor]);
        (0, codex_windows_1.callObjectMethod)((0, codex_windows_1.asRecord)(view)?.webContentsView, "setBackgroundColor", [opts.backgroundColor]);
    }
    const managed = {
        key,
        tweakId: ctx.id,
        id,
        view,
        parentWindowId: (0, codex_windows_1.windowIdFor)(parent),
        attachMode: null,
        disposeBindings: [],
        disposed: false,
    };
    owlViews.set(key, managed);
    try {
        if (route !== null && opts.registerWithCodex !== false && windowManager?.registerWindow) {
            const appearance = opts.appearance || "secondary";
            const windowLike = (0, codex_windows_1.makeWindowLikeForView)(view);
            windowManager.registerWindow(windowLike, hostId, false, appearance);
            services?.getContext?.(hostId)?.registerWindow?.(windowLike);
        }
        attachOwlView(managed, parent);
        if (opts.bounds)
            setOwlViewBounds(managed, opts.bounds);
        if (opts.visible === false)
            setOwlViewVisible(managed, false);
        if (route !== null) {
            await view.webContents.loadURL((0, codex_windows_1.codexAppUrl)(route, hostId));
        }
        else if (opts.url) {
            await view.webContents.loadURL((0, codex_windows_1.normalizeOwlViewUrl)(opts.url));
        }
        else {
            await view.webContents.loadURL("about:blank");
        }
    }
    catch (e) {
        disposeOwlView(managed);
        throw e;
    }
    (0, runtime_paths_1.log)("info", `created Owl view ${ctx.id}:${id}`, {
        parentWindowId: managed.parentWindowId,
        webContentsId: view.webContents.id,
        attachMode: managed.attachMode,
    });
    return owlViewRef(managed);
}
async function callOwlView(tweakId, id, method, arg, arg2) {
    const view = owlViewFor(tweakId, id);
    if (method === "setBounds")
        return setOwlViewBounds(view, arg);
    if (method === "setVisible")
        return setOwlViewVisible(view, Boolean(arg));
    if (method === "bringToFront")
        return bringOwlViewToFront(view);
    if (method === "loadRoute") {
        const route = (0, codex_windows_1.normalizeCodexRoute)(String(arg));
        const hostId = typeof arg2 === "string" && arg2 ? arg2 : "local";
        return view.view.webContents.loadURL((0, codex_windows_1.codexAppUrl)(route, hostId));
    }
    if (method === "loadUrl")
        return view.view.webContents.loadURL((0, codex_windows_1.normalizeOwlViewUrl)(String(arg)));
    if (method === "dispose")
        return disposeOwlViewById(tweakId, id);
    throw new Error(`unknown Codex view method: ${method}`);
}
function owlViewRef(view) {
    return {
        id: view.id,
        webContentsId: view.view.webContents.id,
        parentWindowId: view.parentWindowId,
        setBounds: (bounds) => Promise.resolve(setOwlViewBounds(view, bounds)),
        setVisible: (visible) => Promise.resolve(setOwlViewVisible(view, visible)),
        bringToFront: () => Promise.resolve(bringOwlViewToFront(view)),
        loadRoute: (route, hostId) => view.view.webContents.loadURL((0, codex_windows_1.codexAppUrl)((0, codex_windows_1.normalizeCodexRoute)(route), hostId || "local")).then(() => { }),
        loadUrl: (url) => view.view.webContents.loadURL((0, codex_windows_1.normalizeOwlViewUrl)(url)).then(() => { }),
        dispose: () => Promise.resolve(disposeOwlViewById(view.tweakId, view.id)),
    };
}
function attachOwlView(view, parent) {
    const targets = (0, codex_runtime_probe_1.inspectViewAttachTargets)(parent, view.view);
    if (targets.addBrowserView) {
        (0, codex_windows_1.callObjectMethod)(parent, "addBrowserView", [view.view]);
        view.attachMode = "browserView";
    }
    else if (targets.addChildView &&
        targets.webContentsView) {
        try {
            addOwlChildView(parent, view.view);
            view.attachMode = "contentView";
        }
        catch (e) {
            (0, runtime_paths_1.log)("warn", "Owl contentView attachment failed; falling back to BrowserView", {
                tweakId: view.tweakId,
                viewId: view.id,
                error: String(e),
            });
        }
    }
    if (!view.attachMode) {
        throw new Error("Owl view attachment is not available on this Codex window");
    }
    const dispose = () => disposeOwlViewById(view.tweakId, view.id);
    bindWindowEvent(parent, view, "closed", dispose);
    bindWindowEvent(parent, view, "close", dispose);
}
function bringOwlViewToFront(view) {
    if (view.disposed)
        return;
    const parent = view.parentWindowId === null ? null : electron_1.BrowserWindow.fromId(view.parentWindowId);
    if (!parent || (0, codex_windows_1.isWindowDestroyed)(parent))
        return;
    const contentView = (0, codex_windows_1.asRecord)(parent)?.contentView;
    const webContentsView = (0, codex_windows_1.asRecord)(view.view)?.webContentsView;
    if (view.attachMode === "contentView" && webContentsView) {
        try {
            if (typeof (0, codex_windows_1.asRecord)(parent)?.setTopBrowserView === "function") {
                (0, codex_windows_1.callObjectMethod)(parent, "setTopBrowserView", [view.view]);
            }
            else {
                (0, codex_windows_1.callObjectMethod)(contentView, "addChildView", [webContentsView]);
            }
            return;
        }
        catch (e) {
            (0, runtime_paths_1.log)("warn", "Owl contentView bring-to-front failed", {
                tweakId: view.tweakId,
                viewId: view.id,
                error: String(e),
            });
        }
    }
    if (typeof (0, codex_windows_1.asRecord)(parent)?.setTopBrowserView === "function") {
        (0, codex_windows_1.callObjectMethod)(parent, "setTopBrowserView", [view.view]);
    }
}
function setOwlViewBounds(view, bounds) {
    assertBounds(bounds);
    (0, codex_windows_1.callObjectMethod)(view.view, "setBounds", [bounds]);
    (0, codex_windows_1.callObjectMethod)((0, codex_windows_1.asRecord)(view.view)?.webContentsView, "setBounds", [bounds]);
}
function setOwlViewVisible(view, visible) {
    (0, codex_windows_1.callObjectMethod)((0, codex_windows_1.asRecord)(view.view)?.webContentsView, "setVisible", [visible]);
}
function disposeOwlViewById(tweakId, id) {
    const view = owlViews.get(owlViewKey(tweakId, id));
    if (!view)
        return;
    disposeOwlView(view);
}
function disposeOwlViewsForTweak(tweakId) {
    for (const view of [...owlViews.values()]) {
        if (view.tweakId === tweakId)
            disposeOwlView(view);
    }
}
function disposeAllOwlViews() {
    for (const view of [...owlViews.values()])
        disposeOwlView(view);
}
function disposeOwlView(view) {
    if (view.disposed)
        return;
    view.disposed = true;
    owlViews.delete(view.key);
    for (const dispose of view.disposeBindings.splice(0)) {
        try {
            dispose();
        }
        catch { }
    }
    const parent = view.parentWindowId === null ? null : electron_1.BrowserWindow.fromId(view.parentWindowId);
    if (parent && !(0, codex_windows_1.isWindowDestroyed)(parent)) {
        try {
            if (view.attachMode === "contentView") {
                removeOwlChildView(parent, view.view);
            }
            else if (view.attachMode === "browserView") {
                (0, codex_windows_1.callObjectMethod)(parent, "removeBrowserView", [view.view]);
            }
        }
        catch (e) {
            (0, runtime_paths_1.log)("warn", "Owl view detach failed during dispose", {
                tweakId: view.tweakId,
                viewId: view.id,
                error: String(e),
            });
        }
    }
    try {
        if (!view.view.webContents.isDestroyed()) {
            view.view.webContents.close({ waitForBeforeUnload: false });
        }
    }
    catch { }
}
function owlViewFor(tweakId, id) {
    const view = owlViews.get(owlViewKey(tweakId, id));
    if (!view || view.disposed)
        throw new Error(`Codex view is not loaded: ${tweakId}:${id}`);
    return view;
}
function owlViewKey(tweakId, viewId) {
    return `${tweakId}:${viewId}`;
}
function addOwlChildView(parent, child) {
    const ownerWindow = (0, codex_windows_1.asRecord)(child)?.ownerWindow;
    if (ownerWindow && ownerWindow !== parent) {
        (0, codex_windows_1.callObjectMethod)(ownerWindow, "removeBrowserView", [child]);
    }
    (0, codex_windows_1.callObjectMethod)((0, codex_windows_1.asRecord)(parent)?.contentView, "addChildView", [(0, codex_windows_1.asRecord)(child)?.webContentsView]);
    try {
        child.ownerWindow = parent;
    }
    catch { }
    (0, codex_windows_1.callObjectMethod)((0, codex_windows_1.asRecord)(child.webContents), "_setOwnerWindow", [parent]);
    const browserViews = (0, codex_windows_1.asRecord)(parent)?._browserViews;
    if (Array.isArray(browserViews) && !browserViews.includes(child)) {
        browserViews.push(child);
    }
}
function removeOwlChildView(parent, child) {
    (0, codex_windows_1.callObjectMethod)((0, codex_windows_1.asRecord)(parent)?.contentView, "removeChildView", [(0, codex_windows_1.asRecord)(child)?.webContentsView]);
    try {
        child.ownerWindow = null;
    }
    catch { }
    const browserViews = (0, codex_windows_1.asRecord)(parent)?._browserViews;
    if (Array.isArray(browserViews)) {
        const index = browserViews.indexOf(child);
        if (index >= 0)
            browserViews.splice(index, 1);
    }
}
function bindWindowEvent(win, view, event, listener) {
    const on = (0, codex_windows_1.asRecord)(win)?.on;
    const off = (0, codex_windows_1.asRecord)(win)?.off;
    if (typeof on !== "function")
        return;
    on.call(win, event, listener);
    view.disposeBindings.push(() => {
        if (typeof off === "function")
            off.call(win, event, listener);
        else
            (0, codex_windows_1.callObjectMethod)(win, "removeListener", [event, listener]);
    });
}
function assertBridgeId(value, label) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) {
        throw new Error(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
    }
    return value;
}
function assertBounds(bounds) {
    const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
    if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
        throw new Error("bounds must contain finite x, y, width, and height numbers");
    }
    if (bounds.width < 0 || bounds.height < 0) {
        throw new Error("bounds width and height must be non-negative");
    }
}
//# sourceMappingURL=owl-views.js.map