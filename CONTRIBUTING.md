# Contributing

## Development

```sh
npm install
npm run build
npm run audit
```

The installer package is `packages/installer` and publishes the `chatgpt-layer` CLI (`cgl`, `codexplusplus`, and `codex-plusplus` remain aliases). Runtime code lives in `packages/runtime`; public tweak author types live in `packages/sdk`.

Default tweaks are developed and released from their own repositories. First-run store/tweak install uses the `approvedCommitSha` in `store/index.json`, not the latest GitHub release tag; do not vendor their source into this repository.

## Release Checklist

1. Update package versions using semver.
2. Update `CHANGELOG.md`.
3. Run `npm run build`.
4. Run `npm run audit`.
5. Test `codex-plusplus install`, `doctor`, `repair`, and `uninstall` on a real Codex install for the target platform.
6. Create a GitHub release with a semver tag (`vX.Y.Z`). Publishing `chatgpt-layer` to npm is documented in [docs/NPM-RELEASE.md](docs/NPM-RELEASE.md).

