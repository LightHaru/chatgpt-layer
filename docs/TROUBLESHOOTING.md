# Troubleshooting

## "Codex is damaged and can't be opened" / Gatekeeper rejection

The re-sign step failed or was skipped. Run:

```sh
codex-plusplus doctor
```

If the signature check fails, manually re-sign:

```sh
codex-plusplus repair --force
xattr -dr com.apple.quarantine /Applications/Codex.app
```

On macOS, Codex++ signs ad-hoc by default. `codex-plusplus install --local`
or `codex-plusplus repair --local` opts into a local "Codex++ Local Signing"
identity, but that can involve Keychain access prompts.

## App launches but nothing about codex-plusplus appears

1. Open DevTools (View menu) and look for `[codex-plusplus]` lines.
2. Check `~/Library/Application Support/codex-plusplus/log/loader.log`.
3. If empty, the loader is not being executed → integrity check failed and the app silently fell back. Run `codex-plusplus repair`.

## Codex auto-updated and the patch is gone

The watcher should normally re-apply the patch automatically. To force it immediately, run:

```sh
codex-plusplus repair
```

Check the watcher is installed:

```sh
launchctl list | grep codexplusplus      # macOS
systemctl --user status codex-plusplus-watcher  # Linux
schtasks /Query /TN codex-plusplus-watcher       # Windows
```

## "Tweaks" tab doesn't appear in Settings

Codex's Settings markup may have changed. The injector's heuristics need an update. As a workaround:

1. Open DevTools, run `document.querySelectorAll('[role=dialog]')` while Settings is open. If nothing matches, the dialog uses different attributes — please file an issue with the markup snippet.
2. Until fixed, your tweaks still load (check the console). Their settings sections just have no UI to attach to yet.

## Tweak fails to load

Check the renderer console:

```
[codex-plusplus] tweak load failed: <id> <error>
```

Common causes:

- `manifest.json` not valid JSON
- Missing `id`/`name`/`version` fields
- Entry script throws during `require`
- ESM-style `export default` in a `.js` file (use `.mjs` or `module.exports`)

## Uninstall is incomplete

The uninstaller only restores files we backed up at install time. If you've upgraded `codex-plusplus` and the original app version no longer matches, the restored backup may be stale. Either:

- Reinstall Codex from a fresh download
- Or `codex-plusplus install` against the new Codex, then `uninstall`

## I want to start fresh

```sh
codexplusplus uninstall --purge
```

This removes the runtime, watcher, tweaks, config, logs, backups, and Codex++ user data. Then reinstall Codex.app from the official download.
