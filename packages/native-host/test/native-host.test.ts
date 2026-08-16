import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";

const nodeMajor = Number.parseInt(process.versions.node, 10);
// electron@41 requires Node >= 22.12; loading this addon on Node 20 SIGSEGVs.
// The addon is exercised on Node 22 / Electron 41. Windows already skips (darwin-only).
const skipNativeHost =
  process.platform !== "darwin"
    ? true
    : nodeMajor < 22
      ? "native host addon is exercised on Node 22 / Electron 41"
      : false;

const require = createRequire(import.meta.url);
const hostPath = join(process.cwd(), "packages/native-host/dist/codexpp_native_host.node");

test("native host reports AppKit and Metal capabilities", { skip: skipNativeHost }, () => {
  assert.equal(existsSync(hostPath), true, "native host must be built before tests");
  const host = require(hostPath) as {
    getCapabilities(): Record<string, unknown>;
  };
  const capabilities = host.getCapabilities();
  assert.equal(capabilities.available, true);
  assert.equal(capabilities.appKitEmbedding, true);
  assert.equal(capabilities.childWindowOverlay, true);
  assert.equal(capabilities.directViewAttach, false);
  assert.equal(typeof capabilities.metalViews, "boolean");
});
