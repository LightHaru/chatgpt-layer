# Codex++

Codex++ lets you install local tweaks into the OpenAI Codex desktop app. Tweaks
can change UI, add settings pages, run main-process code, and use native
OS-level features through the Codex++ bridge.
[Join the Discord community](https://discord.gg/6bY6gGX36H).

<img width="1413" height="1016" alt="Codex++ settings screenshot" src="https://github.com/user-attachments/assets/ea0b2ffc-c30d-4f68-ae12-dd8d6a997b2f" />

> Unofficial project. Not affiliated with OpenAI. Use at your own risk.

## TL;DR

Codex++ patches your local Codex app so Codex loads a small Codex++ runtime on
startup.

That runtime lives in your user data directory, not inside Codex. It finds
tweaks in a local `tweaks/` folder and loads them when Codex opens.

The app patch is tiny. Your tweaks, config, logs, backups, and runtime files
stay outside the app bundle, so you can edit tweaks without rebuilding Codex.

When Codex updates, the patch is usually removed. Codex++ installs a watcher
that notices this and re-applies the patch.

1.0.0 adds cleaner patching, better debug output, Owl runtime detection,
browser-host debugging, and native bridge support for AppKit, Metal, helper
processes, and tweak-owned native modules.

## Table Of Contents

- [Install](#install)
- [What Codex++ Is](#what-codex-is)
- [How It Works](#how-it-works)
- [Common Commands](#common-commands)
- [Where Files Live](#where-files-live)
- [Writing Tweaks](#writing-tweaks)
- [Owl And Native Bridge](#owl-and-native-bridge)
- [Browser Host Mode](#browser-host-mode)
- [Updates And Recovery](#updates-and-recovery)
- [Security](#security)
- [More Docs](#more-docs)

## Install

Agentic install, from Codex:

```text
Inspect and install this for me: https://github.com/b-nnett/codex-plusplus
Tell me where you install it and send me the local path for adding new tweaks.
```

Homebrew:

```sh
brew install b-nnett/codex-plusplus/codexplusplus
codexplusplus install
```

GitHub source installer:

```sh
curl -fsSL https://raw.githubusercontent.com/b-nnett/codex-plusplus/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/b-nnett/codex-plusplus/main/install.ps1 | iex
```

Bun:

```sh
bun install -g github:b-nnett/codex-plusplus
codexplusplus install
```

After install, launch Codex normally. Open Settings and look for the Codex++
section.

## What Codex++ Is

Codex++ is a tweak loader for Codex Desktop.

It gives you:

- A local `tweaks/` folder.
- A runtime that loads renderer and main-process tweaks.
- A Codex++ Settings section inside Codex.
- CLI tools for install, repair, update, debug, and tweak development.
- A watcher that repairs Codex++ after Codex updates.
- A public SDK for tweak authors.
- Native bridge APIs for advanced macOS tweaks.

It does not replace Codex, proxy your account, or run a separate Codex clone.
It modifies your installed app so it can load local code.

## How It Works

Install flow:

1. Codex++ finds your Codex app.
2. It backs up the unpatched app files.
3. It patches Codex `app.asar` so a Codex++ loader runs first.
4. It stages the Codex++ runtime in your user data directory.
5. It re-signs the app when needed.
6. It installs a watcher for future Codex updates.

Runtime flow:

1. You launch Codex.
2. The Codex++ loader starts.
3. The loader starts the Codex++ runtime from disk.
4. Codex starts normally.
5. Codex++ discovers enabled tweaks.
6. Renderer tweaks run in Codex windows.
7. Main-process tweaks run in the Codex main process.
8. The Settings UI shows Codex++ pages and tweak controls.

## Common Commands

| Command | What it does |
|---|---|
| `codexplusplus install` | Patch Codex and install the runtime. |
| `codexplusplus status` | Show installed version and patch state. |
| `codexplusplus debug` | Show app path, runtime type, paths, open state, and bridge status. |
| `codexplusplus repair` | Re-apply the patch after an app update or broken install. |
| `codexplusplus update` | Update Codex++ from the latest GitHub release. |
| `codexplusplus update-codex` | Prepare Codex for its official updater, then re-patch after restart. |
| `codexplusplus doctor` | Diagnose signatures, integrity, permissions, and common failures. |
| `codexplusplus safe-mode` | Disable all tweaks without deleting them. |
| `codexplusplus safe-mode --off` | Leave safe mode. |
| `codexplusplus uninstall` | Remove Codex++ and restore the app when safe. |
| `codexplusplus uninstall --purge` | Also delete tweaks, config, logs, backups, and Codex++ user data. |

Tweak development commands:

| Command | What it does |
|---|---|
| `codexplusplus create-tweak ./my-tweak` | Create a new tweak folder. |
| `codexplusplus validate-tweak ./my-tweak` | Validate a tweak manifest and entry file. |
| `codexplusplus dev ./my-tweak` | Link a local tweak into Codex++ for development. |

Source checkout commands:

```sh
npm run build
npm test
node packages/installer/dist/cli.js install
node packages/installer/dist/cli.js debug
```

## Where Files Live

Codex++ keeps almost everything outside Codex.

| Item | Location |
|---|---|
| Loader patch | Inside Codex `app.asar` |
| Runtime | `<user-data-dir>/runtime/` |
| Tweaks | `<user-data-dir>/tweaks/` |
| Tweak data | `<user-data-dir>/tweak-data/` |
| Config | `<user-data-dir>/config.json` |
| State | `<user-data-dir>/state.json` |
| Logs | `<user-data-dir>/log/` |
| Backups | `<user-data-dir>/backup/` |

Default user data paths:

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/codex-plusplus/` |
| Windows | `%APPDATA%/codex-plusplus/` |
| Linux | `$XDG_DATA_HOME/codex-plusplus/` or `~/.local/share/codex-plusplus/` |

On Windows Store installs, Codex++ also creates a writable managed app copy
under `%LOCALAPPDATA%/codex-plusplus/store-apps/`. Use the Codex++ shortcut for
that copy.

## Writing Tweaks

A tweak is a folder with a manifest and an entry file:

```text
my-tweak/
  manifest.json
  index.js
```

Minimal `manifest.json`:

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

Minimal `index.js`:

```js
module.exports = {
  start(api) {
    api.settings.registerPage({
      id: "main",
      title: api.manifest.name,
      render(root) {
        root.textContent = "Hello from Codex++.";
      },
    });
  },
  stop() {},
};
```

Local dev loop:

```sh
codexplusplus create-tweak ./my-tweak --id com.you.my-tweak --name "My Tweak"
codexplusplus validate-tweak ./my-tweak
codexplusplus dev ./my-tweak
```

Full docs are in [Writing Tweaks](./docs/WRITING-TWEAKS.md).

## Owl And Native Bridge

Current macOS Codex builds use Owl: a native app shell with Chromium and an
Electron-compatible JavaScript runtime.

Codex++ 1.0.0 detects Owl and reports capability status through:

```sh
codexplusplus debug
```

Tweak authors should use the Codex++ SDK, not raw Owl internals:

- `api.codex.runtime.getInfo()`
- `api.codex.runtime.getCapabilities()`
- `api.codex.windows.*`
- `api.codex.cdp.*`
- `api.codex.native.*`

Native bridge support includes:

- Tweak-owned `.node` modules.
- Objective-C++/N-API shims for Swift, AppKit, Metal, and MetalKit.
- Native child panels.
- Metal-backed child-window overlays.
- Helper processes.

Start with [Native Bridge](./docs/tweaks/native-bridge.md).

## Browser Host Mode

Browser host mode opens the Codex React UI in a normal browser tab while a
hidden Codex window provides the private app bridge:

```sh
codexplusplus browser --port 8765
```

Then open:

```text
http://127.0.0.1:8765/
```

This is useful for debugging and browser automation. It is experimental. The
in-app browser uses iframe shims in this mode, so some websites may block
embedding.

## Updates And Recovery

Update Codex++:

```sh
codexplusplus update
```

Run the official Codex updater on macOS:

```sh
codexplusplus update-codex
```

Repair Codex++:

```sh
codexplusplus repair --force
```

Disable tweaks temporarily:

```sh
codexplusplus safe-mode
```

Re-enable normal tweak loading:

```sh
codexplusplus safe-mode --off
```

Uninstall:

```sh
codexplusplus uninstall
```

Clean uninstall, including tweaks/config/logs/backups:

```sh
codexplusplus uninstall --purge
```

## Security

Codex++ runs local code inside your Codex desktop app. Install tweaks only from
sources you trust.

Important details:

- Codex++ does not silently update tweak files.
- Tweak update checks link to GitHub Releases for review.
- Native tweaks can run native code and need extra review.
- Native bridge paths are restricted to files inside the tweak directory.
- Tweak data APIs default to Codex++'s user data directory.

See [Security](./SECURITY.md).

## More Docs

- [Architecture](./docs/ARCHITECTURE.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)
- [Writing Tweaks](./docs/WRITING-TWEAKS.md)
- [Tweak API Reference](./docs/tweaks/api-reference.md)
- [Manifest Reference](./docs/tweaks/manifest.md)
- [Runtime And Lifecycle](./docs/tweaks/runtime-lifecycle.md)
- [UI And DOM Patterns](./docs/tweaks/ui-and-dom.md)
- [MCP Servers](./docs/tweaks/mcp.md)
- [Owl Runtime Surface](./docs/OWL-RUNTIME.md)
- [Owl Bridge Roadmap](./docs/OWL-BRIDGE-ROADMAP.md)

## Contributors

- [Alex Naidis (@TheCrazyLex)](https://github.com/TheCrazyLex) - macOS
  permission hardening and sudo install handling.

## License

MIT.
