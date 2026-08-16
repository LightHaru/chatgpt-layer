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
