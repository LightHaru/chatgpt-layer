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
