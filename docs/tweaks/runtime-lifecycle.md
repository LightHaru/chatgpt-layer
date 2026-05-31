# Runtime and Lifecycle

Codex++ loads a runtime from the user data directory. That runtime discovers
tweaks, starts main-process tweaks, injects a renderer preload into Codex
windows, and starts renderer tweaks from that preload.

## Processes

| Process | What runs there |
|---|---|
| Main | Tweak discovery, main-scoped tweak loading, disk storage, MCP sync, tweak filesystem IPC, Codex window APIs, store install/update checks. |
| Renderer preload | Settings injection, renderer-scoped tweak loading, DOM access, React fiber helpers, renderer storage, renderer IPC wrapper. |

## Scope Loading Rules

| Manifest `scope` | Main host | Renderer host |
|---|---:|---:|
| `renderer` | no | yes |
| `main` | yes | no |
| `both` | yes | yes |
| omitted | yes | yes |

Set `scope` explicitly. Omitted scope is currently equivalent to `both`.

## Lifecycle

```js
module.exports = {
  async start(api) {
    // Called when this process loads the tweak.
  },

  async stop() {
    // Called during reload/disable/shutdown where possible.
  },
};
```

Main lifecycle:

- Discover tweaks under `<userRoot>/tweaks`.
- Sync MCP servers for enabled tweaks.
- Start enabled main-capable tweaks.
- Stop all main tweaks on hot reload, disable/enable changes, and app shutdown.
- Flush main storage during stop/shutdown.

Renderer lifecycle:

- Ask main for the discovered tweak list and user paths.
- Skip disabled tweaks, missing entries, and `scope: "main"` tweaks.
- Read tweak source through main IPC.
- Evaluate the entry in the sandboxed preload context.
- Call `start(api)`.
- Call `stop()` during hot reload and before reloading renderer tweaks.

## Hot Reload

The main process watches the tweaks directory. Changes are debounced, then the
runtime:

1. Stops all main tweaks.
2. Clears cached tweak modules under the tweaks directory.
3. Re-discovers tweak manifests and entries.
4. Restarts main tweaks.
5. Broadcasts `codexpp:tweaks-changed` to renderers.
6. Renderers stop loaded renderer tweaks and start them again from fresh source.

Make all mutations idempotent. Codex can also re-render its own DOM without a
Codex++ hot reload.

## Cleanup Checklist

Clean these in `stop()`:

- DOM nodes you inserted outside Codex++ settings pages.
- `<style>` tags you inserted.
- Event listeners on `window`, `document`, or Codex DOM nodes.
- `MutationObserver`, `ResizeObserver`, `IntersectionObserver`.
- `setInterval` / `setTimeout`.
- IPC listeners returned from `api.ipc.on`.
- External processes or file handles from main-process tweaks.

`stop()` should tolerate being called more than once.

## Storage Locations

| API | Process | Backing store |
|---|---|---|
| `api.storage` | renderer | `localStorage["codexpp:storage:<id>"]` |
| `api.storage` | main | `<userRoot>/storage/<id>.json` |
| `api.fs` | renderer/main | `<userRoot>/tweak-data/<id>/` |

Renderer `api.fs` calls are proxied through main IPC because the renderer is
sandboxed.

## Renderer Sandbox

Renderer tweaks are evaluated with `new Function` inside the preload context.
They receive `module`, `exports`, and `console`, but not arbitrary Node
`require`. Bundle dependencies into the entry file before installing.

Use [TypeScript and bundling](./typescript-and-bundling.md) for build examples.

## Safe Mode and Enable Flags

Codex++ stores enable flags in `<userRoot>/config.json`.

- Missing enable state means enabled.
- Safe mode disables tweak loading.
- Toggling a tweak from Settings -> Tweaks triggers a full reload cycle.

## Failure Behavior

- Invalid or missing manifests are skipped during discovery.
- Tweak start errors are logged and do not stop other tweaks.
- Renderer load failures are mirrored to `<userRoot>/log/preload.log`.
- Main load failures are written to `<userRoot>/log/main.log`.
