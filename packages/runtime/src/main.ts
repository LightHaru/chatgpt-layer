/**
 * Main-process bootstrap. Loaded by the asar loader before Codex's own
 * main process code runs. We hook `BrowserWindow` so every window Codex
 * creates gets our preload script attached. We also stand up an IPC
 * channel for tweaks to talk to the main process.
 *
 * We are in CJS land here (matches Electron's main process and Codex's own
 * code). The renderer-side runtime is bundled separately into preload.js.
 */

import { app, clipboard, ipcMain, session, shell } from "electron";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import chokidar from "chokidar";
import { appendCappedLog } from "./logging";
import { getCdpStatus, listCdpTargets, selectPreloadRegistration } from "./codex-runtime-probe";
import { getWatcherHealth } from "./watcher-health";
import {
  reloadTweaks,
  setTweakEnabledAndReload,
} from "./tweak-lifecycle";
import {
  assertPrivilegedIpcSender,
  isLayerAutoUpdateEnabled,
  isPrivilegedIpcSender,
  stripRendererUpdateRepo,
} from "./ipc-guard";
import { maybeStartBrowserUiServer } from "./browser-ui";
import { isPathInside } from "./native-paths";
import {
  CODEX_PLUSPLUS_REPO,
  CODEX_PLUSPLUS_VERSION,
  GUEST_PRELOAD_PATH,
  LOG_DIR,
  PRELOAD_PATH,
  TWEAKS_DIR,
  TWEAK_STORE_INDEX_URL,
  log,
  runtimeDir,
  userRoot,
} from "./runtime-paths";
import {
  isCodexPlusPlusAutoUpdateEnabled,
  isCodexPlusPlusSafeModeEnabled,
  isTweakEnabled,
  readInstallerState,
  readSelfUpdateState,
  readState,
  setCodexPlusPlusAutoUpdate,
  setCodexPlusPlusUpdateConfig,
  type SelfUpdateChannel,
} from "./config-state";
import {
  assertStoreEntryPlatformCompatible,
  assertStoreEntryRuntimeCompatible,
  fetchTweakStoreRegistry,
  installStoreTweak,
  prepareTweakStoreSubmission,
  storeEntryPlatformCompatibility,
  storeEntryRuntimeCompatibility,
} from "./store-install";
import { shuffleStoreEntries } from "./tweak-store";
import { randomInt } from "node:crypto";
import {
  describeInstallationSource,
  ensureCodexPlusPlusUpdateCheck,
  fallbackSourceRoot,
  installSparkleUpdateHook,
  markSelfUpdateStarted,
  startInstalledCli,
} from "./self-update";
import {
  callOwlView,
  createOwlView,
  disposeAllOwlViews,
  disposeOwlViewsForTweak,
  untrustedWebContentsIds,
} from "./owl-views";
import {
  createCodexWindow,
  focusCodexWindow,
  getCodexWindowServices,
  getPrimaryCodexWindowRef,
  showCodexWindow,
  type CodexCreateWindowOptions,
} from "./codex-windows";
import {
  assertAuthorizedTweak,
  assertTweakId,
  currentRuntimeCapabilities,
  currentRuntimeInfo,
  ensureTweakUpdateCheck,
  installGithubReleaseTweak,
  listedTweaksSnapshot,
  loadAllMainTweaks,
  nativeBridge,
  stopAllMainTweaks,
  tweakContext,
  tweakLifecycleDeps,
  tweakState,
} from "./tweak-main-host";
import { ensureTweakDataDir, resolveTweakDataPath } from "./tweak-fs-sandbox";
import {
  CodexSessionManager,
  assertSessionId,
  createNodeCodexProcessLauncher,
  resolveTrustedCodexExecutable,
  setCodexSessionManager,
} from "./codex-sessions";
import type {
  CodexViewCreateOptions,
  NativeHelperLaunchOptions,
  NativeModuleLoadOptions,
  NativePanelCreateOptions,
  NativeViewAttachOptions,
} from "@codex-plusplus/sdk";

