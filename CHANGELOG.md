# Changelog

All notable changes to ChatGPT Layer are documented here. The project is based on Codex++ (MIT).

This project uses semver for the installer, runtime, SDK, and published CLI package. Tweak authors should also use semver release tags so the manager can compare installed and available versions.

## Unreleased

### Changed

- README install docs lead with `npm install -g chatgpt-layer`; GitHub one-liners are the alternative.
- Cross-platform CI matrix: Ubuntu, macOS, and Windows x Node 20 and 22. POSIX rm of package dist dirs is replaced by an in-repo Node clean script. Test discovery no longer depends on shell glob expansion.
- Installer CLI package is registry-ready as `chatgpt-layer` 1.1.4: public metadata, SDK bundled into the published package, no unpublished workspace runtime deps.

### Security

- Enforce `TweakManifest.permissions` end-to-end as capability authorization (least privilege), not a process sandbox. Absent permissions stay legacy; a present list is strict; `[]` grants no optional capabilities. Historical `codex.windows` / `codex.views` aliases are preserved.

## 1.1.4

Release notes: [docs/releases/1.1.4.md](docs/releases/1.1.4.md)

Patch release: bugfixes, docs, refactor, and installer/formula retarget since 1.1.3.

### Added

- Capability-driven runtime compatibility layer for ChatGPT/Owl probing (PR #6, `6a92ebf`).

### Changed

- Homebrew formula retargets to `LightHaru/chatgpt-layer` (`037df7c`).
- Custom update-repo fallback in settings-injector defaults to `LightHaru/chatgpt-layer` (`44209c3`).
- Installer README URLs point at `LightHaru/chatgpt-layer` (`0d0f558`).
- Installer one-liners pin downloaded source to tag `v1.1.4` (`506dda0`, retargeted for this release).
- Split runtime `main.ts` into focused modules without changing behavior (PR #4, `878383a`).
- Watcher-health treats Layer self-update as opt-in (default off) and renames the diagnostic label (PR #5, `f3b015a`).

### Security

- Installer lockfile is fail-closed (`npm ci` only). CONTRIBUTING documents store SHA pinning (`f655b35`).

### Ghi chú

Formula và installer README trỏ LightHaru/chatgpt-layer. One-liner ghim source tag v1.1.4. Lockfile fail-closed (chỉ npm ci). Runtime main.ts tách module. Watcher-health: self-update Layer mặc định tắt. Compatibility layer theo capability (PR #6).

## 1.1.3

Release notes: [docs/releases/1.1.3.md](docs/releases/1.1.3.md)

Security pins that landed on main after 1.1.2, plus standalone product docs.

### Security

- Store Update/Install uses listed `approvedCommitSha` only.
- Layer self-update defaults off (opt-in). The auto-repair watcher only runs `repair` (no Layer self-update).
- Privileged IPC is gated to ChatGPT/Layer frames.
- `doctor` notes the Win/Linux asar integrity writer / fuse gap: sidecar writer is unimplemented and `EnableEmbeddedAsarIntegrityValidation` is left ON.

### Changed

- README is a standalone bilingual product page. Credits Codex++ (based on, MIT) after leaving the GitHub fork network.
- README visual pass (badges/icons).
- SECURITY.md and ARCHITECTURE.md match store pin + opt-in self-update (no longer advisory-only / silent hourly Layer updates).

### Fixed

- Renderer/preload bundle no longer pulls `node:crypto` via `tweak-store.ts` (CI build / esbuild).
- Watcher tests match repair-only behavior (CI tests).

### Ghi chú

README đứng độc lập, ghi công Codex++. Store Update chỉ cài SHA đã ghim. Self-update Layer mặc định tắt. Watcher chỉ repair, không self-update Layer. CI: crypto không vào preload; test watcher khớp repair-only.

## 1.1.2

Premium README, plus in-app GitHub Release updates for store-listed tweaks.

### Added

- Tweaks page: **Update Available** badge on the Tweaks nav, a banner when an installed store-listed tweak has a newer GitHub Release, and an **Update** button that installs from that release instead of only opening the URL.
- Tweaks sidebar badge counts those pending updates.
- Detection is store-listed tweaks only (current store listing: Codex Accounts). Authors must publish a GitHub Release with a semver tag.

### Changed

- README rewritten as a bilingual product page (English + Tiếng Việt): centered logo, badges, launch notes for `ChatGPT.exe`, commands, paths, Tweak Store, repair.

### Ghi chú

README mới song ngữ. Update tweak trong app chỉ áp dụng listing trên Store (hiện là Codex Accounts); tác giả cần cắt GitHub Release với tag semver thì Layer mới hiện nút Update.

## 1.1.1

Release notes: [docs/releases/1.1.1.md](docs/releases/1.1.1.md)

### Changed

- Tweak Store registry now lives in this repo (`store/index.json`) instead of Bennett GitHub Pages.
- Store listings were cleared; the only reviewed tweak is Codex Accounts 2.5.6.

## 1.1.0

Release notes: [docs/releases/1.1.0.md](docs/releases/1.1.0.md)

First ChatGPT Layer release. Forked from Codex++ 1.0.0 after upstream archived.

### Added

- CLI aliases `chatgpt-layer` and `cgl` (Windows shims included). `codexplusplus` still works.
- macOS discovery for `ChatGPT.app` (`com.openai.codex`).
- Desktop and Start Menu **ChatGPT Layer** shortcuts, plus the old `Codex++.lnk` for compatibility.

### Changed

- User-facing name is ChatGPT Layer. Settings sidebar group matches.
- Default install / self-update source is `LightHaru/chatgpt-layer`.
- Windows Store discovery matches package family `OpenAI.Codex` (publisher `2p2nqsd0c76g0`).
- Writable Store mirror lives at `%LOCALAPPDATA%/codex-plusplus/store-apps/OpenAI.Codex/` instead of a frozen versioned folder.
- Kept `%APPDATA%/codex-plusplus` (and macOS/Linux equivalents) and the `tweaks/` folder so existing installs and Codex Accounts keep working.

### Fixed

- Windows launchers no longer target the stub `Codex.exe` helper. They prefer `ChatGPT.exe`.
- Uninstall also removes `ChatGPT Layer.lnk`.

## 0.1.7

Release notes: [docs/releases/0.1.7.md](docs/releases/0.1.7.md)

### Changed

- Updated Settings sidebar injection for the current Codex Desktop Settings UI by scoring known Settings navigation labels instead of depending on the old `Back to app` label.
- Added a solid blue sidebar update pill that opens the Codex++ GitHub Releases page directly.
- Added a Tweak Store sidebar badge showing how many installed tweaks have newer approved versions available.
- Improved self-update command execution diagnostics by capturing stdout/stderr tails when dependency install, build, or repair commands fail.
- Made local macOS signing identity export/import use a generated PKCS#12 password and redact that secret from command failures.
- Documented the safe-mode exit command in CLI help and kept blank `codexplusplus` invocations mapped to help output.

### Fixed

- Fixed Windows installs against Codex builds whose main-process window-services factory has reordered or quoted object properties.
- Fixed Windows uninstall cleanup so Codex++ removes Explorer context-menu entries it created.
- Fixed uninstall cleanup on installs that were previously run with elevated permissions by repairing ownership before removing runtime files.
- Kept macOS signing ad-hoc by default and added `--local` as an opt-in stable local signing identity for install and repair.
- Added detailed window-services hook diagnostics that report scanned candidate bundles, matched fingerprints, parser errors, and nearby source snippets when Codex changes its internals again.
- Broadened recovered Vite main-bundle scanning to include `main.js` and `main.*.js` layouts.
- Retried and best-effort cleaned temporary unpacked asar directories after patching.
- Removed Codex startup/composer performance patching from the installer.

## 0.1.5

Release notes: [docs/releases/0.1.5.md](docs/releases/0.1.5.md)

### Added

- Added the reviewed Tweak Store with pinned approved commits.
- Added Tweak Store platform compatibility labels.
- Added store card icons and version badges showing installed and latest approved versions.

### Changed

- Tweak Store approval now relies on store icons instead of screenshot submissions.
- Updated Bennett's UI Improvements in the store registry to `0.1.5`.
- Changed macOS repair guidance to direct users to `codexplusplus repair` from Terminal when the background watcher is blocked.

### Fixed

- Made the auto-repair watcher run Codex++ self-update and app repair as separate steps, then open a Terminal repair fallback when macOS blocks background app modification.

## 0.1.4

Release notes: [docs/releases/0.1.4.md](docs/releases/0.1.4.md)

### Added

- Added Microsoft Store / WindowsApps Codex detection and patch support.
- Added Bun global install support with a first-run bootstrap command.
- Added dedicated macOS App Management permission alerts with an Open Settings action.

### Changed

- Improved auto-repair watcher retries after Codex updates and reduced repair checks to a 5-minute interval.
- Kept Codex++ release checks throttled to hourly while allowing app repair checks to run more often.
- Made Codex.app settle detection depend only on patch-critical inputs.
- Made blank `codexplusplus` invocations show help instead of a command error.

### Fixed

- Fixed Windows install dependency execution by using `npm.cmd`.
- Fixed Windows Store installs by mirroring locked app resources into a writable managed location.
- Fixed Windows renderer tweak settings.
- Fixed Homebrew command wrappers, executable permissions, reinstall conflicts, and formula tests after self-update.
- Fixed macOS App Management alert text and guidance.

## 0.1.3

Release notes: [docs/releases/0.1.3.md](docs/releases/0.1.3.md)

### Added

- Added hourly Codex++ self-update checks through the watcher.
- Added automatic Codex++ runtime download/build/repair when a newer Codex++ release is available.
- Added restart prompts when Codex is open and needs to reload a freshly updated Codex++ runtime.
- Added visible Codex update mode status while the official Codex updater is running.
- Added Codex beta app metadata support for watcher health checks and repair state.
- Added Markdown rendering for latest Codex++ release notes in Settings.
- Added GitHub issue links to unexpected CLI failure output.

### Changed

- Made Codex update repair alerts faster, clearer, and Codex-branded on macOS.
- Capped Codex++ runtime, loader, and watcher logs at 10 MB.
- Removed bundled example tweak sources from the Codex++ release package. Default tweaks now come from their own release channels.
- Updated the Codex++ Config subtitle to show the installed Codex++ version.
- Fixed Homebrew install instructions.

### Fixed

- Fixed negated installer flags such as `--no-default-tweaks`.
- Fixed the repair flow to avoid unnecessary re-signing when the patch is already intact.
- Fixed Codex beta metadata detection so beta installs report watcher health correctly.

## 0.1.2

Release notes: [docs/releases/0.1.2.md](docs/releases/0.1.2.md)

### Fixed

- Fixed enabling a previously disabled `scope: "main"` or `scope: "both"` tweak from Settings so the main-process half starts immediately instead of requiring Force Reload or an app restart.
- Fixed disabling a main-process tweak from Settings so loaded main-side tweak state is stopped before renderer hosts reload.
- Fixed macOS update self-repair after Codex changed its minified window-services startup shape in version `26.429.20946`, and moved that patcher to a more resilient fingerprint-based hook.
- Fixed the launchd watcher writing unusable TypeScript source paths such as `src/cli.js`, and refreshed it with modern `launchctl bootstrap` registration.

### Added

- Added `create-tweak`, `dev`, `validate-tweak`, and `safe-mode` installer commands for local tweak development and recovery.
- Added manifest validation helpers, permissions metadata, and optional tweak-provided MCP server declarations to the SDK.
- Added automatic Codex MCP config sync for enabled tweaks with `manifest.mcp`.
- Added an Auto-Repair Watcher health card to the Codex++ Config page.
- Added regression tests for tweak enable/disable reload behavior, tweak discovery, and tweak storage.
- Added CI coverage for tests and builds.
- Added macOS system alerts when update repair fails, a GitHub issue report action, and a post-update restart prompt when Codex is already open without Codex++ loaded.

## 0.1.1

### Added

- Added a native Codex window bridge for main-scope tweaks.
- Tweaks can now create Codex-registered chat windows for routes such as `/local/<conversation-id>`, which enables split-screen chat tweaks to render the real Codex chat UI instead of transcript clones or unregistered BrowserViews.
- The installer now exposes Codex's internal window services to the Codex++ runtime during asar patching.
- Added `codexplusplus` as the preferred CLI command, while keeping `codex-plusplus` as an alias.
- Added `codexplusplus update` / `codexplusplus self-update` to refresh Codex++ from GitHub source, rebuild it, and run `repair`.
- Added `codexplusplus update-codex` for macOS Sparkle updates. It restores a signed Codex.app before the official updater runs, then lets the watcher reapply Codex++ after Codex restarts.
- Added a native Windows PowerShell bootstrap script, `install.ps1`.
- Added `update.sh` and `update.ps1` helper scripts for users whose shell does not yet have `codexplusplus` on PATH.
- Added Homebrew formula scaffolding and Bun/global-install metadata so `codexplusplus` can be installed as a normal command.

### Fixed

- Fixed the GitHub source installer failing on clean machines when `npm ci` rejects an out-of-sync workspace lockfile.
- The source installer now installs dependencies with `npm ci --workspaces --include-workspace-root --ignore-scripts`.
- If the downloaded lockfile is stale, the installer now removes only that temporary lockfile and falls back to `npm install --workspaces --include-workspace-root --ignore-scripts`.
- Fixed fallback installs missing workspace dependencies such as `electron`, `chokidar`, or `@codex-plusplus/sdk`.
- Fixed Windows install preflight using the macOS-only `Contents` bundle path.
- Expanded Windows app discovery to cover common Squirrel and Electron install locations.
- Hardened Windows scheduled-task repair command quoting.
- Improved installer prerequisite and failure messages with human-readable `[!]` errors.

### Changed

- Source bootstrap installs local CLI shims into a writable PATH directory when possible, so users can run `codexplusplus repair`, `codexplusplus status`, and `codexplusplus update` after the first install.
- macOS installs now preserve a signed Codex.app backup when available, which supports safer official Codex updates.
- Settings injection now hides Codex++ settings surfaces more cleanly when leaving settings.

## 0.1.0

- Initial alpha release.
- One-command GitHub installer via `install.sh`; no npm package or `npx` dependency.
- Runtime-loaded local tweaks with Settings integration.
- App-update repair watcher for re-patching Codex after app updates, using the locally installed CLI.
- Codex++ release checks through GitHub Releases.
- Default tweak seeding from Bennett UI Improvements and Custom Keyboard Shortcuts GitHub release channels, with `--no-default-tweaks`.
- Review-only tweak update checks via required `githubRepo` manifest metadata.
- In-app tweak manager with enable/disable, config, release links, and maintenance actions.
