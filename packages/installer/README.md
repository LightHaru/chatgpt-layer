# ChatGPT Layer CLI

Unofficial. Not affiliated with OpenAI.

Requires Node.js 20+.

CLI aliases: `chatgpt-layer`, `cgl`, `codexplusplus`, `codex-plusplus`.

## npm

```sh
npm install -g chatgpt-layer
chatgpt-layer install
```

Package: [`chatgpt-layer`](https://www.npmjs.com/package/chatgpt-layer).

## GitHub (alternative)

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.ps1 | iex
```

macOS / Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/LightHaru/chatgpt-layer/main/install.sh | bash
```

The one-liner fetches the installer script from `main` (fail-closed lockfile); that script then pins downloaded source to tag `v1.1.4` unless `CODEX_PLUSPLUS_REF` is set.

See the repository README for architecture, tweak authoring, security policy, and release notes:

https://github.com/LightHaru/chatgpt-layer
