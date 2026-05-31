# UI and DOM Patterns

Renderer tweaks can add Codex++ settings UI and adjust Codex's live DOM. The
runtime does not expose Codex's React instance; use DOM APIs or bundle your own
small renderer.

Match Codex's existing UI patterns. Prefer token classes such as
`text-token-*`, `bg-token-*`, `border-token-border`, `px-row-x`, `py-row-y`,
`p-panel`, and `h-toolbar`.

## Settings Page Skeleton

```js
function title(text, description) {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-1";

  const h = document.createElement("div");
  h.className = "text-base font-medium text-token-text-primary";
  h.textContent = text;
  wrap.append(h);

  if (description) {
    const p = document.createElement("div");
    p.className = "text-sm text-token-text-secondary";
    p.textContent = description;
    wrap.append(p);
  }

  return wrap;
}

function card() {
  const el = document.createElement("div");
  el.className =
    "border-token-border flex flex-col divide-y-[0.5px] divide-token-border rounded-lg border";
  el.style.backgroundColor = "var(--color-background-panel, var(--color-token-bg-fog))";
  return el;
}

function row(label, control, description) {
  const el = document.createElement("div");
  el.className = "flex items-center justify-between gap-4 p-3";

  const left = document.createElement("div");
  left.className = "flex min-w-0 flex-col gap-1";

  const name = document.createElement("div");
  name.className = "min-w-0 text-sm text-token-text-primary";
  name.textContent = label;
  left.append(name);

  if (description) {
    const desc = document.createElement("div");
    desc.className = "text-token-text-secondary min-w-0 text-sm";
    desc.textContent = description;
    left.append(desc);
  }

  el.append(left, control);
  return el;
}
```

Usage:

```js
api.settings.registerPage({
  id: "main",
  title: "Workflow Tools",
  render(root) {
    root.innerHTML = "";
    root.append(title("General", "Configure workflow behavior."));

    const group = card();
    group.append(row("Enabled", switchControl(true, (next) => {
      api.storage.set("enabled", next);
    })));
    root.append(group);
  },
});
```

## Toggle Control

```js
function switchControl(initial, onChange) {
  let value = !!initial;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("role", "switch");

  const pill = document.createElement("span");
  const knob = document.createElement("span");
  knob.className =
    "rounded-full border border-[color:var(--gray-0)] bg-[color:var(--gray-0)] shadow-sm transition-transform duration-200 ease-out h-4 w-4";
  pill.append(knob);
  btn.append(pill);

  const apply = () => {
    btn.setAttribute("aria-checked", String(value));
    btn.className =
      "inline-flex items-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-token-focus-border focus-visible:rounded-full cursor-interaction";
    pill.className =
      "relative inline-flex shrink-0 items-center rounded-full transition-colors duration-200 ease-out h-5 w-8 " +
      (value ? "bg-token-charts-blue" : "bg-token-foreground/20");
    knob.style.transform = value ? "translateX(14px)" : "translateX(2px)";
  };

  btn.onclick = async () => {
    value = !value;
    apply();
    await onChange?.(value);
  };

  apply();
  return btn;
}
```

## Link Button

```js
function linkButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "inline-flex items-center gap-1 text-sm text-token-text-link-foreground hover:underline cursor-interaction";
  button.textContent = label;
  button.onclick = onClick;
  return button;
}
```

## Inject Styles Safely

```js
let style;

module.exports = {
  start(api) {
    if (api.process !== "renderer") return;

    style = document.createElement("style");
    style.dataset.tweak = api.manifest.id;
    style.textContent = `
      [data-my-tweak-highlight="true"] {
        outline: 1px solid var(--color-token-border-focus);
      }
    `;
    document.head.append(style);
  },

  stop() {
    style?.remove();
    style = null;
  },
};
```

## Observe Re-rendered Codex UI

Codex re-renders frequently. Make DOM patches idempotent.

```js
let observer;

function patchComposer(api) {
  const composer = document.querySelector("[data-testid='composer']");
  if (!composer || composer.dataset.myTweakPatched === "true") return;
  composer.dataset.myTweakPatched = "true";
  composer.append(document.createTextNode(""));
  api.log.info("composer patched");
}

module.exports = {
  start(api) {
    if (api.process !== "renderer") return;

    patchComposer(api);
    observer = new MutationObserver(() => patchComposer(api));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  },

  stop() {
    observer?.disconnect();
    observer = null;
    document.querySelectorAll("[data-my-tweak-patched]").forEach((el) => {
      delete el.dataset.myTweakPatched;
    });
  },
};
```

## Override a Button Carefully

```js
const off = [];

async function replaceSend(api) {
  const original = await api.react.waitForElement("button[aria-label='Send']", 5000);
  const clone = original.cloneNode(true);
  original.replaceWith(clone);

  const handler = (event) => {
    event.preventDefault();
    event.stopPropagation();
    api.log.info("custom send behavior");
  };

  clone.addEventListener("click", handler, true);
  off.push(() => clone.removeEventListener("click", handler, true));
}

module.exports = {
  start(api) {
    if (api.process === "renderer") void replaceSend(api);
  },
  stop() {
    while (off.length) off.pop()();
  },
};
```

## React Fiber Utilities

Use `api.react` only as an escape hatch.

```js
const composer = await api.react.waitForElement("[data-testid='composer']", 8000);
const fiber = api.react.getFiber(composer);
const owner = api.react.findOwnerByName(composer, "Composer");
api.log.debug("props", fiber?.memoizedProps);
```

Component names and fiber layout can change across Codex builds. Prefer stable
DOM selectors and no-op fallback behavior.

## Practical Rules

- Keep UI dense and consistent with nearby Codex settings.
- Avoid hard-coded colors unless you are matching an existing token fallback.
- Use `textContent` unless you control and trust the HTML string.
- Add `data-*` markers to injected DOM.
- Make repeated patches no-op when already applied.
- Disconnect observers and remove global listeners in `stop()`.
