# Owl Bridge Roadmap

This roadmap turns the private Owl runtime surface into stable Codex++ APIs.
The goal is not to expose Owl internals directly. The goal is a compatibility
layer that can survive upstream Codex changes while giving tweaks controlled
access to native desktop capabilities.

## Principles

- Codex++ owns the public API. Tweaks do not receive raw
  `globalThis.__codexpp_window_services__`, `window.electronBridge`, or
  upstream Electron objects by default.
- Every bridge feature is capability-gated. Missing upstream APIs should return
  unavailable status, not crash Codex.
- Main-process APIs are explicit. Renderer tweaks call through IPC-backed SDK
  wrappers when needed.
- Native macOS work is first-class. In-process Swift/Objective-C++ modules and
  AppKit/Metal view embedding are 1.0.0 goals. Helper processes remain a
  fallback path for workloads that should not live inside Codex.
- The bridge must be inspectable from `codexplusplus debug`.

## 1.0.0 Target

Ship a stable Owl bridge foundation:

```ts
api.codex.runtime.getInfo()
api.codex.runtime.getCapabilities()
api.codex.windows.create()
api.codex.windows.getPrimary()
api.codex.windows.focus()
api.codex.cdp.getStatus()
api.codex.native.loadModule()
api.codex.native.createPanel()
api.codex.native.attachView()
api.codex.native.launchHelper()
```

The 1.0.0 API should make native Swift/Metal integration possible from a tweak
without exposing raw Owl internals. It still needs capability checks and
graceful fallback, because upstream Codex can change the private runtime shape.

## Phase 1: Runtime Probe

Add a single runtime probe module in `packages/runtime` that centralizes Owl
detection.

Deliverables:

- Detect runtime type: `owl`, `electron`, or `unknown`.
- Detect Codex version, channel, build flavor, and app paths.
- Detect whether `window.electronBridge.usesOwlAppShell()` is true from the
  renderer.
- Detect whether `globalThis.__codexpp_window_services__` is present in main.
- Detect available Electron-compatible exports needed by Codex++.
- Expose a serializable capability report over IPC.

Proposed shape:

```ts
interface CodexRuntimeInfo {
  type: "owl" | "electron" | "unknown";
  codexVersion: string | null;
  channel: string | null;
  buildFlavor: string | null;
  usesOwlAppShell: boolean | null;
  appPath: string | null;
  resourcesPath: string | null;
}

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

Testing:

- Unit-test probes against fixture objects for Owl, Electron, and unknown.
- Add one integration-style test that confirms missing private objects produce
  clean unavailable capability output.

## Phase 2: Debug Visibility

Extend `codexplusplus debug` so we can see the bridge state without attaching
DevTools.

Output should include:

```text
owl bridge
  runtime probe:       ok
  renderer bridge:     available
  window services:     available
  windows.create:      available
  windows.primary:     available
  owl views:           available
  cdp:                 supported, disabled
  native modules:      available
  native panels:       available
  metal views:         available
  native helpers:      available
```

Rules:

- Keep the normal debug output compact.
- Put detailed probe errors in logs, not in the happy-path CLI output.
- If Codex is closed, report install-time capabilities and mark live renderer
  probes as unavailable.

## Phase 3: Stable Window API

Replace the experimental `api.codex.createWindow()` shape with a namespaced
window API while keeping backwards compatibility.

Proposed SDK:

```ts
interface CodexWindowsApi {
  create(options: CodexWindowCreateOptions): Promise<CodexWindowRef>;
  getPrimary(): Promise<CodexWindowRef | null>;
  focus(windowId: number): Promise<boolean>;
  show(windowId: number): Promise<boolean>;
}

interface CodexWindowCreateOptions {
  route: string;
  hostId?: string;
  show?: boolean;
  appearance?: "primary" | "secondary" | "hud";
  parentWindowId?: number;
  bounds?: { x: number; y: number; width: number; height: number };
}
```

Implementation:

- Internally adapt to Owl `windowManager.createWindow()` when available.
- Fall back to existing Codex++ window creation behavior on older builds.
- Validate routes before passing anything to Codex.
- Hide private Owl appearances unless Codex++ explicitly supports them.

Testing:

- Unit-test route validation and option normalization.
- Unit-test fallback behavior when `windowManager` is absent.
- Smoke-test on the current Owl build before release.

## Phase 4: CDP API

CDP should be discoverable, not silently enabled.

Proposed SDK:

```ts
interface CodexCdpApi {
  getStatus(): Promise<CodexCdpStatus>;
  listTargets(): Promise<CodexCdpTarget[]>;
}

