import assert from "node:assert/strict";
import test from "node:test";
import {
  getRuntimeCapabilities,
  getRuntimeInfo,
  inspectWindowServices,
  probeRuntimeCompatibility,
  selectPreloadRegistration,
  type RuntimeProbeEnv,
  type RuntimeProbeOptions,
} from "../src/codex-runtime-probe";

const noop = () => {};

function isolatedEnv(partial: RuntimeProbeEnv = {}): RuntimeProbeEnv {
  return {
    platform: "linux",
    execPath: "/usr/bin/node",
    resourcesPath: null,
    existsSync: () => false,
    app: null,
    session: null,
    browserWindow: null,
    browserView: null,
    getWindowServices: () => null,
    inspectExistingWindow: () => null,
    inspectBrowserView: () => null,
    processEnv: {},
    ...partial,
  };
}

function opts(env: RuntimeProbeEnv, extra: Partial<RuntimeProbeOptions> = {}): RuntimeProbeOptions {
  return {
    userRoot: "/tmp/codexpp-user",
    runtimeDir: "/tmp/codexpp-runtime",
    codexVersion: extra.codexVersion === undefined ? "26.527.31326" : extra.codexVersion,
    channel: extra.channel ?? "stable",
    getWindowServices: env.getWindowServices ?? (() => null),
    env,
    ...extra,
  };
}

function owlFrameworkEnv(partial: RuntimeProbeEnv = {}): RuntimeProbeEnv {
  return isolatedEnv({
    platform: "darwin",
    execPath: "/Applications/Codex.app/Contents/MacOS/Codex",
    resourcesPath: "/Applications/Codex.app/Contents/Resources",
    existsSync: (path) =>
      path.includes("Codex Framework.framework") || path.endsWith("app.asar"),
    app: {
      getVersion: () => "26.527.31326",
      getAppPath: () => "/Applications/Codex.app/Contents/Resources/app.asar",
      isPackaged: true,
    },
    session: {
      defaultSession: {
        registerPreloadScript: () => "codex-plusplus",
        setPreloads: noop,
        getPreloads: () => [],
      },
    },
    browserWindow: { fromId: () => null, getFocusedWindow: () => null, getAllWindows: () => [] },
    browserView: function BrowserView() {},
    getWindowServices: () => modernOwlServices(),
    inspectExistingWindow: () => ({
      addBrowserView: noop,
      contentView: { addChildView: noop, removeChildView: noop },
    }),
    inspectBrowserView: () => ({
      present: true,
      webContentsView: { setBounds: noop },
      setBounds: noop,
    }),
    ...partial,
  });
}

function modernOwlServices() {
  return {
    getPrimaryWindow: () => ({}),
    createFreshWindow: async () => ({}),
    windowManager: {
      createWindow: async () => ({}),
      getPrimaryWindow: () => ({}),
      registerWindow: noop,
    },
  };
}

test("A: modern Owl-style capabilities are supported", () => {
  const env = owlFrameworkEnv();
  const snapshot = probeRuntimeCompatibility(opts(env));
  const capabilities = getRuntimeCapabilities(opts(env));
  const info = getRuntimeInfo(opts(env));

  assert.equal(snapshot.runtimeType, "owl");
  assert.equal(snapshot.shell.owl, true);
  assert.equal(snapshot.shell.electronCompatible, true);
  assert.equal(snapshot.support.level, "supported");
  assert.equal(snapshot.preload.registerPreloadScript, true);
  assert.equal(snapshot.windows.windowServices, true);
  assert.equal(snapshot.windows.createWindow, true);
  assert.equal(snapshot.windows.getPrimaryWindow, true);
  assert.equal(snapshot.windows.registerWindow, true);
  assert.equal(snapshot.views.privateViewTree, true);
  assert.equal(snapshot.views.webContentsView, true);
  assert.equal(snapshot.views.browserView, true);
  assert.equal(info.type, "owl");
  assert.equal(info.codexVersion, "26.527.31326");
  assert.equal(capabilities.windows.create, true);
  assert.equal(capabilities.windows.primary, true);
  assert.equal(capabilities.windows.browserView, true);
  assert.equal(capabilities.views.create, true);
  assert.equal(capabilities.views.privateViewTree, true);
  assert.equal(capabilities.views.webContentsView, true);
  assert.equal(capabilities.views.browserViewFallback, true);
});

