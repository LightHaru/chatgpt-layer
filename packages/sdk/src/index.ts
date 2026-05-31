/**
 * Public SDK for codex-plusplus tweak authors.
 *
 * A tweak is an ES module that default-exports an object satisfying `Tweak`.
 * The runtime calls `start(api)` after the app's settings UI is ready, and
 * `stop()` when the tweak is disabled or the app is shutting down.
 */

export interface TweakManifest {
  /** Reverse-DNS-ish unique id, e.g. "com.you.my-tweak". */
  id: string;
  /** Short human-readable name shown in the Tweaks list. */
  name: string;
  /** Semver version of this tweak. */
  version: string;
  /**
   * Required source repository in `owner/repo` form. Codex++ checks this
   * repository's latest GitHub release once per day and only reports update
   * availability; it never downloads or installs tweak updates automatically.
   */
  githubRepo: string;
  /** Free-form one-liner description. Renders below the name. */
  description?: string;
  /** Author info. Either a string (display name) or a structured record. */
  author?: string | TweakAuthor;
  /** Homepage / source repo URL (rendered as a link in the Tweaks list). */
  homepage?: string;
  /**
   * Icon shown next to the tweak's name. Supports:
   *   - `https://…` URL
   *   - `./path/relative/to/manifest.png` (resolved against the tweak dir)
   *   - data: URL
   * If absent, a generated initial avatar is rendered.
   */
  iconUrl?: string;
  /** Optional tags, e.g. `["ui", "shortcut"]`. */
  tags?: string[];
  /** Semver range of runtime versions this tweak supports. */
  minRuntime?: string;
  /** Optional. If set, the tweak is sandboxed to renderer-only or main-only. */
  scope?: TweakScope;
  /** Optional path to entry; defaults to `index.js`/`index.mjs`/`index.cjs`. */
  main?: string;
  /**
   * Optional MCP server exposed by this tweak. Codex++ syncs this into Codex's
   * MCP config so tweak-provided tools can be used from chat.
   */
  mcp?: TweakMcpServer;
  /** Optional declared capabilities shown to users and validators. */
  permissions?: TweakPermission[];
}

export type TweakScope = "renderer" | "main" | "both";

export interface TweakMcpServer {
  /** Command to launch the MCP server, for example "node". */
  command: string;
  /** Optional launch arguments. Relative file arguments are resolved against the tweak dir. */
  args?: string[];
  /** Optional environment variables passed to the MCP server. */
  env?: Record<string, string>;
}

export type TweakPermission =
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
  | "native-helper";

export const VALID_TWEAK_SCOPES = ["renderer", "main", "both"] as const;

export const VALID_TWEAK_PERMISSIONS = [
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
] as const;

export interface TweakManifestIssue {
  path: string;
  message: string;
}

export interface TweakManifestValidationResult {
  ok: boolean;
  errors: TweakManifestIssue[];
  warnings: TweakManifestIssue[];
}

