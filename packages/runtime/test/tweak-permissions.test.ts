import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import type { TweakManifest, TweakPermission } from "@codex-plusplus/sdk";
import {
  LAYER_ADMIN_IPC_CHANNELS,
  TWEAK_CAPABILITY_IPC_CHANNELS,
  TWEAK_PERMISSION_ALIASES,
  authorizeTweakCapability,
  bindOwnedTweakId,
  createBoundTweakFs,
  createBoundTweakIpc,
  createDeniedTweakFs,
  createDeniedTweakIpc,
  hasExplicitPermissions,
  hasTweakPermission,
  isLayerAdminIpcChannel,
  isLegacyPermissionManifest,
  normalizePermission,
  permissionDeniedMessage,
  planTweakApi,
  scopedTweakIpcChannel,
  tweakApiSurface,
  tweakPermissionForIpcChannel,
  type TweakIdentitySnapshot,
} from "../src/tweak-permissions";

function manifest(overrides: Partial<TweakManifest> = {}): TweakManifest {
  return {
    id: "com.example.foo",
    name: "Foo",
    version: "0.1.0",
    githubRepo: "example/foo",
    ...overrides,
  };
}

function snapshot(
  overrides: {
    id?: string;
    enabled?: boolean;
    permissions?: TweakManifest["permissions"];
    manifest?: TweakManifest;
  } = {},
): TweakIdentitySnapshot {
  const m = overrides.manifest ?? manifest({
    id: overrides.id ?? "com.example.foo",
    ...(overrides.permissions !== undefined ? { permissions: overrides.permissions } : {}),
  });
  if (overrides.permissions !== undefined && overrides.manifest === undefined) {
    m.permissions = overrides.permissions;
  }
  return {
    id: overrides.id ?? m.id,
    enabled: overrides.enabled ?? true,
    dir: `/tweaks/${overrides.id ?? m.id}`,
    manifest: m,
  };
}

test("legacy absent permissions keeps old behavior", () => {
  const legacy = manifest();
  assert.equal(isLegacyPermissionManifest(legacy), true);
  assert.equal(hasExplicitPermissions(legacy), false);
  for (const permission of [
    "settings",
    "ipc",
    "filesystem",
    "network",
    "codex-runtime",
    "codex-windows",
    "codex-views",
    "codex-cdp",
    "native-module",
    "native-view",
    "native-helper",
    "codex-sessions",
  ] as TweakPermission[]) {
    assert.equal(hasTweakPermission(legacy, permission), true, permission);
  }
  const plan = planTweakApi(legacy);
  assert.equal(plan.settings, "present");
  assert.equal(plan.ipc, "present");
  assert.equal(plan.fs, "present");
  assert.equal(plan.codex, "present");
  assert.equal(plan.codexWindows, "present");
  assert.equal(plan.nativeModule, "present");
  assert.equal(plan.codexSessions, "present");
});

test("permissions: [] grants no optional capabilities", () => {
  const empty = manifest({ permissions: [] });
  assert.equal(isLegacyPermissionManifest(empty), false);
  assert.equal(hasExplicitPermissions(empty), true);
  const surface = tweakApiSurface(empty);
  assert.equal(surface.settings, false);
  assert.equal(surface.ipc, false);
  assert.equal(surface.filesystem, false);
  assert.equal(surface.codexWindows, false);
  assert.equal(surface.nativeHelper, false);
  assert.equal(surface.codexSessions, false);
  const plan = planTweakApi(empty);
  assert.equal(plan.settings, "omitted");
  assert.equal(plan.ipc, "denied");
  assert.equal(plan.fs, "denied");
  assert.equal(plan.codex, "omitted");
  assert.equal(plan.codexSessions, "denied");
});

test("settings permission allows settings API", () => {
  const m = manifest({ permissions: ["settings"] });
  assert.equal(hasTweakPermission(m, "settings"), true);
  assert.equal(planTweakApi(m).settings, "present");
  assert.equal(planTweakApi(m).ipc, "denied");
});

test("filesystem permission allows own tweak data", () => {
  const tweak = snapshot({ permissions: ["filesystem"] });
  const authorized = authorizeTweakCapability(tweak, tweak.id, "filesystem", tweak.id);
  assert.equal(authorized.id, "com.example.foo");
  const calls: unknown[][] = [];
  const fs = createBoundTweakFs(tweak.id, async (...args) => {
    calls.push(args);
    return "ok";
  });
  return fs.read("notes.txt").then((value) => {
    assert.equal(value, "ok");
    assert.deepEqual(calls[0], ["codexpp:tweak-fs", "read", "com.example.foo", "notes.txt"]);
  });
});

test("filesystem without permission is denied", () => {
  const m = manifest({ permissions: ["settings"] });
  assert.equal(hasTweakPermission(m, "filesystem"), false);
  const tweak = snapshot({ permissions: ["settings"] });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "filesystem"),
    /tweak com.example.foo must declare filesystem permission/,
  );
  const fs = createDeniedTweakFs("com.example.foo");
  return assert.rejects(fs.read("notes.txt"), /must declare filesystem permission/);
});

