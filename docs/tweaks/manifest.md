# Manifest Reference

Every tweak has a `manifest.json` at its root. The runtime and installer use the
manifest for discovery, validation, update checks, store cards, MCP sync, and
runtime compatibility.

## Required Fields

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Stable unique id. Allowed characters: letters, numbers, `.`, `_`, `-`. Reverse-DNS style is recommended, for example `com.you.my-tweak`. |
| `name` | `string` | Human-readable name shown in Settings -> Tweaks and the Tweak Store. |
| `version` | `string` | Semver is expected, for example `0.1.0`. Non-semver currently warns in validation. |
| `githubRepo` | `owner/repo` | Required for advisory GitHub release checks. Must match `owner/repo`. |

## Optional Fields

| Field | Type | Notes |
|---|---|---|
| `description` | `string` | One-line description shown under the tweak name. |
| `author` | `string` or `TweakAuthor` | Either a display name or `{ "name": "...", "url": "...", "email": "..." }`. |
| `homepage` | `string` | Link shown with tweak metadata. |
| `iconUrl` | `string` | `https://...`, `data:...`, or `./relative-asset.png`. Relative assets are read from the tweak directory and capped at 1 MiB. |
| `tags` | `string[]` | UI/search metadata, for example `["ui", "shortcut"]`. |
| `minRuntime` | `string` | Minimum runtime version or range, for example `1.0.0` or `>=1.0.0`. Store compatibility currently treats this as a minimum version. |
| `scope` | `"renderer"`, `"main"`, or `"both"` | Set this explicitly. If omitted, current runtime behavior is effectively `both`. |
| `main` | `string` | Entry file relative to the tweak directory. |
| `mcp` | `TweakMcpServer` | Declares an MCP server managed by Codex++. |
| `permissions` | `TweakPermission[]` | Declared capabilities shown to users/validators. Native bridge permissions are enforced at runtime. |

## Full Example

```json
{
  "id": "com.you.workflow-tools",
  "name": "Workflow Tools",
  "version": "0.1.0",
  "githubRepo": "you/workflow-tools",
  "description": "Adds workflow buttons and an MCP server.",
  "author": {
    "name": "You",
    "url": "https://github.com/you"
  },
  "homepage": "https://github.com/you/workflow-tools",
  "iconUrl": "./icon.png",
  "tags": ["ui", "mcp"],
  "scope": "both",
  "main": "index.js",
  "minRuntime": "1.0.0",
  "permissions": ["settings", "ipc", "filesystem"],
  "mcp": {
    "command": "node",
    "args": ["mcp-server.js"],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

## Scope

| Scope | Loaded in | Typical use |
|---|---|---|
| `renderer` | Renderer preload | Settings UI, DOM changes, keyboard shortcuts, React fiber inspection. |
| `main` | Electron main process | Native integration, long-running tasks, filesystem work, IPC handlers, MCP sync. |
| `both` | Both processes | Renderer UI backed by main handlers. Branch on `api.process`. |

Set `scope` explicitly. Missing `scope` currently loads in both processes because
the main-process loader treats everything except `"renderer"` as main-capable,
and the renderer loader skips only `"main"`.

## Permissions

Valid permission strings:

| Permission | Meaning |
|---|---|
| `settings` | Adds settings sections/pages or user-facing UI. |
| `ipc` | Uses renderer/main IPC. |
| `filesystem` | Reads/writes tweak data or user-selected files. |
| `network` | Makes network requests. |
| `codex-runtime` | Reads Codex runtime info/capabilities. |
| `codex-windows` | Uses namespaced Codex window APIs. |
| `codex-views` | Creates Owl `WebContentsView` / `BrowserView` overlays. |
| `codex-cdp` | Reads CDP status or target metadata when CDP is enabled. |
| `codex.windows` | Opens Codex-native windows. |
| `codex.views` | Legacy alias for embedded Codex/Owl views. |
| `native-module` | Loads tweak-owned in-process native modules. |
| `native-view` | Creates AppKit/Metal native panels or views. |
| `native-helper` | Launches tweak-owned native helper processes. |

Permissions are declarations for review and user visibility. Native bridge
permissions and Owl view permissions are also enforced at runtime:

- `codex-views` or `codex.views` is required for `api.codex.views.create()`.
- `native-module` is required for `api.codex.native.loadModule()` and module
  requests.
- `native-view` is required for `api.codex.native.createPanel()`,
  `api.codex.native.attachView()`, and native panel/view calls.
- `native-helper` is required for `api.codex.native.launchHelper()` and helper
  calls.

Local/dev tweaks may load unsigned native code from their own directory when
the permission is declared. Codex++ resolves the real target path and rejects
traversal or symlink escapes outside the tweak directory. Store-facing native
tweaks require stricter review of modules, frameworks, dylibs, and helper
binaries.

## MCP Manifest

```json
{
  "mcp": {
    "command": "node",
    "args": ["mcp-server.js"],
    "env": {
      "MY_ENV": "value"
    }
  }
}
```

Rules:

- `mcp.command` is required when `mcp` is present.
- `mcp.args` must be an array of strings.
- `mcp.env` must be an object of string values.
- Relative file-looking commands are resolved against the tweak directory.
- Relative args are resolved against the tweak directory only if that file
  exists.

More detail: [MCP servers](./mcp.md).

## Validation

Run:

```sh
codexplusplus validate-tweak ./my-tweak
```

Validation catches malformed required fields, invalid `githubRepo`, unknown
scope, malformed author/tags/permissions/MCP fields, and missing entry files.

Programmatic validation is available from the SDK:

```js
const { validateTweakManifest } = require("@codex-plusplus/sdk");
const result = validateTweakManifest(manifest);
```

See [SDK and API reference](./api-reference.md#validatetweakmanifestmanifest).

## Update Checks

Codex++ checks GitHub Releases at most once per day per installed tweak:

- Repository comes from `githubRepo`.
- Current version comes from `manifest.version`.
- Latest version comes from the release tag.
- Tags are compared as semver with optional leading `v`.
- If newer, Settings -> Tweaks shows update UI that links to the GitHub release.

Codex++ does not auto-install arbitrary tweak releases. Store-approved tweaks
are pinned to reviewed commit SHAs and installed through the Tweak Store.
