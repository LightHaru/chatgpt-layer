# Installer lifecycle testing

Maintainer notes for ChatGPT Layer installer integration tests. User-facing CLI behavior is unchanged.

## What the installer actually does

Commands live in `packages/installer/src/commands/`. They are not a formal state machine. `state.json` is a record of the last successful install/repair.

### Paths

User data comes from `userPaths()` / `ensureUserPaths()` in `src/paths.ts`:

| Platform | Default root |
|---|---|
| macOS | `~/Library/Application Support/codex-plusplus` |
| Windows | `%APPDATA%\\codex-plusplus` |
| Linux | `$XDG_DATA_HOME/codex-plusplus` or `~/.local/share/codex-plusplus` |

Layout under that root: `runtime/`, `tweaks/`, `backup/`, `config.json`, `state.json`, `update-mode.json`, `self-update-state.json`, `bin/`, `log/`.

`CODEX_PLUSPLUS_HOME` already overrides the user-data root. Integration tests set it to a temp directory. It is an existing internal override, not a new production switch.

App discovery is `locateCodex(--app)` in `src/platform.ts`. Tests always pass `--app` at a synthetic fixture so default locations (`/Applications`, `%LOCALAPPDATA%`, `/opt/codex-desktop`, real HOME) are never used.

### Install (`install.ts`)

1. Locate the app (`--app` or platform defaults).
2. Preflight: system tools (macOS `codesign`/`plutil` when needed), app not running (macOS will quit; Win/Linux throw), writable asar/resources.
3. `ensureUserPaths()`, install CLI shims into `<user-data>/bin` (and, in production, into a writable PATH dir).
4. Backup:
   - `backupOnce(app.asar -> backup/app.asar)` copies only if the backup **does not already exist**.
   - If the current asar already has the Layer patch marker (`package.json` `main === "codex-plusplus-loader.cjs"` or `__codexpp`), install **does not** snapshot it as the original backup. That would poison uninstall restore.
   - macOS full-app `Codex.app` backup via `ditto` only when the app is unpatched **and** `codesign` reports a valid signature.
5. Stage runtime from **built** `packages/installer/assets/runtime/` (copied at package build by `scripts/copy-assets.mjs`). Dev fallback is `packages/runtime/dist`.
6. `patchAsar`: rewrite `package.json#main` to `codex-plusplus-loader.cjs`, copy `assets/loader.cjs` into the asar, patch the window-services factory fingerprint. Already-patched asars keep `__codexpp.originalMain` and recopy the loader (idempotent, not nested).
7. Update `ElectronAsarIntegrity` on macOS. Fuse flip is macOS-only and skipped when `--no-fuse` or the framework binary is missing.
8. Re-sign on macOS unless `--no-resign`.
9. Install the auto-repair watcher unless `--no-watcher`. Tests set `--no-watcher` and `CODEX_PLUSPLUS_DISABLE_WATCHER=1`.
10. Write `state.json` (hashes, app root, original entry, watcher kind, version).

### Repair (`repair.ts`)

Repair is install rerun with extra short-circuits:

- No `state.json`: warns and runs a fresh install.
- If the current asar header hash still matches `state.patchedAsarHash`:
  - Newer Layer version may restage runtime (respects `config.json` `codexPlusPlus.autoUpdate`).
  - If `runtime/main.js` is missing, repair **falls through** to install instead of claiming "already intact".
  - Otherwise prints "Patch already intact."
- macOS waits for Sparkle update files to settle; skipped on Win/Linux.
- Update-mode (`update-mode.json`) can leave a signed app unpatched while an official updater runs. Tests do not enable that file.
- Tweaks and `config.json` are never deleted.

### Uninstall (`uninstall.ts`)

1. Locate app from `--app` or `state.appRoot`.
2. Refuse if the app process is running.
3. `chooseRestorePlan`:
   - Skip restore if the current asar does not look patched (no marker and hash is not `patchedAsarHash`). This includes "already original" and "upstream replaced the app".
   - macOS prefers a full `backup/Codex.app` when that tree looks usable.
   - Otherwise restore `backup/app.asar` (and unpacked/plist/framework if present).
   - Missing backup while the app is still patched **throws** (`No backup found`). It does not invent a restore.
   - Partial restore after a recorded Codex version change **throws**.
4. `uninstallWatcher()` plus Windows managed-artifact cleanup.
5. Delete `runtime/` and `state.json` only. Tweaks, config, logs, backups, and `tweak-data/` stay. `--purge` deletes the entire user-data root.

That last point is current semantics. Tests assert it. Do not silently change uninstall to delete tweaks.

### Status / doctor

Both print to stdout. There is no structured JSON API. Tests match a few tokens (`Not installed`, `matches patched`) and do not snapshot full strings.