interface CodexCdpStatus {
  supported: boolean;
  enabled: boolean;
  port: number | null;
  url: string | null;
}
```

Rules:

- Do not enable remote debugging from a renderer tweak.
- `CODEXPP_REMOTE_DEBUG=1` remains the opt-in switch.
- `listTargets()` only works when CDP is already enabled.
- Never expose arbitrary CDP evaluation as a default public API in 1.0.0.

Future:

- Add an explicit development-only `evaluate()` helper guarded by config.
- Add screenshot helpers for visual tweak testing.

## Phase 5: In-Process Native Module Bridge

This is the core 1.0.0 native feature. A tweak should be able to load compiled
Swift, Objective-C++, C, or C++ code into the Owl/Codex process and call it
through a stable Codex++ bridge.

Proposed SDK:

```ts
interface CodexNativeApi {
  loadModule(options: NativeModuleLoadOptions): Promise<NativeModuleRef>;
  createPanel(options: NativePanelCreateOptions): Promise<NativePanelRef>;
  attachView(options: NativeViewAttachOptions): Promise<NativeViewRef>;
  launchHelper(options: NativeHelperLaunchOptions): Promise<NativeHelperRef>;
}

interface NativeModuleLoadOptions {
  id: string;
  path: string;
  kind?: "node-addon" | "dylib" | "framework";
  entrypoint?: string;
}

interface NativeModuleRef {
  id: string;
  kind: "node-addon" | "dylib" | "framework";
  request(method: string, payload?: unknown, timeoutMs?: number): Promise<unknown>;
  dispose(): Promise<void>;
}

interface NativePanelCreateOptions {
  moduleId?: string;
  factory?: string;
  parentWindowId?: number;
  bounds?: { x: number; y: number; width: number; height: number };
  transparent?: boolean;
  passthroughMouse?: boolean;
}

interface NativePanelRef {
  id: string;
  windowId: number | null;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  show(): Promise<void>;
  hide(): Promise<void>;
  dispose(): Promise<void>;
}

interface NativeViewAttachOptions {
  moduleId?: string;
  factory?: string;
  parentWindowId: number;
  bounds: { x: number; y: number; width: number; height: number };
  zIndex?: number;
}

interface NativeViewRef {
  id: string;
  setBounds(bounds: { x: number; y: number; width: number; height: number }): Promise<void>;
  setVisible(visible: boolean): Promise<void>;
  dispose(): Promise<void>;
}

interface NativeHelperLaunchOptions {
  id: string;
  executable: string;
  args?: string[];
  env?: Record<string, string>;
  transport?: "stdio" | "unix-socket";
  restart?: "never" | "on-crash";
}

interface NativeHelperRef {
  id: string;
  pid: number;
  send(message: unknown): Promise<void>;
  request(message: unknown, timeoutMs?: number): Promise<unknown>;
  stop(): Promise<void>;
}
```

1.0.0 scope:

- Load tweak-owned native code from the tweak directory.
- Support `.node` native addons first because they match the current
  Node/Electron-compatible main process.
- Support Swift by allowing a `.node`/Objective-C++ shim to call a bundled
  Swift dylib or framework.
- Add a Codex++ native host module for AppKit/Metal operations that JavaScript
  cannot do safely itself.
- Let local/dev tweaks load unsigned native modules from their own directory.
- Track every loaded native module and dispose it on tweak stop where the
  module exposes cleanup hooks.
- Log native load paths, module ids, and failures to the Codex++ main log.

Native host responsibilities:

- Resolve `BrowserWindow` ids to native handles through Electron-compatible
  APIs such as `BrowserWindow.fromId(id)` and `getNativeWindowHandle()`.
- Bridge those handles into Objective-C++.
- Create and manage `NSPanel`, child `NSWindow`, `NSView`, and `MTKView`
  instances.
- Keep native frames synchronized with Codex window movement, resize,
  fullscreen, focus, and close events.
- Tear down native views before their parent Codex window is destroyed.

Swift/Metal usage:

- A tweak ships compiled native code, for example:

```text
my-metal-tweak/
  manifest.json
  index.js
  native/
    codexpp-metal.node
    MyMetalRenderer.framework/
