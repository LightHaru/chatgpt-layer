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

import { ipcRenderer } from "electron";
import { registerSection, registerPage, clearSections, setListedTweaks } from "./settings-injector";
import { fiberForNode } from "./react-hook";
import type {
  CodexCdpStatus,
  CodexCdpTarget,
  CodexRuntimeCapabilities,
  CodexRuntimeInfo,
  CodexViewRef,
  CodexWindowRef,
  NativeHelperLaunchOptions,
  NativeHelperRef,
  NativeModuleKind,
  NativeModuleLoadOptions,
  NativeModuleRef,
  NativePanelCreateOptions,
  NativePanelRef,
  NativeViewAttachOptions,
  NativeViewRef,
  TweakManifest,
  TweakApi,
  ReactFiberNode,
  Tweak,
} from "@codex-plusplus/sdk";

interface ListedTweak {
  manifest: TweakManifest;
  entry: string;
  dir: string;
  entryExists: boolean;
  enabled: boolean;
  update: {
    checkedAt: string;
    repo: string;
    currentVersion: string;
    latestVersion: string | null;
    latestTag: string | null;
    releaseUrl: string | null;
    updateAvailable: boolean;
    error?: string;
  } | null;
}

interface UserPaths {
  userRoot: string;
  runtimeDir: string;
  tweaksDir: string;
  logDir: string;
}

interface ElectronBridge {
  getBuildFlavor?: () => string | null;
  usesOwlAppShell?: () => boolean;
}

const loaded = new Map<string, { stop?: () => void }>();
let cachedPaths: UserPaths | null = null;

export async function startTweakHost(): Promise<void> {
  const tweaks = (await ipcRenderer.invoke("codexpp:list-tweaks")) as ListedTweak[];
  const paths = (await ipcRenderer.invoke("codexpp:user-paths")) as UserPaths;
  cachedPaths = paths;
  // Push the list to the settings injector so the Tweaks page can render
  // cards even before any tweak's start() runs (and for disabled tweaks
  // that we never load).
  setListedTweaks(tweaks);
  // Stash for the settings injector's empty-state message.
  (window as unknown as { __codexpp_tweaks_dir__?: string }).__codexpp_tweaks_dir__ =
    paths.tweaksDir;

  for (const t of tweaks) {
    if (t.manifest.scope === "main") continue;
    if (!t.entryExists) continue;
    if (!t.enabled) continue;
    try {
      await loadTweak(t, paths);
    } catch (e) {
      console.error("[codex-plusplus] tweak load failed:", t.manifest.id, e);
      try {
        ipcRenderer.send(
          "codexpp:preload-log",
          "error",
          "tweak load failed: " + t.manifest.id + ": " + String((e as Error)?.stack ?? e),
        );
      } catch {}
    }
  }

  console.info(
    `[codex-plusplus] renderer host loaded ${loaded.size} tweak(s):`,
    [...loaded.keys()].join(", ") || "(none)",
  );
  ipcRenderer.send(
    "codexpp:preload-log",
    "info",
    `renderer host loaded ${loaded.size} tweak(s): ${[...loaded.keys()].join(", ") || "(none)"}`,
  );
}

/**
 * Stop every renderer-scope tweak so a subsequent `startTweakHost()` will
 * re-evaluate fresh source. Module cache isn't relevant since we eval
 * source strings directly — each load creates a fresh scope.
 */
export function teardownTweakHost(): void {
  for (const [id, t] of loaded) {
    try {
      t.stop?.();
    } catch (e) {
      console.warn("[codex-plusplus] tweak stop failed:", id, e);
    } finally {
      void ipcRenderer.invoke("codexpp:codex-view-dispose-tweak", id).catch(() => {});
      void ipcRenderer.invoke("codexpp:native-dispose-tweak", id).catch(() => {});
    }
  }
  loaded.clear();
  clearSections();
}

async function loadTweak(t: ListedTweak, paths: UserPaths): Promise<void> {
  const source = (await ipcRenderer.invoke(
    "codexpp:read-tweak-source",
    t.entry,
  )) as string;

  // Evaluate as CJS-shaped: provide module/exports/api. Tweak code may use
  // `module.exports = { start, stop }` or `exports.start = ...` or pure ESM
  // default export shape (we accept both).
  const module = { exports: {} as { default?: Tweak } & Tweak };
  const exports = module.exports;
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const fn = new Function(
    "module",
    "exports",
    "console",
    `${source}\n//# sourceURL=codexpp-tweak://${encodeURIComponent(t.manifest.id)}/${encodeURIComponent(t.entry)}`,
  );
  fn(module, exports, console);
  const mod = module.exports as { default?: Tweak } & Tweak;
  const tweak: Tweak = (mod as { default?: Tweak }).default ?? (mod as Tweak);
  if (typeof tweak?.start !== "function") {
    throw new Error(`tweak ${t.manifest.id} has no start()`);
  }
  const api = makeRendererApi(t.manifest, paths);
  await tweak.start(api);
  loaded.set(t.manifest.id, { stop: tweak.stop?.bind(tweak) });
}

