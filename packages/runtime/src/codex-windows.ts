import { BrowserView, BrowserWindow } from "electron";
import { CODEX_WINDOW_SERVICES_KEY } from "./runtime-paths";
import type { CodexWindowRef } from "@codex-plusplus/sdk";
import { inspectWindowServices } from "./codex-runtime-probe";

export interface CodexWindowServices {
  createFreshWindow?: (route?: string) => Promise<Electron.BrowserWindow | null>;
  createFreshLocalWindow?: (route?: string) => Promise<Electron.BrowserWindow | null>;
  ensureHostWindow?: (hostId?: string) => Promise<Electron.BrowserWindow | null>;
  getPrimaryWindow?: (hostId?: string) => Electron.BrowserWindow | null;
  getContext?: (hostId: string) => { registerWindow?: (windowLike: CodexWindowLike) => void } | null;
  windowManager?: {
    createWindow?: (opts: Record<string, unknown>) => Promise<Electron.BrowserWindow | null>;
    getPrimaryWindow?: () => Electron.BrowserWindow | null;
    registerWindow?: (
      windowLike: CodexWindowLike,
      hostId: string,
      primary: boolean,
      appearance: string,
    ) => void;
    options?: {
      allowDevtools?: boolean;
      preloadPath?: string;
    };
  };
}

export interface CodexWindowLike {
  id: number;
  webContents: Electron.WebContents;
  on(event: "closed", listener: () => void): unknown;
  once?(event: string, listener: (...args: unknown[]) => void): unknown;
  off?(event: string, listener: (...args: unknown[]) => void): unknown;
  removeListener?(event: string, listener: (...args: unknown[]) => void): unknown;
  isDestroyed?(): boolean;
  isFocused?(): boolean;
  focus?(): void;
  show?(): void;
  hide?(): void;
  getBounds?(): Electron.Rectangle;
  getContentBounds?(): Electron.Rectangle;
  getSize?(): [number, number];
  getContentSize?(): [number, number];
  setTitle?(title: string): void;
  getTitle?(): string;
  setRepresentedFilename?(filename: string): void;
  setDocumentEdited?(edited: boolean): void;
  setWindowButtonVisibility?(visible: boolean): void;
}

export interface CodexCreateWindowOptions {
  route: string;
  hostId?: string;
  show?: boolean;
  appearance?: string;
  parentWindowId?: number;
  bounds?: Electron.Rectangle;
}

export interface CodexCreateViewOptions {
  route: string;
  hostId?: string;
  appearance?: string;
}

export function getPrimaryCodexWindow(): Electron.BrowserWindow | null {
  const services = getCodexWindowServices();
  const inspected = inspectWindowServices(services);
  const fromServices = inspected.getPrimaryWindow
    ? services?.getPrimaryWindow?.("local") ?? null
    : null;
  if (fromServices && !fromServices.isDestroyed()) return fromServices;
  const fromManager = inspected.getPrimaryWindowFromManager
    ? services?.windowManager?.getPrimaryWindow?.call(services.windowManager) ?? null
    : null;
  if (fromManager && !fromManager.isDestroyed()) return fromManager;
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) return focused;
  return BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) ?? null;
}

export function getPrimaryCodexWindowRef(): CodexWindowRef | null {
  const win = getPrimaryCodexWindow();
  if (!win || win.isDestroyed()) return null;
  return { windowId: win.id, webContentsId: win.webContents.id };
}

export function focusCodexWindow(windowId: number): boolean {
  const win = BrowserWindow.fromId(windowId);
  if (!win || win.isDestroyed()) return false;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return true;
}

export function showCodexWindow(windowId: number): boolean {
  const win = BrowserWindow.fromId(windowId);
  if (!win || win.isDestroyed()) return false;
  win.show();
  return true;
}

