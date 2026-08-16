# Security Policy

## Supported Versions

Only the latest released version receives security fixes while the project is in alpha.

## Reporting a Vulnerability

Report security issues privately to the repository maintainers. Do not open a public issue for suspected exploit paths.

Include:

- Affected version or commit.
- Platform and Codex app version.
- Reproduction steps.
- Impact and any proof-of-concept details.

## Tweak Update Policy

Tweaks are unsandboxed local code and should be treated as untrusted until reviewed.

GitHub Release checks can show that a store-listed tweak has a newer semver tag. Store **Update** / **Install** only downloads the `approvedCommitSha` listed in `store/index.json`. It does not install an unpinned latest GitHub Release. The user must click Update; Layer does not replace tweak files in the background.

Layer self-update is opt-in and defaults off.

Before updating a tweak, review the pinned commit, release notes, changed files, repository ownership, and any new permissions or network behavior.

## Runtime Boundaries

Renderer tweaks run in the preload context and can modify the Codex UI. Main-process tweaks can use the main-process API exposed by Codex++. Install only tweaks from sources you trust.

## Tweak Permission Enforcement

`manifest.permissions` is capability authorization (least privilege) for optional tweak APIs. It is **not** a process sandbox, network jail, or OS isolation. Tweaks are still local code in the Codex renderer preload and/or Electron main process.

Policy:

1. **permissions absent** — legacy compatibility. Existing APIs keep working.
2. **permissions present** — only the declared list is authorized.
3. **permissions: []** — not legacy. No optional capabilities.

Main-process IPC is the trustworthy boundary when a tweak identity exists. Renderer API filtering is defense-in-depth. Layer Settings / Tweak Store / self-update admin IPC is not a third-party tweak and is not gated by tweak permissions.

`network` is declarative only: the preload cannot block the web `fetch` API, and Layer does not pretend otherwise.
