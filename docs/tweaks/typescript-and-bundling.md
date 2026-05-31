# TypeScript and Bundling

The runtime loads JavaScript from tweak entry files. It does not transpile
TypeScript, JSX, or raw ESM imports at runtime.

Use `@codex-plusplus/sdk` for types, then bundle to CommonJS.

## Install Dev Dependencies

```sh
npm i -D @codex-plusplus/sdk typescript esbuild
```

## TypeScript Source

`src/index.ts`:

```ts
import { defineTweak } from "@codex-plusplus/sdk";

export default defineTweak({
  start(api) {
    api.log.info("typed tweak", api.manifest.id);
  },
});
```

## Build for Renderer

```sh
npx esbuild src/index.ts \
  --bundle \
  --platform=browser \
  --format=cjs \
  --outfile=index.js
```

Use `--platform=browser` for renderer tweaks so Node built-ins do not leak into
the bundle by accident.

## Build for Main

```sh
npx esbuild src/index.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=index.js
```

Use `--platform=node` for main-process tweaks.

## Both-Process Builds

For simple tweaks, one dependency-light entry can branch:

```ts
import { defineTweak } from "@codex-plusplus/sdk";

export default defineTweak({
  start(api) {
    if (api.process === "main") {
      api.ipc.handle("ping", () => "pong");
      return;
    }

    api.settings?.registerPage({
      id: "main",
      title: "Ping",
      render(root) {
        const button = document.createElement("button");
        button.textContent = "Ping";
        button.onclick = async () => {
          button.textContent = await api.ipc.invoke("ping");
        };
        root.append(button);
      },
    });
  },
});
```

If renderer and main need different dependencies, keep the manifest entry as a
small CommonJS file. The main branch can `require()` Node/main bundles; the
renderer branch must be self-contained because sandboxed renderer tweaks cannot
`require()` sibling files.

```js
module.exports = {
  start(api) {
    if (api.process === "main") {
      return require("./dist/main.cjs").start(api);
    }

    // Renderer-safe code only here, or paste/bundle renderer code into this file.
    api.settings.registerPage({
      id: "main",
      title: api.manifest.name,
      render(root) {
        root.textContent = "Renderer half loaded.";
      },
    });
  },
  stop() {
    // Delegate if needed.
  },
};
```

For most `scope: "both"` tweaks, the simplest durable option is one bundled
entry that branches on `api.process`.

## Package Script

```json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=browser --format=cjs --outfile=index.js",
    "validate": "codexplusplus validate-tweak ."
  },
  "devDependencies": {
    "@codex-plusplus/sdk": "^1.0.0",
    "esbuild": "^0.28.0",
    "typescript": "^5.6.0"
  }
}
```

Run:

```sh
npm run build
codexplusplus validate-tweak .
```
