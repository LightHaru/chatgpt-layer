# Codex app-server transport (MS-2A)

Layer-internal JSONL app-server client, request correlation, thread-owner
store, and **simple** sticky-thread routing. Not Smart Routing. Not Accounts.
Not ChatGPT Desktop interception.

Status labels used below: **PROVEN** / **REFERENCE** / **TEST-ONLY** /
**PLANNED** / **BLOCKED**.

## 1. Scope

MS-2A gives ChatGPT Layer a place to *speak* the Codex app-server protocol to
**Layer-owned** isolated children (MS-1 sessions), and to remember which
session owns which thread.

It does **not**:

- intercept ChatGPT Desktop's live app-server connection (MS-2B)
- replace bundled `codex`, create `codex.real`, wrap the exe, or re-sign
- stand up a localhost HTTP control server
- expose `api.codex.sessions.request`, `rpc`, `appServer.send`, or `spawn`
- migrate `~/.codex` / Accounts
- auto-start sessions or change the ChatGPT single-session default

Public tweak API remains `api.codex.sessions.list()` / `getStatus(id)` gated by
explicit `codex-sessions`. Transport is Layer-internal only.

## 2. Architecture discovered

**PROVEN (this repo, MS-1):**

- Layer injects `runtime/main.js` before ChatGPT's original Electron/Owl main.
- Isolated session homes live under `<userRoot>/codex-sessions/accounts/<session_id>/`.
- `CODEX_HOME` and `CODEX_SQLITE_HOME` are set on Layer-owned children.
- Production MS-1 spawn uses **empty argv** and **drains** stdout/stderr.
- Trusted exe search is a conservative relative list; absence returns `null`.

**REFERENCE (b-nnett/codex-subscription-router, concepts only — not copied):**

- ChatGPT Desktop opens **one** JSON-RPC-like app-server stdio connection.
- The router replaces bundled `codex` with a mux and keeps `codex.real`.
- Interactive mode is detected when argv contains `app-server`.
- Framing is newline-delimited JSON (`{id,method,params,result,error}`, no
  required `jsonrpc` field). stderr is diagnostics.
- Handshake: client `initialize` request, then `initialized` notification.
- New chats: `thread/start`. Follow-ups carry `params.threadId`.
- Thread id from `result.thread.id` / `params.threadId` / `thread/started`.
- Sticky owner map in the mux state file. Quota scoring + failover are
  **not** implemented here.

**PROVEN (official Codex upstream, not Desktop):**

- Command: `codex app-server`
- stdio transport: `--listen stdio://` or `--stdio` (newline-delimited JSON / JSONL)
- Handshake: `initialize` request followed by `initialized` notification
- Python SDK launches `<codex binary> [--config ...] app-server --listen stdio://`

These facts must not be conflated with ChatGPT Desktop's bundled spawn.

**UNVERIFIED on this host:**

- ChatGPT Desktop was not installed; bundled Codex was not executed.
- The exact Desktop bundled spawn site / executable / arguments remain
  **UNVERIFIED** until observed.
- Layer must not treat upstream CLI argv as a proven Desktop invocation.

**BLOCKED:**

- Production Layer-owned app-server child (`PRODUCTION_CHILD_TRANSPORT_ENABLED = false`)
- Desktop live traffic interception

```text
ChatGPT Desktop  ──(live app-server)──►  bundled Codex     [MS-2B, not this PR]
       ▲
       └── Layer preload/main (unchanged single-session default)

Layer CodexSessionManager (MS-1, dormant)     identity + lifecycle state
       └── CodexSessionTransportRegistry (MS-2A)  attach/handshake only
              ├── attached fake / fixture transport [TEST-ONLY]
              ├── production spawn                  [BLOCKED — no second child]
              ├── ThreadOwnerStore
              └── CodexSessionRouter (simple policy, no Smart Routing)

Invariant: one session = one Layer-owned Codex app-server child.
MS-2A does not spawn a second process beside the MS-1 lifecycle child.
Future MS-2B: STOPPED → STARTING → one child → transport init → RUNNING.
```

## 3. Protocol  TEST-ONLY / REFERENCE

Envelope:

```ts
{ id?, method?, params?, result?, error?, /* unknown fields preserved */ }
```

- Request (outbound): `{id, method, params}`
- Notification: `{method, params}` (no id)
- Response: `{id, result}` or `{id, error}`
- Server-initiated request (inbound): `{id, method, params}`

JSON-RPC 2.0 `jsonrpc` is **not** required. If present it is kept in `extra`.

## 4. Framing  TEST-ONLY / PLANNED

Implemented: newline-delimited JSON with **byte-based** bounds. Raw bytes
are buffered until a complete `0x0A` frame exists, then decoded with
**fatal UTF-8** (no U+FFFD). `pendingBytes` is the byte length.

