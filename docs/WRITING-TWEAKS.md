# Writing Codex++ Tweaks

This page is the entry point for tweak authors. The detailed docs are split by
task so the API reference can stay complete without turning the getting-started
guide into a wall of text.

## Start Here

- [Getting started](./tweaks/getting-started.md): folder layout, local dev loop,
  minimal examples, validation, and hot reload.
- [Manifest reference](./tweaks/manifest.md): every `manifest.json` field,
  validation rules, update metadata, permissions, and MCP metadata.
- [Runtime and lifecycle](./tweaks/runtime-lifecycle.md): renderer/main/both
  scopes, loading model, hot reload, storage locations, and cleanup rules.
- [SDK and API reference](./tweaks/api-reference.md): full coverage of every
  public export from `@codex-plusplus/sdk`.
- [Native bridge](./tweaks/native-bridge.md): AppKit/Metal panels, tweak-owned
  `.node` modules, Swift shims, helpers, permissions, and lifecycle.
- [UI and DOM patterns](./tweaks/ui-and-dom.md): settings pages, settings
  sections, Codex token classes, DOM observers, style injection, and safe UI
  overrides.
- [MCP servers](./tweaks/mcp.md): how tweak-declared MCP servers are synced into
  Codex config.
- [TypeScript and bundling](./tweaks/typescript-and-bundling.md): how to use the
  SDK for types and ship runtime-loadable JavaScript.
- [Distribution and debugging](./tweaks/distribution-debugging.md): releases,
  update checks, store behavior, logs, commands, and compatibility rules.
- [Owl runtime surface](./OWL-RUNTIME.md): private Owl/Electron-compatible
  APIs observed in the current Codex app, and the stable Codex++ wrappers.
- [Owl bridge roadmap](./OWL-BRIDGE-ROADMAP.md): planned stable bridge APIs for
  runtime info, windows, CDP, and native helpers.

## Permissions

`manifest.permissions` authorizes optional APIs. It is least-privilege
capability authorization, not a sandbox. Omit the field unless you need to
restrict or declare specific capabilities.

| Manifest | Behavior |
|---|---|
| `permissions` omitted | Legacy: existing APIs keep working. The minimal tweak below is this case. |
| `"permissions": [ ... ]` | Strict: only listed capabilities are authorized. |
| `"permissions": []` | Explicitly none: no optional APIs. This is not legacy. |

Declare only what the tweak uses. Do not copy a full permission list.

| Permission | API | Enforcement |
|---|---|---|
| `settings` | `api.settings` | Enforced. Explicit manifests omit the API when undeclared. |
| `ipc` | `api.ipc` | Enforced. Channel names stay `codexpp:<tweakId>:<channel>`. |
| `filesystem` | `api.fs` | Enforced. Bound to the owning tweak id under `tweak-data/<id>/`. |
| `codex-runtime` | `api.codex.runtime` | Enforced. |
| `codex-windows` | `api.codex.windows` and legacy `createWindow` | Enforced. |
| `codex-views` | `api.codex.views` and legacy `createBrowserView` | Enforced. |
| `codex-cdp` | `api.codex.cdp` | Enforced. |
| `native-module` | `loadModule` / `request` / `dispose` | Enforced. |
| `native-view` | `createPanel` / `attachView` / instance calls | Enforced. |
| `native-helper` | `launchHelper` / helper calls | Enforced. |
| `codex-sessions` | `api.codex.sessions.list` / `getStatus` | Enforced. Read-only. See [multi-session](./CODEX-MULTI-SESSION.md). |
| `network` | outbound web requests | Declarative only. Preload cannot block `fetch`. |

Aliases (equivalent, both accepted):

- `codex.windows` → `codex-windows`
- `codex.views` → `codex-views`

Denied calls fail with a predictable error, for example
`tweak com.example.foo must declare filesystem permission`.

Settings-only example:

```json
{
  "id": "com.you.my-tweak",
  "name": "My Tweak",
  "version": "0.1.0",
  "githubRepo": "you/my-tweak",
  "scope": "renderer",
  "permissions": ["settings"]
}
```

Filesystem + IPC example:

```json
{
  "id": "com.you.notes",
  "name": "Notes",
  "version": "0.1.0",
  "githubRepo": "you/notes",
  "scope": "both",
  "permissions": ["settings", "ipc", "filesystem"]
}
```

See [Manifest reference](./tweaks/manifest.md) for validation details.

## Minimal Tweak

```text
my-tweak/
  manifest.json
  index.js
```

`manifest.json`:

```json
{
  "id": "com.you.my-tweak",
  "name": "My Tweak",
  "version": "0.1.0",
  "githubRepo": "you/my-tweak",
  "description": "Adds a Codex++ settings page.",
  "scope": "renderer",
  "main": "index.js"
}
```

`index.js`:

```js
module.exports = {
  start(api) {
    api.settings.registerPage({
      id: "main",
      title: api.manifest.name,
      render(root) {
        root.innerHTML = "";
        const p = document.createElement("p");
        p.className = "text-sm text-token-text-secondary";
        p.textContent = "Hello from Codex++.";
        root.append(p);
      },
    });
  },
};
```

Validate and link it:

```sh
codexplusplus validate-tweak ./my-tweak
codexplusplus dev ./my-tweak
```
