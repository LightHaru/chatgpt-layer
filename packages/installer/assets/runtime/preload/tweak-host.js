"use strict";
/**
 * Renderer-side tweak host. We:
 *   1. Ask main for the tweak list (with resolved entry path).
 *   2. For each renderer-scoped (or "both") tweak, fetch its source via IPC
 *      and execute it as a CommonJS-shaped function.
 *   3. Provide it the renderer half of the API.
 *
 * Codex runs the renderer with sandbox: true, so Node's `require()` is
 * restricted to a tiny whitelist (electron + a few polyfills). That means we
 * cannot `require()` arbitrary tweak files from disk. Instead we pull the
 * source string from main and evaluate it with `new Function` inside the
 * preload context. Tweak authors who need npm deps must bundle them in.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTweakHost = startTweakHost;
exports.teardownTweakHost = teardownTweakHost;
const electron_1 = require("electron");
const settings_injector_1 = require("./settings-injector");
const react_hook_1 = require("./react-hook");
const loaded = new Map();
let cachedPaths = null;
async function startTweakHost() {
    const tweaks = (await electron_1.ipcRenderer.invoke("codexpp:list-tweaks"));
    const paths = (await electron_1.ipcRenderer.invoke("codexpp:user-paths"));
    cachedPaths = paths;
    // Push the list to the settings injector so the Tweaks page can render
    // cards even before any tweak's start() runs (and for disabled tweaks
    // that we never load).
    (0, settings_injector_1.setListedTweaks)(tweaks);
    // Stash for the settings injector's empty-state message.
    window.__codexpp_tweaks_dir__ =
        paths.tweaksDir;
    for (const t of tweaks) {
        if (t.manifest.scope === "main")
            continue;
        if (!t.entryExists)
            continue;
        if (!t.enabled)
            continue;
        try {
            await loadTweak(t, paths);
        }
        catch (e) {
            console.error("[codex-plusplus] tweak load failed:", t.manifest.id, e);
            try {
                electron_1.ipcRenderer.send("codexpp:preload-log", "error", "tweak load failed: " + t.manifest.id + ": " + String(e?.stack ?? e));
            }
            catch { }
        }
    }
    console.info(`[codex-plusplus] renderer host loaded ${loaded.size} tweak(s):`, [...loaded.keys()].join(", ") || "(none)");
    electron_1.ipcRenderer.send("codexpp:preload-log", "info", `renderer host loaded ${loaded.size} tweak(s): ${[...loaded.keys()].join(", ") || "(none)"}`);
}
/**
 * Stop every renderer-scope tweak so a subsequent `startTweakHost()` will
 * re-evaluate fresh source. Module cache isn't relevant since we eval
 * source strings directly — each load creates a fresh scope.
 */