export function validateTweakManifest(manifest: unknown): TweakManifestValidationResult {
  const errors: TweakManifestIssue[] = [];
  const warnings: TweakManifestIssue[] = [];

  if (!isRecord(manifest)) {
    return {
      ok: false,
      errors: [{ path: "$", message: "manifest must be a JSON object" }],
      warnings,
    };
  }

  requireString(manifest, "id", errors);
  requireString(manifest, "name", errors);
  requireString(manifest, "version", errors);
  requireString(manifest, "githubRepo", errors);

  if (typeof manifest.id === "string" && !/^[a-zA-Z0-9._-]+$/.test(manifest.id)) {
    errors.push({
      path: "id",
      message: "id may only contain letters, numbers, dots, underscores, and dashes",
    });
  }

  if (typeof manifest.version === "string" && !/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(manifest.version)) {
    warnings.push({
      path: "version",
      message: "version should be semver, for example 0.1.0",
    });
  }

  if (
    typeof manifest.githubRepo === "string" &&
    !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(manifest.githubRepo)
  ) {
    errors.push({
      path: "githubRepo",
      message: "githubRepo must use owner/repo format",
    });
  }

  if (
    manifest.scope !== undefined &&
    !VALID_TWEAK_SCOPES.includes(manifest.scope as TweakScope)
  ) {
    errors.push({
      path: "scope",
      message: "scope must be one of renderer, main, or both",
    });
  }

  optionalString(manifest, "description", errors);
  optionalString(manifest, "homepage", errors);
  optionalString(manifest, "iconUrl", errors);
  optionalString(manifest, "minRuntime", errors);
  optionalString(manifest, "main", errors);

  if (manifest.author !== undefined) {
    if (typeof manifest.author !== "string" && !isRecord(manifest.author)) {
      errors.push({ path: "author", message: "author must be a string or object" });
    } else if (isRecord(manifest.author)) {
      requireString(manifest.author, "name", errors, "author.name");
      optionalString(manifest.author, "url", errors, "author.url");
      optionalString(manifest.author, "email", errors, "author.email");
    }
  }

  if (manifest.tags !== undefined) {
    if (!Array.isArray(manifest.tags) || !manifest.tags.every((tag) => typeof tag === "string")) {
      errors.push({ path: "tags", message: "tags must be an array of strings" });
    }
  }

  if (manifest.permissions !== undefined) {
    if (
      !Array.isArray(manifest.permissions) ||
      !manifest.permissions.every((permission) =>
        VALID_TWEAK_PERMISSIONS.includes(permission as TweakPermission),
      )
    ) {
      errors.push({
        path: "permissions",
        message: "permissions must be known Codex++ permission strings",
      });
    }
  }

  if (manifest.mcp !== undefined) {
    validateMcpManifest(manifest.mcp, errors);
  }

  return { ok: errors.length === 0, errors, warnings };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  errors: TweakManifestIssue[],
  path = key,
): void {
  if (typeof record[key] !== "string" || record[key] === "") {
    errors.push({ path, message: `${path} is required and must be a non-empty string` });
  }
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  errors: TweakManifestIssue[],
  path = key,
): void {
  if (record[key] !== undefined && typeof record[key] !== "string") {
    errors.push({ path, message: `${path} must be a string` });
  }
}

function validateMcpManifest(value: unknown, errors: TweakManifestIssue[]): void {
  if (!isRecord(value)) {
    errors.push({ path: "mcp", message: "mcp must be an object" });
    return;
  }

  requireString(value, "command", errors, "mcp.command");

  if (value.args !== undefined) {
    if (!Array.isArray(value.args) || !value.args.every((arg) => typeof arg === "string")) {
      errors.push({ path: "mcp.args", message: "mcp.args must be an array of strings" });
    }
  }

  if (value.env !== undefined) {
    if (!isRecord(value.env)) {
      errors.push({ path: "mcp.env", message: "mcp.env must be an object of strings" });
      return;
    }
    for (const [key, envValue] of Object.entries(value.env)) {
      if (typeof envValue !== "string") {
        errors.push({
          path: `mcp.env.${key}`,
          message: `mcp.env.${key} must be a string`,
        });
      }
    }
  }
}

export interface TweakAuthor {
  name: string;
  url?: string;
  email?: string;
}

export interface Tweak {
  start(api: TweakApi): void | Promise<void>;
  stop?(): void | Promise<void>;
}

/**
 * The API surface passed to a tweak's `start()`. Renderer-only tweaks see the
 * renderer half; main-only tweaks see the main half. `scope: "both"` tweaks
 * receive whichever half is active in the current process.
 */
export interface TweakApi {
  /** Manifest as parsed from disk. Read-only. */
  manifest: Readonly<TweakManifest>;
  /** Per-tweak persistent KV store, scoped to this tweak's id. */
  storage: TweakStorage;
  /** Per-tweak logger; output goes to the codex-plusplus log file + devtools. */
  log: TweakLogger;
  /** Process this tweak is running in. */
  process: "renderer" | "main";

  /** Renderer-only: register UI in Codex's Settings panel. */
  settings?: SettingsApi;
  /** Renderer-only: React fiber utilities for advanced injection. */
  react?: ReactApi;
  /** Cross-process IPC scoped to this tweak's id. */
  ipc: TweakIpc;
  /** Filesystem helpers, sandboxed to the tweak's data dir. */
  fs: TweakFs;
  /** Main-only: native Codex integration points exposed by Codex++. */
  codex?: CodexApi;
}

export interface TweakStorage {
  get<T = unknown>(key: string, fallback?: T): T;
  set(key: string, value: unknown): void;
  delete(key: string): void;
  all(): Record<string, unknown>;
}

