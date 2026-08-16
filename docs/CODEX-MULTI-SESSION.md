# Multi-session foundation (MS-1)

Layer-owned isolated Codex child-process primitives. Dormant by default.
Single-session ChatGPT Desktop behavior is unchanged.

## 1. Purpose

Give ChatGPT Layer a safe place to *own* extra Codex/CLI homes as isolated
child processes, without replacing ChatGPT Desktop's live session and without
pretending Layer can multiplex the existing app-server connection.

MS-1 is the storage + process-lifecycle foundation. It is not a second ChatGPT
window, not a `hostId` route, and not Smart Routing.

## 2. Goals

- Stable opaque session identity (`session_` + 24 hex chars).
- Isolated filesystem layout under Layer's user-data root.
- In-memory lifecycle: `STOPPED` → `STARTING` → `RUNNING` → `STOPPING` → `STOPPED` / `FAILED`.
- MS-2A invariant: one session = one Layer-owned Codex app-server child. The transport registry attaches to that session; it does not spawn a second process. Production app-server spawn stays BLOCKED.
- Trusted-executable spawn only. Tweaks cannot pass argv, shell, env maps, or paths.
- Read-only tweak API: `api.codex.sessions.list()` and `getStatus(id)`, gated by `codex-sessions`.
- Bounded shutdown of live children on `will-quit`.
- Fail closed when the trusted Codex executable cannot be resolved.

## 3. Non-goals

- Do **not** replace the ChatGPT/Codex desktop binary.
- Do **not** stand up a localhost HTTP server or proxy.
- Do **not** implement Smart Routing or sticky threads.
- Do **not** migrate Codex Accounts 2.x automatically.
- Do **not** touch `~/.codex` or copy `auth.json` / tokens.
- Do **not** auto-start sessions at boot.
- Do **not** expose spawn, raw `ChildProcess`, pid, stdout, env, or credentials to tweaks.
- Do **not** implement sessions as extra Codex windows, views, or `hostId` routes.

## 4. Current single-session architecture

ChatGPT Layer is an Electron preload/main injection into ChatGPT Desktop. It
does **not** spawn Codex CLI today and does **not** own the app-server
connection. Codex/ChatGPT Desktop owns the live session. Layer probes Owl /
Electron window services, CDP, and native helpers.

The desktop app talks to its own app-server. Layer sits beside that process; it
does not intercept or route that traffic.

## 5. Planned multi-session

| Piece | MS-1 | Later |
|---|---|---|
| Isolated `CODEX_HOME` / sqlite home | yes | — |
| Child process lifecycle | yes (dormant) | UI to start/stop |
| Tweak read API | `list` / `getStatus` | maybe richer status |
| App-server interception | **no** | MS-2B blocker (Desktop live connection) |
| Layer-owned app-server transport | MS-2A core (fail-closed in production) | proven child invocation |
| Sticky thread ownership | MS-2A store + simple router | Smart Routing |
| Smart Routing | no | later |
| Accounts migration | no | copy later, atomically |

Architectural comparison:

- **Reference Router:** copied/patched app + Codex wrapper/multiplexer in front
  of the real CLI/app-server.
- **ChatGPT Layer:** existing runtime host + capability-controlled multi-session
  *primitives*. Layer does not wrap ChatGPT's connection in MS-1.

## 6. Process model

`CodexSessionManager` holds an in-memory lifecycle map plus disk metadata.
`CodexProcessLauncher.launch(intent)` is the only spawn path.

Intent is session-level only:

```ts
{ sessionId, codexHome, sqliteHome }
```

Tweaks cannot pass executable, shell, args, or env maps. Production
`createNodeCodexProcessLauncher` spawns `exe` with `[]` args, an isolated env
allowlist, `stdio: ["ignore","pipe","pipe"]`, and `windowsHide: true`.

If `resolveTrustedCodexExecutable` returns `null`, `startSession` fails closed
with `trusted Codex executable is not available`. That is an expected MS-1
limitation: Layer does not ship or replace Codex.

Stdout/stderr are drained and discarded. Child output is never written to
`session.json`.

## 7. Stable identity

Primary identity is **never** an email, label, or filesystem path.

