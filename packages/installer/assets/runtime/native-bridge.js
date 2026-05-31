"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NativeBridge = void 0;
const electron_1 = require("electron");
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const node_readline_1 = require("node:readline");
const native_paths_1 = require("./native-paths");
class NativeBridge {
    log;
    options;
    modules = new Map();
    instances = new Map();
    helpers = new Map();
    nativeHostExports = null;
    nativeHostLoadError = null;
    constructor(log, options = {}) {
        this.log = log;
        this.options = options;
    }
    getCapabilities() {
        const host = this.loadNativeHost(false);
        const hostCapabilities = host ? this.readNativeHostCapabilities(host) : {};
        const nativeHost = host !== null;
        return {
            inProcessModules: true,
            swiftModules: process.platform === "darwin",
            appKitEmbedding: Boolean(hostCapabilities.appKitEmbedding),
            childWindowOverlay: Boolean(hostCapabilities.childWindowOverlay),
            directViewAttach: Boolean(hostCapabilities.directViewAttach),
            metalViews: Boolean(hostCapabilities.metalViews),
            nativeHost,
            helpers: true,
        };
    }
    loadModule(ctx, options) {
        const id = assertBridgeId(options.id, "native module id");
        const fullPath = resolveTweakPath(ctx, options.path);
        const kind = options.kind ?? inferModuleKind(fullPath);
        if (kind !== "node-addon") {
            throw new Error(`${kind} native modules must be loaded through a .node Objective-C++ shim in Codex++ 1.0.0`);
        }
        if (!fullPath.endsWith(".node")) {
            throw new Error("node-addon native modules must use a .node file");
        }
        const loaded = require(fullPath);
        const exports = selectEntrypoint(loaded, options.entrypoint);
        const key = moduleKey(ctx.id, id);
        this.modules.set(key, { key, tweakId: ctx.id, id, kind, path: fullPath, exports });
        this.log("info", `loaded native module ${ctx.id}:${id}`, { kind, path: fullPath });
        return this.moduleRef(ctx.id, id, kind);
    }
    async createPanel(ctx, options) {
        const created = await this.createNativeInstance(ctx, "panel", options.moduleId, options.factory ?? "createPanel", {
            parentWindowId: options.parentWindowId,
            bounds: options.bounds,
            transparent: options.transparent === true,
            passthroughMouse: options.passthroughMouse === true,
        });
        return this.panelRef(created);
    }
    async attachView(ctx, options) {
        const created = await this.createNativeInstance(ctx, "view", options.moduleId, options.factory ?? "attachView", {
            parentWindowId: options.parentWindowId,
            bounds: options.bounds,
            zIndex: options.zIndex,
        });
        return this.viewRef(created);
    }
    launchHelper(ctx, options) {
        const id = assertBridgeId(options.id, "native helper id");
        if ((options.transport ?? "stdio") !== "stdio") {
            throw new Error("native helpers support only stdio transport in Codex++ 1.0.0");
        }
        if ((options.restart ?? "never") !== "never") {
            throw new Error("native helper restart policies are not available in Codex++ 1.0.0");
        }
        const executable = resolveTweakPath(ctx, options.executable);
        const args = options.args ?? [];
        const env = { ...process.env, ...(options.env ?? {}) };
        const child = (0, node_child_process_1.spawn)(executable, args, {
            cwd: ctx.dir,
            env,
            stdio: ["pipe", "pipe", "pipe"],
        });
        const key = helperKey(ctx.id, id);
        const helper = {
            key,
            tweakId: ctx.id,
            id,
            child,
            pending: new Map(),
        };
        this.helpers.set(key, helper);
        const stdout = (0, node_readline_1.createInterface)({ input: child.stdout });
        stdout.on("line", (line) => this.handleHelperLine(helper, line));
        child.stderr.on("data", (chunk) => {
            this.log("warn", `native helper ${ctx.id}:${id} stderr`, String(chunk));
        });
        child.on("exit", (code, signal) => {
            this.log("info", `native helper ${ctx.id}:${id} exited`, { code, signal });
            this.helpers.delete(key);
            for (const request of helper.pending.values()) {
                clearTimeout(request.timer);
                request.reject(new Error(`native helper exited before response`));
            }
            helper.pending.clear();
        });
        child.on("error", (error) => {
            this.log("error", `native helper ${ctx.id}:${id} failed`, error);
            this.helpers.delete(key);
            for (const request of helper.pending.values()) {
                clearTimeout(request.timer);
                request.reject(error);
            }
            helper.pending.clear();
        });
        this.log("info", `launched native helper ${ctx.id}:${id}`, { pid: child.pid, executable });
        return this.helperRef(ctx.id, id, child.pid ?? -1);
    }
    disposeTweak(tweakId) {
        for (const [key, instance] of [...this.instances]) {
            if (instance.tweakId !== tweakId)
                continue;
            void this.disposeInstance(instance).finally(() => this.instances.delete(key));
        }
        for (const [key, helper] of [...this.helpers]) {
            if (helper.tweakId !== tweakId)
                continue;
            this.stopHelper(helper);
            this.helpers.delete(key);
        }
        for (const [key, mod] of [...this.modules]) {
            if (mod.tweakId !== tweakId)
                continue;
            void callOptional(mod.exports, "dispose", []);
            this.modules.delete(key);
        }
    }
    disposeAll() {
        const tweakIds = new Set([
            ...[...this.modules.values()].map((item) => item.tweakId),
            ...[...this.instances.values()].map((item) => item.tweakId),
            ...[...this.helpers.values()].map((item) => item.tweakId),
        ]);
        for (const id of tweakIds)
            this.disposeTweak(id);
    }
    async callInstance(tweakId, kind, id, method, arg) {
        if (kind === "panel") {
            if (method === "setBounds")
                return this.invokeInstance(tweakId, id, "setBounds", [arg]);
            if (method === "show")
                return this.invokeInstance(tweakId, id, "show", []);
            if (method === "hide")
                return this.invokeInstance(tweakId, id, "hide", []);
            if (method === "dispose")
                return this.disposeInstanceById(tweakId, id);
        }
        if (kind === "view") {
            if (method === "setBounds")
                return this.invokeInstance(tweakId, id, "setBounds", [arg]);
            if (method === "setVisible")
                return this.invokeInstance(tweakId, id, "setVisible", [arg]);
            if (method === "dispose")
                return this.disposeInstanceById(tweakId, id);
        }
        throw new Error(`unknown native ${kind} method: ${method}`);
    }
    async callHelper(tweakId, helperId, method, payload, timeoutMs) {
        if (method === "send")
            return this.sendHelper(tweakId, helperId, payload);
        if (method === "request")
            return this.requestHelper(tweakId, helperId, payload, timeoutMs);
        if (method === "stop")
            return this.stopHelperById(tweakId, helperId);
        throw new Error(`unknown native helper method: ${method}`);
    }
    moduleRef(tweakId, id, kind = this.moduleFor(tweakId, id).kind) {
        return {
            id,
            kind,
            request: (method, payload, timeoutMs) => this.requestModule(tweakId, id, method, payload, timeoutMs),
            dispose: () => this.disposeModule(tweakId, id),
        };
    }
    panelRef(instance) {
        return {
            id: instance.id,
            windowId: instance.windowId,
            setBounds: (bounds) => this.invokeInstance(instance.tweakId, instance.id, "setBounds", [bounds]),
            show: () => this.invokeInstance(instance.tweakId, instance.id, "show", []),
            hide: () => this.invokeInstance(instance.tweakId, instance.id, "hide", []),
            dispose: () => this.disposeInstanceById(instance.tweakId, instance.id),
        };
    }
    viewRef(instance) {
        return {
            id: instance.id,
            setBounds: (bounds) => this.invokeInstance(instance.tweakId, instance.id, "setBounds", [bounds]),
            setVisible: (visible) => this.invokeInstance(instance.tweakId, instance.id, "setVisible", [visible]),
            dispose: () => this.disposeInstanceById(instance.tweakId, instance.id),
        };
    }
    helperRef(tweakId, id, pid) {
        return {
            id,
            pid,
            send: (message) => this.sendHelper(tweakId, id, message),
            request: (message, timeoutMs) => this.requestHelper(tweakId, id, message, timeoutMs),
            stop: () => this.stopHelperById(tweakId, id),
        };
    }
    async requestModule(tweakId, id, method, payload, _timeoutMs) {
        const mod = this.moduleFor(tweakId, id);
        const target = asRecord(mod.exports);
        const fn = target?.request;
        if (typeof fn === "function") {
            return await fn.call(mod.exports, method, payload);
        }
        const methodFn = target?.[method];
        if (typeof methodFn === "function") {
            return await methodFn.call(mod.exports, payload);
        }
        throw new Error(`native module ${tweakId}:${id} has no request() or ${method}()`);
    }
    async disposeModule(tweakId, id) {
        const key = moduleKey(tweakId, id);
        const mod = this.modules.get(key);
        if (!mod)
            return;
        await callOptional(mod.exports, "dispose", []);
        this.modules.delete(key);
    }
    async createNativeInstance(ctx, kind, moduleId, factory, options) {
        const target = moduleId ? this.moduleFor(ctx.id, moduleId).exports : this.loadNativeHost(true);
        const fn = asRecord(target)?.[factory];
        if (typeof fn !== "function") {
            const label = moduleId ? `native module ${ctx.id}:${moduleId}` : "Codex++ native host";
            throw new Error(`${label} has no factory ${factory}()`);
        }
        const parentWindow = typeof options.parentWindowId === "number"
            ? electron_1.BrowserWindow.fromId(options.parentWindowId)
            : electron_1.BrowserWindow.getFocusedWindow();
        const parentNativeHandle = nativeHandleForWindow(parentWindow);
        const value = await fn.call(target, {
            ...options,
            parentWindowId: windowIdFor(parentWindow),
            parentWebContentsId: webContentsIdFor(parentWindow),
            parentNativeHandle,
        });
        const id = typeof asRecord(value)?.id === "string" ? String(asRecord(value)?.id) : (0, node_crypto_1.randomUUID)();
        const windowId = typeof asRecord(value)?.windowId === "number" ? Number(asRecord(value)?.windowId) : null;
        const instance = {
            key: instanceKey(ctx.id, id),
            tweakId: ctx.id,
            id,
            kind,
            value,
            parentWindowId: windowIdFor(parentWindow),
            windowId,
            disposeBindings: [],
            disposing: false,
        };
        this.instances.set(instance.key, instance);
        if (canBindParentWindow(parentWindow)) {
            this.bindInstanceToParent(instance, parentWindow);
            this.syncParentState(instance, parentWindow, "created");
        }
        this.log("info", `created native ${kind} ${ctx.id}:${id}`, {
            moduleId: moduleId ?? "codexpp.native-host",
            factory,
            windowId,
        });
        return instance;
    }
    loadNativeHost(required) {
        if (this.nativeHostExports)
            return this.nativeHostExports;
        if (this.nativeHostLoadError && !required)
            return null;
        const nativeHostPath = this.options.nativeHostPath;
        if (!nativeHostPath || !(0, node_fs_1.existsSync)(nativeHostPath)) {
            const error = new Error("Codex++ native host is not installed");
            this.nativeHostLoadError = error;
            if (required)
                throw error;
            return null;
        }
        try {
            this.nativeHostExports = require(nativeHostPath);
            this.nativeHostLoadError = null;
            this.log("info", "loaded Codex++ native host", { path: nativeHostPath });
            return this.nativeHostExports;
        }
        catch (error) {
            this.nativeHostLoadError = error instanceof Error ? error : new Error(String(error));
            this.log("error", "failed to load Codex++ native host", this.nativeHostLoadError);
            if (required)
                throw this.nativeHostLoadError;
            return null;
        }
    }
    readNativeHostCapabilities(host) {
        const getCapabilities = asRecord(host)?.getCapabilities;
        if (typeof getCapabilities !== "function")
            return {};
        try {
            const capabilities = getCapabilities.call(host);
            return asRecord(capabilities) ?? {};
        }
        catch (error) {
            this.log("warn", "Codex++ native host capability probe failed", error);
            return {};
        }
    }
    async invokeInstance(tweakId, id, method, args) {
        const instance = this.instanceFor(tweakId, id);
        const fn = asRecord(instance.value)?.[method];
        if (typeof fn === "function") {
            await fn.apply(instance.value, args);
            return;
        }
        if (instance.windowId !== null) {
            const win = electron_1.BrowserWindow.fromId(instance.windowId);
            if (win && !win.isDestroyed()) {
                if (method === "setBounds")
                    win.setBounds(args[0]);
                else if (method === "show")
                    win.show();
                else if (method === "hide")
                    win.hide();
                else if (method === "setVisible")
                    (args[0] ? win.show() : win.hide());
                return;
            }
        }
        throw new Error(`native ${instance.kind} ${tweakId}:${id} does not implement ${method}()`);
    }
    async disposeInstanceById(tweakId, id) {
        const key = instanceKey(tweakId, id);
        const instance = this.instances.get(key);
        if (!instance)
            return;
        await this.disposeInstance(instance);
        this.instances.delete(key);
    }
    async disposeInstance(instance) {
        if (instance.disposing)
            return;
        instance.disposing = true;
        for (const dispose of instance.disposeBindings.splice(0)) {
            try {
                dispose();
            }
            catch { }
        }
        await callOptional(instance.value, "dispose", []);
        if (instance.windowId !== null) {
            const win = electron_1.BrowserWindow.fromId(instance.windowId);
            if (win && !win.isDestroyed())
                win.close();
        }
    }
    bindInstanceToParent(instance, parentWindow) {
        const on = (event, listener) => {
            parentWindow.on(event, listener);
            instance.disposeBindings.push(() => parentWindow.off(event, listener));
        };
        const syncBounds = () => this.syncParentState(instance, parentWindow, "bounds");
        const syncFocus = (focused) => this.signalParentState(instance, parentWindow, "focus", { focused });
        const syncVisibility = (visible) => this.signalParentState(instance, parentWindow, "visibility", { visible });
        const disposeWithParent = () => {
            this.log("info", `disposing native ${instance.kind} ${instance.tweakId}:${instance.id}; parent closed`);
            void this.disposeInstanceById(instance.tweakId, instance.id);
        };
        on("move", syncBounds);
        on("resize", syncBounds);
        on("enter-full-screen", syncBounds);
        on("leave-full-screen", syncBounds);
        on("maximize", syncBounds);
        on("unmaximize", syncBounds);
        on("minimize", syncBounds);
        on("restore", syncBounds);
        on("show", () => syncVisibility(true));
        on("hide", () => syncVisibility(false));
        on("focus", () => syncFocus(true));
        on("blur", () => syncFocus(false));
        on("close", disposeWithParent);
        on("closed", disposeWithParent);
    }
    syncParentState(instance, parentWindow, reason) {
        const state = parentWindowState(parentWindow, reason);
        if (!state)
            return;
        void this.callFirstOptionalInstance(instance, ["syncParent", "parentChanged"], [state])
            .then((handled) => {
            if (!handled) {
                return this.callFirstOptionalInstance(instance, ["setParentBounds", "parentBoundsChanged"], [state.bounds, state]);
            }
            return false;
        })
            .catch((error) => this.log("warn", `native ${instance.kind} parent sync failed`, error));
    }
    signalParentState(instance, parentWindow, reason, patch) {
        const state = parentWindowState(parentWindow, reason);
        if (!state)
            return;
        const payload = { ...state, ...patch };
        void this.callFirstOptionalInstance(instance, ["parentStateChanged", "parentChanged"], [payload])
            .catch((error) => this.log("warn", `native ${instance.kind} parent signal failed`, error));
    }
    async callFirstOptionalInstance(instance, methods, args) {
        const target = asRecord(instance.value);
        for (const method of methods) {
            const fn = target?.[method];
            if (typeof fn !== "function")
                continue;
            await fn.apply(instance.value, args);
            return true;
        }
        return false;
    }
    async sendHelper(tweakId, id, message) {
        const helper = this.helperFor(tweakId, id);
        helper.child.stdin.write(`${JSON.stringify(message)}\n`);
    }
    async requestHelper(tweakId, id, message, timeoutMs = 10_000) {
        const helper = this.helperFor(tweakId, id);
        const requestId = (0, node_crypto_1.randomUUID)();
        const payload = { id: requestId, message };
        return await new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                helper.pending.delete(requestId);
                reject(new Error(`native helper request timed out: ${tweakId}:${id}`));
            }, timeoutMs);
            helper.pending.set(requestId, { resolve, reject, timer });
            helper.child.stdin.write(`${JSON.stringify(payload)}\n`);
        });
    }
    async stopHelperById(tweakId, id) {
        const key = helperKey(tweakId, id);
        const helper = this.helpers.get(key);
        if (!helper)
            return;
        this.stopHelper(helper);
        this.helpers.delete(key);
    }
    stopHelper(helper) {
        if (helper.child.killed)
            return;
        helper.child.kill();
        const timer = setTimeout(() => {
            if (!helper.child.killed)
                helper.child.kill("SIGKILL");
        }, 1500);
        timer.unref?.();
    }
    handleHelperLine(helper, line) {
        let payload;
        try {
            payload = JSON.parse(line);
        }
        catch {
            this.log("info", `native helper ${helper.tweakId}:${helper.id}`, line);
            return;
        }
        if (typeof payload.id !== "string")
            return;
        const request = helper.pending.get(payload.id);
        if (!request)
            return;
        helper.pending.delete(payload.id);
        clearTimeout(request.timer);
        if (payload.error) {
            request.reject(new Error(String(payload.error)));
        }
        else {
            request.resolve(payload.result);
        }
    }
    moduleFor(tweakId, id) {
        const mod = this.modules.get(moduleKey(tweakId, id));
        if (!mod)
            throw new Error(`native module is not loaded: ${tweakId}:${id}`);
        return mod;
    }
    instanceFor(tweakId, id) {
        const instance = this.instances.get(instanceKey(tweakId, id));
        if (!instance)
            throw new Error(`native instance is not loaded: ${tweakId}:${id}`);
        return instance;
    }
    helperFor(tweakId, id) {
        const helper = this.helpers.get(helperKey(tweakId, id));
        if (!helper)
            throw new Error(`native helper is not running: ${tweakId}:${id}`);
        return helper;
    }
}
exports.NativeBridge = NativeBridge;
function resolveTweakPath(ctx, path) {
    return (0, native_paths_1.resolveNativeTweakPath)(ctx.dir, path);
}
function inferModuleKind(path) {
    if (path.endsWith(".node"))
        return "node-addon";
    if (path.endsWith(".dylib"))
        return "dylib";
    if (path.endsWith(".framework"))
        return "framework";
    throw new Error("native module path must end in .node, .dylib, or .framework");
}
function selectEntrypoint(loaded, entrypoint) {
    if (!entrypoint)
        return asRecord(loaded)?.default ?? loaded;
    const selected = asRecord(loaded)?.[entrypoint];
    if (selected === undefined)
        throw new Error(`native module entrypoint not found: ${entrypoint}`);
    return selected;
}
function assertBridgeId(value, label) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) {
        throw new Error(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
    }
    return value;
}
function moduleKey(tweakId, moduleId) {
    return `${tweakId}:${moduleId}`;
}
function instanceKey(tweakId, id) {
    return `${tweakId}:${id}`;
}
function helperKey(tweakId, id) {
    return `${tweakId}:${id}`;
}
function asRecord(value) {
    return value && typeof value === "object" ? value : null;
}
async function callOptional(target, method, args) {
    const fn = asRecord(target)?.[method];
    if (typeof fn === "function")
        await fn.apply(target, args);
}
function parentWindowState(parentWindow, reason) {
    if (isWindowDestroyed(parentWindow))
        return null;
    const bounds = callWindowMethod(parentWindow, "getBounds");
    const contentBounds = callWindowMethod(parentWindow, "getContentBounds");
    return {
        reason,
        windowId: windowIdFor(parentWindow),
        webContentsId: webContentsIdFor(parentWindow),
        bounds,
        contentBounds,
        visible: callWindowMethod(parentWindow, "isVisible") ?? null,
        focused: callWindowMethod(parentWindow, "isFocused") ?? null,
        minimized: callWindowMethod(parentWindow, "isMinimized") ?? null,
        maximized: callWindowMethod(parentWindow, "isMaximized") ?? null,
        fullscreen: callWindowMethod(parentWindow, "isFullScreen") ?? null,
    };
}
function nativeHandleForWindow(parentWindow) {
    if (!parentWindow || isWindowDestroyed(parentWindow))
        return null;
    const fn = asRecord(parentWindow)?.getNativeWindowHandle;
    if (typeof fn !== "function")
        return null;
    try {
        const handle = fn.call(parentWindow);
        return Buffer.isBuffer(handle) ? handle : null;
    }
    catch {
        return null;
    }
}
function canBindParentWindow(parentWindow) {
    if (!parentWindow || isWindowDestroyed(parentWindow))
        return false;
    return typeof asRecord(parentWindow)?.on === "function" &&
        typeof asRecord(parentWindow)?.off === "function";
}
function isWindowDestroyed(parentWindow) {
    const fn = asRecord(parentWindow)?.isDestroyed;
    if (typeof fn !== "function")
        return false;
    try {
        return Boolean(fn.call(parentWindow));
    }
    catch {
        return true;
    }
}
function windowIdFor(parentWindow) {
    const id = asRecord(parentWindow)?.id;
    return typeof id === "number" ? id : null;
}
function webContentsIdFor(parentWindow) {
    const webContents = asRecord(asRecord(parentWindow)?.webContents);
    const id = webContents?.id;
    return typeof id === "number" ? id : null;
}
function callWindowMethod(parentWindow, method) {
    const fn = asRecord(parentWindow)?.[method];
    if (typeof fn !== "function")
        return null;
    try {
        return fn.call(parentWindow);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=native-bridge.js.map