export interface TweakLogger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface SettingsApi {
  /**
   * Register a section in the Codex++ "Tweaks" page. The section appears as
   * a row beneath the tweak's own card. Use this for small per-tweak knobs.
   */
  register(section: SettingsSection): SettingsHandle;

  /**
   * Register a *dedicated settings page* for this tweak. The page gets its
   * own entry in the Codex sidebar (under a "TWEAKS" group header that
   * appears only when at least one tweak has registered a page).
   *
   * Use this when your tweak is large enough that a single row is cramped.
   * Inside `render(root)` you can mount any DOM you like — see the
   * components in `tweaks/AGENTS.md`.
   */
  registerPage(page: SettingsPage): SettingsHandle;
}

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  /** Imperative render. Called when the section is mounted. */
  render(root: HTMLElement): void | (() => void);
}

export interface SettingsPage {
  /** Stable id, scoped to the tweak. Becomes part of the sidebar key. */
  id: string;
  /** Sidebar label, also shown as the page heading. */
  title: string;
  /** Optional subtitle below the page heading. */
  description?: string;
  /**
   * Optional 20×20 currentColor SVG markup for the sidebar item icon.
   * If omitted, the tweak's manifest icon (or initial avatar) is used.
   */
  iconSvg?: string;
  /** Imperative render into the page body. May return a teardown fn. */
  render(root: HTMLElement): void | (() => void);
}

export interface SettingsHandle {
  unregister(): void;
}

export interface ReactApi {
  /**
   * Locate a React fiber by walking from a DOM node. Returns null if the
   * node isn't part of Codex's React tree.
   */
  getFiber(node: Element): ReactFiberNode | null;
  /** Find the nearest fiber whose `type` (component) name matches. */
  findOwnerByName(node: Element, name: string): ReactFiberNode | null;
  /** Wait for an element matching `selector` to exist in the DOM. */
  waitForElement(selector: string, timeoutMs?: number): Promise<Element>;
}

/** Minimal subset of React's internal fiber shape we expose. */
export interface ReactFiberNode {
  type: unknown;
  stateNode: unknown;
  memoizedProps: Record<string, unknown> | null;
  memoizedState: unknown;
  return: ReactFiberNode | null;
  child: ReactFiberNode | null;
  sibling: ReactFiberNode | null;
}

export interface TweakIpc {
  on(channel: string, handler: (...args: unknown[]) => void): () => void;
  send(channel: string, ...args: unknown[]): void;
  /** Renderer ↔ main round-trip; resolves with the handler's return value. */
  invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  /** Main-side: handle invokes from the renderer. */
  handle?(channel: string, handler: (...args: unknown[]) => unknown): void;
}

export interface TweakFs {
  /** Absolute path to this tweak's writable data dir. */
  dataDir: string;
  read(relPath: string): Promise<string>;
  write(relPath: string, contents: string): Promise<void>;
  exists(relPath: string): Promise<boolean>;
}

export interface CodexApi {
  /** Runtime and capability metadata for the current Codex host. */
  runtime: CodexRuntimeApi;
  /** Stable window helpers over Codex/Owl private window services. */
  windows: CodexWindowsApi;
  /** Owl WebContentsView/BrowserView overlays inside Codex windows. */
  views: CodexViewsApi;
  /** Chrome DevTools Protocol status and target discovery. */
  cdp: CodexCdpApi;
  /** Native module, AppKit/Metal view, and helper-process bridge. */
  native: CodexNativeApi;

  /**
   * Main-only: create an embedded BrowserView registered with Codex's host
   * context. The returned object is Electron's BrowserView in the main
   * process, typed as unknown so renderer-only tweak bundles do not need
   * Electron types.
   */
  createBrowserView(options: CodexCreateViewOptions): Promise<unknown>;

  /**
   * Create a Codex-registered native window for an in-app route.
   *
   * The returned window is registered with Codex's own host/app-server
   * context, so routes such as `/local/<conversation-id>` render the native
   * chat UI instead of a detached shell.
   */
  createWindow(options: CodexCreateWindowOptions): Promise<CodexWindowRef>;
}

export type CodexRuntimeType = "owl" | "electron" | "unknown";