test("B: Electron-compatible fallback is degraded and keeps harmless attach", () => {
  const env = isolatedEnv({
    platform: "darwin",
    execPath: "/Applications/Codex.app/Contents/MacOS/Codex",
    resourcesPath: "/Applications/Codex.app/Contents/Resources",
    existsSync: (path) =>
      path.includes("Electron Framework.framework") || path.endsWith("app.asar"),
    app: {
      getVersion: () => "1.2.3",
      getAppPath: () => "/Applications/Codex.app/Contents/Resources/app.asar",
      isPackaged: true,
    },
    session: {
      defaultSession: {
        setPreloads: noop,
        getPreloads: () => [],
      },
    },
    browserWindow: { fromId: () => null },
    browserView: function BrowserView() {},
    inspectExistingWindow: () => ({ addBrowserView: noop }),
    inspectBrowserView: () => ({ present: true }),
  });
  const snapshot = probeRuntimeCompatibility(opts(env));
  const capabilities = getRuntimeCapabilities(opts(env));

  assert.equal(snapshot.runtimeType, "electron");
  assert.equal(snapshot.shell.owl, false);
  assert.equal(snapshot.shell.electronCompatible, true);
  assert.equal(snapshot.support.level, "degraded");
  assert.equal(snapshot.preload.registerPreloadScript, false);
  assert.equal(snapshot.preload.setPreloadsFallback, true);
  assert.equal(capabilities.windows.create, false);
  assert.equal(capabilities.windows.primary, false);
  assert.equal(capabilities.windows.browserView, false);
  assert.equal(capabilities.views.privateViewTree, false);
  assert.equal(capabilities.views.webContentsView, false);
  assert.equal(capabilities.views.browserViewFallback, true);
  assert.equal(capabilities.views.create, true);
  assert.equal(capabilities.windows.focus, true);
});

test("C: missing private contentView degrades to BrowserView fallback", () => {
  const env = owlFrameworkEnv({
    inspectExistingWindow: () => ({ addBrowserView: noop }),
    inspectBrowserView: () => ({ present: true }),
  });
  const snapshot = probeRuntimeCompatibility(opts(env));
  const capabilities = getRuntimeCapabilities(opts(env));

  assert.equal(snapshot.runtimeType, "owl");
  assert.equal(snapshot.support.level, "degraded");
  assert.match(snapshot.support.reasons.join("\n"), /BrowserView fallback/);
  assert.equal(snapshot.views.privateViewTree, false);
  assert.equal(snapshot.views.contentView, false);
  assert.equal(snapshot.views.webContentsView, false);
  assert.equal(snapshot.views.browserView, true);
  assert.equal(capabilities.views.privateViewTree, false);
  assert.equal(capabilities.views.browserViewFallback, true);
  assert.equal(capabilities.views.create, true);
  assert.equal(capabilities.windows.create, true);
});

test("D: window services unavailable fail closed for privileged window APIs", () => {
  const env = owlFrameworkEnv({
    getWindowServices: () => null,
  });
  const snapshot = probeRuntimeCompatibility(opts(env));
  const capabilities = getRuntimeCapabilities(opts(env));

  assert.equal(snapshot.windows.windowServices, false);
  assert.equal(snapshot.windows.createWindow, false);
  assert.equal(snapshot.windows.getPrimaryWindow, false);
  assert.equal(snapshot.windows.registerWindow, false);
  assert.equal(capabilities.windows.create, false);
  assert.equal(capabilities.windows.primary, false);
  assert.equal(capabilities.windows.browserView, false);
  assert.equal(snapshot.support.level, "degraded");
  assert.match(snapshot.support.reasons.join("\n"), /window services unavailable/);
  assert.equal(capabilities.views.browserViewFallback, true);
  assert.equal(capabilities.views.create, true);
  assert.equal(snapshot.preload.registerPreloadScript, true);
});

