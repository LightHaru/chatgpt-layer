import { BrowserView, BrowserWindow } from "electron";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import type { CodexRuntimeCapabilities, CodexViewCreateOptions, CodexViewRef } from "@codex-plusplus/sdk";
import type { NativeTweakContext } from "./native-bridge";
import { GUEST_PRELOAD_PATH, log } from "./runtime-paths";
import {
  asRecord,
  callObjectMethod,
  codexAppUrl,
  getCodexWindowServices,
  getPrimaryCodexWindow,
  isWindowDestroyed,
  makeWindowLikeForView,
  normalizeCodexRoute,
  normalizeOwlViewUrl,
  windowIdFor,
} from "./codex-windows";

export type OwlViewAttachMode = "contentView" | "browserView";

export interface ManagedOwlView {
  key: string;
  tweakId: string;
  id: string;
  view: Electron.BrowserView;
  parentWindowId: number | null;
  attachMode: OwlViewAttachMode | null;
  disposeBindings: Array<() => void>;
  disposed: boolean;
}

export const untrustedWebContentsIds = new Set<number>();
const owlViews = new Map<string, ManagedOwlView>();

export function markUntrustedWebContents(wc: Electron.WebContents): void {
  untrustedWebContentsIds.add(wc.id);
  wc.once("destroyed", () => { untrustedWebContentsIds.delete(wc.id); });
}



export function getOwlViewCapabilities(): CodexRuntimeCapabilities["views"] {
  const parent = getPrimaryCodexWindow() ?? BrowserWindow.getFocusedWindow();
  const contentView = asRecord(parent)?.contentView;
  let sampleView: Electron.BrowserView | null = null;
  try {
    sampleView = new BrowserView({ webPreferences: { sandbox: true } });
  } catch {}
  const webContentsView = asRecord(sampleView)?.webContentsView;
  const privateViewTree = typeof asRecord(contentView)?.addChildView === "function" &&
    typeof asRecord(contentView)?.removeChildView === "function";
  const webContentsViewAvailable = Boolean(webContentsView) &&
    typeof asRecord(webContentsView)?.setBounds === "function";
  const privateAttach = privateViewTree && webContentsViewAvailable;
  const browserViewFallback = typeof asRecord(parent)?.addBrowserView === "function";
  try {
    if (sampleView && !sampleView.webContents.isDestroyed()) {
      sampleView.webContents.close({ waitForBeforeUnload: false });
    }
  } catch {}
  return {
    create: privateAttach || browserViewFallback,
    privateViewTree: privateAttach,
    webContentsView: webContentsViewAvailable,
    browserViewFallback,
  };
}

