<p align="center">
  <img src="assets/logo.png" width="160" alt="ChatGPT Layer">
</p>

<h1 align="center">ChatGPT Layer</h1>

<p align="center">Local tweaks for the ChatGPT desktop app.</p>

<p align="center">
  <a href="https://github.com/LightHaru/chatgpt-layer/releases"><img alt="release" src="https://img.shields.io/github/v/release/LightHaru/chatgpt-layer?style=for-the-badge&color=4F8CFF"></a>
  <a href="https://www.npmjs.com/package/chatgpt-layer"><img alt="npm" src="https://img.shields.io/npm/v/chatgpt-layer?style=for-the-badge&logo=npm&color=CB3837"></a>
  <a href="LICENSE"><img alt="license" src="https://img.shields.io/github/license/LightHaru/chatgpt-layer?style=for-the-badge&color=111827"></a>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white">
  <img alt="macOS" src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black">
  <img alt="node >=20" src="https://img.shields.io/badge/node-%3E%3D20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
  <img alt="unofficial" src="https://img.shields.io/badge/Unofficial-not%20affiliated%20with%20OpenAI-111827?style=for-the-badge">
</p>

<p align="center">
  <a href="#english"><img alt="English" src="https://img.shields.io/badge/English-4F8CFF?style=for-the-badge"></a>
  <a href="#tiếng-việt"><img alt="Tiếng Việt" src="https://img.shields.io/badge/Tiếng%20Việt-111827?style=for-the-badge"></a>
  <a href="https://github.com/LightHaru/chatgpt-layer/releases"><img alt="Releases" src="https://img.shields.io/badge/Releases-3b82f6?style=for-the-badge"></a>
  <a href="https://www.npmjs.com/package/chatgpt-layer"><img alt="npm" src="https://img.shields.io/badge/npm-chatgpt--layer-CB3837?style=for-the-badge&logo=npm&logoColor=white"></a>
  <a href="docs/ARCHITECTURE.md"><img alt="Architecture" src="https://img.shields.io/badge/Architecture-111827?style=flat-square"></a>
  <a href="docs/TROUBLESHOOTING.md"><img alt="Troubleshooting" src="https://img.shields.io/badge/Troubleshooting-111827?style=flat-square"></a>
  <a href="docs/WRITING-TWEAKS.md"><img alt="Writing Tweaks" src="https://img.shields.io/badge/Writing%20Tweaks-111827?style=flat-square"></a>
  <a href="docs/tweaks/api-reference.md"><img alt="Tweak API" src="https://img.shields.io/badge/Tweak%20API-111827?style=flat-square"></a>
  <a href="SECURITY.md"><img alt="Security" src="https://img.shields.io/badge/Security-111827?style=flat-square"></a>
</p>

ChatGPT Layer patches the ChatGPT desktop app so a local runtime can load tweaks from your user data — extra Settings pages, UI changes, main-process code. The app stays ChatGPT. Tweaks live on your machine, not inside the bundle.

Unofficial. Not affiliated with OpenAI.

<p align="center">
  <img width="1413" alt="ChatGPT Layer settings" src="https://github.com/user-attachments/assets/ea0b2ffc-c30d-4f68-ae12-dd8d6a997b2f">
</p>

---

# English

## Features <img alt="" src="https://img.shields.io/badge/overview-4F8CFF?style=flat-square">

