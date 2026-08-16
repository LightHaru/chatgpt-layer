# npm releases (chatgpt-layer)

This is the maintainer playbook for publishing the **chatgpt-layer** CLI to the npm registry. End users still install with `npm install -g chatgpt-layer` (see the README). The repo root package is private and must never be published.

Versions are **immutable**. Never reuse a version that already exists on npm.

Trusted Publishing is **not** assumed to be active until the package owner configures it on npmjs.com (steps below). This repository does not store an npm token for publishing.

## Release steps

1. **Update project/package versions** to the next semver (`X.Y.Z`) in lockstep: root `package.json`, `packages/installer` (published name `chatgpt-layer`), and the other workspace packages that share the product version (`packages/runtime`, `packages/sdk`, `packages/loader`, `packages/native-host`).
2. **Update `CHANGELOG.md`** (move Unreleased notes into `X.Y.Z`, add release-notes link).
3. **Merge the release commit** to `main`.
4. **Ensure CI passes** on `main` (`.github/workflows/ci.yml`).
5. **Create tag `vX.Y.Z`** (leading `v`, matching `packages/installer` version). Same convention as `v1.1.4`.
6. **Publish a GitHub Release** for `vX.Y.Z`. That `published` event is the only trigger for `.github/workflows/publish-npm.yml`.
7. **`publish-npm.yml` validates** the tag, package name, workspace versions, and that `chatgpt-layer@X.Y.Z` is not already on the registry (`scripts/validate-npm-release.mjs`). It then runs `npm ci`, tests, and build.
8. **GitHub OIDC authenticates to npm.** The workflow has `id-token: write` and does **not** set NODE_AUTH_TOKEN / NPM_TOKEN. npm CLI >= 11.5.1 exchanges the OIDC token. `actions/setup-node` is used **without** `registry-url` so setup-node does not write an `.npmrc` that expects NODE_AUTH_TOKEN.
9. **npm publishes `chatgpt-layer@X.Y.Z`** from `packages/installer` (`npm publish --access public`). Provenance is attached automatically for Trusted Publishing from public GitHub to public npm; do not add a signing secret.
10. **Verify:**
    ```sh
    npm install -g chatgpt-layer@X.Y.Z
    chatgpt-layer --help
    chatgpt-layer status
    ```

## Manual Trusted Publisher setup (required once)

Until this is configured on npmjs.com, the publish job cannot authenticate. Do this as the package owner (do not put a publish token in GitHub Actions):

1. Open [https://www.npmjs.com/package/chatgpt-layer](https://www.npmjs.com/package/chatgpt-layer) while signed in as the maintainer.
2. **Package chatgpt-layer → Settings → Trusted Publisher → GitHub Actions**
3. Fill in:
   - **Organization or user:** `LightHaru`
   - **Repository:** `chatgpt-layer`
   - **Workflow filename:** `publish-npm.yml` (filename only, not a path)
   - **Environment name:** leave unset
   - **Allowed actions:** `npm publish`
4. Save.

Exact identity the workflow presents:

| Field | Value |
|---|---|
| Owner | `LightHaru` |
| Repository | `chatgpt-layer` |
| Workflow | `publish-npm.yml` |
| Allowed action | `npm publish` |
| Environment | unset |

Self-hosted runners are not used and are not supported for this publisher.

## What the workflow checks

- Published package **name** is `chatgpt-layer` (not the private root `codex-plusplus`).
- GitHub Release tag is `v` + `packages/installer` version.
- GitHub Release tag commit must already be on `main` (`git merge-base --is-ancestor HEAD origin/main`); a branch-only tag is refused.
- Workspace package versions that share the product version match; mismatches fail closed with a list.
- `GET https://registry.npmjs.org/chatgpt-layer/X.Y.Z` — HTTP 200 fails with `chatgpt-layer@X.Y.Z already exists on npm`. HTTP 404 continues.
- Packed tarball includes `dist`, `assets`, `README.md`, and `LICENSE`, and has no workspace-only deps such as `@codex-plusplus/sdk: *`.
- Smoke: packed CLI `--help` only. The workflow does **not** run `chatgpt-layer install` against a ChatGPT app.

## Local dry-run (never publish from a laptop)

```sh
npm ci
npm test
npm run build
cd packages/installer
npm publish --dry-run --access public
npm pack
```

Do not run `npm publish` without `--dry-run` from a developer machine.

## Ghi chú (Tiếng Việt)

Bản phát hành `chatgpt-layer@X.Y.Z` lên npm chỉ chạy khi có GitHub Release `vX.Y.Z`. Workflow `.github/workflows/publish-npm.yml` dùng OIDC (Trusted Publishing), không dùng token npm trong CI. Cần cấu hình Trusted Publisher một lần trên npmjs.com: owner `LightHaru`, repo `chatgpt-layer`, workflow `publish-npm.yml`, action `npm publish`, không chọn environment. Version đã publish thì không tái sử dụng.

