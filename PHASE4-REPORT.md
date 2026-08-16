# Phase 4 Cross-platform CI hardening

HEAD: fed3dbe. Version 1.1.4.

No permission / compat / IPC / store-pin / updater / installer architecture changes.

## Matrix

Six jobs: ubuntu-latest, macos-latest, windows-latest crossed with Node 20 and 22.
Each job: checkout, setup-node (package-manager cache), install-from-lockfile, unit tests, compile.
permissions: contents: read
concurrency group with cancel-in-progress
timeout-minutes: 20
strategy.fail-fast: false
no secrets, no publish, no artifacts, no job-level if-skips
steps are package-manager commands valid under pwsh and bash
sync-accounts-store.yml unchanged


## Audit result

Ran lockfile audit --json after install-from-lockfile on this Linux box (v20.19.2 / package-manager 9.2.0).

Not clean. 3 advisories (1 low, 1 high, 1 critical). Did not auto-fix, did not force, did not add a blocking audit job.

- tar ^7.5.2 (direct, critical rollup, range <=7.5.20): parser DoS / interpretation GHSAs; fixAvailable true
- brace-expansion (transitive, high): expansion DoS; fixAvailable true
- esbuild (transitive via runtime compile, low): Win dev-server file read, range >=0.27.3 <0.28.1; fixAvailable true

Existing scripts.audit is unchanged for local/release use.

## Generated-file check decision

Do not add git diff --exit-code after compile.

- Consecutive compile twice on this machine: deterministic (tree hash matched).
- esbuild inline sourcemaps use relative sources (no absolute box paths).
- packages/*/dist is gitignored. Tracked generated output is packages/installer/assets/runtime/ (copied from runtime dist).
- macOS native-host .node is compiled and codesigned only on darwin. A post-compile diff job would fail on macos-latest whenever compiler output differs from the committed binary, and would be a false-green on linux/win (compile skipped; recursive copy merge leaves the committed darwin .node in assets/runtime/native/).
- That makes a matrix-wide generated-file check flaky. Not added.


## Test results (this Linux box)

Node v20.19.2 only. Node 22 is not installed here.

    tests 188
    pass 185
    fail 0
    skipped 3

Skipped on linux (existing platform filters, not CI job skips):

1. locateCodex reads beta bundle metadata from override path on macOS
2. locateCodex prefers the Store ChatGPT.exe over the Codex helper on Windows
3. native host reports AppKit and Metal capabilities

install-from-lockfile / unit tests / compile all exited 0. prepare already compiles during install. Native-host compile skipped with the existing non-darwin message.

## Portability bugs / fixes

1. Test glob is shell-dependent. Root test script used node --import tsx --test packages/*/test/*.test.ts. Bash expands it; Win cmd/pwsh via the package manager does not. Node 20 glob support is not something to bet the matrix on. Fix: scripts/run-tests.mjs walks packages/*/test/*.test.ts in-process and spawns node --import tsx --test with explicit files.
2. clean was POSIX rm -rf. CI does not call clean, but windows-latest is the point of this phase. Fix: scripts/clean.mjs using fs.rmSync (no new dependency).
3. Linux install unit test uses Unix execute bits. resolveLinuxInstall supports am-will writes mode 0o755 then isExecutableFile checks stat.mode & 0o111. On Win those bits are not preserved, so the test would fail on windows-latest. Fix: skip on win32, matching the existing symlink test. Production locateCodex never calls resolveLinuxInstall on Win.
4. No Node 22-only APIs in first-party source (fs.glob, Promise.withResolvers, Array.fromAsync, crypto.hash, import.meta.dirname, process.getBuiltinModule, Set union, URL.parse). engines.node stays >=20. Do not raise to >=22.

Not changed (not a test/compile failure): darwin-only codesign/launchctl/ditto already gated; native-host build.mjs already exits 0 on non-darwin; IPC, api.codex, permissions, compatibility layer, store pin, self-update default-off.


## Files to change

- .github/workflows/ci.yml -- 3 OS x 2 Node matrix
- package.json -- clean / test scripts only (version remains 1.1.4)
- scripts/clean.mjs -- new
- scripts/run-tests.mjs -- new
- packages/installer/test/platform.test.ts -- skip Linux execute-bit case on win32
- CHANGELOG.md -- Unreleased note
- PHASE4-REPORT.md -- this file

## Known limitations

- Node 22 was not available on this box; matrix Node 22 is GitHub-hosted only.
- runtime optional host package @41 declares node >=22.12.0. Node 20 install-from-lockfile prints EBADENGINE for that package and related extract helpers. Tests and compile still succeeded because that host is not started. Do not bump engines to hide this.
- Audit is dirty (tar, brace-expansion, esbuild); no blocking audit job.
- Native host is darwin-only. Linux/Win CI skip compile; tests skip load.
- Tracked assets/runtime/native/codexpp_native_host.node can remain a leftover darwin binary after a linux/win copy-assets merge. Out of scope unless a test/compile fails.
- Platform unit tests still skip macOS-only / Win-only locateCodex cases on the other OSes (correct; they are not CI job skips).
- chmod-based preflight/uninstall tests already skip win32.
