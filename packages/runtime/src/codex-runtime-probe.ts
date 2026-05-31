import { app, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
  CodexCdpStatus,
  CodexCdpTarget,
  CodexRuntimeCapabilities,
  CodexRuntimeInfo,
  CodexRuntimeType,
} from "@codex-plusplus/sdk";

export interface RuntimeProbeOptions {
  userRoot: string;
  runtimeDir: string;
  codexVersion: string | null;
  channel: string | null;
  getWindowServices(): unknown | null;
  getNativeCapabilities?(): CodexRuntimeCapabilities["native"];
  getViewCapabilities?(): CodexRuntimeCapabilities["views"];
}

export function getRuntimeInfo(opts: RuntimeProbeOptions): CodexRuntimeInfo {
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

export function getRuntimeCapabilities(opts: RuntimeProbeOptions): CodexRuntimeCapabilities {
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

export function getCdpStatus(): CodexCdpStatus {
  const enabled = process.env.CODEXPP_REMOTE_DEBUG === "1";
  const port = parseCdpPort(process.env.CODEXPP_REMOTE_DEBUG_PORT);
  return {
    supported: true,
    enabled,
    port: enabled ? port : null,
    url: enabled ? `http://127.0.0.1:${port}` : null,
  };
}

export async function listCdpTargets(): Promise<CodexCdpTarget[]> {
  const status = getCdpStatus();
  if (!status.enabled || !status.url) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1000);
  try {
    const res = await fetch(`${status.url}/json`, { signal: controller.signal });
    if (!res.ok) return [];
    const rows = await res.json() as unknown;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => normalizeCdpTarget(row))
      .filter((row): row is CodexCdpTarget => row !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function detectRuntimeType(): CodexRuntimeType {
  if (process.platform === "darwin") {
    const appRoot = inferMacAppRoot();
    if (appRoot && existsSync(join(appRoot, "Contents", "Frameworks", "Codex Framework.framework"))) {
      return "owl";
    }
    if (
      appRoot &&
      existsSync(join(appRoot, "Contents", "Frameworks", "Electron Framework.framework"))
    ) {
      return "electron";
    }
    if (process.resourcesPath && existsSync(join(process.resourcesPath, "app.asar"))) {
      return "electron";
    }
    return "unknown";
  }
  return process.resourcesPath && existsSync(join(process.resourcesPath, "app.asar"))
    ? "electron"
    : "unknown";
}

function inferMacAppRoot(): string | null {
  const marker = ".app/Contents/MacOS/";
  const idx = process.execPath.indexOf(marker);
  return idx >= 0 ? process.execPath.slice(0, idx + ".app".length) : null;
}

function safeAppVersion(): string | null {
  try {
    return app.getVersion();
  } catch {
    return null;
  }
}

function safeAppPath(): string | null {
  try {
    return app.getAppPath();
  } catch {
    return process.resourcesPath ? join(process.resourcesPath, "app.asar") : null;
  }
}

function safeBuildFlavor(): string | null {
  const appPath = safeAppPath();
  if (!appPath) return null;
  const parent = dirname(appPath);
  if (parent.includes("Nightly")) return "nightly";
  return app.isPackaged ? "prod" : "dev";
}

function parseCdpPort(value: string | undefined): number {
  const parsed = Number(value ?? "9222");
  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : 9222;
}

function hasNativeWindowHandles(): boolean {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && typeof focused.getNativeWindowHandle === "function") return true;
  return typeof BrowserWindow.fromId === "function";
}

function defaultNativeCapabilities(): CodexRuntimeCapabilities["native"] {
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

function defaultViewCapabilities(): CodexRuntimeCapabilities["views"] {
  return {
    create: false,
    privateViewTree: false,
    webContentsView: false,
    browserViewFallback: typeof BrowserWindow.fromId === "function",
  };
}

function normalizeCdpTarget(row: unknown): CodexCdpTarget | null {
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
