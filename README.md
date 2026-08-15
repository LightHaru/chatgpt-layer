<p align="center">
  <img src="assets/logo.png" width="128" alt="ChatGPT Layer">
</p>

<h1 align="center">ChatGPT Layer</h1>

<p align="center">
  Local tweaks for the ChatGPT desktop app.
</p>

<p align="center">
  <a href="#english">English</a> ·
  <a href="#tiếng-việt">Tiếng Việt</a>
</p>

<p align="center">
  <img alt="version" src="https://img.shields.io/badge/version-1.1.2-4F8CFF?style=flat-square">
  <img alt="platforms" src="https://img.shields.io/badge/Windows%20%7C%20macOS%20%7C%20Linux-3b82f6?style=flat-square">
  <img alt="unofficial" src="https://img.shields.io/badge/unofficial-not%20affiliated%20with%20OpenAI-111827?style=flat-square">
</p>

ChatGPT Layer patches the ChatGPT desktop app so a local runtime can load tweaks from your user data — extra Settings pages, UI changes, main-process code. The app stays ChatGPT. Tweaks live on your machine, not inside the bundle.

Unofficial. Not affiliated with OpenAI.

<p align="center">
  <img width="1413" alt="ChatGPT Layer settings" src="https://github.com/user-attachments/assets/ea0b2ffc-c30d-4f68-ae12-dd8d6a997b2f">
</p>

---

# English

## Features