test("tweak A cannot fs using tweak B's id", () => {
  assert.throws(
    () => bindOwnedTweakId("com.example.a", "com.example.b"),
    /tweak com.example.a cannot use tweak com.example.b's identity/,
  );
  const b = snapshot({ id: "com.example.b", permissions: ["filesystem"], manifest: manifest({ id: "com.example.b", permissions: ["filesystem"] }) });
  assert.throws(
    () => authorizeTweakCapability(b, "com.example.b", "filesystem", "com.example.a"),
    /cannot use tweak com.example.b's identity/,
  );
  const calls: unknown[][] = [];
  const fs = createBoundTweakFs("com.example.a", async (...args) => {
    calls.push(args);
    return true;
  });
  return fs.exists("x").then(() => {
    assert.equal(calls[0]?.[2], "com.example.a");
    assert.notEqual(calls[0]?.[2], "com.example.b");
  });
});

test("codex-windows and codex.windows aliases are equivalent", () => {
  assert.equal(normalizePermission("codex.windows"), "codex-windows");
  assert.equal(TWEAK_PERMISSION_ALIASES["codex.windows"], "codex-windows");
  assert.equal(hasTweakPermission(manifest({ permissions: ["codex.windows"] }), "codex-windows"), true);
  assert.equal(hasTweakPermission(manifest({ permissions: ["codex-windows"] }), "codex.windows"), true);
  const dotted = snapshot({ permissions: ["codex.windows"] });
  assert.equal(authorizeTweakCapability(dotted, dotted.id, "codex-windows").id, dotted.id);
  const dashed = snapshot({ permissions: ["codex-windows"] });
  assert.equal(authorizeTweakCapability(dashed, dashed.id, "codex.windows").id, dashed.id);
});

test("codex-views and codex.views aliases are equivalent", () => {
  assert.equal(normalizePermission("codex.views"), "codex-views");
  assert.equal(hasTweakPermission(manifest({ permissions: ["codex.views"] }), "codex-views"), true);
  assert.equal(hasTweakPermission(manifest({ permissions: ["codex-views"] }), "codex.views"), true);
  const dotted = snapshot({ permissions: ["codex.views"] });
  assert.doesNotThrow(() => authorizeTweakCapability(dotted, dotted.id, "codex-views"));
});

test("window create denied without window permission", () => {
  const tweak = snapshot({ permissions: ["settings"] });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "codex-windows"),
    /must declare codex-windows permission/,
  );
  assert.equal(tweakPermissionForIpcChannel("codexpp:codex-window-create"), "codex-windows");
});

test("view create denied without view permission", () => {
  const tweak = snapshot({ permissions: ["codex-windows"] });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "codex-views"),
    /must declare codex-views permission/,
  );
  assert.equal(tweakPermissionForIpcChannel("codexpp:codex-view-create"), "codex-views");
});

test("native-module denied without it", () => {
  const tweak = snapshot({ permissions: ["native-view"] });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "native-module"),
    /must declare native-module permission/,
  );
});

test("native-view denied without it", () => {
  const tweak = snapshot({ permissions: ["native-module"] });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "native-view"),
    /must declare native-view permission/,
  );
});

test("native-helper denied without it", () => {
  const tweak = snapshot({ permissions: ["native-module"] });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "native-helper"),
    /must declare native-helper permission/,
  );
});

test("disabled tweak cannot use privileged capability", () => {
  const tweak = snapshot({ permissions: ["filesystem", "codex-windows"], enabled: false });
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "filesystem"),
    /tweak is disabled: com.example.foo/,
  );
  assert.throws(
    () => authorizeTweakCapability(tweak, tweak.id, "codex-windows"),
    /tweak is disabled/,
  );
});

test("unknown tweak id fails closed", () => {
  assert.throws(
    () => authorizeTweakCapability(undefined, "com.unknown.tweak", "filesystem"),
    /unknown tweak: com.unknown.tweak/,
  );
  assert.throws(
    () => authorizeTweakCapability(undefined, "../evil", "filesystem"),
    /bad tweak id/,
  );
  assert.throws(() => bindOwnedTweakId("bad id", "bad id"), /bad tweak id/);
});

test("Layer built-in admin UI remains functional", () => {
  const mainSource = readFileSync(resolve(process.cwd(), "packages/runtime/src/main.ts"), "utf8");
  for (const channel of LAYER_ADMIN_IPC_CHANNELS) {
    assert.equal(isLayerAdminIpcChannel(channel), true);
    assert.equal(tweakPermissionForIpcChannel(channel), undefined);
    assert.match(mainSource, new RegExp(`privilegedHandle\\("${channel}"`));
    const body = extractHandlerBody(mainSource, channel);
    assert.doesNotMatch(body, /assertAuthorizedTweak/);
    assert.doesNotMatch(body, /hasTweakPermission/);
  }
  assert.equal(
    LAYER_ADMIN_IPC_CHANNELS.some((channel) => channel in TWEAK_CAPABILITY_IPC_CHANNELS),
    false,
  );
});

