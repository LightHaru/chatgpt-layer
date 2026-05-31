# AGENTS.md — Codex++ tweak authoring guide

This file is read by AI coding agents (and humans) authoring tweaks for
Codex++. **Follow it.**

## Prime directive

> **Match Codex's existing UI patterns unless the user specifically requests
> otherwise.** Don't invent new visual idioms. Don't hard-code colors, sizes,
> or fonts. Use Codex's Tailwind tokens (`text-token-*`, `bg-token-*`,
> `border-token-border`, `px-row-x`, `py-row-y`, `p-panel`, `h-toolbar`,
> etc.). When in doubt, mirror what the surrounding Codex screen does.

If the user explicitly says "I want a custom look here" — only then deviate.

## Tweak shape

A tweak is a folder containing:

```
my-tweak/
  manifest.json   ← required, schema below
  index.js        ← entry, exports { start, stop }
  icon.png        ← optional, referenced by manifest.iconUrl
```

`index.js` is loaded as a CommonJS-shaped module. Bundle ESM or TypeScript to
runtime-loadable JavaScript before installing the tweak:

```js
module.exports = {
  async start(api) { /* … */ },
  async stop()    { /* … */ },
};
```

Or, with the SDK helper:

```js
const { defineTweak } = require("@codex-plusplus/sdk");
module.exports = defineTweak({
  start(api) { api.log.info("hello"); },
});
```

## Manifest schema (`manifest.json`)

| Field         | Type                            | Required | Notes |
|---------------|---------------------------------|----------|-------|
| `id`          | `string` (reverse-DNS)          | yes      | `"com.you.my-tweak"` |
| `name`        | `string`                        | yes      | Shown in the Tweaks list. |
| `version`     | `string` (semver)               | yes      | `"1.0.0"` |
| `githubRepo`  | `string` (`owner/repo`)         | yes      | GitHub repository slug for the tweak, e.g. `"you/my-tweak"`. |
| `description` | `string`                        | no       | Renders below the name. |
| `author`      | `string \| { name, url?, email? }` | no    | If a string, treated as display name. If structured with `url`, name becomes a link. |
| `homepage`    | `string` (URL)                  | no       | Linked next to the author. |
| `iconUrl`     | `string`                        | no       | `https://…`, `data:…`, or `./relative.png`. If absent, an initial avatar is rendered. |
| `tags`        | `string[]`                      | no       | e.g. `["ui", "shortcut"]`. |
| `scope`       | `"renderer" \| "main" \| "both"` | no      | Current runtime behavior is effectively `"both"` when omitted. Set it explicitly. |
| `main`        | `string`                        | no       | Custom entry path. Defaults to `index.js`/`index.mjs`/`index.cjs`. |
| `minRuntime`  | `string` (semver range)         | no       | Codex++ runtime range required. |

Full manifest example:

```json
{
  "id": "com.example.my-tweak",
  "name": "Hello World",
  "version": "0.1.0",
  "githubRepo": "example/my-tweak",
  "description": "Minimal example tweak. Adds a section to the Tweaks tab.",
  "author": {
    "name": "codex-plusplus",
    "url": "https://github.com/anomalyco/codex-plusplus"
  },
  "homepage": "https://github.com/example/my-tweak",
  "tags": ["example", "demo"],
  "scope": "renderer"
}
```

## The API (`api`)

See `@codex-plusplus/sdk` for full types. The most-used pieces:

- `api.log.{debug,info,warn,error}(…)` — goes to `preload.log` and DevTools.
- `api.storage.{get,set,delete,all}` — per-tweak persistent KV.
- `api.settings.register({ id, title, description, render })` — register a
  section that appears under your tweak's row in the Tweaks page.
- `api.settings.registerPage({ id, title, description?, iconSvg?, render })` — register a dedicated settings page in the sidebar.
- `api.react.waitForElement(selector, timeoutMs?)` — async DOM-ready wait.
- `api.react.findOwnerByName(node, "Component")` — fiber walk.
- `api.ipc.{on,send,invoke}` — channels are auto-prefixed with `codexpp:<id>:`.
- `api.fs.{read,write,exists}` — sandboxed to your tweak's data dir.
- `api.codex.runtime.{getInfo,getCapabilities}` — Owl/Electron runtime probes.
- `api.codex.windows.{create,getPrimary,focus,show}` — stable native Codex window hooks.
- `api.codex.views.create(...)` — Owl `WebContentsView`/`BrowserView` overlays inside Codex windows.
- `api.codex.cdp.{getStatus,listTargets}` — CDP status/target discovery when remote debug is enabled.
- `api.codex.native.{loadModule,createPanel,attachView,launchHelper}` — native module, AppKit/Metal view, and helper bridge.
- `api.codex.{createWindow,createBrowserView}` — backwards-compatible window/view hooks.

