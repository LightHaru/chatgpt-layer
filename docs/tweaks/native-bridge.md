# Native Bridge

Codex++ 1.0.0 exposes native macOS integration through `api.codex.native`.
The bridge is main-process backed and never exposes raw Owl objects to tweaks.

## Permissions

Declare the permissions you use:

```json
{
  "permissions": ["codex-windows", "native-view", "native-module", "native-helper"]
}
```

- `native-view` is required for `createPanel()`, `attachView()`, and panel/view
  method calls.
- `native-module` is required for tweak-owned `.node` modules and module
  requests.
- `native-helper` is required for helper processes.

Native paths must resolve to an existing file inside the tweak directory.
Codex++ checks real paths, so symlink escapes are rejected.

## Built-In Host

When `moduleId` is omitted, Codex++ uses its bundled Objective-C++ native host:

```js
module.exports = {
  async start(api) {
    const parent = await api.codex.windows.getPrimary();
    this.panel = await api.codex.native.createPanel({
      parentWindowId: parent?.windowId,
      bounds: { x: 80, y: 80, width: 420, height: 260 },
      transparent: true,
    });
  },
  async stop() {
    await this.panel?.dispose();
  },
};
```

`attachView()` uses the same host and creates a child-window overlay containing
an `MTKView`:

```js
const view = await api.codex.native.attachView({
  parentWindowId: parent.windowId,
  bounds: { x: 0, y: 0, width: 640, height: 360 },
});
```

The 1.0.0 host prefers child `NSPanel` / child `NSWindow` overlays. Direct child
`NSView` insertion is gated by `api.codex.runtime.getCapabilities()` and should
only be used once `capabilities.native.directViewAttach` is true.

## Tweak-Owned Modules

Use `loadModule()` when a tweak needs custom Objective-C++, C++, Swift, or
Metal behavior:

```js
const native = await api.codex.native.loadModule({
  id: "renderer",
  path: "native/renderer.node",
  kind: "node-addon",
});

const panel = await api.codex.native.createPanel({
  moduleId: native.id,
  factory: "createPanel",
  parentWindowId: parent.windowId,
});
```

The loaded `.node` module can export:

```ts
{
  request?(method: string, payload?: unknown): unknown | Promise<unknown>;
  dispose?(): void | Promise<void>;
  createPanel?(options: NativeFactoryOptions): NativePanelLike | Promise<NativePanelLike>;
  attachView?(options: NativeFactoryOptions): NativeViewLike | Promise<NativeViewLike>;
}
```

Factory options include:

```ts
interface NativeFactoryOptions {
  parentWindowId: number | null;
  parentWebContentsId: number | null;
  parentNativeHandle: Buffer | null;
  bounds?: { x: number; y: number; width: number; height: number };
}
```

On macOS, `parentNativeHandle` is the Electron-compatible native handle from
`BrowserWindow.getNativeWindowHandle()`. Native code should treat it as an
opaque pointer and normalize `NSWindow` vs `NSView` before use.

## Swift

For 1.0.0, Swift is loaded through an Objective-C++/N-API shim:

1. Build a Swift `.dylib` or `.framework` inside the tweak.
2. Build a `.node` Objective-C++ shim that links to that Swift binary.
3. Export the Codex++ native module contract from the shim.
4. Load the shim with `api.codex.native.loadModule()`.

This keeps JS loading on the stable N-API surface while letting the native side
use Swift, AppKit, Metal, and MetalKit.

## Lifecycle

Codex++ tracks native modules, panels, views, and helpers per tweak.

- Parent window move, resize, fullscreen, focus, visibility, and close events
  are forwarded to optional native instance methods such as
  `syncParent(state)`, `parentChanged(state)`,
  `setParentBounds(bounds, state)`, and `parentBoundsChanged(bounds, state)`.
- Native panels/views are disposed when their tweak stops, when renderer tweaks
  are torn down, when Codex quits, or when the parent Codex window closes.
- Helpers use stdio transport in 1.0.0 and are terminated on tweak stop.

Store-distributed native tweaks require stricter source/build review than pure
JS tweaks because they can execute process-local native code.
