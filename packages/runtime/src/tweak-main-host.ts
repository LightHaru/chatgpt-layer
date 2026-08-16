import { ipcMain, webContents } from "electron";
import { existsSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { discoverTweaks, type DiscoveredTweak } from "./tweak-discovery";
import { createDiskStorage, type DiskStorage } from "./storage";
import { syncManagedMcpServers } from "./mcp-sync";
import {
  isMainProcessTweakScope,
  reloadTweaks,
  type SetTweakEnabledAndReloadDeps,
} from "./tweak-lifecycle";
import { NativeBridge, type NativeTweakContext } from "./native-bridge";
import { isPathInside } from "./native-paths";
import {
  getCdpStatus,
  getRuntimeCapabilities,
  getRuntimeInfo,
  listCdpTargets,
  windowSampleFrom,
} from "./codex-runtime-probe";
import type {
  CodexApi,
  CodexRuntimeCapabilities,
  CodexRuntimeInfo,
  CodexViewCreateOptions,
  NativeHelperLaunchOptions,
  NativeModuleLoadOptions,
  NativePanelCreateOptions,
  NativeViewAttachOptions,
  TweakFs,
  TweakIpc,
  TweakManifest,
  TweakPermission,
} from "@codex-plusplus/sdk";
import { requireCodexSessionManager } from "./codex-sessions";
import {
  assertTweakHasPermission,
  assertValidTweakId,
  authorizeTweakCapability,
  createDeniedAsyncMethod,
  createDeniedTweakFs,
  createDeniedTweakIpc,
  hasAnyCodexApi,
  hasTweakPermission,
  scopedTweakIpcChannel,
  tweakApiSurface,
  type TweakIdentitySnapshot,
} from "./tweak-permissions";
import { ensureTweakDataDir, resolveTweakDataPath } from "./tweak-fs-sandbox";
import {
  isTweakEnabled,
  readInstallerState,
  readState,
  setTweakEnabled,
  writeState,
  type TweakUpdateCheck,
} from "./config-state";
import {
  assertStoreEntryPlatformCompatible,
  assertStoreEntryRuntimeCompatible,
  compareVersions,
  fetchTweakStoreRegistry,
  installStoreTweak,
  normalizeVersion,
} from "./store-install";
import { normalizeGitHubRepo } from "./tweak-store";
import {
  CODEX_CONFIG_FILE,
  TWEAKS_DIR,
  log,
  runtimeDir,
  userRoot,
} from "./runtime-paths";
import {
  createCodexBrowserView,
  createCodexWindow,
  focusCodexWindow,
  getCodexWindowServices,
  getPrimaryCodexWindow,
  getPrimaryCodexWindowRef,
  showCodexWindow,
} from "./codex-windows";
import {
  createOwlView,
  disposeOwlViewsForTweak,
} from "./owl-views";

const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export interface LoadedMainTweak {
  stop?: () => void;
  storage: DiskStorage;
}

export const tweakState = {
  discovered: [] as DiscoveredTweak[],
  loadedMain: new Map<string, LoadedMainTweak>(),
};

export const nativeBridge = new NativeBridge(log, {
  nativeHostPath: join(runtimeDir, "native", "codexpp_native_host.node"),
});

export function loadAllMainTweaks(): void {
  try {
    tweakState.discovered = discoverTweaks(TWEAKS_DIR);
    log(
      "info",
      `discovered ${tweakState.discovered.length} tweak(s):`,
      tweakState.discovered.map((t) => t.manifest.id).join(", "),
    );
  } catch (e) {
    log("error", "tweak discovery failed:", e);
    tweakState.discovered = [];
  }

  syncMcpServersFromEnabledTweaks();

  for (const t of tweakState.discovered) {
    if (!isMainProcessTweakScope(t.manifest.scope)) continue;
    if (!isTweakEnabled(t.manifest.id)) {
      log("info", `skipping disabled main tweak: ${t.manifest.id}`);
      continue;
    }
    try {
      const mod = require(t.entry);
      const tweak = mod.default ?? mod;
      if (typeof tweak?.start === "function") {
        const storage = createDiskStorage(userRoot!, t.manifest.id);
        tweak.start({
          manifest: t.manifest,
          process: "main",
          log: makeLogger(t.manifest.id),
          storage,
          ipc: makeMainIpc(t.manifest),
          fs: makeMainFs(t.manifest),
          codex: makeCodexApi(t),
        });
        tweakState.loadedMain.set(t.manifest.id, {
          stop: tweak.stop,
          storage,
        });
        log("info", `started main tweak: ${t.manifest.id}`);
      }
    } catch (e) {
      log("error", `tweak ${t.manifest.id} failed to start:`, e);
    }
  }
}

export function syncMcpServersFromEnabledTweaks(): void {
  try {
    const result = syncManagedMcpServers({
      configPath: CODEX_CONFIG_FILE,
      tweaks: tweakState.discovered.filter((t) => isTweakEnabled(t.manifest.id)),
    });
    if (result.changed) {
      log("info", `synced Codex MCP config: ${result.serverNames.join(", ") || "none"}`);
    }
    if (result.skippedServerNames.length > 0) {
      log(
        "info",
        `skipped Codex++ managed MCP server(s) already configured by user: ${result.skippedServerNames.join(", ")}`,
      );
    }
  } catch (e) {
    log("warn", "failed to sync Codex MCP config:", e);
  }
}

export function stopAllMainTweaks(): void {
  for (const [id, t] of tweakState.loadedMain) {
    try {
      t.stop?.();
      t.storage.flush();
      log("info", `stopped main tweak: ${id}`);
    } catch (e) {
      log("warn", `stop failed for ${id}:`, e);
    } finally {
      nativeBridge.disposeTweak(id);
      disposeOwlViewsForTweak(id);
    }
  }
  tweakState.loadedMain.clear();
}

export function clearTweakModuleCache(): void {
  const rootSet = new Set<string>([TWEAKS_DIR, safeRealpath(TWEAKS_DIR)]);
  const entrySet = new Set<string>();
  for (const tweak of tweakState.discovered) {
    rootSet.add(tweak.dir);
    rootSet.add(safeRealpath(tweak.dir));
    entrySet.add(tweak.entry);
    entrySet.add(safeRealpath(tweak.entry));
  }

  const roots = [...rootSet];
  for (const key of Object.keys(require.cache)) {
    const realKey = safeRealpath(key);
    const isTweakModule =
      entrySet.has(key) ||
      entrySet.has(realKey) ||
      roots.some((root) => isPathInside(root, key) || isPathInside(root, realKey));
    if (isTweakModule) delete require.cache[key];
  }
}

export function safeRealpath(filePath: string): string {
  try {
    return realpathSync(filePath);
  } catch {
    return filePath;
  }
}

export function listedTweaksSnapshot() {
  const updateChecks = readState().tweakUpdateChecks ?? {};
  return tweakState.discovered.map((t) => ({
    manifest: t.manifest,
    entry: t.entry,
    dir: t.dir,
    entryExists: existsSync(t.entry),
    enabled: isTweakEnabled(t.manifest.id),
    update: updateChecks[t.manifest.id] ?? null,
  }));
}

export async function ensureTweakUpdateCheck(t: DiscoveredTweak, force = false): Promise<void> {
  const id = t.manifest.id;
  const repo = t.manifest.githubRepo;
  if (!repo) return;
  const state = readState();
  const cached = state.tweakUpdateChecks?.[id];
  if (
    !force &&
    cached &&
    cached.repo === repo &&
    cached.currentVersion === t.manifest.version &&
    Date.now() - Date.parse(cached.checkedAt) < UPDATE_CHECK_INTERVAL_MS
  ) {
    return;
  }

  let check: TweakUpdateCheck;
  try {
    const { registry } = await fetchTweakStoreRegistry();
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
    } else {
      const latestVersion = normalizeVersion(entry.manifest.version);
      check = {
        checkedAt: new Date().toISOString(),
        repo,
        currentVersion: t.manifest.version,
        latestVersion,
        latestTag: null,
        releaseUrl: entry.releaseUrl ?? `https://github.com/${repo}/releases`,
        updateAvailable: compareVersions(latestVersion, normalizeVersion(t.manifest.version)) > 0,
        pinnedSha: entry.approvedCommitSha,
      };
    }
  } catch (e) {
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
  writeState(state);
}

export async function installGithubReleaseTweak(id: string): Promise<{
  installed: string;
  version: string;
  commitSha: string;
}> {
  const tweak = tweakState.discovered.find((item) => item.manifest.id === id);
  if (!tweak) throw new Error(`unknown tweak: ${id}`);
  if (!tweak.manifest.githubRepo) {
    throw new Error(`${tweak.manifest.name} has no githubRepo in its manifest`);
  }

  let repo: string;
  try {
    repo = normalizeGitHubRepo(tweak.manifest.githubRepo);
  } catch {
    throw new Error(`${tweak.manifest.name} has an invalid githubRepo: ${tweak.manifest.githubRepo}`);
  }

  const { registry } = await fetchTweakStoreRegistry();
  const storeEntry = registry.entries.find((entry) => {
    if (entry.id !== id) return false;
    try {
      return normalizeGitHubRepo(entry.repo) === repo;
    } catch {
      return entry.repo === repo;
    }
  });
  if (!storeEntry) {
    throw new Error(
      `${tweak.manifest.name} is not listed in the ChatGPT Layer tweak store, so it can't be updated from GitHub.`,
    );
  }

  assertStoreEntryPlatformCompatible(storeEntry);
  assertStoreEntryRuntimeCompatible(storeEntry);
  await installStoreTweak(storeEntry);
  reloadTweaks("store-pin-install", tweakLifecycleDeps);
  const installed = tweakState.discovered.find((item) => item.manifest.id === id) ?? tweak;
  await ensureTweakUpdateCheck(installed, true);
  return { installed: id, version: storeEntry.manifest.version, commitSha: storeEntry.approvedCommitSha };
}

export function broadcastReload(): void {
  const payload = {
    at: Date.now(),
    tweaks: tweakState.discovered.map((t) => t.manifest.id),
  };
  for (const wc of webContents.getAllWebContents()) {
    try {
      wc.send("codexpp:tweaks-changed", payload);
    } catch (e) {
      log("warn", "broadcast send failed:", e);
    }
  }
}

export function makeLogger(scope: string) {
  return {
    debug: (...a: unknown[]) => log("info", `[${scope}]`, ...a),
    info: (...a: unknown[]) => log("info", `[${scope}]`, ...a),
    warn: (...a: unknown[]) => log("warn", `[${scope}]`, ...a),
    error: (...a: unknown[]) => log("error", `[${scope}]`, ...a),
  };
}

export function makeMainIpc(manifest: TweakManifest): TweakIpc {
  if (!hasTweakPermission(manifest, "ipc")) return createDeniedTweakIpc(manifest.id);
  const id = manifest.id;
  const ch = (c: string) => scopedTweakIpcChannel(id, c);
  return {
    on: (c: string, h: (...args: unknown[]) => void) => {
      const wrapped = (_e: unknown, ...args: unknown[]) => h(...args);
      ipcMain.on(ch(c), wrapped);
      return () => ipcMain.removeListener(ch(c), wrapped as never);
    },
    send: (_c: string) => {
      throw new Error("ipc.send is renderer→main; main side uses handle/on");
    },
    invoke: (_c: string) => {
      throw new Error("ipc.invoke is renderer→main; main side uses handle");
    },
    handle: (c: string, handler: (...args: unknown[]) => unknown) => {
      ipcMain.handle(ch(c), (_e: unknown, ...args: unknown[]) => handler(...args));
    },
  };
}

export function makeMainFs(manifest: TweakManifest): TweakFs {
  if (!hasTweakPermission(manifest, "filesystem")) return createDeniedTweakFs(manifest.id);
  const id = manifest.id;
  const dir = ensureTweakDataDir(userRoot!, id);
  const fs = require("node:fs/promises") as typeof import("node:fs/promises");
  return {
    dataDir: dir,
    read: (p: string) => fs.readFile(resolveTweakDataPath(userRoot!, id, p).full, "utf8"),
    write: (p: string, c: string) => fs.writeFile(resolveTweakDataPath(userRoot!, id, p).full, c, "utf8"),
    exists: async (p: string) => {
      try {
        await fs.access(resolveTweakDataPath(userRoot!, id, p).full);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function currentRuntimeInfo(): CodexRuntimeInfo {
  const installerState = readInstallerState();
  return getRuntimeInfo({
    userRoot: userRoot!,
    runtimeDir: runtimeDir!,
    codexVersion: installerState?.codexVersion ?? null,
    channel: null,
    getWindowServices: getCodexWindowServices,
    env: liveProbeEnv(),
  });
}

export function currentRuntimeCapabilities(): CodexRuntimeCapabilities {
  const installerState = readInstallerState();
  return getRuntimeCapabilities({
    userRoot: userRoot!,
    runtimeDir: runtimeDir!,
    codexVersion: installerState?.codexVersion ?? null,
    channel: null,
    getWindowServices: getCodexWindowServices,
    getNativeCapabilities: () => nativeBridge.getCapabilities(),
    env: liveProbeEnv(),
  });
}

function liveProbeEnv() {
  return {
    inspectExistingWindow: () => windowSampleFrom(getPrimaryCodexWindow()),
  };
}

export function tweakContext(tweakId: string, permission?: TweakPermission): NativeTweakContext {
  const tweak = permission
    ? assertAuthorizedTweak(tweakId, permission)
    : tweakById(tweakId);
  return { id: tweak.manifest.id, dir: tweak.dir };
}

export function discoveredTweakSnapshot(tweakId: string): TweakIdentitySnapshot | undefined {
  const tweak = tweakState.discovered.find((item) => item.manifest.id === tweakId);
  if (!tweak) return undefined;
  return {
    id: tweak.manifest.id,
    enabled: isTweakEnabled(tweak.manifest.id),
    dir: tweak.dir,
    manifest: tweak.manifest,
  };
}

export function tweakById(tweakId: string): DiscoveredTweak {
  const snapshot = authorizeEnabledTweak(tweakId);
  const tweak = tweakState.discovered.find((item) => item.manifest.id === snapshot.id);
  if (!tweak) throw new Error(`unknown tweak: ${tweakId}`);
  return tweak;
}

export function authorizeEnabledTweak(tweakId: unknown): TweakIdentitySnapshot {
  assertValidTweakId(tweakId);
  const snapshot = discoveredTweakSnapshot(tweakId);
  if (!snapshot) throw new Error(`unknown tweak: ${tweakId}`);
  if (!snapshot.enabled) throw new Error(`tweak is disabled: ${tweakId}`);
  return snapshot;
}

export function assertAuthorizedTweak(
  tweakId: unknown,
  permission: TweakPermission,
  ownerId?: string,
): DiscoveredTweak {
  const snapshot = authorizeTweakCapability(
    typeof tweakId === "string" ? discoveredTweakSnapshot(tweakId) : undefined,
    tweakId,
    permission,
    ownerId,
  );
  const tweak = tweakState.discovered.find((item) => item.manifest.id === snapshot.id);
  if (!tweak) throw new Error(`unknown tweak: ${String(tweakId)}`);
  return tweak;
}

/** @deprecated Use assertAuthorizedTweak */
export function assertTweakPermissionForId(tweakId: string, permission: TweakPermission): DiscoveredTweak {
  return assertAuthorizedTweak(tweakId, permission);
}

/** @deprecated Use assertAuthorizedTweak(tweakId, "codex-views") */
export function assertTweakViewPermissionForId(tweakId: string): DiscoveredTweak {
  return assertAuthorizedTweak(tweakId, "codex-views");
}

export function assertTweakPermission(tweak: DiscoveredTweak, permission: TweakPermission): void {
  assertTweakHasPermission(tweak.manifest, permission);
}

export function assertTweakViewPermission(tweak: DiscoveredTweak): void {
  assertTweakHasPermission(tweak.manifest, "codex-views");
}

export function assertTweakId(tweakId: string): void {
  assertValidTweakId(tweakId);
}

export function makeCodexApi(tweak: DiscoveredTweak): CodexApi | undefined {
  const surface = tweakApiSurface(tweak.manifest);
  if (!hasAnyCodexApi(surface)) return undefined;
  const ctx = (): NativeTweakContext => ({ id: tweak.manifest.id, dir: tweak.dir });
  const deny = (permission: TweakPermission) => createDeniedAsyncMethod(tweak.manifest.id, permission);
  const guard = <A extends unknown[], R>(
    permission: TweakPermission,
    fn: (...args: A) => R | Promise<R>,
  ): ((...args: A) => Promise<R>) => {
    return async (...args: A) => {
      assertTweakHasPermission(tweak.manifest, permission);
      return await fn(...args);
    };
  };
  return {
    runtime: {
      getInfo: surface.codexRuntime ? async () => currentRuntimeInfo() : deny("codex-runtime"),
      getCapabilities: surface.codexRuntime ? async () => currentRuntimeCapabilities() : deny("codex-runtime"),
    },
    windows: {
      create: surface.codexWindows ? guard("codex-windows", createCodexWindow) : deny("codex-windows"),
      getPrimary: surface.codexWindows ? async () => getPrimaryCodexWindowRef() : deny("codex-windows"),
      focus: surface.codexWindows
        ? guard("codex-windows", async (windowId: number) => focusCodexWindow(windowId))
        : deny("codex-windows"),
      show: surface.codexWindows
        ? guard("codex-windows", async (windowId: number) => showCodexWindow(windowId))
        : deny("codex-windows"),
    },
    views: {
      create: surface.codexViews
        ? guard("codex-views", (options: CodexViewCreateOptions) => createOwlView(ctx(), options))
        : deny("codex-views"),
    },
    cdp: {
      getStatus: surface.codexCdp ? async () => getCdpStatus() : deny("codex-cdp"),
      listTargets: surface.codexCdp ? async () => listCdpTargets() : deny("codex-cdp"),
    },
    native: {
      loadModule: surface.nativeModule
        ? guard("native-module", async (options: NativeModuleLoadOptions) => nativeBridge.loadModule(ctx(), options))
        : deny("native-module"),
      createPanel: surface.nativeView
        ? guard("native-view", (options: NativePanelCreateOptions) => nativeBridge.createPanel(ctx(), options))
        : deny("native-view"),
      attachView: surface.nativeView
        ? guard("native-view", (options: NativeViewAttachOptions) => nativeBridge.attachView(ctx(), options))
        : deny("native-view"),
      launchHelper: surface.nativeHelper
        ? guard("native-helper", async (options: NativeHelperLaunchOptions) => nativeBridge.launchHelper(ctx(), options))
        : deny("native-helper"),
    },
    createBrowserView: surface.codexViews
      ? guard("codex-views", createCodexBrowserView)
      : deny("codex-views"),
    createWindow: surface.codexWindows ? guard("codex-windows", createCodexWindow) : deny("codex-windows"),
    sessions: {
      list: surface.codexSessions
        ? async () => requireCodexSessionManager().listSessions()
        : deny("codex-sessions"),
      getStatus: surface.codexSessions
        ? async (id: string) => requireCodexSessionManager().getSessionStatus(id)
        : deny("codex-sessions"),
    },
  };
}


export const tweakLifecycleDeps: SetTweakEnabledAndReloadDeps = {
  logInfo: (message: string) => log("info", message),
  setTweakEnabled,
  stopAllMainTweaks,
  clearTweakModuleCache,
  loadAllMainTweaks,
  broadcastReload,
};