## UI components — copy these, don't invent new ones

All snippets below render correctly inside a `SettingsSection.render(root)`
or any DOM you mount into Codex.

### 1. Section title row

Use this above each card-grouped form section.

```js
const titleRow = document.createElement("div");
titleRow.className = "flex h-toolbar items-center justify-between gap-2 px-0 py-0";
const inner = document.createElement("div");
inner.className = "flex min-w-0 flex-1 flex-col gap-1";
const t = document.createElement("div");
t.className = "text-base font-medium text-token-text-primary";
t.textContent = "General";
inner.appendChild(t);
titleRow.appendChild(inner);
root.appendChild(titleRow);
```

Optional subtitle below:

```js
const sub = document.createElement("div");
sub.className = "text-token-text-secondary text-sm";
sub.textContent = "Configure how the thing behaves.";
inner.appendChild(sub);
```

### 2. Rounded grouped card

Group rows inside one of these — Codex's signature settings card:

```js
const card = document.createElement("div");
card.className =
  "border-token-border flex flex-col divide-y-[0.5px] divide-token-border rounded-lg border";
card.style.backgroundColor = "var(--color-background-panel, var(--color-token-bg-fog))";
```

### 3. Setting row (label + control)

```js
const row = document.createElement("div");
row.className = "flex items-center justify-between gap-4 p-3";
const left = document.createElement("div");
left.className = "flex min-w-0 flex-col gap-1";
const label = document.createElement("div");
label.className = "min-w-0 text-sm text-token-text-primary";
label.textContent = "Show line numbers";
const desc = document.createElement("div");
desc.className = "text-token-text-secondary min-w-0 text-sm";
desc.textContent = "Display 1-indexed line numbers in the gutter.";
left.append(label, desc);
row.appendChild(left);
// row.appendChild(<your control>);
card.appendChild(row);
```

### 4. Toggle switch (Codex-native)

```js
function switchControl(initial, onChange) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("role", "switch");
  const pill = document.createElement("span");
  const knob = document.createElement("span");
  knob.className =
    "rounded-full border border-[color:var(--gray-0)] bg-[color:var(--gray-0)] " +
    "shadow-sm transition-transform duration-200 ease-out h-4 w-4";
  pill.appendChild(knob);
  const apply = (on) => {
    btn.setAttribute("aria-checked", String(on));
    btn.className =
      "inline-flex items-center text-sm focus-visible:outline-none focus-visible:ring-2 " +
      "focus-visible:ring-token-focus-border focus-visible:rounded-full cursor-interaction";
    pill.className =
      "relative inline-flex shrink-0 items-center rounded-full transition-colors " +
      "duration-200 ease-out h-5 w-8 " +
      (on ? "bg-token-charts-blue" : "bg-token-foreground/20");
    knob.style.transform = on ? "translateX(14px)" : "translateX(2px)";
  };
  apply(initial);
  btn.appendChild(pill);
  btn.addEventListener("click", async () => {
    const next = btn.getAttribute("aria-checked") !== "true";
    apply(next);
    await onChange?.(next);
  });
  return btn;
}
```

### 5. Dropdown (Codex / Radix-style trigger)

```js
const trigger = document.createElement("button");
trigger.type = "button";
trigger.className =
  "border-token-border bg-token-foreground/5 hover:bg-token-foreground/10 " +
  "h-token-button-composer w-[240px] inline-flex items-center justify-between gap-2 " +
  "rounded-md border px-3 text-sm text-token-text-primary cursor-interaction";
trigger.innerHTML =
  '<span>Auto</span>' +
  '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" class="text-token-text-secondary">' +
    '<path d="M5 8l5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
```