export async function createOwlView(
  ctx: NativeTweakContext,
  opts: CodexViewCreateOptions,
): Promise<CodexViewRef> {
  const id = assertBridgeId(opts.id ?? randomUUID(), "Codex view id");
  const key = owlViewKey(ctx.id, id);
  if (owlViews.has(key)) throw new Error(`Codex view already exists: ${ctx.id}:${id}`);

  const parent = typeof opts.parentWindowId === "number"
    ? BrowserWindow.fromId(opts.parentWindowId)
    : getPrimaryCodexWindow();
  if (!parent || isWindowDestroyed(parent)) {
    throw new Error("Codex view needs an active parent window");
  }

  const services = getCodexWindowServices();
  const windowManager = services?.windowManager;
  const route = opts.route === undefined ? null : normalizeCodexRoute(opts.route);
  const hostId = opts.hostId || "local";
  const view = new BrowserView({
    webPreferences: {
      preload: opts.registerWithCodex === false
        ? (existsSync(GUEST_PRELOAD_PATH) ? GUEST_PRELOAD_PATH : undefined)
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
    callObjectMethod(view, "setBackgroundColor", [opts.backgroundColor]);
    callObjectMethod(asRecord(view)?.webContentsView, "setBackgroundColor", [opts.backgroundColor]);
  }

  const managed: ManagedOwlView = {
    key,
    tweakId: ctx.id,
    id,
    view,
    parentWindowId: windowIdFor(parent),
    attachMode: null,
    disposeBindings: [],
    disposed: false,
  };
  owlViews.set(key, managed);

  try {
    if (route !== null && opts.registerWithCodex !== false && windowManager?.registerWindow) {
      const appearance = opts.appearance || "secondary";
      const windowLike = makeWindowLikeForView(view);
      windowManager.registerWindow(windowLike, hostId, false, appearance);
      services?.getContext?.(hostId)?.registerWindow?.(windowLike);
    }

    attachOwlView(managed, parent);
    if (opts.bounds) setOwlViewBounds(managed, opts.bounds);
    if (opts.visible === false) setOwlViewVisible(managed, false);

    if (route !== null) {
      await view.webContents.loadURL(codexAppUrl(route, hostId));
    } else if (opts.url) {
      await view.webContents.loadURL(normalizeOwlViewUrl(opts.url));
    } else {
      await view.webContents.loadURL("about:blank");
    }
  } catch (e) {
    disposeOwlView(managed);
    throw e;
  }

  log("info", `created Owl view ${ctx.id}:${id}`, {
    parentWindowId: managed.parentWindowId,
    webContentsId: view.webContents.id,
    attachMode: managed.attachMode,
  });
  return owlViewRef(managed);
}

export async function callOwlView(
  tweakId: string,
  id: string,
  method: string,
  arg?: unknown,
  arg2?: unknown,
): Promise<unknown> {
  const view = owlViewFor(tweakId, id);
  if (method === "setBounds") return setOwlViewBounds(view, arg as Electron.Rectangle);
  if (method === "setVisible") return setOwlViewVisible(view, Boolean(arg));
  if (method === "bringToFront") return bringOwlViewToFront(view);
  if (method === "loadRoute") {
    const route = normalizeCodexRoute(String(arg));
    const hostId = typeof arg2 === "string" && arg2 ? arg2 : "local";
    return view.view.webContents.loadURL(codexAppUrl(route, hostId));
  }
  if (method === "loadUrl") return view.view.webContents.loadURL(normalizeOwlViewUrl(String(arg)));
  if (method === "dispose") return disposeOwlViewById(tweakId, id);
  throw new Error(`unknown Codex view method: ${method}`);
}

export function owlViewRef(view: ManagedOwlView): CodexViewRef {
  return {
    id: view.id,
    webContentsId: view.view.webContents.id,
    parentWindowId: view.parentWindowId,
    setBounds: (bounds) => Promise.resolve(setOwlViewBounds(view, bounds)),
    setVisible: (visible) => Promise.resolve(setOwlViewVisible(view, visible)),
    bringToFront: () => Promise.resolve(bringOwlViewToFront(view)),
    loadRoute: (route, hostId) => view.view.webContents.loadURL(codexAppUrl(normalizeCodexRoute(route), hostId || "local")).then(() => {}),
    loadUrl: (url) => view.view.webContents.loadURL(normalizeOwlViewUrl(url)).then(() => {}),
    dispose: () => Promise.resolve(disposeOwlViewById(view.tweakId, view.id)),
  };
}

export function attachOwlView(view: ManagedOwlView, parent: Electron.BrowserWindow): void {
  const contentView = asRecord(parent)?.contentView;
  const webContentsView = asRecord(view.view)?.webContentsView;
  if (typeof asRecord(parent)?.addBrowserView === "function") {
    callObjectMethod(parent, "addBrowserView", [view.view]);
    view.attachMode = "browserView";
  } else if (
    typeof asRecord(contentView)?.addChildView === "function" &&
    webContentsView
  ) {
    try {
      addOwlChildView(parent, view.view);
      view.attachMode = "contentView";
    } catch (e) {
      log("warn", "Owl contentView attachment failed; falling back to BrowserView", {
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

export function bringOwlViewToFront(view: ManagedOwlView): void {
  if (view.disposed) return;
  const parent = view.parentWindowId === null ? null : BrowserWindow.fromId(view.parentWindowId);
  if (!parent || isWindowDestroyed(parent)) return;
  const contentView = asRecord(parent)?.contentView;
  const webContentsView = asRecord(view.view)?.webContentsView;
  if (view.attachMode === "contentView" && webContentsView) {
    try {
      if (typeof asRecord(parent)?.setTopBrowserView === "function") {
        callObjectMethod(parent, "setTopBrowserView", [view.view]);
      } else {
        callObjectMethod(contentView, "addChildView", [webContentsView]);
      }
      return;
    } catch (e) {
      log("warn", "Owl contentView bring-to-front failed", {
        tweakId: view.tweakId,
        viewId: view.id,
        error: String(e),
      });
    }
  }
  if (typeof asRecord(parent)?.setTopBrowserView === "function") {
    callObjectMethod(parent, "setTopBrowserView", [view.view]);
  }
}

export function setOwlViewBounds(view: ManagedOwlView, bounds: Electron.Rectangle): void {
  assertBounds(bounds);
  callObjectMethod(view.view, "setBounds", [bounds]);
  callObjectMethod(asRecord(view.view)?.webContentsView, "setBounds", [bounds]);
}

export function setOwlViewVisible(view: ManagedOwlView, visible: boolean): void {
  callObjectMethod(asRecord(view.view)?.webContentsView, "setVisible", [visible]);
}

export function disposeOwlViewById(tweakId: string, id: string): void {
  const view = owlViews.get(owlViewKey(tweakId, id));
  if (!view) return;
  disposeOwlView(view);
}

export function disposeOwlViewsForTweak(tweakId: string): void {
  for (const view of [...owlViews.values()]) {
    if (view.tweakId === tweakId) disposeOwlView(view);
  }
}

export function disposeAllOwlViews(): void {
  for (const view of [...owlViews.values()]) disposeOwlView(view);
}

export function disposeOwlView(view: ManagedOwlView): void {
  if (view.disposed) return;
  view.disposed = true;
  owlViews.delete(view.key);
  for (const dispose of view.disposeBindings.splice(0)) {
    try {
      dispose();
    } catch {}
  }
  const parent = view.parentWindowId === null ? null : BrowserWindow.fromId(view.parentWindowId);
  if (parent && !isWindowDestroyed(parent)) {
    try {
      if (view.attachMode === "contentView") {
        removeOwlChildView(parent, view.view);
      } else if (view.attachMode === "browserView") {
        callObjectMethod(parent, "removeBrowserView", [view.view]);
      }
    } catch (e) {
      log("warn", "Owl view detach failed during dispose", {
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
  } catch {}
}

export function owlViewFor(tweakId: string, id: string): ManagedOwlView {
  const view = owlViews.get(owlViewKey(tweakId, id));
  if (!view || view.disposed) throw new Error(`Codex view is not loaded: ${tweakId}:${id}`);
  return view;
}

export function owlViewKey(tweakId: string, viewId: string): string {
  return `${tweakId}:${viewId}`;
}

export function addOwlChildView(parent: Electron.BrowserWindow, child: Electron.BrowserView): void {
  const ownerWindow = asRecord(child)?.ownerWindow;
  if (ownerWindow && ownerWindow !== parent) {
    callObjectMethod(ownerWindow, "removeBrowserView", [child]);
  }

  callObjectMethod(asRecord(parent)?.contentView, "addChildView", [asRecord(child)?.webContentsView]);
  try {
    (child as unknown as { ownerWindow: Electron.BrowserWindow | null }).ownerWindow = parent;
  } catch {}
  callObjectMethod(asRecord(child.webContents), "_setOwnerWindow", [parent]);

  const browserViews = asRecord(parent)?._browserViews;
  if (Array.isArray(browserViews) && !browserViews.includes(child)) {
    browserViews.push(child);
  }
}

export function removeOwlChildView(parent: Electron.BrowserWindow, child: Electron.BrowserView): void {
  callObjectMethod(asRecord(parent)?.contentView, "removeChildView", [asRecord(child)?.webContentsView]);
  try {
    (child as unknown as { ownerWindow: Electron.BrowserWindow | null }).ownerWindow = null;
  } catch {}

  const browserViews = asRecord(parent)?._browserViews;
  if (Array.isArray(browserViews)) {
    const index = browserViews.indexOf(child);
    if (index >= 0) browserViews.splice(index, 1);
  }
}

export function bindWindowEvent(
  win: Electron.BrowserWindow,
  view: ManagedOwlView,
  event: string,
  listener: (...args: unknown[]) => void,
): void {
  const on = asRecord(win)?.on;
  const off = asRecord(win)?.off;
  if (typeof on !== "function") return;
  on.call(win, event, listener);
  view.disposeBindings.push(() => {
    if (typeof off === "function") off.call(win, event, listener);
    else callObjectMethod(win, "removeListener", [event, listener]);
  });
}

export function assertBridgeId(value: string, label: string): string {
  if (typeof value !== "string" || !/^[a-zA-Z0-9._-]+$/.test(value)) {
    throw new Error(`${label} may only contain letters, numbers, dots, underscores, and dashes`);
  }
  return value;
}

export function assertBounds(bounds: Electron.Rectangle): void {
  const values = [bounds?.x, bounds?.y, bounds?.width, bounds?.height];
  if (!values.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("bounds must contain finite x, y, width, and height numbers");
  }
  if (bounds.width < 0 || bounds.height < 0) {
    throw new Error("bounds width and height must be non-negative");
  }
}
