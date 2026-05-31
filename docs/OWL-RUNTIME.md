# Owl Runtime Surface

This documents the Owl runtime surface Codex++ can observe in the current
packaged Codex app. It is based on the local stable app at Codex
`26.527.31326`.

Owl is private upstream implementation detail. Treat every API below as
unstable unless it is wrapped by `@codex-plusplus/sdk`.

See [Owl Bridge Roadmap](./OWL-BRIDGE-ROADMAP.md) for the plan to turn this
private surface into stable Codex++ APIs.

## Runtime Detection

On macOS, Codex++ reports `runtime.type = "owl"` when the app bundle contains:

```text
Codex.app/Contents/Frameworks/Codex Framework.framework
Codex.app/Contents/Resources/codex
Codex.app/Contents/Resources/app.asar
```

The current Owl app does not contain:

```text
Codex.app/Contents/Frameworks/Electron Framework.framework
```

The `app.asar` still contains the desktop JavaScript app. Its package metadata
still uses the historical `openai-codex-electron` name and exposes Owl build
scripts such as `owl`, `build:owl`, and `owl:package`.

## What Owl Is

For Codex++ purposes, Owl is a native Codex shell plus a Chromium runtime that
keeps enough Electron compatibility for the existing desktop JavaScript app to
run.

Observed bundle pieces:

| Path | Purpose |
|---|---|
| `Contents/MacOS/Codex` | macOS app launcher. |
| `Contents/Resources/codex` | native Codex executable. Links AppKit, CoreGraphics, AVFoundation, Metal, ScreenCaptureKit, and related system frameworks. |
| `Contents/Frameworks/Codex Framework.framework` | Chromium-style framework and resources. |
| `Contents/Resources/app.asar` | packaged desktop JS app, still loaded through CommonJS. |

The main bundle is still a Node/Electron-shaped CommonJS process. The renderer
is still Chromium. Renderer windows use:

```ts
contextIsolation: true;
nodeIntegration: false;
```

## Chrome DevTools Protocol

CDP is still available because Owl is Chromium-based. It is not enabled by
default.

Codex++ enables CDP before `app.whenReady()` when:

```sh
CODEXPP_REMOTE_DEBUG=1
```

Launch Codex with CDP enabled:

```sh
open --env CODEXPP_REMOTE_DEBUG=1 --env CODEXPP_REMOTE_DEBUG_PORT=9222 -a Codex
```

List targets:

```sh
curl -s http://127.0.0.1:9222/json
```

The app page target normally has an `app://-/index.html?...` URL.

## Electron Compatibility

The main process can still `require("electron")`. Codex++ currently imports and
uses these Electron-compatible exports:

```ts
import {
  app,
  BrowserView,
  BrowserWindow,
  clipboard,
  ipcMain,
  session,
  shell,
  webContents,
} from "electron";
```

The upstream app also references these standard Electron-style exports in the
current Owl build:

```text
app
autoUpdater
BrowserWindow
clipboard
contentTracing
crashReporter
dialog
globalShortcut
ipcMain
Menu
MenuItem
MessageChannelMain
nativeImage
nativeTheme
net
Notification
powerMonitor
powerSaveBlocker
protocol
screen
session
shell
systemPreferences
Tray
utilityProcess
webContents
```

This does not mean every Electron API behaves identically to stock Electron.
Use Codex++ wrappers where possible, and probe before relying on a new Electron
export.

The current main bundle also uses normal Node APIs:

```text
node:child_process
node:crypto
node:fs
node:fs/promises
node:http
node:https
node:inspector
node:module
node:net
node:os
node:path
node:perf_hooks
node:process
node:readline
node:stream
node:string_decoder
node:timers/promises
node:url
node:util
node:worker_threads
node:zlib
```

## Renderer Bridge

Codex's own preload exposes this private renderer surface:

```ts
declare global {
  const codexWindowType: "electron";

  interface Window {
    electronBridge: ElectronBridge;
  }
}

interface ElectronBridge {
  windowType: "electron";
  sendMessageFromView(message: unknown): Promise<void>;
  getPathForFile(file: File): string | null;
  sendWorkerMessageFromView(workerId: string, message: unknown): Promise<void>;
  subscribeToWorkerMessages(
    workerId: string,
    handler: (message: unknown) => void,
  ): () => void;
  showContextMenu(payload: unknown): Promise<unknown>;
  showApplicationMenu(menuId: string, x: number, y: number): Promise<void>;
  getFastModeRolloutMetrics(payload: unknown): Promise<unknown>;
  getSharedObjectSnapshotValue(key: string): unknown;
  getSystemThemeVariant(): "light" | "dark" | string;
  subscribeToSystemThemeVariant(handler: () => void): () => void;
  triggerSentryTestError(): Promise<void>;
  getSentryInitOptions(): Record<string, unknown>;
  getAppSessionId(): string | undefined;
  getBuildFlavor(): string | null;
  isIntelMacBuild(): boolean;
  usesOwlAppShell(): boolean;
}
```