| Bound | Value |
|---|---|
| `MAX_MESSAGE_BYTES` | 256 KiB |
| `MAX_BUFFER_BYTES` | 512 KiB |

Handles partial chunks, multiple messages per chunk, CRLF (`0x0D 0x0A`),
empty lines, and UTF-8 split across stdout chunks. Outbound writes are
bounded with the same `MAX_MESSAGE_BYTES` (circular JSON fails the request).
Malformed or oversized **fails that child/session parser**, not Electron main.

stderr is drained as diagnostics and never parsed as protocol
(**REFERENCE**, not proven against Desktop).

Production must not claim this framing is PROVEN until a real bundled binary
is observed.

## 5. Transport

`CodexAppServerTransport`: `request`, `notify`, `onNotification`,
`onServerRequest` / `setServerRequestHandler` (Option A: **one** handler
that returns `{ result }` or `{ error }`; the transport sends exactly one
response), `close`.

- Tweaks never see stdin, stdout, stderr, pid, `ChildProcess`, env, or exe.
- Tests use `InProcessAppServerTransport` / `createFakeTransport`.
- Stdio adapter exists for the in-repo fixture (**TEST-ONLY**).
- Production `createFailClosedAppServerLauncher()` throws `not-proven`.

## 6. Request correlation

Internal ids `layer:<n>`. Pending map is bounded (256). Timeout is internal
(default 30s, injectable in tests, not a tweak API). Cleanup on settle,
timeout, and child exit. Duplicate responses are ignored. No cross-session
id sharing: each transport has its own map.

## 7. Lifecycle integration

MS-1 `CodexManagedChild` stays lifecycle-only (stdout drained). MS-2A does
not change empty-argv spawn and **does not launch a second child**.

`CodexSessionTransportRegistry` maps `sessionId → live transport`. It
**attaches** a transport the caller already owns (tests inject fakes or a
fixture). It does not require the MS-1 lifecycle to be RUNNING first.

Identity: `transport.sessionId` must already equal the registry `sessionId`.
Mismatch is `session-mismatch`. The registry never rewrites
`transport.sessionId`. Handshake is not started on a mismatch.

Reservation: `attachAndInitialize` stores `sessionId → transport` in
`attaching` before handshake. The registry owns that concrete transport.
A second `attachAndInitialize` or sync `attach` for that session is
`attach-in-progress` until the first settles. A bound record is
`already-attached`. Failed handshake closes the reserved transport, drops
the reservation (object identity), and leaves no record so a later attach
may retry.

`stop` closes a bound record **or** an in-flight handshake transport, awaits
close, and the pending attach never binds afterward. `closeAll` marks the
registry closed first, snapshots bound records and reservations, clears both,
closes every owned transport (deduped by object identity), and awaits all
closes before resolving. A handshake that later succeeds must **not** bind.

If the session is removed from the session manager before bind, the reserved
transport is closed and not bound. The session is not recreated.

Stale close: `onClose` deletes the record only when
`current.transport === transport` (object identity). A delayed close of OLD
after NEW is attached must not drop NEW. An ordinary close of the current
transport still removes the entry.

Ownership:

- Before acceptance (mismatch / duplicate / in-progress): reject **without**
  mutating or closing the incoming transport.
- After reservation or bind: the registry owns it and closes it on handshake
  failure, `stop`, `closeAll`, or closed-during-handshake.

| Event | Transport |
|---|---|
| `attach` / `attachAndInitialize` | register (optional handshake) — no spawn |
| unexpected child/parser failure | close, reject pending, drop registry entry |
| `stop` | close bound **or** in-flight handshake transport (does not stop an MS-1 dummy child) |
| `will-quit` | `appServerHost.closeAll()` then MS-1 `shutdownAll` |
| future production (PLANNED/BLOCKED) | STOPPED → STARTING → **one** child → init → RUNNING; unexpected exit → FAILED |

Nothing auto-starts. The host in `main.ts` is dormant.

`CODEX_HOME` / `CODEX_SQLITE_HOME` are still honored for Layer-owned children
when a launcher actually spawns (fixture / future proven production).

## 8. Thread-owner store

Path: `<userRoot>/codex-sessions/thread-owners.json`

```json
{ "version": 1, "owners": { "<threadId>": "session_<24 hex>" } }
```

- Reuses MS-1 `assertSafeSessionLayout` (symlink/junction at structural roots
  fail closed).
- Atomic write, size bound, allowlisted keys only, no credentials/paths.
- Session ids must match `session_[a-f0-9]{24}`.
- Thread ids are opaque bounded strings (no `/`, `..`, `:`, `@`).
- `setOwner` replacement requires `{ overwrite: true }`.
- `listOwners` is internal. The file is not exposed to the renderer.

## 9. Routing semantics