// Optional: enable Chrome DevTools Protocol on a TCP port so we can drive the
// running Codex from outside (curl http://localhost:<port>/json, attach via
// CDP WebSocket, take screenshots, evaluate in renderer, etc.). Codex's
// production build sets webPreferences.devTools=false, which kills the
// in-window DevTools shortcut, but `--remote-debugging-port` works regardless
// because it's a Chromium command-line switch processed before app init.
//
// Off by default. Set CODEXPP_REMOTE_DEBUG=1 (optionally CODEXPP_REMOTE_DEBUG_PORT)
// to turn it on. Must be appended before `app` becomes ready; we're at module
// top-level so that's fine.
if (process.env.CODEXPP_REMOTE_DEBUG === "1") {
  const port = process.env.CODEXPP_REMOTE_DEBUG_PORT ?? "9222";
  app.commandLine.appendSwitch("remote-debugging-port", port);
  log("info", `remote debugging enabled on port ${port}`);
}

// Surface unhandled errors from anywhere in the main process to our log.
process.on("uncaughtException", (e: Error & { code?: string }) => {
  log("error", "uncaughtException", { code: e.code, message: e.message, stack: e.stack });
});
process.on("unhandledRejection", (e) => {
  log("error", "unhandledRejection", { value: String(e) });
});

installSparkleUpdateHook();