test("legacy existing manifest remains compatible", () => {
  const writingTweaksExample = manifest({
    id: "com.you.my-tweak",
    name: "My Tweak",
    version: "0.1.0",
    githubRepo: "you/my-tweak",
    description: "Adds a Codex++ settings page.",
    scope: "renderer",
    main: "index.js",
  });
  assert.equal("permissions" in writingTweaksExample && writingTweaksExample.permissions !== undefined, false);
  const plan = planTweakApi(writingTweaksExample);
  assert.equal(plan.settings, "present");
  assert.equal(plan.ipc, "present");
  assert.equal(plan.fs, "present");
  assert.equal(plan.codex, "present");
  const authorized = authorizeTweakCapability(
    snapshot({
      id: writingTweaksExample.id,
      manifest: writingTweaksExample,
    }),
    writingTweaksExample.id,
    "settings",
  );
  assert.equal(authorized.enabled, true);
});

test("explicit manifests only receive authorized APIs", () => {
  const plan = planTweakApi(manifest({ permissions: ["settings", "filesystem"] }));
  assert.equal(plan.settings, "present");
  assert.equal(plan.fs, "present");
  assert.equal(plan.ipc, "denied");
  assert.equal(plan.codex, "omitted");
  assert.equal(plan.codexWindows, "denied");
  assert.equal(plan.nativeModule, "denied");

  const windowsOnly = planTweakApi(manifest({ permissions: ["codex-windows"] }));
  assert.equal(windowsOnly.settings, "omitted");
  assert.equal(windowsOnly.codex, "present");
  assert.equal(windowsOnly.codexWindows, "present");
  assert.equal(windowsOnly.codexViews, "denied");

  const ipc = createDeniedTweakIpc("com.example.foo");
  assert.throws(() => ipc.send("ping"), /must declare ipc permission/);
  assert.equal(permissionDeniedMessage("com.example.foo", "filesystem"), "tweak com.example.foo must declare filesystem permission");
});

test("tweak IPC channel names stay scoped as codexpp:<tweakId>:<channel>", () => {
  assert.equal(scopedTweakIpcChannel("com.example.foo", "ping"), "codexpp:com.example.foo:ping");
  const sent: unknown[][] = [];
  const ipc = createBoundTweakIpc("com.example.foo", {
    on() {},
    removeListener() {},
    send: (...args) => {
      sent.push(args);
    },
    invoke: async (...args) => args,
  });
  ipc.send("ping", 1);
  assert.deepEqual(sent[0], ["codexpp:com.example.foo:ping", 1]);
});

test("network permission is declarative only and is not an IPC gate", () => {
  assert.equal(tweakPermissionForIpcChannel("codexpp:tweak-fs"), "filesystem");
  assert.equal(
    Object.values(TWEAK_CAPABILITY_IPC_CHANNELS).includes("network" as never),
    false,
  );
  assert.equal(hasTweakPermission(manifest({ permissions: ["network"] }), "network"), true);
  assert.equal(hasTweakPermission(manifest({ permissions: [] }), "network"), false);
});

test("main IPC handlers authorize tweak identity for capability channels", () => {
  const mainSource = readFileSync(resolve(process.cwd(), "packages/runtime/src/main.ts"), "utf8");
  for (const channel of Object.keys(TWEAK_CAPABILITY_IPC_CHANNELS)) {
    assert.match(mainSource, new RegExp(`"${channel}"`));
    const body = extractHandlerBody(mainSource, channel);
    assert.match(body, /assertAuthorizedTweak\(/);
  }
  assert.match(mainSource, /privilegedHandle\("codexpp:codex-window-create"/);
  assert.match(mainSource, /privilegedHandle\("codexpp:codex-window-primary"/);
  assert.match(mainSource, /privilegedHandle\("codexpp:tweak-fs"/);
});


test("codex-sessions permission gates list/status capability", () => {
  assert.equal(tweakPermissionForIpcChannel("codexpp:codex-sessions-list"), "codex-sessions");
  assert.equal(tweakPermissionForIpcChannel("codexpp:codex-sessions-status"), "codex-sessions");
  const unauthorized = snapshot({ permissions: ["settings"] });
  assert.throws(
    () => authorizeTweakCapability(unauthorized, unauthorized.id, "codex-sessions"),
    /must declare codex-sessions permission/,
  );
  const allowed = snapshot({ permissions: ["codex-sessions"] });
  assert.equal(authorizeTweakCapability(allowed, allowed.id, "codex-sessions").id, allowed.id);
  assert.equal(planTweakApi(allowed).codexSessions, "present");
  assert.equal(planTweakApi(allowed).codex, "present");
  assert.equal(planTweakApi(manifest({ permissions: [] })).codexSessions, "denied");
});

function extractHandlerBody(source: string, channel: string): string {
  const marker = `"${channel}"`;
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, `missing IPC handler marker: ${channel}`);
  const arrowIndex = source.indexOf("=>", markerIndex);
  assert.notEqual(arrowIndex, -1, `missing IPC handler arrow: ${channel}`);
  const startBrace = source.indexOf("{", arrowIndex);
  let depth = 0;
  for (let i = startBrace; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;
    if (depth === 0) return source.slice(startBrace + 1, i);
  }
  assert.fail("missing closing brace");
}