`CodexSessionRouter` — simple policy only.

**New thread (`thread/start`):** target session (explicit, or test
`selectSession`) → on **success** extract `result.thread.id` → persist owner.
Failure or missing thread id → **no** owner entry.

**Existing thread:** lookup owner. If the owner has a live transport, route
there. If missing, require an explicit `fallbackSessionId`. If the owner is
unavailable, return `unavailable` unless the caller passed a fallback.
Fallback **does not** migrate ownership.

**Not implemented:** `thread/read` source → `thread/resume` target failover.
Documented as a future MS-2B+ flow only. Owner is not updated on error alone.

Error kinds (`timeout`, `malformed`, `spawn`, `child-exit`, `internal`, …)
are **never** treated as quota exhaustion.

## 10. Thread id extraction  (known shapes only)

1. `params.threadId` or `params.thread_id` (top-level)
2. `result.thread.id`
3. `params.thread.id` for `thread/started`

No recursive JSON search. Nested lookalikes in unrelated fields are ignored.

## 11. Server-initiated requests  (Option A)

Inbound `{id, method}` is a server request. MS-2A implements a **single**
handler (`onServerRequest` / `setServerRequestHandler`) that must return
`{ result }` or `{ error }`. The transport awaits it and sends exactly one
response. Handler throw → bounded `{code: -32603, message: "Internal error"}`.
Write failure closes the transport.

If no handler is registered, Layer replies
`{id, error: {code: -32601, message: "Method not found"}}` so the child does
not deadlock.

In-flight async handlers are counted (`serverRequestsInFlight`) and capped
(`MAX_SERVER_REQUESTS_IN_FLIGHT`). Overflow replies `-32000` and does not
queue unbounded promises.

## 12. Security boundaries

- No command injection, caller argv, caller exe, or caller env maps.
- No path injection: session layout + thread-id charset + atomic store.
- No token leakage: store allowlist; stderr/stdout never logged; metadata
  still uses MS-1 `stripCredentials`.
- Malformed/huge JSON fails that session.
- Request id collision avoided via `layer:` prefix per transport and
  type-safe keys (`n:1` vs `s:1` vs `s:#1`).
- Pending/listener maps are bounded; close unsubscribes.
- Spoofed session ids fail `assertSessionId`.
- Cross-session responses cannot settle another transport's map.
- Corrupted owner store fails closed rather than overwriting with `{}`.
- No new public mutation IPC.

## 13. Production feasibility

| Piece | Status |
|---|---|
| Protocol model + NDJSON parser | TEST-ONLY / PLANNED |
| In-process fake transport | TEST-ONLY |
| Fixture child stdio | TEST-ONLY |
| Request correlation | TEST-ONLY (proven in tests) |
| ThreadOwnerStore | implemented, Layer-internal |
| Simple router | implemented, Layer-internal |
| Trusted bundled exe | UNVERIFIED (resolver may return null) |
| Upstream app-server protocol | PROVEN (official Codex CLI / SDK) |
| Upstream app-server stdio argv | PROVEN (`app-server --listen stdio://` / `--stdio`) |
| Desktop bundled spawn invocation | UNVERIFIED until observed |
| Production child transport | BLOCKED / fail-closed |
| Desktop live interception | BLOCKED (MS-2B2 gate not met) |
| Smart Routing / quota failover | not implemented |

## 14. MS-2B1 Desktop spawn seam discovery

MS-2B1 answers: how does ChatGPT Desktop create its live Codex app-server
child, and can Layer observe that creation *before* it happens without
replacing any binary?

It does **not** intercept live Desktop traffic, wrap `ChildProcess`, or
proxy stdin/stdout.

### 14.1 Loader ordering  (PROVEN in this repo)

`packages/loader/loader.cjs` loads Layer runtime **before** original main:

```js
safe("runtime", () => require(path.join(runtimeDir, "main.js")));
require("./" + originalMain);
```

So a JS-accessible process API used by Desktop after that point can be
observed from `runtime/main.ts`. This does **not** prove Desktop uses
`node:child_process.spawn`. Native / Owl spawn would not hit the hook.

### 14.2 Probe  (default OFF)

Developer flag: `CODEXPP_APP_SERVER_PROBE=1`

When OFF: no monkey patch, zero behavioral change.

When ON: wrap `node:child_process.spawn` only, call the original function,
return the **exact** original child. No Proxy, no stdout listeners, no
flowing mode, no stdin/stdout inspection.

