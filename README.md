# ChatGPT Layer

Local tweaks for the OpenAI ChatGPT desktop app. Unofficial. Not affiliated with OpenAI.

Đây là fork đang maintain của [Codex++](https://github.com/b-nnett/codex-plusplus) (Bennett). Package Microsoft Store vẫn tên `OpenAI.Codex`. Tweak, CLI, và data path cũ vẫn dùng được.

[Join the Discord community](https://discord.gg/6bY6gGX36H).

<img width="1413" height="1016" alt="ChatGPT Layer settings" src="https://github.com/user-attachments/assets/ea0b2ffc-c30d-4f68-ae12-dd8d6a997b2f" />

> Unofficial project. Not affiliated with OpenAI. Use at your own risk.

## Tiếng Việt

ChatGPT Layer vá `app.asar` của app ChatGPT desktop để load runtime tweak trên máy anh.

- Windows: launcher trỏ `ChatGPT.exe`. `Codex.exe` cùng thư mục là stub, mở lên là thoát.
- Shortcut: **ChatGPT Layer** (Start Menu + Desktop). Đừng mở icon Store.
- Data vẫn ở `%APPDATA%\codex-plusplus\` nên Codex Accounts và tweak cũ không gãy.
- Lệnh: `chatgpt-layer` / `cgl` / `codexplusplus`.
- Store update thường gỡ patch. Chạy `chatgpt-layer repair` sau khi update.

Cài từ PowerShell (Node 20+):

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

Rồi mở shortcut **ChatGPT Layer**. Settings sẽ có nhóm ChatGPT Layer.

## TL;DR

ChatGPT Layer patches the local ChatGPT desktop app so a small runtime loads on
startup. Tweaks live in your user data directory, not inside the app bundle.

When the Store/app updates, the patch is usually removed. Repair with
`chatgpt-layer repair`.

**1.1.0** prefers `ChatGPT.exe` on Windows Store installs, discovers the
`OpenAI.Codex` package family, rebrands the loader to ChatGPT Layer, and keeps
Codex++ data paths so existing tweaks keep working.

## Table Of Contents

- [Install](#install)
- [What ChatGPT Layer Is](#what-chatgpt-layer-is)
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

Windows PowerShell (Node 20+):

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh | bash
```

From a source checkout:

```sh
chatgpt-layer install
```

Aliases: `cgl`, `codexplusplus`.

After install, launch ChatGPT from the **ChatGPT Layer** shortcut, not the Store
icon. Open Settings and look for the ChatGPT Layer section.

On Windows, launchers target `ChatGPT.exe`. `Codex.exe` in the same folder is a
stub that exits immediately.

## What ChatGPT Layer Is

A tweak loader for the ChatGPT desktop app. It keeps the Codex++ tweak APIs and
the existing `%APPDATA%/codex-plusplus` data paths.

It gives you:

- A local `tweaks/` folder.
- A runtime that loads renderer and main-process tweaks.
- A ChatGPT Layer section in Settings.
- CLI tools for install, repair, update, debug, and tweak development.
- A watcher that can re-apply the patch after app updates.
- A public SDK for tweak authors.
- Native bridge APIs for advanced macOS tweaks.

It does not replace ChatGPT, proxy your account, or pool quotas. It patches the
installed app so it can load local code.

## How It Works

Install flow:

1. ChatGPT Layer finds the ChatGPT / Codex desktop app.
2. It backs up the unpatched app files.
3. It patches `app.asar` so a loader runs first.
4. It stages the runtime in your user data directory.
5. It re-signs the app when needed.
6. On Windows Store installs it mirrors the locked package into a writable
   `%LOCALAPPDATA%/codex-plusplus/store-apps/OpenAI.Codex/` copy.

Runtime flow:

1. You launch ChatGPT from the ChatGPT Layer shortcut.
2. The loader starts, then the runtime on disk.
3. ChatGPT starts normally.
4. Enabled tweaks load.
5. Settings shows ChatGPT Layer pages and tweak controls.

## Common Commands

| Command | What it does |
|---|---|
| `chatgpt-layer install` | Patch ChatGPT and install the runtime. |
| `chatgpt-layer status` | Show installed version and patch state. |
| `chatgpt-layer debug` | Show app path, runtime type, paths, open state, and bridge status. |
| `chatgpt-layer repair` | Re-apply the patch after an app update or broken install. |
| `chatgpt-layer update` | Update ChatGPT Layer from the latest GitHub release. |
| `chatgpt-layer doctor` | Diagnose signatures, integrity, permissions, and common failures. |
| `chatgpt-layer safe-mode` | Disable all tweaks without deleting them. |
| `chatgpt-layer safe-mode --off` | Leave safe mode. |
| `chatgpt-layer uninstall` | Remove the loader and restore the app when safe. |
| `chatgpt-layer uninstall --purge` | Also delete tweaks, config, logs, backups, and user data. |

`cgl` and `codexplusplus` are aliases for the same CLI.

Tweak development:

```sh
chatgpt-layer create-tweak ./my-tweak --id com.you.my-tweak --name "My Tweak"
chatgpt-layer validate-tweak ./my-tweak
chatgpt-layer dev ./my-tweak
```

## Where Files Live

Almost everything stays outside the app.

| Item | Location |
|---|---|
| Loader patch | Inside ChatGPT `app.asar` |
| Runtime | `<user-data-dir>/runtime/` |
| Tweaks | `<user-data-dir>/tweaks/` |
| Tweak data | `<user-data-dir>/tweak-data/` |
| Config | `<user-data-dir>/config.json` |
| State | `<user-data-dir>/state.json` |
| Logs | `<user-data-dir>/log/` |
| Backups | `<user-data-dir>/backup/` |

Default user data paths (unchanged from Codex++):

| OS | Path |
|---|---|
| macOS | `~/Library/Application Support/codex-plusplus/` |
| Windows | `%APPDATA%/codex-plusplus/` |
| Linux | `$XDG_DATA_HOME/codex-plusplus/` or `~/.local/share/codex-plusplus/` |

On Windows Store installs, ChatGPT Layer mirrors the locked package to
`%LOCALAPPDATA%/codex-plusplus/store-apps/OpenAI.Codex/`. Use the ChatGPT Layer
shortcut. A `Codex++.lnk` shortcut is still created for compatibility.

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
  "description": "Adds a ChatGPT Layer settings page.",
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
        root.textContent = "Hello from ChatGPT Layer.";
      },
    });
  },
  stop() {},
};
```

Full docs are in [Writing Tweaks](./docs/WRITING-TWEAKS.md). The SDK APIs are
still `api.codex.*` so existing tweaks keep working.

## Owl And Native Bridge

Current desktop builds use Owl: a native app shell with Chromium and an
Electron-compatible JavaScript runtime.

```sh
chatgpt-layer debug
```

Tweak authors should use the SDK, not raw Owl internals:

- `api.codex.runtime.getInfo()`
- `api.codex.runtime.getCapabilities()`
- `api.codex.windows.*`
- `api.codex.cdp.*`
- `api.codex.native.*`

Start with [Native Bridge](./docs/tweaks/native-bridge.md).

## Browser Host Mode

```sh
chatgpt-layer browser --port 8765
```

Then open `http://127.0.0.1:8765/`. Experimental.

## Updates And Recovery

```sh
chatgpt-layer update
chatgpt-layer repair --force
chatgpt-layer safe-mode
chatgpt-layer safe-mode --off
chatgpt-layer uninstall
chatgpt-layer uninstall --purge
```

After a Microsoft Store ChatGPT update, quit `ChatGPT.exe` completely and run
`chatgpt-layer repair`. Future asar layout changes can still break the patcher.

## Security

ChatGPT Layer runs local code inside the ChatGPT desktop app. Install tweaks
only from sources you trust.

- Tweaks are not silently updated.
- Tweak update checks link to GitHub Releases for review.
- Native tweaks can run native code and need extra review.
- Data APIs default to the ChatGPT Layer / Codex++ user data directory.

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

- Bennett ([@b-nnett](https://github.com/b-nnett)) — original Codex++.
- [Alex Naidis (@TheCrazyLex)](https://github.com/TheCrazyLex) — macOS
  permission hardening and sudo install handling.

## License

MIT.