- Format: `session_` + 24 lowercase hex characters (12 random bytes).
- Regex: `/^session_[a-f0-9]{24}$/`
- Labels are display-only and can be renamed independently of the id.
- Path traversal, absolute paths, UNC, drive letters, and emails are rejected.

## 8. Isolated filesystem layout

Under `CODEX_PLUSPLUS_USER_ROOT` (injected as `userRoot`; session modules must
not import `runtime-paths.ts`):

```text
<userRoot>/codex-sessions/          empty until a session is created
  accounts/<session_id>/
    session.json                    metadata only
    codex-home/                     CODEX_HOME for that child
    sqlite-home/                    CODEX_SQLITE_HOME for that child
```

Session state must stay below the **real** Layer `userRoot`. `userRoot` itself
may resolve through a user-selected symlink (`CODEX_PLUSPLUS_HOME`
compatibility). Structural descendants must not:

- `<userRoot>/codex-sessions`
- `<userRoot>/codex-sessions/accounts`

If either path exists as a symlink or directory junction, session code **fails
closed**: it does not follow the link, write through it, remove through it, or
repair it by deleting the outside target. After `mkdir` of a missing structural
dir, the path is re-`lstat`ed (TOCTOU). A session directory that is itself a
symlink is also refused.

Lexical `resolve()` alone is not the containment proof. Existing structural
dirs are `lstat`ed, then `realpath`ed, and must be strictly inside
`realpath(userRoot)` (or `resolve(userRoot)` if it does not exist).

Deletion independently re-validates the layout, refuses symlink session dirs
without following them, refuses `userRoot`, `tweak-data`, `HOME`, `APPDATA`,
and `~/.codex`, and never deletes sibling sessions.

`createSession` does not create or copy `~/.codex`.

## 9. Lifecycle

| State | Meaning |
|---|---|
| `STOPPED` | No child. Safe default after boot. |
| `STARTING` | Launch in flight. |
| `RUNNING` | Child is alive. |
| `STOPPING` | SIGTERM, then SIGKILL after timeouts. |
| `FAILED` | Launch failed or unexpected exit. |

Rules:

- Unknown id throws.
- Disabled sessions cannot start. Disable while `RUNNING` is a flag only.
- Double start throws `session already starting/running`.
- Stop on `STOPPED` is a safe no-op.
- Stop with no child on `FAILED` stays `FAILED`.
- `removeSession` of a live session is rejected unless `forceStop`.
- `restartSession` is stop then start.
- Unexpected exit while `STARTING`/`RUNNING` → `FAILED` with `lastExit.reason: "unexpected"` (timestamp, code, signal only).
- Per-session in-flight promises plus synchronous state checks prevent double-start races.

MS-1 does not auto-start anything. Boot leaves the map dormant (`STOPPED`).

## 10. Renderer / main trust

Session mutation (create/start/stop/remove) lives in the main process.
Renderer tweaks see only IPC-proxied `list` and `getStatus`.

Those channels are:

- listed in `TWEAK_CAPABILITY_IPC_CHANNELS` mapped to `codex-sessions`
- listed in `PRIVILEGED_IPC_CHANNELS`
- registered with `privilegedHandle` + `assertAuthorizedTweak`

There is no broad `invoke(anything)` session channel. `getStatus` accepts only
`(tweakId, sessionId string)` and rejects extra payload properties.

Renderer-safe status never includes pid, `ChildProcess`, stdout, env, or paths.

## 11. Tweak permission

Permission name: `codex-sessions`.

`codex-sessions` is **explicit opt-in**. It is never implied by an omitted
`permissions` field.

- omitted permissions → legacy historical capabilities remain allowed;
  `codex-sessions` is denied
- `[]` → none, including `codex-sessions`
- explicit list → only listed capabilities (`codex-sessions` only if named)

Public API:

```ts
api.codex.sessions.list(): Promise<CodexSessionMetadata[]>
api.codex.sessions.getStatus(id: string): Promise<CodexSessionStatus>
```

Denied calls throw `tweak <id> must declare codex-sessions permission`.

## 12. Future routing

MS-1 does **not** route ChatGPT traffic. MS-2A adds a Layer-internal transport
and simple sticky-thread core; it still does **not** intercept ChatGPT Desktop's
live app-server connection (that is MS-2B).