// 1. Hook every session so our preload runs in every renderer.
//
// We use Electron's modern `session.registerPreloadScript` API (added in
// Electron 35). The deprecated `setPreloads` path silently no-ops in some
// configurations (notably with sandboxed renderers), so registerPreloadScript
// is the only reliable way to inject into Codex's BrowserWindows.
function registerPreload(s: Electron.Session, label: string, kind: "full" | "guest" = "full"): void {
  const filePath = kind === "guest" && existsSync(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : PRELOAD_PATH;
  const id = kind === "guest" ? "codex-plusplus-guest" : "codex-plusplus";
  try {
    const strategy = selectPreloadRegistration(s);
    if (strategy === "registerPreloadScript") {
      const reg = (s as unknown as {
        registerPreloadScript: (opts: {
          type?: "frame" | "service-worker";
          id?: string;
          filePath: string;
        }) => string;
      }).registerPreloadScript;
      reg.call(s, { type: "frame", filePath, id });
      log("info", `preload registered (registerPreloadScript) on ${label}:`, filePath);
      return;
    }
    if (strategy === "setPreloads") {
      const existing = s.getPreloads();
      if (!existing.includes(filePath)) {
        s.setPreloads([...existing, filePath]);
      }
      log("info", `preload registered (setPreloads) on ${label}:`, filePath);
      return;
    }
    log("error", `preload registration on ${label} failed: no session preload API`);
  } catch (e) {
    if (e instanceof Error && e.message.includes("existing ID")) {
      log("info", `preload already registered on ${label}:`, PRELOAD_PATH);
      return;
    }
    log("error", `preload registration on ${label} failed:`, e);
  }
}

app.whenReady().then(() => {
  log("info", "app ready fired");
  if (isCodexPlusPlusSafeModeEnabled()) {
    log("warn", "safe mode is enabled; preload will not be registered");
    return;
  }
  registerPreload(session.defaultSession, "defaultSession", "full");
  maybeStartBrowserUiServer({
    getWindowServices: getCodexWindowServices,
    log,
  });
});

app.on("session-created", (s) => {
  if (isCodexPlusPlusSafeModeEnabled()) return;
  if (s === session.defaultSession) return;
  registerPreload(s, "session-created", "guest");
});

// DIAGNOSTIC: log every webContents creation. Useful for verifying our
// preload reaches every renderer Codex spawns.
app.on("web-contents-created", (_e, wc) => {
  try {
    const wp = (wc as unknown as { getLastWebPreferences?: () => Record<string, unknown> })
      .getLastWebPreferences?.();
    log("info", "web-contents-created", {
      id: wc.id,
      type: wc.getType(),
      sessionIsDefault: wc.session === session.defaultSession,
      sandbox: wp?.sandbox,
      contextIsolation: wp?.contextIsolation,
    });
    wc.on("preload-error", (_ev, p, err) => {
      log("error", `wc ${wc.id} preload-error path=${p}`, String(err?.stack ?? err));
    });
  } catch (e) {
    log("error", "web-contents-created handler failed:", String((e as Error)?.stack ?? e));
  }
});

log("info", "main.ts evaluated; app.isReady=" + app.isReady());
if (isCodexPlusPlusSafeModeEnabled()) {
  log("warn", "safe mode is enabled; tweaks will not be loaded");
}

const sessionManager = new CodexSessionManager({
  userRoot,
  launcher: createNodeCodexProcessLauncher({
    resolveExecutable: () => {
      let resourcesPath: string | null = null;
      let appPath: string | null = null;
      try {
        const info = currentRuntimeInfo();
        resourcesPath = info.resourcesPath;
        appPath = info.appPath;
      } catch {}
      if (!resourcesPath) {
        const fromProcess = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
        if (typeof fromProcess === "string") resourcesPath = fromProcess;
      }
      if (!appPath) {
        try {
          appPath = app.getAppPath();
        } catch {
          appPath = null;
        }
      }
      return resolveTrustedCodexExecutable({
        platform: process.platform,
        resourcesPath,
        appPath,
      });
    },
  }),
  log,
});
setCodexSessionManager(sessionManager);

// 2. Initial tweak discovery + main-scope load.
loadAllMainTweaks();

let sessionShutdownStarted = false;
app.on("will-quit", (event) => {
  stopAllMainTweaks();
  nativeBridge.disposeAll();
  disposeAllOwlViews();
  // Best-effort flush of any pending storage writes.
  for (const t of tweakState.loadedMain.values()) {
    try {
      t.storage.flush();
    } catch {}
  }
  if (sessionShutdownStarted) return;
  if (!sessionManager.hasLiveChildren()) return;
  event.preventDefault();
  sessionShutdownStarted = true;
  const failSafe = setTimeout(() => {
    app.quit();
  }, 3000);
  void sessionManager.shutdownAll({ timeoutMs: 3000 }).finally(() => {
    clearTimeout(failSafe);
    app.quit();
  });
});

function privilegedHandle(channel: string, listener: (...args: any[]) => unknown): void {
  ipcMain.handle(channel, (event, ...args) => {
    assertPrivilegedIpcSender(channel, event.sender, untrustedWebContentsIds);
    return listener(event, ...args);
  });
}

ipcMain.on("codexpp:privileged-frame", (event) => {
  event.returnValue = isPrivilegedIpcSender(event.sender, untrustedWebContentsIds);
});

// 3. IPC: expose tweak metadata + reveal-in-finder.
ipcMain.handle("codexpp:list-tweaks", async (_e, opts?: { force?: boolean } | boolean) => {
  const force = opts === true || (opts !== null && typeof opts === "object" && opts.force === true);
  await Promise.all(tweakState.discovered.map((t) => ensureTweakUpdateCheck(t, force)));
  return listedTweaksSnapshot();
});

ipcMain.handle("codexpp:get-tweak-enabled", (_e, id: string) => isTweakEnabled(id));
ipcMain.handle("codexpp:set-tweak-enabled", (_e, id: string, enabled: boolean) => {
  return setTweakEnabledAndReload(id, enabled, tweakLifecycleDeps);
});

ipcMain.handle("codexpp:get-config", () => {
  const s = readState();
  const installerState = readInstallerState();
  const sourceRoot = installerState?.sourceRoot ?? fallbackSourceRoot();
  return {
    version: CODEX_PLUSPLUS_VERSION,
    autoUpdate: isLayerAutoUpdateEnabled(s.codexPlusPlus?.autoUpdate),
    safeMode: s.codexPlusPlus?.safeMode === true,
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? "",
    updateCheck: s.codexPlusPlus?.updateCheck ?? null,
    selfUpdate: readSelfUpdateState(),
    installationSource: describeInstallationSource(sourceRoot),
  };
});

privilegedHandle("codexpp:set-auto-update", (_e, enabled: boolean) => {
  setCodexPlusPlusAutoUpdate(!!enabled);
  return { autoUpdate: isCodexPlusPlusAutoUpdateEnabled() };
});

privilegedHandle("codexpp:set-update-config", (_e, config: {
  updateChannel?: SelfUpdateChannel;
  updateRepo?: string;
  updateRef?: string;
}) => {
  setCodexPlusPlusUpdateConfig(stripRendererUpdateRepo(config ?? {}));
  const s = readState();
  return {
    updateChannel: s.codexPlusPlus?.updateChannel ?? "stable",
    updateRepo: s.codexPlusPlus?.updateRepo ?? CODEX_PLUSPLUS_REPO,
    updateRef: s.codexPlusPlus?.updateRef ?? "",
  };
});

ipcMain.handle("codexpp:check-codexpp-update", async (_e, force?: boolean) => {
  return ensureCodexPlusPlusUpdateCheck(force === true);
});

privilegedHandle("codexpp:run-codexpp-update", async () => {
  const sourceRoot = readInstallerState()?.sourceRoot ?? fallbackSourceRoot();
  if (!sourceRoot) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const cli = join(sourceRoot, "packages", "installer", "dist", "cli.js");
  if (!existsSync(cli)) {
    throw new Error("Codex++ source CLI was not found. Run the installer once, then try again.");
  }
  const pending = markSelfUpdateStarted(sourceRoot);
  startInstalledCli(cli, ["update", "--watcher"]);
  return pending;
});

ipcMain.handle("codexpp:get-watcher-health", () => getWatcherHealth(userRoot!));

ipcMain.handle("codexpp:get-tweak-store", async () => {
  const store = await fetchTweakStoreRegistry();
  const registry = store.registry;
  const installed = new Map(tweakState.discovered.map((t) => [t.manifest.id, t]));
  const entries = shuffleStoreEntries(registry.entries, randomInt);
  return {
    ...registry,
    sourceUrl: TWEAK_STORE_INDEX_URL,
    fetchedAt: store.fetchedAt,
    entries: entries.map((entry) => {
      const local = installed.get(entry.id);
      const platform = storeEntryPlatformCompatibility(entry);
      const runtime = storeEntryRuntimeCompatibility(entry);
      return {
        ...entry,
        platform,
        runtime,
        installed: local
          ? {
              version: local.manifest.version,
              enabled: isTweakEnabled(local.manifest.id),
            }
          : null,
      };
    }),
  };
});

privilegedHandle("codexpp:install-store-tweak", async (_e, id: string) => {
  const { registry } = await fetchTweakStoreRegistry();
  const entry = registry.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Tweak store entry not found: ${id}`);
  assertStoreEntryPlatformCompatible(entry);
  assertStoreEntryRuntimeCompatible(entry);
  await installStoreTweak(entry);
  reloadTweaks("store-install", tweakLifecycleDeps);
  return { installed: entry.id };
});

privilegedHandle("codexpp:install-github-tweak", async (_e, id: string) => {
  return installGithubReleaseTweak(id);
});

privilegedHandle("codexpp:prepare-tweak-store-submission", async (_e, repoInput: string) => {
  return prepareTweakStoreSubmission(repoInput);
});

// Sandboxed renderer preload can't use Node fs to read tweak source. Main
// reads it on the renderer's behalf. Path must live under tweaksDir for
// security — we refuse anything else.
ipcMain.handle("codexpp:read-tweak-source", (_e, entryPath: string) => {
  const resolved = resolve(entryPath);
  if (!isPathInside(TWEAKS_DIR, resolved)) {
    throw new Error("path outside tweaks dir");
  }
  return require("node:fs").readFileSync(resolved, "utf8");
});

/**
 * Read an arbitrary asset file from inside a tweak's directory and return it
 * as a `data:` URL. Used by the settings injector to render manifest icons
 * (the renderer is sandboxed; `file://` won't load).
 *
 * Security: caller passes `tweakDir` and `relPath`; we (1) require tweakDir
 * to live under TWEAKS_DIR, (2) resolve relPath against it and re-check the
 * result still lives under TWEAKS_DIR, (3) cap output size at 1 MiB.
 */
const ASSET_MAX_BYTES = 1024 * 1024;
const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};
ipcMain.handle(
  "codexpp:read-tweak-asset",
  (_e, tweakDir: string, relPath: string) => {
    const fs = require("node:fs") as typeof import("node:fs");
    const dir = resolve(tweakDir);
    if (!isPathInside(TWEAKS_DIR, dir)) {
      throw new Error("tweakDir outside tweaks dir");
    }
    const full = resolve(dir, relPath);
    if (!isPathInside(dir, full) || full === dir) {
      throw new Error("path traversal");
    }
    const stat = fs.statSync(full);
    if (stat.size > ASSET_MAX_BYTES) {
      throw new Error(`asset too large (${stat.size} > ${ASSET_MAX_BYTES})`);
    }
    const ext = full.slice(full.lastIndexOf(".")).toLowerCase();
    const mime = MIME_BY_EXT[ext] ?? "application/octet-stream";
    const buf = fs.readFileSync(full);
    return `data:${mime};base64,${buf.toString("base64")}`;
  },
);

// Sandboxed preload can't write logs to disk; forward to us via IPC.
ipcMain.on("codexpp:preload-log", (_e, level: "info" | "warn" | "error", msg: string) => {
  const lvl = level === "error" || level === "warn" ? level : "info";
  try {
    appendCappedLog(join(LOG_DIR, "preload.log"), `[${new Date().toISOString()}] [${lvl}] ${msg}\n`);
  } catch {}
});

// Sandbox-safe filesystem ops for renderer-scope tweaks. Each tweak gets
// a sandboxed dir under userRoot/tweak-data/<id>. Renderer side calls these
// over IPC instead of using Node fs directly.
privilegedHandle("codexpp:tweak-fs", (_e, op: string, id: string, p: string, c?: string) => {
  const tweak = assertAuthorizedTweak(id, "filesystem");
  const dir = ensureTweakDataDir(userRoot!, tweak.manifest.id);
  const fs = require("node:fs") as typeof import("node:fs");
  if (op === "dataDir") return dir;
  const { full } = resolveTweakDataPath(userRoot!, tweak.manifest.id, p);
  switch (op) {
    case "read": return fs.readFileSync(full, "utf8");
    case "write": return fs.writeFileSync(full, c ?? "", "utf8");
    case "exists": return fs.existsSync(full);
    default: throw new Error(`unknown op: ${op}`);
  }
});

ipcMain.handle("codexpp:user-paths", () => ({
  userRoot,
  runtimeDir,
  tweaksDir: TWEAKS_DIR,
  logDir: LOG_DIR,
}));

ipcMain.handle("codexpp:codex-runtime-info", (_e, tweakId: string) => {
  assertAuthorizedTweak(tweakId, "codex-runtime");
  return currentRuntimeInfo();
});
ipcMain.handle("codexpp:codex-runtime-capabilities", (_e, tweakId: string) => {
  assertAuthorizedTweak(tweakId, "codex-runtime");
  return currentRuntimeCapabilities();
});
ipcMain.handle("codexpp:codex-cdp-status", (_e, tweakId: string) => {
  assertAuthorizedTweak(tweakId, "codex-cdp");
  return getCdpStatus();
});
ipcMain.handle("codexpp:codex-cdp-targets", (_e, tweakId: string) => {
  assertAuthorizedTweak(tweakId, "codex-cdp");
  return listCdpTargets();
});
privilegedHandle("codexpp:codex-window-create", (_e, tweakId: string, opts: CodexCreateWindowOptions) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return createCodexWindow(opts);
});
privilegedHandle("codexpp:codex-window-primary", (_e, tweakId: string) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return getPrimaryCodexWindowRef();
});
privilegedHandle("codexpp:codex-window-focus", (_e, tweakId: string, windowId: number) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return focusCodexWindow(windowId);
});
privilegedHandle("codexpp:codex-window-show", (_e, tweakId: string, windowId: number) => {
  assertAuthorizedTweak(tweakId, "codex-windows");
  return showCodexWindow(windowId);
});
privilegedHandle("codexpp:codex-view-create",
  async (_e, tweakId: string, options: CodexViewCreateOptions) => {
    const tweak = assertAuthorizedTweak(tweakId, "codex-views");
    const ref = await createOwlView({ id: tweak.manifest.id, dir: tweak.dir }, options);
    return {
      id: ref.id,
      webContentsId: ref.webContentsId,
      parentWindowId: ref.parentWindowId,
    };
  },
);
privilegedHandle("codexpp:codex-view-call",
  (_e, tweakId: string, viewId: string, method: string, arg?: unknown, arg2?: unknown) => {
    const tweak = assertAuthorizedTweak(tweakId, "codex-views");
    return callOwlView(tweak.manifest.id, viewId, method, arg, arg2);
  },
);
ipcMain.handle("codexpp:codex-view-dispose-tweak", (_e, tweakId: string) => {
  assertTweakId(tweakId);
  disposeOwlViewsForTweak(tweakId);
});
privilegedHandle("codexpp:native-load-module",
  (_e, tweakId: string, options: NativeModuleLoadOptions) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-module");
    const ref = nativeBridge.loadModule(tweakContext(tweak.manifest.id, "native-module"), options);
    return { id: ref.id, kind: ref.kind };
  },
);
privilegedHandle("codexpp:native-module-request",
  (_e, tweakId: string, moduleId: string, method: string, payload?: unknown, timeoutMs?: number) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-module");
    return nativeBridge.requestModule(tweak.manifest.id, moduleId, method, payload, timeoutMs);
  },
);
privilegedHandle("codexpp:native-module-dispose", (_e, tweakId: string, moduleId: string) => {
  const tweak = assertAuthorizedTweak(tweakId, "native-module");
  return nativeBridge.disposeModule(tweak.manifest.id, moduleId);
});
ipcMain.handle("codexpp:native-dispose-tweak", (_e, tweakId: string) => {
  assertTweakId(tweakId);
  nativeBridge.disposeTweak(tweakId);
});
privilegedHandle("codexpp:native-create-panel",
  async (_e, tweakId: string, options: NativePanelCreateOptions) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-view");
    const ref = await nativeBridge.createPanel(tweakContext(tweak.manifest.id, "native-view"), options);
    return { id: ref.id, windowId: ref.windowId };
  },
);
privilegedHandle("codexpp:native-attach-view",
  async (_e, tweakId: string, options: NativeViewAttachOptions) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-view");
    const ref = await nativeBridge.attachView(tweakContext(tweak.manifest.id, "native-view"), options);
    return { id: ref.id };
  },
);
privilegedHandle("codexpp:native-instance-call",
  async (_e, tweakId: string, kind: "panel" | "view", instanceId: string, method: string, arg?: unknown) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-view");
    return nativeBridge.callInstance(tweak.manifest.id, kind, instanceId, method, arg);
  },
);
privilegedHandle("codexpp:native-launch-helper",
  (_e, tweakId: string, options: NativeHelperLaunchOptions) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-helper");
    const ref = nativeBridge.launchHelper(tweakContext(tweak.manifest.id, "native-helper"), options);
    return { id: ref.id, pid: ref.pid };
  },
);
privilegedHandle("codexpp:native-helper-call",
  (_e, tweakId: string, helperId: string, method: string, payload?: unknown, timeoutMs?: number) => {
    const tweak = assertAuthorizedTweak(tweakId, "native-helper");
    return nativeBridge.callHelper(tweak.manifest.id, helperId, method, payload, timeoutMs);
  },
);
privilegedHandle("codexpp:codex-sessions-list", (_e, tweakId: string, extra?: unknown) => {
  assertAuthorizedTweak(tweakId, "codex-sessions");
  if (extra !== undefined) throw new Error("unexpected payload");
  return sessionManager.listSessions();
});
privilegedHandle("codexpp:codex-sessions-status", (_e, tweakId: string, sessionId: string, extra?: unknown) => {
  assertAuthorizedTweak(tweakId, "codex-sessions");
  if (typeof sessionId !== "string") throw new Error("invalid session id");
  assertSessionId(sessionId);
  if (extra !== undefined) throw new Error("unexpected payload");
  return sessionManager.getSessionStatus(sessionId);
});

