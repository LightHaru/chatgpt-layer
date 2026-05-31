# Distribution and Debugging

## Release Checks

Every tweak must declare `githubRepo` in `owner/repo` form. Codex++ checks
GitHub Releases at most once per day per installed tweak:

- Current version comes from `manifest.version`.
- Latest version comes from the latest release tag.
- Tags are compared as semver with optional leading `v`.
- If newer, Settings -> Tweaks shows update UI linking to the GitHub release.

Codex++ does not auto-install arbitrary tweak releases.

## Tweak Store

Store-approved tweaks are pinned to reviewed commit SHAs in `store/index.json`.
Store installs validate the downloaded manifest against the approved entry and
write `.codexpp-store.json` metadata into the installed tweak folder.

When updating a store tweak, Codex++ checks whether local files differ from the
approved baseline. If they do, it refuses to auto-update and asks the user to
resolve local changes.

## Useful Commands

```sh
codexplusplus create-tweak ./my-tweak --id com.you.my-tweak --name "My Tweak" --repo you/my-tweak
codexplusplus validate-tweak ./my-tweak
codexplusplus dev ./my-tweak
codexplusplus status
codexplusplus doctor
codexplusplus debug
```

## Logs

| Log | Contents |
|---|---|
| `<userRoot>/log/main.log` | main runtime, main tweaks, MCP sync, store install. |
| `<userRoot>/log/preload.log` | renderer preload, renderer tweaks, settings injector. |
| `<userRoot>/log/loader.log` | loader startup before runtime handoff. |

Renderer logs also appear in DevTools with `[codex-plusplus]` prefixes.

## Debugging Renderer Tweaks

- Filter DevTools console for `[codex-plusplus]`.
- Prefer `api.log.info()` for persistent logs.
- Use `api.react.waitForElement(selector, timeoutMs)` instead of patching before
  Codex has rendered.
- Add `data-*` markers to DOM you inject.
- Make DOM patches idempotent.
- Handle missing selectors as a no-op.

## Debugging Main Tweaks

- Check `<userRoot>/log/main.log`.
- Wrap long-running startup work in `try/catch` and log errors.
- Ensure IPC handlers do not throw unstructured values.
- Stop external processes and flush resources from `stop()`.

## Compatibility Rules

- Set `scope` explicitly.
- Keep renderer bundles dependency-light.
- Prefer settings pages/sections for user-facing controls.
- Prefer Codex design tokens over hard-coded colors.
- Treat React fiber APIs as unstable.
- Keep selectors defensive and support no-op failure.
- Clean up listeners, observers, styles, intervals, and DOM in `stop()`.
- Never write outside your tweak data directory unless the user explicitly opted
  into that behavior and your manifest declares the capability.
