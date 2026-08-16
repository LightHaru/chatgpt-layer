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

**BLOCKED on this host:**

- ChatGPT Desktop was not installed; bundled Codex was not executed.
- Exact production argv is therefore **not proven**. Layer must not invent
  `["app-server"]`.

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

Reservation: `attachAndInitialize` takes an exclusive per-session reservation
before handshake (`attaching`). A second `attachAndInitialize` or sync
`attach` for that session is `attach-in-progress` until the first settles.
A bound record is `already-attached`. Failed handshake closes the reserved
transport, drops the reservation, and leaves no record so a later attach
may retry. `closeAll` during handshake: later success must **not** bind;
that transport is closed and the registry stays empty/closed.

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
| `stop` | reject new work, close transport (does not stop an MS-1 dummy child) |
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
| Trusted bundled exe | BLOCKED (resolver may return null) |
| Exact app-server argv | BLOCKED (REFERENCE `app-server` not proven) |
| Production child transport | BLOCKED / fail-closed |
| Desktop live interception | BLOCKED (MS-2B) |
| Smart Routing / quota failover | not implemented |

## 14. MS-2B desktop seam candidates

Layer already runs in ChatGPT's main process. The goal is to **observe or
proxy** the Desktop app-server without replacing binaries.

| ID | Seam | Platform | Privilege | Fragility | Version-sensitive | Binary replace? | Verdict |
|---|---|---|---|---|---|---|---|
| A | Replace bundled `codex` with a wrapper / `codex.real` | macOS (router), theoretically others | installer + codesign | high | yes | **yes** | **Rejected** (MS-2A rules; this is the router design) |
| B | Patch Desktop asar to rewrite the spawn site | all | installer | very high | yes (anchors) | asar patch, not exe swap | **Rejected** as a default; last resort |
| C | Monkey-patch Node `child_process.spawn` / `utilityProcess` from Layer `main.ts` (loads **before** original main) | Electron/Owl JS spawn path | main | medium | if spawn stays in JS | no | **Recommended candidate** *if* Desktop spawns Codex from JS after Layer loads. Unproven: spawn may be native Owl. |
| D | Localhost HTTP control server (router port 48123) | all | extra local server | medium | no | no | **Rejected** (explicit non-goal) |
| E | CDP / remote-debugging intercept | all | debug switch | high | no | no | **Rejected** for protocol mux; does not yield app-server JSONL |
| F | Sniff renderer `codex_desktop:*` IPC | all | preload already present | high | yes | no | Investigate as a *signal*, not a transport. Unlikely to be the JSONL app-server. |

**Recommended MS-2B research order:** C (spawn hook, fail closed if the child is not the app-server), then F as telemetry only. Do not implement a fragile seam in this PR.

## 15. Known blockers

1. Exact production invocation not proven.
2. Trusted executable often unresolved.
3. Desktop live connection still owned by ChatGPT.
4. No real-auth probe in CI (would need credentials and a bundled binary).

## 16. Tests

No network. No `~/.codex`. No real ChatGPT. Fixture + in-process fakes only.

Optional real bundled-exe probe is **omitted**: invocation is not proven, so
it must not run in default CI.