function makeRendererApi(manifest: TweakManifest, paths: UserPaths): TweakApi {
  const id = manifest.id;
  const log = (level: "debug" | "info" | "warn" | "error", ...a: unknown[]) => {
    const consoleFn =
      level === "debug" ? console.debug
      : level === "warn" ? console.warn
      : level === "error" ? console.error
      : console.log;
    consoleFn(`[codex-plusplus][${id}]`, ...a);
    // Also mirror to main's log file so we can diagnose tweak behavior
    // without attaching DevTools. Stringify each arg defensively.
    try {
      const parts = a.map((v) => {
        if (typeof v === "string") return v;
        if (v instanceof Error) return `${v.name}: ${v.message}`;
        try { return JSON.stringify(v); } catch { return String(v); }
      });
      ipcRenderer.send(
        "codexpp:preload-log",
        level,
        `[tweak ${id}] ${parts.join(" ")}`,
      );
    } catch {
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
      register: (s) => registerSection({ ...s, id: `${id}:${s.id}` }),
      registerPage: (p) =>
        registerPage(id, manifest, { ...p, id: `${id}:${p.id}` }),
    },
    react: {
      getFiber: (n) => fiberForNode(n) as ReactFiberNode | null,
      findOwnerByName: (n, name) => {
        let f = fiberForNode(n) as ReactFiberNode | null;
        while (f) {
          const t = f.type as { displayName?: string; name?: string } | null;
          if (t && (t.displayName === name || t.name === name)) return f;
          f = f.return;
        }
        return null;
      },
      waitForElement: (sel, timeoutMs = 5000) =>
        new Promise((resolve, reject) => {
          const existing = document.querySelector(sel);
          if (existing) return resolve(existing);
          const deadline = Date.now() + timeoutMs;
          const obs = new MutationObserver(() => {
            const el = document.querySelector(sel);
            if (el) {
              obs.disconnect();
              resolve(el);
            } else if (Date.now() > deadline) {
              obs.disconnect();
              reject(new Error(`timeout waiting for ${sel}`));
            }
          });
          obs.observe(document.documentElement, { childList: true, subtree: true });
        }),
    },
    ipc: {
      on: (c, h) => {
        const wrapped = (_e: unknown, ...args: unknown[]) => h(...args);
        ipcRenderer.on(`codexpp:${id}:${c}`, wrapped);
        return () => ipcRenderer.removeListener(`codexpp:${id}:${c}`, wrapped);
      },
      send: (c, ...args) => ipcRenderer.send(`codexpp:${id}:${c}`, ...args),
      invoke: <T>(c: string, ...args: unknown[]) =>
        ipcRenderer.invoke(`codexpp:${id}:${c}`, ...args) as Promise<T>,
    },
    fs: rendererFs(id, paths),
    codex: rendererCodexApi(id),
  };
}

function rendererCodexApi(tweakId: string): NonNullable<TweakApi["codex"]> {
  return {
    runtime: {
      getInfo: async () => {
        const info = await ipcRenderer.invoke("codexpp:codex-runtime-info") as CodexRuntimeInfo;
        const bridge = rendererElectronBridge();
        return {
          ...info,
          buildFlavor: bridge?.getBuildFlavor?.() ?? info.buildFlavor,
          usesOwlAppShell: bridge?.usesOwlAppShell?.() ?? info.usesOwlAppShell,
        };
      },
      getCapabilities: () =>
        ipcRenderer.invoke("codexpp:codex-runtime-capabilities") as Promise<CodexRuntimeCapabilities>,
    },
    windows: {
      create: (options) =>
        ipcRenderer.invoke("codexpp:codex-window-create", options) as Promise<CodexWindowRef>,
      getPrimary: () =>
        ipcRenderer.invoke("codexpp:codex-window-primary") as Promise<CodexWindowRef | null>,
      focus: (windowId) =>
        ipcRenderer.invoke("codexpp:codex-window-focus", windowId) as Promise<boolean>,
      show: (windowId) =>
        ipcRenderer.invoke("codexpp:codex-window-show", windowId) as Promise<boolean>,
    },
    views: {
      create: async (options) => {
        const ref = await ipcRenderer.invoke(
          "codexpp:codex-view-create",
          tweakId,
          options,
        ) as { id: string; webContentsId: number; parentWindowId: number | null };
        return rendererCodexViewRef(tweakId, ref.id, ref.webContentsId, ref.parentWindowId);
      },
    },
    cdp: {
      getStatus: () =>
        ipcRenderer.invoke("codexpp:codex-cdp-status") as Promise<CodexCdpStatus>,
      listTargets: () =>
        ipcRenderer.invoke("codexpp:codex-cdp-targets") as Promise<CodexCdpTarget[]>,
    },
    native: {
      loadModule: async (options) => {
        const ref = await ipcRenderer.invoke(
          "codexpp:native-load-module",
          tweakId,
          options,
        ) as { id: string; kind: NativeModuleKind };
        return rendererNativeModuleRef(tweakId, ref.id, ref.kind);
      },
      createPanel: async (options) => {
        const ref = await ipcRenderer.invoke(
          "codexpp:native-create-panel",
          tweakId,
          options,
        ) as { id: string; windowId: number | null };
        return rendererNativePanelRef(tweakId, ref.id, ref.windowId);
      },
      attachView: async (options) => {
        const ref = await ipcRenderer.invoke(
          "codexpp:native-attach-view",
          tweakId,
          options,
        ) as { id: string };
        return rendererNativeViewRef(tweakId, ref.id);
      },
      launchHelper: async (options) => {
        const ref = await ipcRenderer.invoke(
          "codexpp:native-launch-helper",
          tweakId,
          options,
        ) as { id: string; pid: number };
        return rendererNativeHelperRef(tweakId, ref.id, ref.pid);
      },
    },
    createBrowserView: (_options) => {
      throw new Error("api.codex.createBrowserView is main-only; use a main-scoped tweak");
    },
    createWindow: (options) =>
      ipcRenderer.invoke("codexpp:codex-window-create", options) as Promise<CodexWindowRef>,
  };
}