```

- The main tweak loads the native module:

```js
module.exports = {
  async start(api) {
    const mod = await api.codex.native.loadModule({
      id: "metal",
      path: "native/codexpp-metal.node",
      kind: "node-addon",
    });

    const parent = await api.codex.windows.getPrimary();
    this.panel = await api.codex.native.createPanel({
      moduleId: mod.id,
      factory: "createMetalPanel",
      parentWindowId: parent?.windowId,
      bounds: { x: 80, y: 80, width: 640, height: 420 },
    });
  },
  async stop() {
    await this.panel?.dispose();
  },
};
```

## Phase 6: Native UI Embedding

This is part of the 1.0.0 goal, not a post-1.0 stretch goal. The first shipped
version can be marked experimental, but it should exist.

1.0.0 embedding target:

- Attach an `NSView` or `MTKView` to a Codex `BrowserWindow` or an owned
  child/native panel.
- Position it from JavaScript using bounds in window-content coordinates.
- Allow native views to be shown, hidden, resized, and disposed.
- Keep native content above or beside renderer content without corrupting the
  Codex React tree.
- Support Metal render loops that pause on hide/dispose.

Implementation options to validate:

- **Child `NSWindow` / `NSPanel` overlay**: safer first implementation. Parent
  it to a Codex window, track bounds, and avoid modifying Chromium's internal
  view hierarchy.
- **Direct child `NSView` attachment**: closer to the ideal API. Use
  `getNativeWindowHandle()` and Objective-C++ to attach an AppKit/Metal view
  directly when Owl's current window shape allows it.
- **Renderer placeholder anchoring**: renderer tweak creates a DOM placeholder;
  main process reads its bounds over IPC/CDP and keeps the native view aligned.

The bridge should try the safer overlay path first and expose direct child-view
attachment as a capability when the current Owl build supports it.

## Phase 7: Native Helper Bridge

Helper processes are still useful, but they are not the main native story.

Use helpers for:

- Crash-isolated workloads.
- Long-running native services.
- Native operations that require a separate entitlement or process boundary.
- Cross-platform support where in-process macOS APIs do not exist.

1.0.0 helper scope:

- Launch a helper owned by the tweak.
- Pipe structured JSON messages over stdio.
- Kill helper processes on tweak stop and Codex quit.
- Store helper logs under the Codex++ log directory.
- Validate executable paths are inside the tweak directory unless the tweak has
  an explicit native-helper permission.

## Phase 8: Permissions And Store Review

Add manifest permissions before native bridge features are broadly enabled:

```json
{
  "permissions": [
    "codex-runtime",
    "codex-windows",
    "codex-cdp",
    "native-module",
    "native-view",
    "native-helper"
  ]
}
```

Review rules:

- Native modules, frameworks, dylibs, views, and helpers must be declared in the
  manifest.
- Local/dev tweaks may load unsigned native code from their own directory.
- Store tweaks with native code require stricter review, clear disclosure, and
  either source review or reproducible build steps.
- Native code must not phone home without network permission and clear
  disclosure.
- Any helper using screen capture, accessibility, microphone, camera, or input
  monitoring needs explicit store review callouts.

## Release Criteria

1.0.0 can ship the Owl bridge when:

- `codexplusplus debug` reports bridge capabilities clearly.
- All public bridge APIs return graceful unavailable errors on missing Owl APIs.
- Renderer and main tweaks can query runtime info.
- Window creation works on current Owl and does not regress older
  Electron-style fixtures.
- CDP status is visible and opt-in.
- A minimal native module can be loaded from a tweak directory.
- A minimal Swift/Objective-C++ backed module can respond to JS requests.
- A native `NSPanel` or child window can be parented to a Codex window and
  cleaned up on tweak stop.
- A minimal `MTKView` can render, resize, hide, and dispose without crashing
  Codex.
- Native helper launch/stop works as the fallback native path.
- Docs clearly separate stable Codex++ APIs from private Owl internals.

## Open Questions

- Should unsigned in-process native modules be local/dev only, or allowed for
  manually installed tweaks with a scary prompt?
- Do store tweaks need a stricter signing requirement for native modules,
  frameworks, dylibs, and helper binaries?
- Should `api.codex.windows.create()` allow `primary`, or reserve primary window
  behavior for Codex itself?
- Should CDP helpers live behind a global developer-mode config flag?
- Which native attachment strategy should be the default on Owl:
  child-window/panel overlay or direct child `NSView` attachment?
- How do we want renderer placeholders to communicate layout changes to native
  panels?
- How much of the native module/helper API should be available on Windows and
  Linux in 1.0.0?