Observed bridge IPC channels:

| Bridge API | IPC channel |
|---|---|
| `sendMessageFromView` | `codex_desktop:message-from-view` |
| main-to-renderer view messages | `codex_desktop:message-for-view` |
| `sendWorkerMessageFromView(id, msg)` | `codex_desktop:worker:<id>:from-view` |
| `subscribeToWorkerMessages(id, cb)` | `codex_desktop:worker:<id>:for-view` |
| `showContextMenu` | `codex_desktop:show-context-menu` |
| `showApplicationMenu` | `codex_desktop:show-application-menu` |
| `getFastModeRolloutMetrics` | `codex_desktop:get-fast-mode-rollout-metrics` |
| `triggerSentryTestError` | `codex_desktop:trigger-sentry-test` |
| `getSentryInitOptions` | `codex_desktop:get-sentry-init-options` |
| `getBuildFlavor` | `codex_desktop:get-build-flavor` |
| `usesOwlAppShell` | `codex_desktop:get-uses-owl-app-shell` |
| `getSystemThemeVariant` | `codex_desktop:get-system-theme-variant` |
| shared object snapshot | `codex_desktop:get-shared-object-snapshot` |

The preload also listens for a same-window `message` event with:

```ts
{ type: "connect-app-host"; port: MessagePort }
```

and forwards that port to:

```text
codex_desktop:connect-app-host
```

Codex++ renderer tweaks should not call `electronBridge` directly unless they
are intentionally targeting private Codex internals. Prefer the tweak SDK and
DOM APIs.

## Main Window Services

Codex++ patches the current Owl main bundle so the Codex window-services object
is available at:

```ts
globalThis.__codexpp_window_services__
```

Observed top-level shape:

```ts
interface OwlWindowServices {
  windowManager: OwlWindowManager;
  filePreviewManager: unknown;
  avatarOverlayManager: unknown;
  hotkeyWindowLifecycleManager: unknown;
  globalDictationLifecycleManager: unknown;
  appshotHotkeyController: unknown;

  setWindowContext(context: unknown): void;
  ensureWindow(): Promise<Electron.BrowserWindow | null>;
  createFreshWindow(initialRoute?: string): Promise<Electron.BrowserWindow | null>;
  showLastActivePrimaryWindow(): boolean;
  markAppQuitting(): void;
  isTrustedIpcSender(
    sender: Electron.WebContents,
    senderFrame?: Electron.WebFrameMain | null,
  ): boolean;
  sendMessageToWindow(window: Electron.BrowserWindow, message: unknown): void;
  sendMessageToAllRegisteredWindows(message: unknown): void;
  sendMessageToAllWindows(message: unknown): void;
  getPrimaryWindow(): Electron.BrowserWindow | null;
  getContextForWebContents(webContents: Electron.WebContents): unknown | null;
}
```

Codex++ currently uses this object only through guarded runtime code. The SDK
does not expose the full private object to tweaks.

## Window Manager

The current `windowManager` object exposes these observed methods:

