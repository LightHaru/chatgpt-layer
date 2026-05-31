import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";

const require = createRequire(import.meta.url);
const hostPath = join(process.cwd(), "packages/native-host/dist/codexpp_native_host.node");

test("native host reports AppKit and Metal capabilities", { skip: process.platform !== "darwin" }, () => {
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