- Load local tweaks into ChatGPT desktop: UI, Settings pages, main-process code.
- Runtime and tweaks live in your user data. The patch inside `app.asar` is small.
- CLI for install, status, repair, update, and tweak development (`chatgpt-layer` / `cgl` / `codexplusplus`).
- In-app Tweak Store. Right now the only listing is [Codex Accounts](https://github.com/LightHaru/codex-plusplus-accounts) (`me.lightharu.codex-accounts`) by LightHaru.
- When a store-listed tweak has a newer GitHub Release, Tweaks shows a badge and a one-click **Update** (1.1.2).
- Existing tweaks keep working: SDK is still `api.codex.*`, folders still named `tweaks`.

## Install

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

**macOS / Linux**

```sh
curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh | bash
```

Then open ChatGPT from the **ChatGPT Layer** shortcut (Windows) and look for the ChatGPT Layer section in Settings.

## Launch

On Windows, always start from the **ChatGPT Layer** shortcut (Start Menu or Desktop). That shortcut runs `ChatGPT.exe`.

`Codex.exe` in the same folder is a stub that exits. Do **not** use the Microsoft Store icon — that launches the unpatched package.

The Store package family is still `OpenAI.Codex` (publisher `2p2nqsd0c76g0`). Layer mirrors it to a writable copy (see paths below).

## Commands

Aliases: `chatgpt-layer`, `cgl`, `codexplusplus`.

| Command | What it does |
|---|---|
| `chatgpt-layer install` | Patch ChatGPT and install the runtime. |
| `chatgpt-layer status` | Show installed version and patch state. |
| `chatgpt-layer debug` | App path, runtime, paths, open state, bridge. |
| `chatgpt-layer repair` | Re-apply the patch after an app update. |
| `chatgpt-layer update` | Update Layer from the latest GitHub release. |
| `chatgpt-layer doctor` | Diagnose signatures, integrity, permissions. |
| `chatgpt-layer safe-mode` | Disable all tweaks without deleting them. |
| `chatgpt-layer uninstall` | Remove the loader and restore the app when safe. |
| `chatgpt-layer uninstall --purge` | Also delete tweaks, config, logs, backups, and user data. |
| `chatgpt-layer create-tweak` | Scaffold a new tweak folder. |
| `chatgpt-layer validate-tweak` | Validate a tweak manifest and entry file. |
| `chatgpt-layer dev` | Link a local tweak for development. |
| `chatgpt-layer browser` | Open the ChatGPT UI in a browser host. |

## Where files live

Data directories are unchanged from the original loader, so existing tweaks keep working.

| | Path |
|---|---|
| Windows | `%APPDATA%\codex-plusplus\` |
| macOS | `~/Library/Application Support/codex-plusplus/` |
| Linux | `$XDG_DATA_HOME/codex-plusplus/` or `~/.local/share/codex-plusplus/` |
| Tweaks | `<user-data>/tweaks/` |
| Runtime | `<user-data>/runtime/` |
| Windows Store writable copy | `%LOCALAPPDATA%\codex-plusplus\store-apps\OpenAI.Codex\` |

## Tweaks and Tweak Store

Drop a folder into `tweaks/` (manifest + entry file). Layer loads enabled tweaks when ChatGPT starts.

The in-app Tweak Store reads:

`https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/store/index.json`

The only listing today is **Codex Accounts** (`me.lightharu.codex-accounts`) by LightHaru — switch ChatGPT sessions from the avatar menu.

SDK APIs stay `api.codex.*`. Internal folders stay `tweaks`. Old tweaks do not need a rename.

From 1.1.2, if a **store-listed** tweak has a newer GitHub Release (semver tag), Tweaks shows **Update Available**, a banner, and an **Update** button that installs from that release. Authors must cut a GitHub Release for detection. This is not silent: you click Update.

## Updates and repair

Microsoft Store / app updates usually strip the patch. Fully quit `ChatGPT.exe` first, then:

```sh
chatgpt-layer repair
```

Update Layer itself with `chatgpt-layer update`.

Tweak updates (store-listed, 1.1.2): the Tweaks sidebar badge counts pending GitHub Release updates. Open Tweaks and click **Update** — Layer installs from that release instead of only opening the URL.

## Security

Tweaks are local code running inside ChatGPT. Install only from sources you trust.

GitHub Release install is user-clicked, not silent. Layer does not push tweak files in the background.

See [Security](SECURITY.md).

## Writing tweaks

A tweak is a folder:

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

```sh
chatgpt-layer create-tweak ./my-tweak --id com.you.my-tweak --name "My Tweak"
chatgpt-layer validate-tweak ./my-tweak
chatgpt-layer dev ./my-tweak
```

APIs are still `api.codex.*`. Full guide: [Writing Tweaks](docs/WRITING-TWEAKS.md). Store-listed tweaks that want in-app Update need a GitHub Release with a semver tag.

## More docs

- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Writing Tweaks](docs/WRITING-TWEAKS.md)
- [Tweak API](docs/tweaks/api-reference.md)

## Credits

[Bennett](https://github.com/b-nnett) ([@b-nnett](https://github.com/b-nnett)) built the original Codex++ loader. ChatGPT Layer keeps those data paths and `api.codex.*` so existing tweaks keep working.

[Alex Naidis](https://github.com/TheCrazyLex) ([@TheCrazyLex](https://github.com/TheCrazyLex)) — macOS permission hardening.

LightHaru maintains ChatGPT Layer.

Optional community Discord (Bennett's server, not the product name): [discord.gg/6bY6gGX36H](https://discord.gg/6bY6gGX36H).

## License

[MIT](LICENSE).

---

# Tiếng Việt

ChatGPT Layer vá app ChatGPT desktop để runtime trên máy bạn load tweak từ user data — thêm trang Settings, đổi UI, chạy code main-process. App vẫn là ChatGPT. Tweak nằm trên máy bạn, không nhét vào bundle.

Không chính thức. Không liên kết với OpenAI.

## Tính năng

- Load tweak local vào ChatGPT desktop: UI, trang Settings, code main-process.
- Runtime và tweak nằm ở user data. Phần vá trong `app.asar` nhỏ.
- CLI để cài, xem status, repair, update, và viết tweak (`chatgpt-layer` / `cgl` / `codexplusplus`).
- Tweak Store trong app. Hiện chỉ có [Codex Accounts](https://github.com/LightHaru/codex-plusplus-accounts) (`me.lightharu.codex-accounts`) của LightHaru.
- Tweak trên Store có GitHub Release mới thì trang Tweaks hiện badge và nút **Update** một click (1.1.2).
- Tweak cũ vẫn chạy: SDK vẫn `api.codex.*`, thư mục vẫn tên `tweaks`.

## Cài đặt

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

**macOS / Linux**

```sh
curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh | bash
```

Xong thì mở ChatGPT bằng shortcut **ChatGPT Layer** (Windows) và tìm nhóm ChatGPT Layer trong Settings.

## Khởi chạy

Trên Windows, luôn mở **ChatGPT Layer** (Start Menu hoặc Desktop). Shortcut đó chạy `ChatGPT.exe`.

`Codex.exe` cùng thư mục là stub — mở lên là thoát ngay. Đừng bấm icon Microsoft Store: đó là package chưa vá.

Package family trên Store vẫn là `OpenAI.Codex` (publisher `2p2nqsd0c76g0`). Layer nhân bản sang thư mục ghi được (xem bảng đường dẫn).

## Lệnh

Alias: `chatgpt-layer`, `cgl`, `codexplusplus`.

| Lệnh | Việc |
|---|---|
| `chatgpt-layer install` | Vá ChatGPT và cài runtime. |
| `chatgpt-layer status` | Hiện version và trạng thái patch. |
| `chatgpt-layer debug` | Đường dẫn app, runtime, path, bridge. |
| `chatgpt-layer repair` | Vá lại sau khi app update. |
| `chatgpt-layer update` | Cập nhật Layer từ GitHub release mới nhất. |
| `chatgpt-layer doctor` | Kiểm tra chữ ký, integrity, quyền. |
| `chatgpt-layer safe-mode` | Tắt hết tweak, không xóa. |
| `chatgpt-layer uninstall` | Gỡ loader, restore app khi an toàn. |
| `chatgpt-layer uninstall --purge` | Xóa luôn tweak, config, log, backup, user data. |
| `chatgpt-layer create-tweak` | Tạo folder tweak mới. |
| `chatgpt-layer validate-tweak` | Kiểm tra manifest và file entry. |
| `chatgpt-layer dev` | Link tweak local để dev. |
| `chatgpt-layer browser` | Mở UI ChatGPT trên browser host. |

## File nằm đâu

Thư mục dữ liệu giữ nguyên từ loader gốc, nên tweak đang có không gãy.

| | Đường dẫn |
|---|---|
| Windows | `%APPDATA%\codex-plusplus\` |
| macOS | `~/Library/Application Support/codex-plusplus/` |
| Linux | `$XDG_DATA_HOME/codex-plusplus/` hoặc `~/.local/share/codex-plusplus/` |
| Tweaks | `<user-data>/tweaks/` |
| Runtime | `<user-data>/runtime/` |
| Bản Store ghi được (Windows) | `%LOCALAPPDATA%\codex-plusplus\store-apps\OpenAI.Codex\` |

## Tweak và Tweak Store

Bỏ một folder vào `tweaks/` (manifest + file entry). Layer load tweak đang bật khi ChatGPT mở.

Tweak Store trong app đọc:

`https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/store/index.json`

Hiện chỉ có **Codex Accounts** (`me.lightharu.codex-accounts`) của LightHaru — đổi session ChatGPT từ menu avatar.

SDK vẫn `api.codex.*`. Thư mục trong máy vẫn tên `tweaks`. Tweak cũ không cần đổi tên.

Từ 1.1.2, nếu tweak **nằm trên Store** có GitHub Release mới (tag semver), trang Tweaks hiện **Update Available**, banner, và nút **Update** cài từ release đó. Tác giả phải cắt GitHub Release thì Layer mới phát hiện. Không tự cài im lặng: bạn bấm Update.

## Cập nhật và repair

Update Store / app thường gỡ mất patch. Tắt hẳn `ChatGPT.exe` rồi chạy:

```sh
chatgpt-layer repair
```

Cập nhật Layer: `chatgpt-layer update`.

Cập nhật tweak (trên Store, 1.1.2): badge trên sidebar Tweaks đếm số bản GitHub Release đang chờ. Vào Tweaks, bấm **Update** — Layer cài từ release đó, không chỉ mở URL.

## Bảo mật

Tweak là code local chạy bên trong ChatGPT. Chỉ cài từ nguồn bạn tin.

Cài từ GitHub Release do bạn bấm, không chạy ngầm. Layer không tự đẩy file tweak.

Xem [Security](SECURITY.md).

## Viết tweak

Một tweak là một folder:

```text
my-tweak/
  manifest.json
  index.js
```

`manifest.json` tối thiểu:

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

`index.js` tối thiểu:

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

```sh
chatgpt-layer create-tweak ./my-tweak --id com.you.my-tweak --name "My Tweak"
chatgpt-layer validate-tweak ./my-tweak
chatgpt-layer dev ./my-tweak
```

API vẫn `api.codex.*`. Hướng dẫn đầy đủ: [Writing Tweaks](docs/WRITING-TWEAKS.md). Tweak trên Store muốn Update trong app thì cần GitHub Release với tag semver.

## Tài liệu thêm

- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Writing Tweaks](docs/WRITING-TWEAKS.md)
- [Tweak API](docs/tweaks/api-reference.md)

## Cảm ơn

[Bennett](https://github.com/b-nnett) ([@b-nnett](https://github.com/b-nnett)) làm loader Codex++ gốc. ChatGPT Layer giữ path dữ liệu và `api.codex.*` để tweak cũ vẫn chạy.

[Alex Naidis](https://github.com/TheCrazyLex) ([@TheCrazyLex](https://github.com/TheCrazyLex)) — siết quyền khi cài trên macOS.

LightHaru đang maintain ChatGPT Layer.

Discord cộng đồng (server của Bennett, không phải tên sản phẩm): [discord.gg/6bY6gGX36H](https://discord.gg/6bY6gGX36H).

## Giấy phép

[MIT](LICENSE).