```ts
interface OwlWindowManager {
  setOnMainProcessInspectorStateChanged(handler: unknown): void;
  setQueueCodexDeepLinkUrl(handler: unknown): void;
  queueCodexDeepLinkUrl(url: string, options?: unknown): boolean;

  markWebContentsReady(webContents: Electron.WebContents): void;
  forgetWebContents(webContentsId: number): void;
  isWebContentsReady(webContentsId: number): boolean;
  flushPendingMessages(webContents: Electron.WebContents): void;

  setAppShellShortcutState(webContentsId: number, state: unknown): void;
  getAppShellShortcutState(webContentsId: number): unknown | null;

  markAppQuitting(): void;
  showPrimaryWindow(options?: { stealFocus?: boolean }): boolean;
  showLastActivePrimaryWindow(): boolean;
  showWindow(
    window: Electron.BrowserWindow | null,
    options?: { stealFocus?: boolean },
  ): boolean;

  sendMessageToWindow(window: Electron.BrowserWindow, message: unknown): void;
  sendMessageToAllRegisteredWindows(message: unknown): void;
  sendMessageToAllWindows(message: unknown): void;
  sendMessageToWebContents(webContents: Electron.WebContents, message: unknown): void;
  sendMessageToWebContentsId(webContentsId: number, message: unknown): void;

  getPrimaryWindow(): Electron.BrowserWindow | null;
  getPrimaryWindows(): Electron.BrowserWindow[];
  getTrackedPrimaryWindows(): Electron.BrowserWindow[];
  wasPrimaryWindowFocusedWithin(window: Electron.BrowserWindow, ms: number): boolean;
  trackPrimaryWindow(window: Electron.BrowserWindow): void;

  refreshWindowBackdrops(): void;
  hasRegisteredWebContents(webContents: Electron.WebContents): boolean;
  getHostIdForWebContents(webContents: Electron.WebContents): string | null;
  isTrustedIpcSender(
    sender: Electron.WebContents,
    senderFrame?: Electron.WebFrameMain | null,
  ): boolean;

  isMainProcessInspectorEnabled(): boolean;
  toggleMainProcessInspector(): Promise<void>; // currently throws in production
  openMcpAppSandboxDevtools(webContents: Electron.WebContents, id: string): void;

  createWindow(options?: OwlCreateWindowOptions): Promise<Electron.BrowserWindow>;
  createPrimaryWindow(options?: Omit<OwlCreateWindowOptions, "appearance">): Promise<Electron.BrowserWindow>;
  createAuxWindow(title: string, hostId?: string): Promise<Electron.BrowserWindow>;
  ensureAuxWindow(
    owner: Electron.WebContents,
    stores: unknown,
    title: string,
  ): Promise<unknown>;
  registerWindow(
    window: Electron.BrowserWindow,
    hostId: string,
    primary: boolean,
    appearance: OwlWindowAppearance,
  ): void;

  addBrowserCommentPopupWindowCreatedHandler(handler: unknown): () => void;
  createBrowserCommentPopupWindowOptions(parent: Electron.BrowserWindow): unknown;

  getPrimaryMinimumSize(): { width: number; height: number };
  syncPrimaryMinimumSize(): void;
  restorePrimaryWindowBounds(): unknown | null;
  persistPrimaryWindowBounds(window: Electron.BrowserWindow): void;
  clampPrimaryWindowBounds(bounds: unknown): unknown;
  isWithinDisplayWorkArea(bounds: unknown): boolean;

  isOpaqueWindowsEnabled(): boolean;
  shouldUseOpaqueWindowSurface(
    appearance: OwlWindowAppearance,
    bounds: Electron.Rectangle,
    isFocused: boolean,
  ): boolean;
  applyWindowBackdrop(
    window: Electron.BrowserWindow,
    appearance: OwlWindowAppearance,
    force: boolean,
  ): void;
  installNativeContextMenu(window: Electron.BrowserWindow): void;
  installWebContentsDiagnostics(window: Electron.BrowserWindow): void;
  maybeRecoverFromRendererCrash(
    window: Electron.BrowserWindow,
    reason: string,
  ): void;
}
```

Observed `createWindow` options:

```ts
type OwlWindowAppearance =
  | "primary"
  | "secondary"
  | "hud"
  | "avatarOverlay"
  | "browserCommentPopup"
  | "globalDictation"
  | "hotkeyWindowHome"
  | "hotkeyWindowThread";

interface OwlCreateWindowOptions {
  title?: string;
  width?: number;      // default 1280
  height?: number;     // default 820
  appearance?: OwlWindowAppearance; // default "primary"
  show?: boolean;      // default true
  initialRoute?: string;
  hostId?: string;
  parent?: Electron.BrowserWindow;
  focusable?: boolean;
  lockTitle?: boolean;
}
```

`createWindow()` installs Codex's own preload, registers diagnostics and native
context menus, tracks the window under a `hostId`, and loads the app route.

## Codex++ Stable Wrappers

The stable tweak-facing surface is namespaced and serialized. Tweaks receive
capabilities and handles, never raw Owl service objects:

```ts
const info = await api.codex.runtime.getInfo();
const capabilities = await api.codex.runtime.getCapabilities();

const primary = await api.codex.windows.getPrimary();
const win = await api.codex.windows.create({
  route: "/",
  hostId: "local",
  show: true,
  appearance: "secondary",
});

const cdp = await api.codex.cdp.getStatus();

const overlay = await api.codex.views.create({
  parentWindowId: primary?.windowId ?? win.windowId,
  route: "/",
  bounds: { x: 24, y: 24, width: 420, height: 260 },
});

const panel = await api.codex.native.createPanel({
  parentWindowId: primary?.windowId ?? win.windowId,
});
```

`api.codex.views` uses Owl's private
`contentView.addChildView(view.webContentsView)` path when available and falls
back to `BrowserWindow.addBrowserView(view)`.

`createPanel()` and `attachView()` use the bundled Codex++ native host when
`moduleId` is omitted. Tweak-owned `.node` modules can still be loaded with
`api.codex.native.loadModule()` when a tweak needs custom Swift/Objective-C++.

Backwards-compatible helpers remain available for existing main-process tweaks:

```ts
await api.codex.createWindow({ route: "/", hostId: "local" });
await api.codex.createBrowserView({ route: "/", hostId: "local" });
```

See [SDK and API reference](./tweaks/api-reference.md#codexapi).

## Introspection

Check the installed runtime type:

```sh
node packages/installer/dist/cli.js debug
```

List Electron-compatible exports from a local main-process tweak:

```js
module.exports = {
  start(api) {
    const electron = require("electron");
    api.log.info(Object.keys(electron).sort().join(", "));
  },
};
```

Inspect renderer globals through CDP:

```js
Object.keys(window.electronBridge).sort()
window.electronBridge.usesOwlAppShell()
window.electronBridge.getBuildFlavor()
```

Do not ship tweaks that depend on raw Owl internals unless the tweak also
handles missing methods and upstream shape changes.