Not instrumented (no evidence they are Desktop's app-server path):
`execFile`, `exec`, `execSync`, `spawnSync`, shell, `utilityProcess.fork`,
`Module._load`. Fail closed rather than blanket-hooking.

### 14.3 Candidate rules

A spawn is a Desktop app-server **candidate** only with strong evidence:

1. basename looks like a Codex runtime (`codex` / `codex.exe`, case-insensitive)
2. realpath is inside trusted Desktop `resourcesPath` / `appPath` roots
   (same roots as `resolveTrustedCodexExecutable`; symlink/junction escape
   is not trusted)
3. argv contains the `app-server` subcommand (after `--config` / `-c` prefixes)
4. transport is `--listen stdio://` or `--stdio`

Basename alone is not enough. Arbitrary processes with an `app-server` arg
are not candidates. `app-server` without a stdio transport is not a proven
Desktop stdio candidate. Unclassifiable input is passed through unchanged.

### 14.4 Sanitized diagnostics

Capped local `main.log` only. No localhost server, no telemetry.

Logged: timestamp, process API, candidate, executable basename, trusted
root?, safe relative resource path, app-server detected, transport mode,
argument count, platform, Layer version.

Never logged: env, tokens, cookies, Authorization, `~/.codex/auth.json`,
full command lines, prompt text, stdin/stdout, sensitive cwd, `--config`
values.

Internal status getter only. No renderer IPC, no public tweak API.

### 14.5 Local evidence (this host)

ChatGPT Desktop was not present. Bundled Codex was not executed.
`codex app-server --help` capability probe was **not** run (must not run
in default CI). Desktop live seam remains **UNVERIFIED**.

### 14.6 Production launcher

`PRODUCTION_CHILD_TRANSPORT_ENABLED` stays `false` until all of:

1. trusted bundled executable resolved
2. that executable supports required app-server mode
3. stdio invocation works on the installed build
4. lifecycle ownership remains one-child-per-session
5. integration tests cover the production launcher boundary

Upstream CLI knowledge alone does not enable production spawn.

## 15. MS-2B2 interception gate

Do **not** implement stream/process interception until **all** are PROVEN:

1. Desktop invokes trusted Codex via a JS spawn seam Layer can hook
2. Observed argv is an app-server stdio invocation
3. Layer hook runs before that spawn
4. Pass-through probe does not alter Desktop behavior

Only then may MS-2B2 build a stream/process facade or router interception.

### 15.1 Designs compared (not implemented)

| | A. ChildProcess facade over Layer router | B. Interpose stdin/stdout on the proven child | C. Runtime spawn substitution to a Layer router child (no on-disk binary replace) |
|---|---|---|---|
| Feasibility | High *if* JS spawn is proven; must emulate Node ChildProcess | High *if* JS spawn is proven; original child stays | High *if* JS spawn is proven; returns a real ChildProcess |
| Process semantics | Fake pid/kill/events unless carefully emulated | Real Desktop child identity | Real router-child identity |
| stdin/stdout | Facade pipes | Wrap streams (risk of flowing mode) | Real pipes to router |
| exit/error | Must be synthesized | Original child exit | Router child exit |
| Platform | Electron JS spawn only | same | same |
| Security | Desktop talks only to facade; must not leak other sessions | Layer sees live Desktop protocol | Substitute only for trusted+stdio candidates |
| Brittleness | High (API surface of ChildProcess) | Medium (stream wrapping) | Medium (Desktop must not depend on exe path) |
| Original child exists? | No | Yes | No (router child instead) |
| One-session-one-child | Holds inside router; Desktop sees one facade | Desktop still has one child — **cannot mux accounts** | Holds inside router; Desktop sees one router child |

Binary replace / `codex.real` remains **rejected**.

**Recommendation if the JS spawn seam is later proven:** **C**. It keeps a
real `ChildProcess` (unlike A), does not replace an on-disk Codex binary,
and can mux Layer-owned children while Desktop still sees one process.
**B** is useful only to confirm protocol on a single connection; it cannot
implement multi-account routing. If Desktop spawns from native/Owl instead
of `child_process.spawn`, A/B/C all fail closed and a different seam is
required.

Do not implement A, B, or C in MS-2B1.

## 16. Historical seam table

| ID | Seam | Verdict |
|---|---|---|
| Replace bundled `codex` / `codex.real` | **Rejected** |
| Patch Desktop asar spawn site | **Rejected** as default |
| `child_process.spawn` pass-through probe | **MS-2B1** (default OFF) |
| Localhost HTTP control server | **Rejected** |
| CDP intercept | **Rejected** for protocol mux |
| Renderer `codex_desktop:*` IPC | signal only, not transport |

## 17. Known blockers

1. Desktop bundled spawn invocation remains UNVERIFIED.
2. Trusted executable often unresolved on this host.
3. Desktop live connection still owned by ChatGPT.
4. No real-auth or bundled-exe probe in CI.

## 18. Tests

No network. No `~/.codex`. No real ChatGPT. Fixture + injected fake spawn
only. Optional real Desktop / bundled-exe probes must not run in default CI.