function rendererCodexViewRef(
  tweakId: string,
  id: string,
  webContentsId: number,
  parentWindowId: number | null,
): CodexViewRef {
  return {
    id,
    webContentsId,
    parentWindowId,
    setBounds: (bounds) =>
      ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "setBounds", bounds) as Promise<void>,
    setVisible: (visible) =>
      ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "setVisible", visible) as Promise<void>,
    bringToFront: () =>
      ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "bringToFront") as Promise<void>,
    loadRoute: (route, hostId) =>
      ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "loadRoute", route, hostId) as Promise<void>,
    loadUrl: (url) =>
      ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "loadUrl", url) as Promise<void>,
    dispose: () =>
      ipcRenderer.invoke("codexpp:codex-view-call", tweakId, id, "dispose") as Promise<void>,
  };
}

function rendererNativeModuleRef(
  tweakId: string,
  id: string,
  kind: NativeModuleKind,
): NativeModuleRef {
  return {
    id,
    kind,
    request: (method, payload, timeoutMs) =>
      ipcRenderer.invoke(
        "codexpp:native-module-request",
        tweakId,
        id,
        method,
        payload,
        timeoutMs,
      ),
    dispose: () =>
      ipcRenderer.invoke("codexpp:native-module-dispose", tweakId, id) as Promise<void>,
  };
}

function rendererNativePanelRef(tweakId: string, id: string, windowId: number | null): NativePanelRef {
  return {
    id,
    windowId,
    setBounds: (bounds) =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "setBounds", bounds) as Promise<void>,
    show: () =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "show") as Promise<void>,
    hide: () =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "hide") as Promise<void>,
    dispose: () =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "panel", id, "dispose") as Promise<void>,
  };
}

function rendererNativeViewRef(tweakId: string, id: string): NativeViewRef {
  return {
    id,
    setBounds: (bounds) =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "view", id, "setBounds", bounds) as Promise<void>,
    setVisible: (visible) =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "view", id, "setVisible", visible) as Promise<void>,
    dispose: () =>
      ipcRenderer.invoke("codexpp:native-instance-call", tweakId, "view", id, "dispose") as Promise<void>,
  };
}

function rendererNativeHelperRef(tweakId: string, id: string, pid: number): NativeHelperRef {
  return {
    id,
    pid,
    send: (message) =>
      ipcRenderer.invoke("codexpp:native-helper-call", tweakId, id, "send", message) as Promise<void>,
    request: (message, timeoutMs) =>
      ipcRenderer.invoke(
        "codexpp:native-helper-call",
        tweakId,
        id,
        "request",
        message,
        timeoutMs,
      ),
    stop: () =>
      ipcRenderer.invoke("codexpp:native-helper-call", tweakId, id, "stop") as Promise<void>,
  };
}

function rendererElectronBridge(): ElectronBridge | null {
  const value = (window as unknown as { electronBridge?: unknown }).electronBridge;
  return value && typeof value === "object" ? value as ElectronBridge : null;
}

function rendererStorage(id: string) {
  const key = `codexpp:storage:${id}`;
  const read = (): Record<string, unknown> => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "{}");
    } catch {
      return {};
    }
  };
  const write = (v: Record<string, unknown>) =>
    localStorage.setItem(key, JSON.stringify(v));
  return {
    get: <T>(k: string, d?: T) => (k in read() ? (read()[k] as T) : (d as T)),
    set: (k: string, v: unknown) => {
      const o = read();
      o[k] = v;
      write(o);
    },
    delete: (k: string) => {
      const o = read();
      delete o[k];
      write(o);
    },
    all: () => read(),
  };
}

function rendererFs(id: string, _paths: UserPaths) {
  // Sandboxed renderer can't use Node fs directly — proxy through main IPC.
  return {
    dataDir: `<remote>/tweak-data/${id}`,
    read: (p: string) =>
      ipcRenderer.invoke("codexpp:tweak-fs", "read", id, p) as Promise<string>,
    write: (p: string, c: string) =>
      ipcRenderer.invoke("codexpp:tweak-fs", "write", id, p, c) as Promise<void>,
    exists: (p: string) =>
      ipcRenderer.invoke("codexpp:tweak-fs", "exists", id, p) as Promise<boolean>,
  };
}