export interface CodexRuntimeInfo {
  type: CodexRuntimeType;
  codexVersion: string | null;
  channel: string | null;
  buildFlavor: string | null;
  usesOwlAppShell: boolean | null;
  appPath: string | null;
  resourcesPath: string | null;
}

export interface CodexRuntimeCapabilities {
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

export interface CodexRuntimeApi {
  getInfo(): Promise<CodexRuntimeInfo>;
  getCapabilities(): Promise<CodexRuntimeCapabilities>;
}

export interface CodexWindowsApi {
  create(options: CodexCreateWindowOptions): Promise<CodexWindowRef>;
  getPrimary(): Promise<CodexWindowRef | null>;
  focus(windowId: number): Promise<boolean>;
  show(windowId: number): Promise<boolean>;
}

export interface CodexViewCreateOptions {
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

export interface CodexViewRef {
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

export interface CodexViewsApi {
  create(options: CodexViewCreateOptions): Promise<CodexViewRef>;
}

export interface CodexCdpStatus {
  supported: boolean;
  enabled: boolean;
  port: number | null;
  url: string | null;
}

export interface CodexCdpTarget {
  id: string;
  type: string;
  title?: string;
  url: string;
  webSocketDebuggerUrl?: string;
}

export interface CodexCdpApi {
  getStatus(): Promise<CodexCdpStatus>;
  listTargets(): Promise<CodexCdpTarget[]>;
}

export type NativeModuleKind = "node-addon" | "dylib" | "framework";

export interface NativeModuleLoadOptions {
  id: string;
  path: string;
  kind?: NativeModuleKind;
  entrypoint?: string;
}

export interface NativeModuleRef {
  id: string;
  kind: NativeModuleKind;
  request(method: string, payload?: unknown, timeoutMs?: number): Promise<unknown>;
  dispose(): Promise<void>;
}

export interface NativePanelCreateOptions {
  moduleId?: string;
  factory?: string;
  parentWindowId?: number;
  bounds?: { x: number; y: number; width: number; height: number };
  transparent?: boolean;
  passthroughMouse?: boolean;
}

export interface NativePanelRef {
  id: string;
  windowId: number | null;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  dispose(): Promise<void>;
}

export interface NativeViewAttachOptions {
  moduleId?: string;
  factory?: string;
  parentWindowId: number;
  bounds: { x: number; y: number; width: number; height: number };
  zIndex?: number;
}

export interface NativeViewRef {
  id: string;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
  dispose(): Promise<void>;
}

export interface NativeHelperLaunchOptions {
  id: string;
  executable: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: "stdio" | "unix-socket";
  restart?: "never" | "on-crash";
}

export interface NativeHelperRef {
  id: string;
  pid: number;
  send(message: unknown): Promise<void>;
  request(message: unknown, timeoutMs?: number): Promise<unknown>;
  stop(): Promise<void>;
}

export interface CodexNativeApi {
  loadModule(options: NativeModuleLoadOptions): Promise<NativeModuleRef>;
  createPanel(options: NativePanelCreateOptions): Promise<NativePanelRef>;
  attachView(options: NativeViewAttachOptions): Promise<NativeViewRef>;
  launchHelper(options: NativeHelperLaunchOptions): Promise<NativeHelperRef>;
}

export interface CodexCreateWindowOptions {
  /** Absolute Codex route, e.g. `/local/<conversation-id>` or `/`. */
  route: string;
  /** Host id. Defaults to `local`. */
  hostId?: string;
  /** Show the window after creating it. Defaults to true. */
  show?: boolean;
  /** Native Codex window appearance. Defaults to `secondary`. */
  appearance?: string;
  /** Parent BrowserWindow id. Defaults to the focused window when available. */
  parentWindowId?: number;
  /** Optional initial bounds in screen coordinates. */
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface CodexCreateViewOptions {
  /** Absolute Codex route, e.g. `/local/<conversation-id>` or `/`. */
  route: string;
  /** Host id. Defaults to `local`. */
  hostId?: string;
  /** Native Codex appearance token used for registration. */
  appearance?: string;
}

export interface CodexWindowRef {
  windowId: number;
  webContentsId: number;
}

/** Helper to give authors type inference without `satisfies`. */
export function defineTweak(tweak: Tweak): Tweak {
  return tweak;
}
