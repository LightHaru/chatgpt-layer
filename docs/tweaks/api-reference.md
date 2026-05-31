# SDK and API Reference

This is the full public API surface exported by `@codex-plusplus/sdk`.

Use it for types:

```ts
import {
  defineTweak,
  validateTweakManifest,
  type Tweak,
  type TweakApi,
  type TweakManifest,
} from "@codex-plusplus/sdk";
```

Runtime note: TypeScript and ESM must be bundled to runtime-loadable JavaScript
before installing a tweak. See [TypeScript and bundling](./typescript-and-bundling.md).

## Export Index

Functions:

- [`defineTweak(tweak)`](#definetweaktweak)
- [`validateTweakManifest(manifest)`](#validatetweakmanifestmanifest)

Constants:

- [`VALID_TWEAK_SCOPES`](#valid_tweak_scopes)
- [`VALID_TWEAK_PERMISSIONS`](#valid_tweak_permissions)

Types and interfaces:

- [`Tweak`](#tweak)
- [`TweakApi`](#tweakapi)
- [`TweakManifest`](#tweakmanifest)
- [`TweakAuthor`](#tweakauthor)
- [`TweakScope`](#tweakscope)
- [`TweakPermission`](#tweakpermission)
- [`TweakMcpServer`](#tweakmcpserver)
- [`TweakManifestIssue`](#tweakmanifestissue)
- [`TweakManifestValidationResult`](#tweakmanifestvalidationresult)
- [`TweakStorage`](#tweakstorage)
- [`TweakLogger`](#tweaklogger)
- [`SettingsApi`](#settingsapi)
- [`SettingsSection`](#settingssection)
- [`SettingsPage`](#settingspage)
- [`SettingsHandle`](#settingshandle)
- [`ReactApi`](#reactapi)
- [`ReactFiberNode`](#reactfibernode)
- [`TweakIpc`](#tweakipc)
- [`TweakFs`](#tweakfs)
- [`CodexApi`](#codexapi)
- [`CodexRuntimeType`](#codexruntimetype)
- [`CodexRuntimeInfo`](#codexruntimeinfo)
- [`CodexRuntimeCapabilities`](#codexruntimecapabilities)
- [`CodexRuntimeApi`](#codexruntimeapi)
- [`CodexWindowsApi`](#codexwindowsapi)
- [`CodexViewCreateOptions`](#codexviewcreateoptions)
- [`CodexViewRef`](#codexviewref)
- [`CodexViewsApi`](#codexviewsapi)
- [`CodexCdpStatus`](#codexcdpstatus)
- [`CodexCdpTarget`](#codexcdptarget)
- [`CodexCdpApi`](#codexcdpapi)
- [`NativeModuleKind`](#nativemodulekind)
- [`NativeModuleLoadOptions`](#nativemoduleloadoptions)
- [`NativeModuleRef`](#nativemoduleref)
- [`NativePanelCreateOptions`](#nativepanelcreateoptions)
- [`NativePanelRef`](#nativepanelref)
- [`NativeViewAttachOptions`](#nativeviewattachoptions)
- [`NativeViewRef`](#nativeviewref)
- [`NativeHelperLaunchOptions`](#nativehelperlaunchoptions)
- [`NativeHelperRef`](#nativehelperref)
- [`CodexNativeApi`](#codexnativeapi)
- [`CodexCreateWindowOptions`](#codexcreatewindowoptions)
- [`CodexCreateViewOptions`](#codexcreateviewoptions)
- [`CodexWindowRef`](#codexwindowref)

## `defineTweak(tweak)`

```ts
function defineTweak(tweak: Tweak): Tweak
```

`defineTweak` is an identity helper for type inference.

```ts
import { defineTweak } from "@codex-plusplus/sdk";

export default defineTweak({
  start(api) {
    api.log.info(api.manifest.id);
  },
});
```

## `validateTweakManifest(manifest)`

```ts
function validateTweakManifest(manifest: unknown): TweakManifestValidationResult
```

Validates the manifest shape. It checks required string fields, id characters,
GitHub repo format, scope, optional strings, author object, tags, permissions,
and MCP shape.

It does not check that the entry file exists; `codexplusplus validate-tweak`
adds that filesystem check.

```ts
const result = validateTweakManifest(manifest);
if (!result.ok) {
  for (const issue of result.errors) {
    console.error(`${issue.path}: ${issue.message}`);
  }
}
```

## `VALID_TWEAK_SCOPES`

```ts
const VALID_TWEAK_SCOPES = ["renderer", "main", "both"] as const
```

Runtime-supported manifest scopes.

## `VALID_TWEAK_PERMISSIONS`

```ts
const VALID_TWEAK_PERMISSIONS = [
  "ipc",
  "filesystem",
  "network",
  "settings",
  "codex-runtime",
  "codex-windows",
  "codex-views",
  "codex-cdp",
  "codex.windows",
  "codex.views",
  "native-module",
  "native-view",
  "native-helper",
] as const
```

Known permission declaration values.

## `Tweak`

```ts
interface Tweak {
  start(api: TweakApi): void | Promise<void>;
  stop?(): void | Promise<void>;
}
```

The object exported by a tweak entry.

Runtime accepted shapes:

```js
module.exports = { start() {} };
exports.start = function start() {};
module.exports.default = { start() {} };
```

Bundle TypeScript/ESM output before installing.

## `TweakApi`

```ts
interface TweakApi {
  manifest: Readonly<TweakManifest>;
  storage: TweakStorage;
  log: TweakLogger;
  process: "renderer" | "main";
  settings?: SettingsApi;
  react?: ReactApi;
  ipc: TweakIpc;
  fs: TweakFs;
  codex?: CodexApi;
}
```

Available by process:

| API | Renderer | Main |
|---|---:|---:|
| `manifest` | yes | yes |
| `storage` | yes | yes |
| `log` | yes | yes |
| `process` | yes | yes |
| `settings` | yes | no |
| `react` | yes | no |
| `ipc` | yes | yes |
| `fs` | yes | yes |
| `codex` | yes | yes |

Check `api.process` or optional properties before using process-specific APIs in
`scope: "both"` tweaks.

## `TweakManifest`

```ts
interface TweakManifest {
  id: string;
  name: string;
  version: string;
  githubRepo: string;
  description?: string;
  author?: string | TweakAuthor;
  homepage?: string;
  iconUrl?: string;
  tags?: string[];
  minRuntime?: string;
  scope?: TweakScope;
  main?: string;
  mcp?: TweakMcpServer;
  permissions?: TweakPermission[];
}
```

See [Manifest reference](./manifest.md) for runtime behavior and examples.

## `TweakAuthor`

```ts
interface TweakAuthor {
  name: string;
  url?: string;
  email?: string;
}
```

Structured author metadata. `author` can also be a plain string.

## `TweakScope`

```ts
type TweakScope = "renderer" | "main" | "both"
```

Controls which tweak host loads the entry. Missing scope currently behaves like
`both`; set it explicitly.

## `TweakPermission`

```ts
type TweakPermission =
  | "ipc"
  | "filesystem"
  | "network"
  | "settings"
  | "codex-runtime"
  | "codex-windows"
  | "codex-views"
  | "codex-cdp"
  | "codex.windows"
  | "codex.views"
  | "native-module"
  | "native-view"
  | "native-helper"
```

Declared capabilities for user visibility/review. Native permissions and Owl
view permissions are enforced at runtime.

## `TweakMcpServer`

```ts
interface TweakMcpServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}
```

Declares an MCP server managed by Codex++. See [MCP servers](./mcp.md).

## `TweakManifestIssue`

```ts
interface TweakManifestIssue {
  path: string;
  message: string;
}
```

Validation issue shape.

## `TweakManifestValidationResult`

```ts
interface TweakManifestValidationResult {
  ok: boolean;
  errors: TweakManifestIssue[];
  warnings: TweakManifestIssue[];
}
```

Returned by `validateTweakManifest`.

## `TweakStorage`

```ts
interface TweakStorage {
  get<T = unknown>(key: string, fallback?: T): T;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  all(): Record<string, unknown>;
}
```

Per-tweak key/value storage.

Renderer backing store:

```text
localStorage["codexpp:storage:<tweak-id>"]
```

Main backing store:

```text
<userRoot>/storage/<tweak-id>.json
```

Example:

```js
const count = api.storage.get("count", 0);
api.storage.set("count", count + 1);
```

Values must be JSON-serializable if you expect them to persist safely.

## `TweakLogger`

```ts
interface TweakLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}
```

Renderer logs go to DevTools and `<userRoot>/log/preload.log`. Main logs go to
`<userRoot>/log/main.log`.

## `SettingsApi`

```ts
interface SettingsApi {
  register(section: SettingsSection): SettingsHandle;
  registerPage(page: SettingsPage): SettingsHandle;
}
```

Renderer-only. `settings` is undefined in main.

Use `register` for compact controls nested under the tweak card. Use
`registerPage` for a full sidebar page.

## `SettingsSection`

```ts
interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  render(root: HTMLElement): void | (() => void);
}
```

`id` is scoped by tweak id at runtime. A local id of `quick` becomes
`<tweak-id>:quick`.

Runtime note: section cleanup return values are accepted by the type but current
section rendering is simple. Clean up long-lived resources from tweak `stop()`.

## `SettingsPage`

```ts
interface SettingsPage {
  id: string;
  title: string;
  description?: string;
  iconSvg?: string;
  render(root: HTMLElement): void | (() => void);
}
```

Renderer-only dedicated settings page. Pages appear under a "Tweaks" sidebar
group. `iconSvg` should be 20 by 20 SVG markup using `currentColor`.

Page cleanup functions are called before re-rendering and when pages unregister.

## `SettingsHandle`

```ts
interface SettingsHandle {
  unregister(): void;
}
```

Returned by `settings.register` and `settings.registerPage`.

## `ReactApi`

```ts
interface ReactApi {
  getFiber(node: Element): ReactFiberNode | null;
  findOwnerByName(node: Element, name: string): ReactFiberNode | null;
  waitForElement(selector: string, timeoutMs?: number): Promise<Element>;
}
```

Renderer-only. Use as an escape hatch for Codex internals.

Example:

```js
const composer = await api.react.waitForElement("[data-testid='composer']", 8000);
const fiber = api.react.getFiber(composer);
const owner = api.react.findOwnerByName(composer, "Composer");
```

Component names and fiber shapes can change in upstream Codex builds.

## `ReactFiberNode`

```ts
interface ReactFiberNode {
  type: unknown;
  stateNode: unknown;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
  return: ReactFiberNode | null;
  child: ReactFiberNode | null;
  sibling: ReactFiberNode | null;
}
```

Minimal exposed React fiber shape. Treat it as unstable.

## `TweakIpc`

```ts
interface TweakIpc {
  on(channel: string, handler: (...args: unknown[]) => void): () => void;
  send(channel: string, ...args: unknown[]): void;
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  handle?(channel: string, handler: (...args: unknown[]) => unknown): void;
}
```

Channels are prefixed as:

```text
codexpp:<tweak-id>:<channel>
```

Renderer supports `on`, `send`, and `invoke`.

Main supports `on` and `handle`. Main-side `send` and `invoke` intentionally
throw because they are renderer-to-main operations in the current runtime.

## `TweakFs`

```ts
interface TweakFs {
  dataDir: string;
  read(relPath: string): Promise<string>;
  write(relPath: string, contents: string): Promise<void>;
  exists(relPath: string): Promise<boolean>;
}
```

Sandboxed to:

```text
<userRoot>/tweak-data/<tweak-id>/
```

Keep paths relative. Renderer calls are proxied through main IPC. Current
main-side implementation joins paths under `dataDir`; keep to relative paths and
avoid path traversal.

## `CodexApi`

```ts
interface CodexApi {
  runtime: CodexRuntimeApi;
  windows: CodexWindowsApi;
  views: CodexViewsApi;
  cdp: CodexCdpApi;
  native: CodexNativeApi;
  createBrowserView(options: CodexCreateViewOptions): Promise<unknown>;
  createWindow(options: CodexCreateWindowOptions): Promise<CodexWindowRef>;
}
```

Available in renderer and main. Renderer calls are proxied to the main process
where required.

These APIs depend on Codex window services exposed by the patch. They may need
runtime updates when upstream Codex changes its Owl/Electron internals. See
[Owl runtime surface](../OWL-RUNTIME.md) for the private upstream APIs Codex++
currently observes.

`createWindow()` and `createBrowserView()` are kept for backwards
compatibility. Prefer the namespaced APIs for new tweaks.

## `CodexRuntimeType`

```ts
type CodexRuntimeType = "owl" | "electron" | "unknown";
```

## `CodexRuntimeInfo`

```ts
interface CodexRuntimeInfo {
  type: CodexRuntimeType;
  codexVersion: string | null;
  channel: string | null;
  buildFlavor: string | null;
  usesOwlAppShell: boolean | null;
  appPath: string | null;
  resourcesPath: string | null;
}
```

## `CodexRuntimeCapabilities`

```ts
interface CodexRuntimeCapabilities {
  windows: {
    create: boolean;
    focus: boolean;
    primary: boolean;
    browserView: boolean;
  };
  views: {
    create: boolean;
    privateViewTree: boolean;
    webContentsView: boolean;
    browserViewFallback: boolean;
  };
  cdp: {
    supported: boolean;
    enabled: boolean;
    port: number | null;
  };
  native: {
    inProcessModules: boolean;
    swiftModules: boolean;
    appKitEmbedding: boolean;
    childWindowOverlay: boolean;
    directViewAttach: boolean;
    metalViews: boolean;
    nativeHost: boolean;
    helpers: boolean;
  };
}
```

## `CodexRuntimeApi`

```ts
interface CodexRuntimeApi {
  getInfo(): Promise<CodexRuntimeInfo>;
  getCapabilities(): Promise<CodexRuntimeCapabilities>;
}
```

Use this before calling Owl-sensitive APIs.

## `CodexWindowsApi`

```ts
interface CodexWindowsApi {
  create(options: CodexCreateWindowOptions): Promise<CodexWindowRef>;
  getPrimary(): Promise<CodexWindowRef | null>;
  focus(windowId: number): Promise<boolean>;
  show(windowId: number): Promise<boolean>;
}
```

`create()` is the namespaced replacement for `api.codex.createWindow()`.

## `CodexViewCreateOptions`

```ts
interface CodexViewCreateOptions {
  id?: string;
  parentWindowId?: number;
  route?: string;
  url?: string;
  hostId?: string;
  appearance?: string;
  bounds?: { x: number; y: number; width: number; height: number };
  visible?: boolean;
  backgroundColor?: string;
  registerWithCodex?: boolean;
}
```

Creates an Owl `BrowserView` / `WebContentsView` child inside a Codex window.
When `route` is provided, Codex++ loads the Codex app route through
`app://-/index.html` and registers the view with Codex's host context unless
`registerWithCodex` is `false`. When `url` is provided, it loads that URL.

The tweak manifest must declare `codex-views` or the legacy `codex.views`
permission.

## `CodexViewRef`

```ts
interface CodexViewRef {
  id: string;
  webContentsId: number;
  parentWindowId: number | null;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
  bringToFront(): Promise<void>;
  loadRoute(route: string, hostId?: string): Promise<void>;
  loadUrl(url: string): Promise<void>;
  dispose(): Promise<void>;
}
```

The ref is serializable and works from renderer or main tweaks. Internally,
Codex++ prefers Owl's private `contentView.addChildView(view.webContentsView)`
path and falls back to `BrowserWindow.addBrowserView(view)`.

## `CodexViewsApi`

```ts
interface CodexViewsApi {
  create(options: CodexViewCreateOptions): Promise<CodexViewRef>;
}
```

## `CodexCdpStatus`

```ts
interface CodexCdpStatus {
  supported: boolean;
  enabled: boolean;
  port: number | null;
  url: string | null;
}
```

CDP is opt-in. Codex++ reports status but does not silently enable it.

## `CodexCdpTarget`

```ts
interface CodexCdpTarget {
  id: string;
  type: string;
  title?: string;
  url: string;
  webSocketDebuggerUrl?: string;
}
```

## `CodexCdpApi`

```ts
interface CodexCdpApi {
  getStatus(): Promise<CodexCdpStatus>;
  listTargets(): Promise<CodexCdpTarget[]>;
}
```

`listTargets()` returns an empty array unless CDP is already enabled.

## `NativeModuleKind`

```ts
type NativeModuleKind = "node-addon" | "dylib" | "framework";
```

1.0.0 loads `.node` addons directly. Swift dylibs/frameworks should be reached
through an Objective-C++ `.node` shim.

## `NativeModuleLoadOptions`

```ts
interface NativeModuleLoadOptions {
  id: string;
  path: string;
  kind?: NativeModuleKind;
  entrypoint?: string;
}
```

`path` is resolved inside the tweak directory. The file must exist, and Codex++
checks the real path so traversal and symlink escapes outside that directory
are rejected.

## `NativeModuleRef`

```ts
interface NativeModuleRef {
  id: string;
  kind: NativeModuleKind;
  request(method: string, payload?: unknown, timeoutMs?: number): Promise<unknown>;
  dispose(): Promise<void>;
}
```

For `.node` modules, Codex++ calls `module.request(method, payload)` when
present, otherwise it calls an exported function matching `method`.
The tweak manifest must declare `native-module`.

## `NativePanelCreateOptions`

```ts
interface NativePanelCreateOptions {
  moduleId?: string;
  factory?: string;
  parentWindowId?: number;
  bounds?: { x: number; y: number; width: number; height: number };
  transparent?: boolean;
  passthroughMouse?: boolean;
}
```

Calls a factory exported by a loaded native module. When `moduleId` is omitted,
Codex++ uses its built-in native host and defaults `factory` to `createPanel`.
The runtime supplies the parent native window handle to the module when
available. After creation,
Codex++ forwards parent window bounds, focus, visibility, fullscreen, minimize,
and close events to optional native methods such as `syncParent(state)`,
`parentChanged(state)`, `setParentBounds(bounds, state)`, and
`parentBoundsChanged(bounds, state)`. The tweak manifest must declare
`native-view`.

## `NativePanelRef`

```ts
interface NativePanelRef {
  id: string;
  windowId: number | null;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  dispose(): Promise<void>;
}
```

## `NativeViewAttachOptions`

```ts
interface NativeViewAttachOptions {
  moduleId?: string;
  factory?: string;
  parentWindowId: number;
  bounds: { x: number; y: number; width: number; height: number };
  zIndex?: number;
}
```

When `moduleId` is omitted, Codex++ uses its built-in native host and defaults
`factory` to `attachView`. The 1.0.0 built-in host uses a child-window overlay
with an `MTKView`; direct child `NSView` insertion is reported separately by
`capabilities.native.directViewAttach`.

## `NativeViewRef`

```ts
interface NativeViewRef {
  id: string;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
  dispose(): Promise<void>;
}
```

## `NativeHelperLaunchOptions`

```ts
interface NativeHelperLaunchOptions {
  id: string;
  executable: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: "stdio" | "unix-socket";
  restart?: "never" | "on-crash";
}
```

Helpers are a fallback/native-service path. In-process native modules are the
primary Swift/Metal bridge for 1.0.0. The tweak manifest must declare
`native-helper`. In 1.0.0, helper transport must be `stdio` and restart policy
must be `never`; unsupported values fail explicitly.

## `NativeHelperRef`

```ts
interface NativeHelperRef {
  id: string;
  pid: number;
  send(message: unknown): Promise<void>;
  request(message: unknown, timeoutMs?: number): Promise<unknown>;
  stop(): Promise<void>;
}
```

## `CodexNativeApi`

```ts
interface CodexNativeApi {
  loadModule(options: NativeModuleLoadOptions): Promise<NativeModuleRef>;
  createPanel(options: NativePanelCreateOptions): Promise<NativePanelRef>;
  attachView(options: NativeViewAttachOptions): Promise<NativeViewRef>;
  launchHelper(options: NativeHelperLaunchOptions): Promise<NativeHelperRef>;
}
```

Native APIs are main-process backed. Renderer tweaks call them through Codex++
IPC. Local/dev tweaks may load unsigned native code from their own directory;
store-distributed native tweaks require stricter review. Native module, view,
and helper permissions are enforced at runtime.

## `CodexCreateWindowOptions`

```ts
interface CodexCreateWindowOptions {
  route: string;
  hostId?: string;
  show?: boolean;
  appearance?: string;
  parentWindowId?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}
```

Fields:

| Field | Notes |
|---|---|
| `route` | Required absolute Codex app route, for example `/` or `/local/<conversation-id>`. Must start with `/` and must not include a protocol/control characters. |
| `hostId` | Defaults to `local`. |
| `show` | Defaults to `true`. |
| `appearance` | Defaults to `secondary`. Passed through to Codex window services. |
| `parentWindowId` | Optional Electron BrowserWindow id. Defaults to focused window when available. |
| `bounds` | Optional screen coordinates. |

Example:

```js
const ref = await api.codex.createWindow({
  route: "/",
  hostId: "local",
  show: true,
  bounds: { x: 100, y: 100, width: 900, height: 700 },
});
api.log.info(ref.windowId, ref.webContentsId);
```

## `CodexCreateViewOptions`

```ts
interface CodexCreateViewOptions {
  route: string;
  hostId?: string;
  appearance?: string;
}
```

Creates an Electron `BrowserView` registered with Codex's host context. The
return type is `unknown` so renderer-only bundles do not need Electron types.
Use only from main-process code that understands Electron.

## `CodexWindowRef`

```ts
interface CodexWindowRef {
  windowId: number;
  webContentsId: number;
}
```

Returned by `createWindow`.
