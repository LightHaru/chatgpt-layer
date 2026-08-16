import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPrivilegedIpcSender,
  classifyIpcSender,
  isLayerAutoUpdateEnabled,
  isPrivilegedIpcChannel,
  isPrivilegedIpcSender,
  stripRendererUpdateRepo,
} from "../src/ipc-guard";

test("auto-update is opt-in and defaults off", () => {
  assert.equal(isLayerAutoUpdateEnabled(undefined), false);
  assert.equal(isLayerAutoUpdateEnabled(null), false);
  assert.equal(isLayerAutoUpdateEnabled(false), false);
  assert.equal(isLayerAutoUpdateEnabled(true), true);
});

test("privileged IPC channels include install, self-update, native, and fs", () => {
  assert.equal(isPrivilegedIpcChannel("codexpp:install-store-tweak"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:install-github-tweak"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:run-codexpp-update"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:set-update-config"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:native-launch-helper"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:codex-window-create"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:tweak-fs"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:copy-text"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:reveal"), true);
  assert.equal(isPrivilegedIpcChannel("codexpp:list-tweaks"), false);
});

test("IPC sender checks allow ChatGPT windows and reject guests", () => {
  const windowSender = { id: 1, getType: () => "window" };
  const chatView = { id: 2, getType: () => "browserView" };
  const webview = { id: 3, getType: () => "webview" };
  const untrustedView = { id: 99, getType: () => "browserView" };
  const untrusted = new Set([99]);

  assert.equal(classifyIpcSender(windowSender, untrusted), "privileged");
  assert.equal(classifyIpcSender(chatView, untrusted), "privileged");
  assert.equal(classifyIpcSender(webview, untrusted), "guest");
  assert.equal(classifyIpcSender(untrustedView, untrusted), "guest");
  assert.equal(isPrivilegedIpcSender(untrustedView, untrusted), false);
  assert.throws(
    () => assertPrivilegedIpcSender("codexpp:tweak-fs", untrustedView, untrusted),
    /untrusted frame/,
  );
  assert.doesNotThrow(() => assertPrivilegedIpcSender("codexpp:tweak-fs", windowSender, untrusted));
});

test("renderer IPC cannot set updateRepo", () => {
  const stripped = stripRendererUpdateRepo({
    updateChannel: "custom" as const,
    updateRepo: "evil/repo",
    updateRef: "v1.0.0",
  });
  assert.equal("updateRepo" in stripped, false);
  assert.equal(stripped.updateChannel, "custom");
  assert.equal(stripped.updateRef, "v1.0.0");
});