(Wire your own popover; Radix isn't exposed.)

### 6. Link button ("Open file" pattern)

```js
const link = document.createElement("button");
link.type = "button";
link.className =
  "inline-flex items-center gap-1 text-sm text-token-text-link-foreground hover:underline cursor-interaction";
link.innerHTML =
  '<span>Open file</span>' +
  '<svg width="14" height="14" viewBox="0 0 20 20" fill="none">' +
    '<path d="M11 4h5v5M9 11l7-7M14 12v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3"' +
    ' stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
  '</svg>';
```

### 7. Danger pill (small, e.g. "Reset")

```js
const pill = document.createElement("button");
pill.type = "button";
pill.className =
  "rounded-full px-2 py-0.5 text-sm bg-token-charts-red/10 text-token-charts-red " +
  "hover:bg-token-charts-red/20 cursor-interaction";
pill.textContent = "Reset";
```

### 8. Danger button (large)

```js
const btn = document.createElement("button");
btn.type = "button";
btn.className =
  "h-token-button-composer rounded-md px-3 text-sm font-medium " +
  "bg-token-charts-red/10 text-token-charts-red hover:bg-token-charts-red/20 cursor-interaction";
btn.textContent = "Delete all data";
```

## Hot reload

Codex++ watches your tweak folder and reloads on save. Don't add your own
file watcher — `start()` will simply be re-invoked. Use `stop()` to undo any
DOM mutations / IPC handlers / event listeners.

## Inspecting the live DOM (Chrome DevTools Protocol)

When you're authoring a tweak, you almost always need to know Codex's
real markup — class names, structure, computed styles. The Codex++
runtime can expose Electron's renderer over CDP so you (or an AI agent)
can probe and mutate it from the host shell without clicking around.

**Enable it:**

```sh
CODEXPP_REMOTE_DEBUG=1 open -a Codex
# default port 9222 — override with CODEXPP_REMOTE_DEBUG_PORT=NNNN
```

The switch is wired in at `packages/runtime/src/main.ts` and is **off by
default**. Only turn it on for development.

**List targets:**

```sh
curl -s http://localhost:9222/json | jq '.[] | {id, type, url}'
```

You want the one with `"type": "page"` and `url: "app://-/index.html?..."`.

**Probe / evaluate JS** (no extra deps — Node 18+ has `WebSocket`):

```js
const tabs = await (await fetch('http://localhost:9222/json')).json();
const tab  = tabs.find(t => t.type === 'page');
const ws   = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const send = (method, params = {}) => new Promise(r => {
  const i = ++id;
  const h = e => { const m = JSON.parse(e.data); if (m.id === i) { ws.removeEventListener('message', h); r(m); } };
  ws.addEventListener('message', h);
  ws.send(JSON.stringify({ id: i, method, params }));
});
await new Promise(r => ws.addEventListener('open', r, { once: true }));
await send('Runtime.enable');
const r = await send('Runtime.evaluate', {
  expression: `document.querySelectorAll('aside').length`,
  returnByValue: true,
});
console.log(r.result.result.value);
ws.close();
```

**Common methods:**

- `Runtime.evaluate` — run any expression, get a value back. Best tool for
  reading computed styles, dumping `outerHTML`, counting elements.
- `Page.reload` — full renderer refresh; re-runs the preload. Equivalent
  to clicking **Force Reload** in the Tweaks page.
- `Page.captureScreenshot` — grab a PNG to verify visual changes.
- `Input.dispatchKeyEvent` — keyboard simulation. **Note:** macOS menu
  accelerators (e.g. `Cmd+,`) are unreliable through this; have the user
  open menus manually.

When iterating: write a small probe script under `/tmp/probe-*.mjs`,
make a change, rebuild + stage the runtime, `Page.reload`, re-probe.

## Don'ts

- ❌ Don't import React directly — Codex's React isn't a stable dependency.
  Use `api.react.*` or vanilla DOM.
- ❌ Don't use Node `require()` — the renderer is sandboxed. Bundle deps in.
- ❌ Don't hard-code hex colors. Use Codex tokens (`text-token-*`).
- ❌ Don't poll the DOM — use `api.react.waitForElement`.
- ❌ Don't ship your own toggle/button styling — use the components above.

## Reference

- SDK types: `@codex-plusplus/sdk` → `TweakManifest`, `TweakApi`,
  `SettingsSection`, etc.
- Codex's Settings markup samples: `/tmp/codex_panels/*.txt` (when the
  runtime is in dev/dump mode).
