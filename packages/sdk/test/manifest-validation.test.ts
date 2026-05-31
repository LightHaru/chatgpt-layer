import assert from "node:assert/strict";
import test from "node:test";
import { validateTweakManifest } from "../src/index";

test("validateTweakManifest accepts a complete manifest", () => {
  const result = validateTweakManifest({
    id: "com.example.tweak",
    name: "Example Tweak",
    version: "0.1.0",
    githubRepo: "example/tweak",
    scope: "both",
    permissions: ["settings", "ipc", "filesystem"],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("validateTweakManifest accepts Owl bridge permissions", () => {
  const result = validateTweakManifest({
    id: "com.example.native-tweak",
    name: "Native Tweak",
    version: "1.0.0",
    githubRepo: "example/native-tweak",
    permissions: [
      "codex-runtime",
      "codex-windows",
      "codex-views",
      "codex-cdp",
      "native-module",
      "native-view",
      "native-helper",
    ],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("validateTweakManifest accepts a manifest MCP server", () => {
  const result = validateTweakManifest({
    id: "com.example.tweak",
    name: "Example Tweak",
    version: "0.1.0",
    githubRepo: "example/tweak",
    mcp: {
      command: "node",
      args: ["mcp-server.js"],
      env: { EXAMPLE: "1" },
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("validateTweakManifest rejects malformed MCP server config", () => {
  const result = validateTweakManifest({
    id: "com.example.tweak",
    name: "Example Tweak",
    version: "0.1.0",
    githubRepo: "example/tweak",
    mcp: {
      command: "",
      args: ["mcp-server.js", 1],
      env: { EXAMPLE: true },
    },
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((issue) => issue.path),
    ["mcp.command", "mcp.args", "mcp.env.EXAMPLE"],
  );
});

test("validateTweakManifest rejects non-object manifests", () => {
  const result = validateTweakManifest(null);

  assert.equal(result.ok, false);
  assert.equal(result.errors[0]?.path, "$");
});

test("validateTweakManifest requires core fields", () => {
  const result = validateTweakManifest({});

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((issue) => issue.path),
    ["id", "name", "version", "githubRepo"],
  );
});

test("validateTweakManifest rejects invalid scope and permissions", () => {
  const result = validateTweakManifest({
    id: "com.example.tweak",
    name: "Example Tweak",
    version: "0.1.0",
    githubRepo: "example/tweak",
    scope: "global",
    permissions: ["settings", "root"],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.errors.map((issue) => issue.path),
    ["scope", "permissions"],
  );
});

test("validateTweakManifest warns on non-semver versions", () => {
  const result = validateTweakManifest({
    id: "com.example.tweak",
    name: "Example Tweak",
    version: "latest",
    githubRepo: "example/tweak",
  });

  assert.equal(result.ok, true);
  assert.equal(result.warnings[0]?.path, "version");
});