`readState` returns `null` for a missing or malformed `state.json` (invalid JSON is not installed).

### Watcher

Production:

- macOS: `~/Library/LaunchAgents/com.codexplusplus.watcher.plist` plus launchctl
- Linux: `~/.config/systemd/user/codex-plusplus-watcher.{service,timer,path}` plus systemctl --user
- Windows: Task Scheduler `codex-plusplus-watcher*`

`CODEX_PLUSPLUS_DISABLE_WATCHER=1` (internal/test-only) makes `installWatcher` return `"none"` and skips uninstall/Windows cleanup host calls. Never set this in production.

## Test-only overrides

| Variable / flag | Production default | Tests |
|---|---|---|
| `CODEX_PLUSPLUS_HOME` | unset (platform user-data) | temp `<testRoot>/user-data` |
| `CODEX_PLUSPLUS_DISABLE_WATCHER=1` | unset | set; no launchd/systemd/schtasks |
| `CODEX_PLUSPLUS_DISABLE_PATH_SHIMS=1` | unset | set; CLI shims stay in `<user-data>/bin` |
| `--app` | auto-detect real ChatGPT/Codex | synthetic fixture only |
| `--no-watcher --no-fuse --no-resign` | watcher/fuse/resign on where applicable | always for integration |

CLI children also get a fake `HOME` / `APPDATA` / `LOCALAPPDATA` / `PATH` so a spawned `dist/cli.js` cannot see a real ChatGPT install.

Do not introduce production defaults that point at test roots.

## Fixtures

`packages/installer/test/helpers/fake-chatgpt-app.ts` builds a tiny deterministic asar with `@electron/asar` at runtime:

- `package.json` `main: "main.js"`
- synthetic `main.js` with window-services fingerprints (not ChatGPT source)
- `unrelated-keep.txt` inside the asar and at the app root

Layout matches the host OS (`ChatGPT.app` on macOS, `ChatGPT.exe` plus `resources/app.asar` on Windows, `Codex` plus `resources/app.asar` on Linux). No copyrighted ChatGPT files are committed.

Helper states (test-only, not production): `CLEAN`, `INSTALLED`, `BROKEN_PATCH`, `BROKEN_RUNTIME`, `REPAIRED`, `UNINSTALLED`.

Runtime files used by install come from `packages/installer/assets/` (the built copy), never a second hand-copied tree.

## Layout

- `packages/installer/test/integration/install-lifecycle.test.ts`
- `packages/installer/test/integration/repair.test.ts`
- `packages/installer/test/integration/uninstall.test.ts`
- `packages/installer/test/helpers/fake-chatgpt-app.ts` (not `*.test.ts`)

`scripts/run-tests.mjs` recurses `packages/*/test/**/*.test.ts` so `npm test` runs this suite on the CI matrix (ubuntu/mac/windows x Node 20/22), offline.

## Coverage

- Fresh install invariants, idempotent re-install, backup not overwritten with a patched asar
- Status after install / after uninstall
- Repair after original asar restore, loader strip, missing runtime, upstream app.asar replacement
- Uninstall restore, tweak preservation, `--purge`, second uninstall
- Partial/corrupt: state without patch, patch without runtime, backup vs changed app, state -> missing app, malformed state, patch already present
- Failure injection: malformed asar, unwritable asar, runtime copy dest is a file, patchAsar write fail, missing backup
- Path audit: writes stay under the fake app root / fake user-data / temp test root
- CLI smoke against `packages/installer/dist/cli.js` with fixture `--app`

## Known limitations

- Tests do not launch a real Electron ChatGPT process.
- macOS full-app `ditto` backup and codesign are not exercised on Linux CI; `--no-resign` is used everywhere.
- `status`/`doctor` have no machine-readable API; assertions are token-based.
- Uninstall without `--app` after state is gone still auto-detects a real app (production behavior). Tests always pass `--app`.
- Self-update, Store v2, Trusted Publishing, tweak permissions, `api.codex.*`, IPC `codexpp:*`, and `approvedCommitSha` are out of scope.

## Bugs fixed with this suite

- Re-install of an already-patched asar no longer snapshots that patched copy as `backup/app.asar`.
- Re-install preserves `state.originalAsarHash` (from prior state or the existing backup) instead of recording the patched hash as "original".
- `patchAsar` and uninstall restore call `@electron/asar`'s `uncache` after replacing `app.asar` in place. Without that, same-process `extractFile`/`extractAll` (and therefore `hasCodexPlusPlusAsarMarker`) read the old header against new bytes.
- Repair no longer reports "Patch already intact" when the asar hash matches but `runtime/main.js` is missing; it restages runtime.