| | |
|:---:|:---|
| <img alt="tweaks" src="https://img.shields.io/badge/tweaks-4F8CFF?style=flat-square"> | Load local tweaks into ChatGPT desktop: UI, Settings pages, main-process code. Runtime and tweaks live in your user data. The patch inside `app.asar` is small. Existing tweaks keep working: SDK is still `api.codex.*`, folders still named `tweaks`. |
| <img alt="CLI" src="https://img.shields.io/badge/CLI-111827?style=flat-square"> | CLI for install, status, repair, update, and tweak development (`chatgpt-layer` / `cgl` / `codexplusplus`). |
| <img alt="store" src="https://img.shields.io/badge/store-3b82f6?style=flat-square"> | In-app Tweak Store. Right now the only listing is [Codex Accounts](https://github.com/LightHaru/codex-plusplus-accounts) (`me.lightharu.codex-accounts`) by LightHaru. |
| <img alt="repair" src="https://img.shields.io/badge/repair-4F8CFF?style=flat-square"> | Microsoft Store / app updates usually strip the patch. Fully quit `ChatGPT.exe`, then `chatgpt-layer repair`. |
| <img alt="security pin" src="https://img.shields.io/badge/security%20pin-111827?style=flat-square"> | Store **Update** / **Install** only installs the `approvedCommitSha` pinned in `store/index.json` (1.1.3). A newer GitHub Release can badge the Tweaks page; the button does not pull an unpinned latest tag. |

## Install <img alt="" src="https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm">

**npm** (recommended, Node.js 20+)

```sh
npm install -g chatgpt-layer
chatgpt-layer install
```

Or without a global install:

```sh
npx chatgpt-layer@latest install
```

Aliases: `chatgpt-layer`, `cgl`, `codexplusplus`, `codex-plusplus`. Package: [chatgpt-layer](https://www.npmjs.com/package/chatgpt-layer).

**GitHub one-liners** (alternative)

The one-liners fetch the installer script from `main` (fail-closed lockfile). That script then pins the downloaded source to tag `v1.1.4` unless `CODEX_PLUSPLUS_REF` is set.

<p>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white">
</p>

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

<p>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black">
</p>

**macOS / Linux**

```sh
curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh | bash
```

Then open ChatGPT from the **ChatGPT Layer** shortcut (Windows) and look for the ChatGPT Layer section in Settings.

## Launch <img alt="" src="https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white">

On Windows, always start from the **ChatGPT Layer** shortcut (Start Menu or Desktop). That shortcut runs `ChatGPT.exe`.

`Codex.exe` in the same folder is a stub that exits. Do **not** use the Microsoft Store icon — that launches the unpatched package.

The Store package family is still `OpenAI.Codex` (publisher `2p2nqsd0c76g0`). Layer mirrors it to a writable copy (see paths below).

## Commands <img alt="" src="https://img.shields.io/badge/CLI-111827?style=flat-square">

Aliases: <img alt="chatgpt-layer" src="https://img.shields.io/badge/chatgpt--layer-4F8CFF?style=flat-square"> <img alt="cgl" src="https://img.shields.io/badge/cgl-3b82f6?style=flat-square"> <img alt="codexplusplus" src="https://img.shields.io/badge/codexplusplus-111827?style=flat-square">

| Command | What it does |
|---|---|
| `chatgpt-layer install` | Patch ChatGPT and install the runtime. |
| `chatgpt-layer status` | Show installed version and patch state. |
| `chatgpt-layer debug` | App path, runtime, paths, open state, bridge. |
| `chatgpt-layer repair` | Re-apply the patch after an app update. |
| `chatgpt-layer update` | Update Layer from a GitHub release. Self-update is opt-in (default off). |
| `chatgpt-layer doctor` | Diagnose signatures, integrity, permissions. |
| `chatgpt-layer safe-mode` | Disable all tweaks without deleting them. |
| `chatgpt-layer uninstall` | Remove the loader and restore the app when safe. |
| `chatgpt-layer uninstall --purge` | Also delete tweaks, config, logs, backups, and user data. |
| `chatgpt-layer create-tweak` | Scaffold a new tweak folder. |
| `chatgpt-layer validate-tweak` | Validate a tweak manifest and entry file. |
| `chatgpt-layer dev` | Link a local tweak for development. |
| `chatgpt-layer browser` | Open the ChatGPT UI in a browser host. |

## Where files live <img alt="" src="https://img.shields.io/badge/paths-111827?style=flat-square">

Data directories are unchanged from the original loader, so existing tweaks keep working.

| | Path |
|---|---|
| Windows | `%APPDATA%\codex-plusplus\` |
| macOS | `~/Library/Application Support/codex-plusplus/` |
| Linux | `$XDG_DATA_HOME/codex-plusplus/` or `~/.local/share/codex-plusplus/` |
| Tweaks | `<user-data>/tweaks/` |
| Runtime | `<user-data>/runtime/` |
| Windows Store writable copy | `%LOCALAPPDATA%\codex-plusplus\store-apps\OpenAI.Codex\` |

## Tweaks and Tweak Store <img alt="" src="https://img.shields.io/badge/store-3b82f6?style=flat-square">

Drop a folder into `tweaks/` (manifest + entry file). Layer loads enabled tweaks when ChatGPT starts.

The in-app Tweak Store reads:

`https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/store/index.json`

The only listing today is **Codex Accounts** (`me.lightharu.codex-accounts`) by LightHaru — switch ChatGPT sessions from the avatar menu.

SDK APIs stay `api.codex.*`. Internal folders stay `tweaks`. Old tweaks do not need a rename.

From 1.1.2, store-listed tweaks can show **Update Available** when a newer GitHub Release (semver tag) exists. From 1.1.3, **Update** / **Install** only installs the `approvedCommitSha` listed in the store — not an unpinned latest GitHub Release. Authors still cut a GitHub Release for detection. This is not silent: you click Update.

## Updates and repair <img alt="" src="https://img.shields.io/badge/repair-4F8CFF?style=flat-square">

Microsoft Store / app updates usually strip the patch. Fully quit `ChatGPT.exe` first, then:

```sh
chatgpt-layer repair
```

Update Layer itself with `chatgpt-layer update`. Layer self-update is opt-in and defaults off (1.1.3). Repair after a ChatGPT app update still works.

Tweak updates (store-listed): the Tweaks sidebar badge counts pending updates. Open Tweaks and click **Update** — Layer installs the pinned `approvedCommitSha` from `store/index.json`, not an unpinned latest tag.

## Security <img alt="" src="https://img.shields.io/badge/pin%201.1.4-111827?style=flat-square">

Tweaks are unsandboxed local code running inside ChatGPT. Install only from sources you trust.

Store Update/Install only installs SHAs pinned in `store/index.json` (1.1.3). Layer self-update is opt-in (default off). Privileged IPC is gated to ChatGPT/Layer frames.

See [Security](SECURITY.md).

## Writing tweaks <img alt="" src="https://img.shields.io/badge/SDK-4F8CFF?style=flat-square">

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

APIs are still `api.codex.*`. Full guide: [Writing Tweaks](docs/WRITING-TWEAKS.md). Store-listed tweaks that want in-app Update need a GitHub Release with a semver tag, and the store must pin `approvedCommitSha`.

## More docs <img alt="" src="https://img.shields.io/badge/docs-111827?style=flat-square">

- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Writing Tweaks](docs/WRITING-TWEAKS.md)
- [Tweak API](docs/tweaks/api-reference.md)
- [npm releases](docs/NPM-RELEASE.md)
- [Installer testing](docs/INSTALLER-TESTING.md)

## Acknowledgments <img alt="" src="https://img.shields.io/badge/based%20on%20Codex++-111827?style=flat-square">

ChatGPT Layer is a standalone project **based on** [Codex++](https://github.com/b-nnett/codex-plusplus) by [Bennett](https://github.com/b-nnett) ([@b-nnett](https://github.com/b-nnett)) (MIT). Upstream is archived; this repo continues that work for the ChatGPT desktop app. It is not a GitHub fork.

Data paths and `api.codex.*` stay the same so existing tweaks keep working.

[Alex Naidis](https://github.com/TheCrazyLex) ([@TheCrazyLex](https://github.com/TheCrazyLex)) — macOS permission hardening.

LightHaru maintains ChatGPT Layer.

Optional community Discord (Bennett's server, not the product name): [discord.gg/6bY6gGX36H](https://discord.gg/6bY6gGX36H).

## License <img alt="" src="https://img.shields.io/github/license/LightHaru/chatgpt-layer?style=flat-square&color=111827">

[MIT](LICENSE).

---

# Tiếng Việt

<p>
  <a href="#english"><img alt="English" src="https://img.shields.io/badge/English-4F8CFF?style=flat-square"></a>
  <a href="#tiếng-việt"><img alt="Tiếng Việt" src="https://img.shields.io/badge/Tiếng%20Việt-111827?style=flat-square"></a>
  <a href="https://github.com/LightHaru/chatgpt-layer/releases"><img alt="Releases" src="https://img.shields.io/badge/Releases-3b82f6?style=flat-square"></a>
  <a href="https://www.npmjs.com/package/chatgpt-layer"><img alt="npm" src="https://img.shields.io/badge/npm-chatgpt--layer-CB3837?style=for-the-badge&logo=npm&logoColor=white"></a>
  <a href="docs/ARCHITECTURE.md"><img alt="Architecture" src="https://img.shields.io/badge/Architecture-111827?style=flat-square"></a>
  <a href="docs/TROUBLESHOOTING.md"><img alt="Troubleshooting" src="https://img.shields.io/badge/Troubleshooting-111827?style=flat-square"></a>
  <a href="docs/WRITING-TWEAKS.md"><img alt="Writing Tweaks" src="https://img.shields.io/badge/Writing%20Tweaks-111827?style=flat-square"></a>
  <a href="docs/tweaks/api-reference.md"><img alt="Tweak API" src="https://img.shields.io/badge/Tweak%20API-111827?style=flat-square"></a>
  <a href="SECURITY.md"><img alt="Security" src="https://img.shields.io/badge/Security-111827?style=flat-square"></a>
</p>

ChatGPT Layer vá app ChatGPT desktop để runtime trên máy bạn load tweak từ user data — thêm trang Settings, đổi UI, chạy code main-process. App vẫn là ChatGPT. Tweak nằm trên máy bạn, không nhét vào bundle.

Không chính thức. Không liên kết với OpenAI.

## Tính năng <img alt="" src="https://img.shields.io/badge/overview-4F8CFF?style=flat-square">

| | |
|:---:|:---|
| <img alt="tweaks" src="https://img.shields.io/badge/tweaks-4F8CFF?style=flat-square"> | Load tweak local vào ChatGPT desktop: UI, trang Settings, code main-process. Runtime và tweak nằm ở user data. Phần vá trong `app.asar` nhỏ. Tweak cũ vẫn chạy: SDK vẫn `api.codex.*`, thư mục vẫn tên `tweaks`. |
| <img alt="CLI" src="https://img.shields.io/badge/CLI-111827?style=flat-square"> | CLI để cài, xem status, repair, update, và viết tweak (`chatgpt-layer` / `cgl` / `codexplusplus`). |
| <img alt="store" src="https://img.shields.io/badge/store-3b82f6?style=flat-square"> | Tweak Store trong app. Hiện chỉ có [Codex Accounts](https://github.com/LightHaru/codex-plusplus-accounts) (`me.lightharu.codex-accounts`) của LightHaru. |
| <img alt="repair" src="https://img.shields.io/badge/repair-4F8CFF?style=flat-square"> | Update Store / app thường gỡ mất patch. Tắt hẳn `ChatGPT.exe`, rồi `chatgpt-layer repair`. |
| <img alt="security pin" src="https://img.shields.io/badge/security%20pin-111827?style=flat-square"> | **Update** / **Install** trên Store chỉ cài `approvedCommitSha` đã ghim trong `store/index.json` (1.1.3). GitHub Release mới có thể hiện badge; nút không kéo tag latest chưa ghim. |

## Cài đặt <img alt="" src="https://img.shields.io/badge/npm-CB3837?style=flat-square&logo=npm">

**npm** (nên dùng, Node.js 20+)

```sh
npm install -g chatgpt-layer
chatgpt-layer install
```

Hoặc không cần cài global:

```sh
npx chatgpt-layer@latest install
```

Alias: `chatgpt-layer`, `cgl`, `codexplusplus`, `codex-plusplus`. Gói: [chatgpt-layer](https://www.npmjs.com/package/chatgpt-layer).

**One-liner GitHub** (cách khác)

One-liner lấy script cài từ `main` (lockfile fail-closed). Script đó ghim source tải về tag `v1.1.4` trừ khi đặt `CODEX_PLUSPLUS_REF`.

<p>
  <img alt="Windows" src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white">
</p>

**Windows (PowerShell)**

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

<p>
  <img alt="macOS" src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white">
  <img alt="Linux" src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black">
</p>

**macOS / Linux**

```sh
curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh | bash
```

Xong thì mở ChatGPT bằng shortcut **ChatGPT Layer** (Windows) và tìm nhóm ChatGPT Layer trong Settings.

## Khởi chạy <img alt="" src="https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white">

Trên Windows, luôn mở **ChatGPT Layer** (Start Menu hoặc Desktop). Shortcut đó chạy `ChatGPT.exe`.

`Codex.exe` cùng thư mục là stub — mở lên là thoát ngay. Đừng bấm icon Microsoft Store: đó là package chưa vá.

Package family trên Store vẫn là `OpenAI.Codex` (publisher `2p2nqsd0c76g0`). Layer nhân bản sang thư mục ghi được (xem bảng đường dẫn).

## Lệnh <img alt="" src="https://img.shields.io/badge/CLI-111827?style=flat-square">

Alias: <img alt="chatgpt-layer" src="https://img.shields.io/badge/chatgpt--layer-4F8CFF?style=flat-square"> <img alt="cgl" src="https://img.shields.io/badge/cgl-3b82f6?style=flat-square"> <img alt="codexplusplus" src="https://img.shields.io/badge/codexplusplus-111827?style=flat-square">

| Lệnh | Việc |
|---|---|
| `chatgpt-layer install` | Vá ChatGPT và cài runtime. |
| `chatgpt-layer status` | Hiện version và trạng thái patch. |
| `chatgpt-layer debug` | Đường dẫn app, runtime, path, bridge. |
| `chatgpt-layer repair` | Vá lại sau khi app update. |
| `chatgpt-layer update` | Cập nhật Layer từ GitHub release. Self-update là opt-in (mặc định tắt). |
| `chatgpt-layer doctor` | Kiểm tra chữ ký, integrity, quyền. |
| `chatgpt-layer safe-mode` | Tắt hết tweak, không xóa. |
| `chatgpt-layer uninstall` | Gỡ loader, restore app khi an toàn. |
| `chatgpt-layer uninstall --purge` | Xóa luôn tweak, config, log, backup, user data. |
| `chatgpt-layer create-tweak` | Tạo folder tweak mới. |
| `chatgpt-layer validate-tweak` | Kiểm tra manifest và file entry. |
| `chatgpt-layer dev` | Link tweak local để dev. |
| `chatgpt-layer browser` | Mở UI ChatGPT trên browser host. |

## File nằm đâu <img alt="" src="https://img.shields.io/badge/paths-111827?style=flat-square">

Thư mục dữ liệu giữ nguyên từ loader gốc, nên tweak đang có không gãy.

| | Đường dẫn |
|---|---|
| Windows | `%APPDATA%\codex-plusplus\` |
| macOS | `~/Library/Application Support/codex-plusplus/` |
| Linux | `$XDG_DATA_HOME/codex-plusplus/` hoặc `~/.local/share/codex-plusplus/` |
| Tweaks | `<user-data>/tweaks/` |
| Runtime | `<user-data>/runtime/` |
| Bản Store ghi được (Windows) | `%LOCALAPPDATA%\codex-plusplus\store-apps\OpenAI.Codex\` |

## Tweak và Tweak Store <img alt="" src="https://img.shields.io/badge/store-3b82f6?style=flat-square">

Bỏ một folder vào `tweaks/` (manifest + file entry). Layer load tweak đang bật khi ChatGPT mở.

Tweak Store trong app đọc:

`https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/store/index.json`

Hiện chỉ có **Codex Accounts** (`me.lightharu.codex-accounts`) của LightHaru — đổi session ChatGPT từ menu avatar.

SDK vẫn `api.codex.*`. Thư mục trong máy vẫn tên `tweaks`. Tweak cũ không cần đổi tên.

Từ 1.1.2, tweak trên Store có GitHub Release mới (tag semver) thì Tweaks hiện **Update Available**. Từ 1.1.3, nút **Update** / **Install** chỉ cài `approvedCommitSha` ghi trong store — không phải bản latest chưa ghim trên GitHub Release. Tác giả vẫn cần cắt GitHub Release thì Layer mới phát hiện. Không tự cài im lặng: bạn bấm Update.

## Cập nhật và repair <img alt="" src="https://img.shields.io/badge/repair-4F8CFF?style=flat-square">

Update Store / app thường gỡ mất patch. Tắt hẳn `ChatGPT.exe` rồi chạy:

```sh
chatgpt-layer repair
```

Cập nhật Layer: `chatgpt-layer update`. Self-update Layer là opt-in, mặc định tắt (1.1.3). Repair sau khi app ChatGPT update vẫn chạy.

Cập nhật tweak (trên Store): badge trên sidebar Tweaks đếm số bản đang chờ. Vào Tweaks, bấm **Update** — Layer cài `approvedCommitSha` đã ghim trong `store/index.json`, không kéo tag latest chưa ghim.

## Bảo mật <img alt="" src="https://img.shields.io/badge/pin%201.1.4-111827?style=flat-square">

Tweak là code local không sandbox, chạy bên trong ChatGPT. Chỉ cài từ nguồn bạn tin.

Store Update/Install chỉ cài SHA đã ghim trong `store/index.json` (1.1.3). Self-update Layer là opt-in (mặc định tắt). IPC đặc quyền chỉ mở cho frame ChatGPT/Layer.

Xem [Security](SECURITY.md).

## Viết tweak <img alt="" src="https://img.shields.io/badge/SDK-4F8CFF?style=flat-square">

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

API vẫn `api.codex.*`. Hướng dẫn đầy đủ: [Writing Tweaks](docs/WRITING-TWEAKS.md). Tweak trên Store muốn Update trong app thì cần GitHub Release với tag semver, và store phải ghim `approvedCommitSha`.

## Tài liệu thêm <img alt="" src="https://img.shields.io/badge/docs-111827?style=flat-square">

- [Architecture](docs/ARCHITECTURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Writing Tweaks](docs/WRITING-TWEAKS.md)
- [Tweak API](docs/tweaks/api-reference.md)
- [Phát hành npm](docs/NPM-RELEASE.md)
- [Kiểm thử installer](docs/INSTALLER-TESTING.md)

## Cảm ơn <img alt="" src="https://img.shields.io/badge/based%20on%20Codex++-111827?style=flat-square">

ChatGPT Layer là dự án độc lập **dựa trên** [Codex++](https://github.com/b-nnett/codex-plusplus) của [Bennett](https://github.com/b-nnett) ([@b-nnett](https://github.com/b-nnett)) (MIT). Upstream đã archive; repo này tiếp tục công việc đó cho app ChatGPT desktop. Đây không còn là GitHub fork.

Giữ nguyên path dữ liệu và `api.codex.*` để tweak cũ vẫn chạy.

[Alex Naidis](https://github.com/TheCrazyLex) ([@TheCrazyLex](https://github.com/TheCrazyLex)) — siết quyền khi cài trên macOS.

LightHaru đang maintain ChatGPT Layer.

Discord cộng đồng (server của Bennett, không phải tên sản phẩm): [discord.gg/6bY6gGX36H](https://discord.gg/6bY6gGX36H).

## Giấy phép <img alt="" src="https://img.shields.io/github/license/LightHaru/chatgpt-layer?style=flat-square&color=111827">

[MIT](LICENSE).