See [Codex app-server transport (MS-2A)](./CODEX-APP-SERVER.md).

## 13. Sticky-thread core (MS-2A)

`ThreadOwnerStore` persists `threadId → sessionId` at
`<userRoot>/codex-sessions/thread-owners.json`. `CodexSessionRouter` assigns new
threads to an explicit (or test-selected) RUNNING session and routes existing
threads to the recorded owner. There is **no** quota scoring, **no** failover
migration, and **no** Smart Routing.

## 14. Failure handling

- Missing trusted executable → launch-failed / `FAILED`.
- Spawn error → `FAILED`, `lastExit.reason: "launch-failed"`.
- Unexpected child exit → `FAILED`, `lastExit.reason: "unexpected"`.
- Metadata reads allowlist known keys only (`stripCredentials`) so a poisoned
  `session.json` cannot surface tokens to tweaks.
- Logs may include session ids and lifecycle, never env values, tokens, or child output.

## 15. Shutdown

On `app.on("will-quit")`, after existing tweak/native/view cleanup:

- If no live children, return.
- Otherwise `preventDefault` once, `shutdownAll` with a ~3s bound, then
  `app.quit()`. Never hang forever.

`shutdownAll` stops live children, removes listeners, and clears timers.

## 16. Cross-platform

Path checks `lstat` structural dirs (Node reports Windows junctions as
symbolic links) and require realpaths to stay strictly inside the real
`userRoot`. Absolute/`..` relatives are rejected. Windows drive letters and
UNC ids fail `assertSessionId`. Spawn uses `windowsHide: true`. Isolated env
copies `PATH`, `HOME`, `USERPROFILE`, `SYSTEMROOT`, `WINDIR`, `TEMP`, `TMP`,
`LANG`, `LC_ALL` plus `CODEX_HOME` and `CODEX_SQLITE_HOME`.

Trusted executable search is a conservative relative list under
`resourcesPath` / `appPath` (and Darwin `Contents/Resources`). Absence is
`null`, not an installer requirement.

## 17. Backward compatibility

- Version stays `1.1.4`.
- Existing `api.codex` fields remain required.
- No sessions are created at boot, so ChatGPT single-session behavior is unchanged.
- `codex-sessions/` is absent until something creates a session.
- Legacy tweaks that omit `permissions` keep historical APIs. The new
  `codex-sessions` API is explicit opt-in and stays denied unless declared.

## 18. Codex Accounts 2.x migration

**No auto-migration in MS-1.** Preserve `~/.codex/auth_accounts` if present.
A later copy, if any, must be atomic and must never log tokens. This tree does
not modify LightHaru/codex-plusplus-accounts.

## 19. Security

- Opaque ids; never email/path identity.
- Strict containment under the real `userRoot`; structural session dirs must
  not be symlinks or directory junctions.
- Deletion refuse-list: user root, tweak-data, HOME, APPDATA, `~/.codex`.
- Isolated env allowlist; no caller-supplied env.
- No tweak-supplied executable.
- No tokens, `auth.json`, `OPENAI_API_KEY`, or cookies in metadata.
- `stripCredentials` allowlist on read.
- Capability IPC + privileged sender checks.
- Guest frames cannot invoke session channels.

This is capability authorization, not a process sandbox. Tweaks remain local
code. Main authorizes when a tweak identity is present.

## 20. Known limitations

- Trusted Codex executable may be unresolved; `startSession` then fails closed.
- Layer does not own ChatGPT's live Desktop app-server (MS-2B blocker).
- Production Layer-owned app-server child invocation is **BLOCKED** until proven.
- No Smart Routing or Accounts import.
- Public tweak API is read-only; create/start/stop are main-process only.
- MS-1 child stdout is discarded; MS-2A protocol stdio is Layer-internal only.
- MS-1 is dormant: nothing starts unless main code calls `startSession`.

## 21. MS-2 follow-ups

- Prove the real bundled Codex app-server argv/framing against ChatGPT Desktop.
- MS-2B: observe or proxy Desktop's live app-server without replacing binaries.
- Optional UI to create/start/stop sessions.
- Atomic Accounts copy into a session home (never log tokens).
- Smart Routing and quota-aware failover — only after a proven transport exists.