privilegedHandle("codexpp:reveal", (_e, p: string) => {
  shell.openPath(p).catch(() => {});
});

ipcMain.handle("codexpp:open-external", (_e, url: string) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "github.com") {
    throw new Error("only github.com links can be opened from tweak metadata");
  }
  shell.openExternal(parsed.toString()).catch(() => {});
});

privilegedHandle("codexpp:copy-text", (_e, text: string) => {
  clipboard.writeText(String(text));
  return true;
});

// Manual force-reload trigger from the renderer (e.g. the "Force Reload"
// button on our injected Tweaks page). Bypasses the watcher debounce.
ipcMain.handle("codexpp:reload-tweaks", () => {
  reloadTweaks("manual", tweakLifecycleDeps);
  return { at: Date.now(), count: tweakState.discovered.length };
});

// 4. Filesystem watcher → debounced reload + broadcast.
//    We watch the tweaks dir for any change. On the first tick of inactivity
//    we stop main-side tweaks, clear their cached modules, re-discover, then
//    restart and broadcast `codexpp:tweaks-changed` to every renderer so it
//    can re-init its host.
const RELOAD_DEBOUNCE_MS = 250;
let reloadTimer: NodeJS.Timeout | null = null;
function scheduleReload(reason: string): void {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    reloadTweaks(reason, tweakLifecycleDeps);
  }, RELOAD_DEBOUNCE_MS);
}

try {
  const watcher = chokidar.watch(TWEAKS_DIR, {
    ignoreInitial: true,
    // Wait for files to settle before triggering — guards against partially
    // written tweak files during editor saves / git checkouts.
    awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
    // Avoid eating CPU on huge node_modules trees inside tweak folders.
    ignored: (p) => p.includes(`${TWEAKS_DIR}/`) && /\/node_modules\//.test(p),
  });
  watcher.on("all", (event, path) => scheduleReload(`${event} ${path}`));
  watcher.on("error", (e) => log("warn", "watcher error:", e));
  log("info", "watching", TWEAKS_DIR);
  app.on("will-quit", () => watcher.close().catch(() => {}));
} catch (e) {
  log("error", "failed to start watcher:", e);
}