test("E: unknown runtime fails closed for privileged surfaces", () => {
  const env = isolatedEnv();
  const snapshot = probeRuntimeCompatibility(opts(env, { codexVersion: null, channel: null }));
  const capabilities = getRuntimeCapabilities(opts(env, { codexVersion: null }));

  assert.equal(snapshot.runtimeType, "unknown");
  assert.equal(snapshot.support.level, "unknown");
  assert.equal(snapshot.shell.owl, false);
  assert.equal(snapshot.shell.electronCompatible, false);
  assert.equal(snapshot.windows.createWindow, false);
  assert.equal(snapshot.windows.windowServices, false);
  assert.equal(snapshot.preload.registerPreloadScript, false);
  assert.equal(snapshot.preload.setPreloadsFallback, false);
  assert.equal(snapshot.views.browserView, false);
  assert.equal(snapshot.views.privateViewTree, false);
  assert.equal(capabilities.windows.create, false);
  assert.equal(capabilities.windows.primary, false);
  assert.equal(capabilities.windows.focus, false);
  assert.equal(capabilities.views.create, false);
  assert.equal(capabilities.views.browserViewFallback, false);
});

test("F: missing registerPreloadScript keeps setPreloads fallback", () => {
  const env = owlFrameworkEnv({
    session: {
      defaultSession: {
        setPreloads: noop,
        getPreloads: () => [],
      },
    },
  });
  const snapshot = probeRuntimeCompatibility(opts(env));

  assert.equal(selectPreloadRegistration(env.session && "defaultSession" in env.session ? env.session.defaultSession : env.session), "setPreloads");
  assert.equal(snapshot.preload.registerPreloadScript, false);
  assert.equal(snapshot.preload.setPreloadsFallback, true);
  assert.equal(snapshot.support.level, "degraded");
  assert.match(snapshot.support.reasons.join("\n"), /setPreloads fallback/);
  assert.equal(snapshot.windows.createWindow, true);
});

test("G: future/unknown app version with valid capabilities stays supported", () => {
  const env = owlFrameworkEnv({
    app: {
      getVersion: () => "99.0.0-future",
      getAppPath: () => "/Applications/Codex.app/Contents/Resources/app.asar",
      isPackaged: true,
    },
  });
  const snapshot = probeRuntimeCompatibility(opts(env, { codexVersion: "99.0.0-future" }));
  const info = getRuntimeInfo(opts(env, { codexVersion: "99.0.0-future" }));
  const capabilities = getRuntimeCapabilities(opts(env, { codexVersion: "99.0.0-future" }));

  assert.equal(snapshot.appVersion, "99.0.0-future");
  assert.equal(info.codexVersion, "99.0.0-future");
  assert.equal(snapshot.support.level, "supported");
  assert.equal(snapshot.runtimeType, "owl");
  assert.equal(capabilities.windows.create, true);
  assert.equal(capabilities.views.privateViewTree, true);
  assert.doesNotMatch(snapshot.support.reasons.join("\n"), /version/);
});

test("inspectWindowServices fails closed when privileged factories are missing", () => {
  assert.deepEqual(inspectWindowServices(null), {
    present: false,
    createWindow: false,
    createFreshWindow: false,
    createFreshLocalWindow: false,
    ensureHostWindow: false,
    getPrimaryWindow: false,
    getPrimaryWindowFromManager: false,
    registerWindow: false,
    canCreate: false,
  });
  assert.equal(inspectWindowServices({ windowManager: {} }).canCreate, false);
  assert.equal(inspectWindowServices({ createFreshWindow: noop }).canCreate, true);
});

test("selectPreloadRegistration prefers registerPreloadScript then setPreloads", () => {
  assert.equal(selectPreloadRegistration({ registerPreloadScript: noop, setPreloads: noop }), "registerPreloadScript");
  assert.equal(selectPreloadRegistration({ setPreloads: noop }), "setPreloads");
  assert.equal(selectPreloadRegistration({}), "unavailable");
  assert.equal(selectPreloadRegistration(null), "unavailable");
});

test("public runtime info/capability shape stays additive-compatible", () => {
  const capabilities = getRuntimeCapabilities(opts(isolatedEnv(), { codexVersion: null }));
  const info = getRuntimeInfo(opts(isolatedEnv(), { codexVersion: null, channel: null }));
  assert.deepEqual(Object.keys(info).sort(), [
    "appPath",
    "buildFlavor",
    "channel",
    "codexVersion",
    "resourcesPath",
    "type",
    "usesOwlAppShell",
  ]);
  assert.deepEqual(Object.keys(capabilities).sort(), ["cdp", "native", "views", "windows"]);
  assert.deepEqual(Object.keys(capabilities.windows).sort(), ["browserView", "create", "focus", "primary"]);
  assert.deepEqual(Object.keys(capabilities.views).sort(), [
    "browserViewFallback",
    "create",
    "privateViewTree",
    "webContentsView",
  ]);
});