function teardownTweakHost() {
    for (const [id, t] of loaded) {
        try {
            t.stop?.();
        }
        catch (e) {
            console.warn("[codex-plusplus] tweak stop failed:", id, e);
        }
        finally {
            void electron_1.ipcRenderer.invoke("codexpp:codex-view-dispose-tweak", id).catch(() => { });
            void electron_1.ipcRenderer.invoke("codexpp:native-dispose-tweak", id).catch(() => { });
        }
    }
    loaded.clear();
    (0, settings_injector_1.clearSections)();
}
async function loadTweak(t, paths) {
    const source = (await electron_1.ipcRenderer.invoke("codexpp:read-tweak-source", t.entry));
    // Evaluate as CJS-shaped: provide module/exports/api. Tweak code may use
    // `module.exports = { start, stop }` or `exports.start = ...` or pure ESM
    // default export shape (we accept both).
    const module = { exports: {} };
    const exports = module.exports;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const fn = new Function("module", "exports", "console", `${source}\n//# sourceURL=codexpp-tweak://${encodeURIComponent(t.manifest.id)}/${encodeURIComponent(t.entry)}`);
    fn(module, exports, console);
    const mod = module.exports;
    const tweak = mod.default ?? mod;
    if (typeof tweak?.start !== "function") {
        throw new Error(`tweak ${t.manifest.id} has no start()`);
    }
    const api = makeRendererApi(t.manifest, paths);
    await tweak.start(api);
    loaded.set(t.manifest.id, { stop: tweak.stop?.bind(tweak) });
}
function makeRendererApi(manifest, paths) {
    const id = manifest.id;
    const log = (level, ...a) => {
        const consoleFn = level === "debug" ? console.debug
            : level === "warn" ? console.warn
                : level === "error" ? console.error
                    : console.log;
        consoleFn(`[codex-plusplus][${id}]`, ...a);
        // Also mirror to main's log file so we can diagnose tweak behavior
        // without attaching DevTools. Stringify each arg defensively.
        try {
            const parts = a.map((v) => {
                if (typeof v === "string")
                    return v;
                if (v instanceof Error)
                    return `${v.name}: ${v.message}`;
                try {
                    return JSON.stringify(v);
                }
                catch {
                    return String(v);
                }
            });
            electron_1.ipcRenderer.send("codexpp:preload-log", level, `[tweak ${id}] ${parts.join(" ")}`);
        }
        catch {
            /* swallow — never let logging break a tweak */
        }
    };
    return {
        manifest,
        process: "renderer",
        log: {
            debug: (...a) => log("debug", ...a),
            info: (...a) => log("info", ...a),
            warn: (...a) => log("warn", ...a),
            error: (...a) => log("error", ...a),
        },
        storage: rendererStorage(id),
        settings: {
            register: (s) => (0, settings_injector_1.registerSection)({ ...s, id: `${id}:${s.id}` }),
            registerPage: (p) => (0, settings_injector_1.registerPage)(id, manifest, { ...p, id: `${id}:${p.id}` }),
        },
        react: {
            getFiber: (n) => (0, react_hook_1.fiberForNode)(n),
            findOwnerByName: (n, name) => {
                let f = (0, react_hook_1.fiberForNode)(n);
                while (f) {
                    const t = f.type;
                    if (t && (t.displayName === name || t.name === name))
                        return f;
                    f = f.return;
                }
                return null;
            },
            waitForElement: (sel, timeoutMs = 5000) => new Promise((resolve, reject) => {
                const existing = document.querySelector(sel);
                if (existing)
                    return resolve(existing);
                const deadline = Date.now() + timeoutMs;
                const obs = new MutationObserver(() => {
                    const el = document.querySelector(sel);
                    if (el) {
                        obs.disconnect();
                        resolve(el);
                    }
                    else if (Date.now() > deadline) {
                        obs.disconnect();
                        reject(new Error(`timeout waiting for ${sel}`));
                    }
                });
                obs.observe(document.documentElement, { childList: true, subtree: true });
            }),
        },
        ipc: {
            on: (c, h) => {
                const wrapped = (_e, ...args) => h(...args);
                electron_1.ipcRenderer.on(`codexpp:${id}:${c}`, wrapped);
                return () => electron_1.ipcRenderer.removeListener(`codexpp:${id}:${c}`, wrapped);
            },
            send: (c, ...args) => electron_1.ipcRenderer.send(`codexpp:${id}:${c}`, ...args),
            invoke: (c, ...args) => electron_1.ipcRenderer.invoke(`codexpp:${id}:${c}`, ...args),
        },
        fs: rendererFs(id, paths),
        codex: rendererCodexApi(id),
    };
}
function rendererCodexApi(tweakId) {
    return {
        runtime: {
            getInfo: async () => {
                const info = await electron_1.ipcRenderer.invoke("codexpp:codex-runtime-info");
                const bridge = rendererElectronBridge();
                return {
                    ...info,
                    buildFlavor: bridge?.getBuildFlavor?.() ?? info.buildFlavor,
                    usesOwlAppShell: bridge?.usesOwlAppShell?.() ?? info.usesOwlAppShell,
                };
            },
            getCapabilities: () => electron_1.ipcRenderer.invoke("codexpp:codex-runtime-capabilities"),
        },
        windows: {
            create: (options) => electron_1.ipcRenderer.invoke("codexpp:codex-window-create", options),
            getPrimary: () => electron_1.ipcRenderer.invoke("codexpp:codex-window-primary"),
            focus: (windowId) => electron_1.ipcRenderer.invoke("codexpp:codex-window-focus", windowId),
            show: (windowId) => electron_1.ipcRenderer.invoke("codexpp:codex-window-show", windowId),
        },
        views: {
            create: async (options) => {
                const ref = await electron_1.ipcRenderer.invoke("codexpp:codex-view-create", tweakId, options);
                return rendererCodexViewRef(tweakId, ref.id, ref.webContentsId, ref.parentWindowId);
            },
        },
        cdp: {
            getStatus: () => electron_1.ipcRenderer.invoke("codexpp:codex-cdp-status"),
            listTargets: () => electron_1.ipcRenderer.invoke("codexpp:codex-cdp-targets"),
        },
        native: {
            loadModule: async (options) => {
                const ref = await electron_1.ipcRenderer.invoke("codexpp:native-load-module", tweakId, options);
                return rendererNativeModuleRef(tweakId, ref.id, ref.kind);
            },
            createPanel: async (options) => {
                const ref = await electron_1.ipcRenderer.invoke("codexpp:native-create-panel", tweakId, options);
                return rendererNativePanelRef(tweakId, ref.id, ref.windowId);
            },
            attachView: async (options) => {
                const ref = await electron_1.ipcRenderer.invoke("codexpp:native-attach-view", tweakId, options);
                return rendererNativeViewRef(tweakId, ref.id);
            },
            launchHelper: async (options) => {
                const ref = await electron_1.ipcRenderer.invoke("codexpp:native-launch-helper", tweakId, options);
                return rendererNativeHelperRef(tweakId, ref.id, ref.pid);
            },
        },
        createBrowserView: (_options) => {
            throw new Error("api.codex.createBrowserView is main-only; use a main-scoped tweak");
        },
        createWindow: (options) => electron_1.ipcRenderer.invoke("codexpp:codex-window-create", options),
    };
}
function rendererCodexViewRef(tweakId, id, webContentsId, parentWindowId) {
    return {
        id,
        webContentsId,
        parentWindowId,
        setBounds: (bounds) => electron_1.ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "setBounds", bounds),
        setVisible: (visible) => electron_1.ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "setVisible", visible),
        bringToFront: () => electron_1.ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "bringToFront"),
        loadRoute: (route, hostId) => electron_1.ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "loadRoute", route, hostId),
        loadUrl: (url) => electron_1.ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "loadUrl", url),
        dispose: () => electron_1.ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "dispose"),
    };
}
function rendererNativeModuleRef(tweakId, id, kind) {
    return {
        id,
        kind,
        request: (method, payload, timeoutMs) => electron_1.ipcRenderer.invoke("codexpp:native-module-request", tweakId, id, method, payload, timeoutMs),
        dispose: () => electron_1.ipcRenderer.invoke("codexpp:native-module-dispose", tweakId, id),
    };
}
function rendererNativePanelRef(tweakId, id, windowId) {
    return {
        id,
        windowId,
        setBounds: (bounds) => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "setBounds", bounds),
        show: () => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "show"),
        hide: () => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "hide"),
        dispose: () => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "dispose"),
    };
}
function rendererNativeViewRef(tweakId, id) {
    return {
        id,
        setBounds: (bounds) => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "view", id, "setBounds", bounds),
        setVisible: (visible) => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "view", id, "setVisible", visible),
        dispose: () => electron_1.ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "view", id, "dispose"),
    };
}
function rendererNativeHelperRef(tweakId, id, pid) {
    return {
        id,
        pid,
        send: (message) => electron_1.ipcRenderer.invoke("codexpp:native-helper-call", tweakId, id, "send", message),
        request: (message, timeoutMs) => electron_1.ipcRenderer.invoke("codexpp:native-helper-call", tweakId, id, "request", message, timeoutMs),
        stop: () => electron_1.ipcRenderer.invoke("codexpp:native-helper-call", tweakId, id, "stop"),
    };
}
function rendererElectronBridge() {
    const value = window.electronBridge;
    return value && typeof value === "object" ? value : null;
}
function rendererStorage(id) {
    const key = `codexpp:storage:${id}`;
    const read = () => {
        try {
            return JSON.parse(localStorage.getItem(key) ?? "{}");
        }
        catch {
            return {};
        }
    };
    const write = (v) => localStorage.setItem(key, JSON.stringify(v));
    return {
        get: (k, d) => (k in read() ? read()[k] : d),
        set: (k, v) => {
            const o = read();
            o[k] = v;
            write(o);
        },
        delete: (k) => {
            const o = read();
            delete o[k];
            write(o);
        },
        all: () => read(),
    };
}
function rendererFs(id, _paths) {
    // Sandboxed renderer can't use Node fs directly — proxy through main IPC.
    return {
        dataDir: `<remote>/tweak-data/${id}`,
        read: (p) => electron_1.ipcRenderer.invoke("codexpp:tweak-fs", "read", id, p),
        write: (p, c) => electron_1.ipcRenderer.invoke("codexpp:tweak-fs", "write", id, p, c),
        exists: (p) => electron_1.ipcRenderer.invoke("codexpp:tweak-fs", "exists", id, p),
    };
}
//# sourceMappingURL=tweak-host.js.map