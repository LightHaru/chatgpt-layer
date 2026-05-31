# @codex-plusplus/native-host

macOS Objective-C++ N-API host used by the Codex++ Owl bridge.

The host is intentionally small:

- `getCapabilities()` reports AppKit/Metal support.
- `createPanel(options)` creates a child `NSPanel` overlay parented to the
  current Codex `BrowserWindow` native handle.
- `attachView(options)` creates a child overlay containing an `MTKView`.
- `disposeAll()` tears down all native windows created by the host.

Direct child `NSView` insertion is not the default path yet. The first 1.0.0
implementation uses a child-window overlay because it is safer against Owl and
Chromium view hierarchy changes.