export async function createCodexBrowserView(opts: CodexCreateViewOptions): Promise<unknown> {
  const services = getCodexWindowServices();
  const windowManager = services?.windowManager;
  const inspected = inspectWindowServices(services);
  if (!services || !windowManager?.registerWindow || !inspected.registerWindow) {
    throw new Error(
      "Codex embedded view services are not available. Reinstall Codex++ 1.0.0 or later.",
    );
  }

  const route = normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const appearance = opts.appearance || "secondary";
  const view = new BrowserView({
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

export async function createCodexWindow(opts: CodexCreateWindowOptions): Promise<CodexWindowRef> {
  const services = getCodexWindowServices();
  const inspected = inspectWindowServices(services);
  if (!services || !inspected.present) {
    throw new Error(
      "Codex window services are not available. Reinstall Codex++ 1.0.0 or later.",
    );
  }

  const route = normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const parent = typeof opts.parentWindowId === "number"
    ? BrowserWindow.fromId(opts.parentWindowId)
    : BrowserWindow.getFocusedWindow();
  const createWindow = services.windowManager?.createWindow;

  let win: Electron.BrowserWindow | null | undefined;
  if (inspected.createWindow && typeof createWindow === "function") {
    win = await createWindow.call(services.windowManager, {
      initialRoute: route,
      hostId,
      show: opts.show !== false,
      appearance: opts.appearance || "secondary",
      parent,
    });
  } else if (hostId === "local" && inspected.createFreshWindow && typeof services.createFreshWindow === "function") {
    win = await services.createFreshWindow(route);
  } else if (hostId === "local" && inspected.createFreshLocalWindow && typeof services.createFreshLocalWindow === "function") {
    win = await services.createFreshLocalWindow(route);
  } else if (inspected.ensureHostWindow && typeof services.ensureHostWindow === "function") {
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
    } catch {}
  }
  if (opts.show !== false) {
    win.show();
  }

  return {
    windowId: win.id,
    webContentsId: win.webContents.id,
  };
}

export function makeWindowLikeForView(view: Electron.BrowserView): CodexWindowLike {
  const viewBounds = () => view.getBounds();
  return {
    id: view.webContents.id,
    webContents: view.webContents,
    on: (event: "closed", listener: () => void) => {
      if (event === "closed") {
        view.webContents.once("destroyed", listener);
      } else {
        view.webContents.on(event, listener);
      }
      return view;
    },
    once: (event: string, listener: (...args: unknown[]) => void) => {
      view.webContents.once(event as "destroyed", listener);
      return view;
    },
    off: (event: string, listener: (...args: unknown[]) => void) => {
      view.webContents.off(event as "destroyed", listener);
      return view;
    },
    removeListener: (event: string, listener: (...args: unknown[]) => void) => {
      view.webContents.removeListener(event as "destroyed", listener);
      return view;
    },
    isDestroyed: () => view.webContents.isDestroyed(),
    isFocused: () => view.webContents.isFocused(),
    focus: () => view.webContents.focus(),
    show: () => {},
    hide: () => {},
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
    setTitle: () => {},
    getTitle: () => "",
    setRepresentedFilename: () => {},
    setDocumentEdited: () => {},
    setWindowButtonVisibility: () => {},
  };
}

export function codexAppUrl(route: string, hostId: string): string {
  const url = new URL("app://-/index.html");
  url.searchParams.set("hostId", hostId);
  if (route !== "/") url.searchParams.set("initialRoute", route);
  return url.toString();
}

export function normalizeOwlViewUrl(url: string): string {
  if (typeof url !== "string" || url.includes("\n") || url.includes("\r")) {
    throw new Error("Owl view URL must be a string without control characters");
  }
  const parsed = new URL(url);
  if (!["http:", "https:", "app:", "file:", "data:", "about:"].includes(parsed.protocol)) {
    throw new Error(`unsupported Owl view URL protocol: ${parsed.protocol}`);
  }
  return parsed.toString();
}

export function getCodexWindowServices(): CodexWindowServices | null {
  const services = (globalThis as unknown as Record<string, unknown>)[CODEX_WINDOW_SERVICES_KEY];
  return services && typeof services === "object" ? (services as CodexWindowServices) : null;
}

export function normalizeCodexRoute(route: string): string {
  if (typeof route !== "string" || !route.startsWith("/")) {
    throw new Error("Codex route must be an absolute app route");
  }
  if (route.includes("://") || route.includes("\n") || route.includes("\r")) {
    throw new Error("Codex route must not include a protocol or control characters");
  }
  return route;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

export function callObjectMethod(target: unknown, method: string, args: unknown[]): unknown {
  const fn = asRecord(target)?.[method];
  if (typeof fn !== "function") return undefined;
  return fn.apply(target, args);
}

export function isWindowDestroyed(win: Electron.BrowserWindow | null | undefined): boolean {
  if (!win) return true;
  const fn = asRecord(win)?.isDestroyed;
  if (typeof fn !== "function") return false;
  try {
    return Boolean(fn.call(win));
  } catch {
    return true;
  }
}

export function windowIdFor(win: Electron.BrowserWindow | null | undefined): number | null {
  const id = asRecord(win)?.id;
  return typeof id === "number" ? id : null;
}
