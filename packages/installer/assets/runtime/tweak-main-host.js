"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tweakLifecycleDeps = exports.nativeBridge = exports.tweakState = void 0;
exports.loadAllMainTweaks = loadAllMainTweaks;
exports.syncMcpServersFromEnabledTweaks = syncMcpServersFromEnabledTweaks;
exports.stopAllMainTweaks = stopAllMainTweaks;
exports.clearTweakModuleCache = clearTweakModuleCache;
exports.safeRealpath = safeRealpath;
exports.listedTweaksSnapshot = listedTweaksSnapshot;
exports.ensureTweakUpdateCheck = ensureTweakUpdateCheck;
exports.installGithubReleaseTweak = installGithubReleaseTweak;
exports.broadcastReload = broadcastReload;
exports.makeLogger = makeLogger;
exports.makeMainIpc = makeMainIpc;
exports.makeMainFs = makeMainFs;
exports.currentRuntimeInfo = currentRuntimeInfo;
exports.currentRuntimeCapabilities = currentRuntimeCapabilities;
exports.tweakContext = tweakContext;
exports.discoveredTweakSnapshot = discoveredTweakSnapshot;
exports.tweakById = tweakById;
exports.authorizeEnabledTweak = authorizeEnabledTweak;
exports.assertAuthorizedTweak = assertAuthorizedTweak;
exports.assertTweakPermissionForId = assertTweakPermissionForId;
exports.assertTweakViewPermissionForId = assertTweakViewPermissionForId;
exports.assertTweakPermission = assertTweakPermission;
exports.assertTweakViewPermission = assertTweakViewPermission;
exports.assertTweakId = assertTweakId;
exports.makeCodexApi = makeCodexApi;
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tweak_discovery_1 = require("./tweak-discovery");
const storage_1 = require("./storage");
const mcp_sync_1 = require("./mcp-sync");
const tweak_lifecycle_1 = require("./tweak-lifecycle");
const native_bridge_1 = require("./native-bridge");
const native_paths_1 = require("./native-paths");
const codex_runtime_probe_1 = require("./codex-runtime-probe");
const codex_sessions_1 = require("./codex-sessions");
const tweak_permissions_1 = require("./tweak-permissions");
const tweak_fs_sandbox_1 = require("./tweak-fs-sandbox");
const config_state_1 = require("./config-state");
const store_install_1 = require("./store-install");
const tweak_store_1 = require("./tweak-store");
const runtime_paths_1 = require("./runtime-paths");
const codex_windows_1 = require("./codex-windows");
const owl_views_1 = require("./owl-views");
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
exports.tweakState = {
    discovered: [],
    loadedMain: new Map(),
};
exports.nativeBridge = new native_bridge_1.NativeBridge(runtime_paths_1.log, {
    nativeHostPath: (0, node_path_1.join)(runtime_paths_1.runtimeDir, "native", "codexpp_native_host.node"),
});
function loadAllMainTweaks() {
    try {
        exports.tweakState.discovered = (0, tweak_discovery_1.discoverTweaks)(runtime_paths_1.TWEAKS_DIR);
        (0, runtime_paths_1.log)("info", `discovered ${exports.tweakState.discovered.length} tweak(s):`, exports.tweakState.discovered.map((t) => t.manifest.id).join(", "));
    }
    catch (e) {
        (0, runtime_paths_1.log)("error", "tweak discovery failed:", e);
        exports.tweakState.discovered = [];
    }
    syncMcpServersFromEnabledTweaks();
    for (const t of exports.tweakState.discovered) {
        if (!(0, tweak_lifecycle_1.isMainProcessTweakScope)(t.manifest.scope))
            continue;
        if (!(0, config_state_1.isTweakEnabled)(t.manifest.id)) {
            (0, runtime_paths_1.log)("info", `skipping disabled main tweak: ${t.manifest.id}`);
            continue;
        }
        try {
            const mod = require(t.entry);
            const tweak = mod.default ?? mod;
            if (typeof tweak?.start === "function") {
                const storage = (0, storage_1.createDiskStorage)(runtime_paths_1.userRoot, t.manifest.id);
                tweak.start({
                    manifest: t.manifest,
                    process: "main",
                    log: makeLogger(t.manifest.id),
                    storage,
                    ipc: makeMainIpc(t.manifest),
                    fs: makeMainFs(t.manifest),
                    codex: makeCodexApi(t),
                });
                exports.tweakState.loadedMain.set(t.manifest.id, {
                    stop: tweak.stop,
                    storage,
                });
                (0, runtime_paths_1.log)("info", `started main tweak: ${t.manifest.id}`);
            }
        }
        catch (e) {
            (0, runtime_paths_1.log)("error", `tweak ${t.manifest.id} failed to start:`, e);
        }
    }
}
function syncMcpServersFromEnabledTweaks() {
    try {
        const result = (0, mcp_sync_1.syncManagedMcpServers)({
            configPath: runtime_paths_1.CODEX_CONFIG_FILE,
            tweaks: exports.tweakState.discovered.filter((t) => (0, config_state_1.isTweakEnabled)(t.manifest.id)),
        });
        if (result.changed) {
            (0, runtime_paths_1.log)("info", `synced Codex MCP config: ${result.serverNames.join(", ") || "none"}`);
        }
        if (result.skippedServerNames.length > 0) {
            (0, runtime_paths_1.log)("info", `skipped Codex++ managed MCP server(s) already configured by user: ${result.skippedServerNames.join(", ")}`);
        }
    }
    catch (e) {
        (0, runtime_paths_1.log)("warn", "failed to sync Codex MCP config:", e);
    }
}
function stopAllMainTweaks() {
    for (const [id, t] of exports.tweakState.loadedMain) {
        try {
            t.stop?.();
            t.storage.flush();
            (0, runtime_paths_1.log)("info", `stopped main tweak: ${id}`);
        }
        catch (e) {
            (0, runtime_paths_1.log)("warn", `stop failed for ${id}:`, e);
        }
        finally {
            exports.nativeBridge.disposeTweak(id);
            (0, owl_views_1.disposeOwlViewsForTweak)(id);
        }
    }
    exports.tweakState.loadedMain.clear();
}
function clearTweakModuleCache() {
    const rootSet = new Set([runtime_paths_1.TWEAKS_DIR, safeRealpath(runtime_paths_1.TWEAKS_DIR)]);
    const entrySet = new Set();
    for (const tweak of exports.tweakState.discovered) {
        rootSet.add(tweak.dir);
        rootSet.add(safeRealpath(tweak.dir));
        entrySet.add(tweak.entry);
        entrySet.add(safeRealpath(tweak.entry));
    }
    const roots = [...rootSet];
    for (const key of Object.keys(require.cache)) {
        const realKey = safeRealpath(key);
        const isTweakModule = entrySet.has(key) ||
            entrySet.has(realKey) ||
            roots.some((root) => (0, native_paths_1.isPathInside)(root, key) || (0, native_paths_1.isPathInside)(root, realKey));
        if (isTweakModule)
            delete require.cache[key];
    }
}
function safeRealpath(filePath) {
    try {
        return (0, node_fs_1.realpathSync)(filePath);
    }
    catch {
        return filePath;
    }
}
function listedTweaksSnapshot() {
    const updateChecks = (0, config_state_1.readState)().tweakUpdateChecks ?? {};
    return exports.tweakState.discovered.map((t) => ({
        manifest: t.manifest,
        entry: t.entry,
        dir: t.dir,
        entryExists: (0, node_fs_1.existsSync)(t.entry),
        enabled: (0, config_state_1.isTweakEnabled)(t.manifest.id),
        update: updateChecks[t.manifest.id] ?? null,
    }));
}
async function ensureTweakUpdateCheck(t, force = false) {
    const id = t.manifest.id;
    const repo = t.manifest.githubRepo;
    if (!repo)
        return;
    const state = (0, config_state_1.readState)();
    const cached = state.tweakUpdateChecks?.[id];
    if (!force &&
        cached &&
        cached.repo === repo &&
        cached.currentVersion === t.manifest.version &&
        Date.now() - Date.parse(cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS) {
        return;
    }
    let check;
    try {
        const { registry } = await (0, store_install_1.fetchTweakStoreRegistry)();
        const entry = registry.entries.find((candidate) => candidate.id === id);
        if (!entry) {
            check = {
                checkedAt: new Date().toISOString(),
                repo,
                currentVersion: t.manifest.version,
                latestVersion: null,
                latestTag: null,
                releaseUrl: null,
                updateAvailable: false,
            };
        }
        else {
            const latestVersion = (0, store_install_1.normalizeVersion)(entry.manifest.version);
            check = {
                checkedAt: new Date().toISOString(),
                repo,
                currentVersion: t.manifest.version,
                latestVersion,
                latestTag: null,
                releaseUrl: entry.releaseUrl ?? `https://github.com/${repo}/releases`,
                updateAvailable: (0, store_install_1.compareVersions)(latestVersion, (0, store_install_1.normalizeVersion)(t.manifest.version)) > 0,
                pinnedSha: entry.approvedCommitSha,
            };
        }
    }
    catch (e) {
        check = {
            checkedAt: new Date().toISOString(),
            repo,
            currentVersion: t.manifest.version,
            latestVersion: null,
            latestTag: null,
            releaseUrl: null,
            updateAvailable: false,
            error: e instanceof Error ? e.message : String(e),
        };
    }
    state.tweakUpdateChecks ??= {};
    state.tweakUpdateChecks[id] = check;
    (0, config_state_1.writeState)(state);
}
async function installGithubReleaseTweak(id) {
    const tweak = exports.tweakState.discovered.find((item) => item.manifest.id === id);
    if (!tweak)
        throw new Error(`unknown tweak: ${id}`);
    if (!tweak.manifest.githubRepo) {
        throw new Error(`${tweak.manifest.name} has no githubRepo in its manifest`);
    }
    let repo;
    try {
        repo = (0, tweak_store_1.normalizeGitHubRepo)(tweak.manifest.githubRepo);
    }
    catch {
        throw new Error(`${tweak.manifest.name} has an invalid githubRepo: ${tweak.manifest.githubRepo}`);
    }
    const { registry } = await (0, store_install_1.fetchTweakStoreRegistry)();
    const storeEntry = registry.entries.find((entry) => {
        if (entry.id !== id)
            return false;
        try {
            return (0, tweak_store_1.normalizeGitHubRepo)(entry.repo) === repo;
        }
        catch {
            return entry.repo === repo;
        }
    });
    if (!storeEntry) {
        throw new Error(`${tweak.manifest.name} is not listed in the ChatGPT Layer tweak store, so it can't be updated from GitHub.`);
    }
    (0, store_install_1.assertStoreEntryPlatformCompatible)(storeEntry);
    (0, store_install_1.assertStoreEntryRuntimeCompatible)(storeEntry);
    await (0, store_install_1.installStoreTweak)(storeEntry);
    (0, tweak_lifecycle_1.reloadTweaks)("store-pin-install", exports.tweakLifecycleDeps);
    const installed = exports.tweakState.discovered.find((item) => item.manifest.id === id) ?? tweak;
    await ensureTweakUpdateCheck(installed, true);
    return { installed: id, version: storeEntry.manifest.version, commitSha: storeEntry.approvedCommitSha };
}
function broadcastReload() {
    const payload = {
        at: Date.now(),
        tweaks: exports.tweakState.discovered.map((t) => t.manifest.id),
    };
    for (const wc of electron_1.webContents.getAllWebContents()) {
        try {
            wc.send("codexpp:tweaks-changed", payload);
        }
        catch (e) {
            (0, runtime_paths_1.log)("warn", "broadcast send failed:", e);
        }
    }
}
function makeLogger(scope) {
    return {
        debug: (...a) => (0, runtime_paths_1.log)("info", `[${scope}]`, ...a),
        info: (...a) => (0, runtime_paths_1.log)("info", `[${scope}]`, ...a),
        warn: (...a) => (0, runtime_paths_1.log)("warn", `[${scope}]`, ...a),
        error: (...a) => (0, runtime_paths_1.log)("error", `[${scope}]`, ...a),
    };
}
function makeMainIpc(manifest) {
    if (!(0, tweak_permissions_1.hasTweakPermission)(manifest, "ipc"))
        return (0, tweak_permissions_1.createDeniedTweakIpc)(manifest.id);
    const id = manifest.id;
    const ch = (c) => (0, tweak_permissions_1.scopedTweakIpcChannel)(id, c);
    return {
        on: (c, h) => {
            const wrapped = (_e, ...args) => h(...args);
            electron_1.ipcMain.on(ch(c), wrapped);
            return () => electron_1.ipcMain.removeListener(ch(c), wrapped);
        },
        send: (_c) => {
            throw new Error("ipc.send is renderer→main; main side uses handle/on");
        },
        invoke: (_c) => {
            throw new Error("ipc.invoke is renderer→main; main side uses handle");
        },
        handle: (c, handler) => {
            electron_1.ipcMain.handle(ch(c), (_e, ...args) => handler(...args));
        },
    };
}
function makeMainFs(manifest) {
    if (!(0, tweak_permissions_1.hasTweakPermission)(manifest, "filesystem"))
        return (0, tweak_permissions_1.createDeniedTweakFs)(manifest.id);
    const id = manifest.id;
    const dir = (0, tweak_fs_sandbox_1.ensureTweakDataDir)(runtime_paths_1.userRoot, id);
    const fs = require("node:fs/promises");
    return {
        dataDir: dir,
        read: (p) => fs.readFile((0, tweak_fs_sandbox_1.resolveTweakDataPath)(runtime_paths_1.userRoot, id, p).full, "utf8"),
        write: (p, c) => fs.writeFile((0, tweak_fs_sandbox_1.resolveTweakDataPath)(runtime_paths_1.userRoot, id, p).full, c, "utf8"),
        exists: async (p) => {
            try {
                await fs.access((0, tweak_fs_sandbox_1.resolveTweakDataPath)(runtime_paths_1.userRoot, id, p).full);
                return true;
            }
            catch {
                return false;
            }
        },
    };
}
function currentRuntimeInfo() {
    const installerState = (0, config_state_1.readInstallerState)();
    return (0, codex_runtime_probe_1.getRuntimeInfo)({
        userRoot: runtime_paths_1.userRoot,
        runtimeDir: runtime_paths_1.runtimeDir,
        codexVersion: installerState?.codexVersion ?? null,
        channel: null,
        getWindowServices: codex_windows_1.getCodexWindowServices,
        env: liveProbeEnv(),
    });
}
function currentRuntimeCapabilities() {
    const installerState = (0, config_state_1.readInstallerState)();
    return (0, codex_runtime_probe_1.getRuntimeCapabilities)({
        userRoot: runtime_paths_1.userRoot,
        runtimeDir: runtime_paths_1.runtimeDir,
        codexVersion: installerState?.codexVersion ?? null,
        channel: null,
        getWindowServices: codex_windows_1.getCodexWindowServices,
        getNativeCapabilities: () => exports.nativeBridge.getCapabilities(),
        env: liveProbeEnv(),
    });
}
function liveProbeEnv() {
    return {
        inspectExistingWindow: () => (0, codex_runtime_probe_1.windowSampleFrom)((0, codex_windows_1.getPrimaryCodexWindow)()),
    };
}
function tweakContext(tweakId, permission) {
    const tweak = permission
        ? assertAuthorizedTweak(tweakId, permission)
        : tweakById(tweakId);
    return { id: tweak.manifest.id, dir: tweak.dir };
}
function discoveredTweakSnapshot(tweakId) {
    const tweak = exports.tweakState.discovered.find((item) => item.manifest.id === tweakId);
    if (!tweak)
        return undefined;
    return {
        id: tweak.manifest.id,
        enabled: (0, config_state_1.isTweakEnabled)(tweak.manifest.id),
        dir: tweak.dir,
        manifest: tweak.manifest,
    };
}
function tweakById(tweakId) {
    const snapshot = authorizeEnabledTweak(tweakId);
    const tweak = exports.tweakState.discovered.find((item) => item.manifest.id === snapshot.id);
    if (!tweak)
        throw new Error(`unknown tweak: ${tweakId}`);
    return tweak;
}
function authorizeEnabledTweak(tweakId) {
    (0, tweak_permissions_1.assertValidTweakId)(tweakId);
    const snapshot = discoveredTweakSnapshot(tweakId);
    if (!snapshot)
        throw new Error(`unknown tweak: ${tweakId}`);
    if (!snapshot.enabled)
        throw new Error(`tweak is disabled: ${tweakId}`);
    return snapshot;
}
function assertAuthorizedTweak(tweakId, permission, ownerId) {
    const snapshot = (0, tweak_permissions_1.authorizeTweakCapability)(typeof tweakId === "string" ? discoveredTweakSnapshot(tweakId) : undefined, tweakId, permission, ownerId);
    const tweak = exports.tweakState.discovered.find((item) => item.manifest.id === snapshot.id);
    if (!tweak)
        throw new Error(`unknown tweak: ${String(tweakId)}`);
    return tweak;
}
/** @deprecated Use assertAuthorizedTweak */
function assertTweakPermissionForId(tweakId, permission) {
    return assertAuthorizedTweak(tweakId, permission);
}
/** @deprecated Use assertAuthorizedTweak(tweakId, "codex-views") */
function assertTweakViewPermissionForId(tweakId) {
    return assertAuthorizedTweak(tweakId, "codex-views");
}
function assertTweakPermission(tweak, permission) {
    (0, tweak_permissions_1.assertTweakHasPermission)(tweak.manifest, permission);
}
function assertTweakViewPermission(tweak) {
    (0, tweak_permissions_1.assertTweakHasPermission)(tweak.manifest, "codex-views");
}
function assertTweakId(tweakId) {
    (0, tweak_permissions_1.assertValidTweakId)(tweakId);
}
function makeCodexApi(tweak) {
    const surface = (0, tweak_permissions_1.tweakApiSurface)(tweak.manifest);
    if (!(0, tweak_permissions_1.hasAnyCodexApi)(surface))
        return undefined;
    const ctx = () => ({ id: tweak.manifest.id, dir: tweak.dir });
    const deny = (permission) => (0, tweak_permissions_1.createDeniedAsyncMethod)(tweak.manifest.id, permission);
    const guard = (permission, fn) => {
        return async (...args) => {
            (0, tweak_permissions_1.assertTweakHasPermission)(tweak.manifest, permission);
            return await fn(...args);
        };
    };
    return {
        runtime: {
            getInfo: surface.codexRuntime ? async () => currentRuntimeInfo() : deny("codex-runtime"),
            getCapabilities: surface.codexRuntime ? async () => currentRuntimeCapabilities() : deny("codex-runtime"),
        },
        windows: {
            create: surface.codexWindows ? guard("codex-windows", codex_windows_1.createCodexWindow) : deny("codex-windows"),
            getPrimary: surface.codexWindows ? async () => (0, codex_windows_1.getPrimaryCodexWindowRef)() : deny("codex-windows"),
            focus: surface.codexWindows
                ? guard("codex-windows", async (windowId) => (0, codex_windows_1.focusCodexWindow)(windowId))
                : deny("codex-windows"),
            show: surface.codexWindows
                ? guard("codex-windows", async (windowId) => (0, codex_windows_1.showCodexWindow)(windowId))
                : deny("codex-windows"),
        },
        views: {
            create: surface.codexViews
                ? guard("codex-views", (options) => (0, owl_views_1.createOwlView)(ctx(), options))
                : deny("codex-views"),
        },
        cdp: {
            getStatus: surface.codexCdp ? async () => (0, codex_runtime_probe_1.getCdpStatus)() : deny("codex-cdp"),
            listTargets: surface.codexCdp ? async () => (0, codex_runtime_probe_1.listCdpTargets)() : deny("codex-cdp"),
        },
        native: {
            loadModule: surface.nativeModule
                ? guard("native-module", async (options) => exports.nativeBridge.loadModule(ctx(), options))
                : deny("native-module"),
            createPanel: surface.nativeView
                ? guard("native-view", (options) => exports.nativeBridge.createPanel(ctx(), options))
                : deny("native-view"),
            attachView: surface.nativeView
                ? guard("native-view", (options) => exports.nativeBridge.attachView(ctx(), options))
                : deny("native-view"),
            launchHelper: surface.nativeHelper
                ? guard("native-helper", async (options) => exports.nativeBridge.launchHelper(ctx(), options))
                : deny("native-helper"),
        },
        createBrowserView: surface.codexViews
            ? guard("codex-views", codex_windows_1.createCodexBrowserView)
            : deny("codex-views"),
        createWindow: surface.codexWindows ? guard("codex-windows", codex_windows_1.createCodexWindow) : deny("codex-windows"),
        sessions: {
            list: surface.codexSessions
                ? async () => (0, codex_sessions_1.requireCodexSessionManager)().listSessions()
                : deny("codex-sessions"),
            getStatus: surface.codexSessions
                ? async (id) => (0, codex_sessions_1.requireCodexSessionManager)().getSessionStatus(id)
                : deny("codex-sessions"),
        },
    };
}
exports.tweakLifecycleDeps = {
    logInfo: (message) => (0, runtime_paths_1.log)("info", message),
    setTweakEnabled: config_state_1.setTweakEnabled,
    stopAllMainTweaks,
    clearTweakModuleCache,
    loadAllMainTweaks,
    broadcastReload,
};
//# sourceMappingURL=tweak-main-host.js.map