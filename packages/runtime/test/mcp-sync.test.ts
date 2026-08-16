import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildManagedMcpBlock,
  mcpServerNameFromTweakId,
  syncManagedMcpServers,
} from "../src/mcp-sync";

test("mcpServerNameFromTweakId matches Bennett tweak names", () => {
  assert.equal(mcpServerNameFromTweakId("co.bennett.native-widgets"), "native-widgets");
  assert.equal(mcpServerNameFromTweakId("co.bennett.project-home"), "project-home");
  assert.equal(mcpServerNameFromTweakId("com.example.my-widget"), "com-example-my-widget");
});

test("buildManagedMcpBlock creates TOML entries and resolves local server scripts", () => {
  withTempDir((root) => {
    const tweakDir = join(root, "co.bennett.native-widgets");
    mkdirSync(tweakDir, { recursive: true });
    writeFileSync(join(tweakDir, "mcp-server.js"), "");

    const built = buildManagedMcpBlock([
      {
        dir: tweakDir,
        manifest: {
          id: "co.bennett.native-widgets",
          mcp: {
            command: "node",
            args: ["mcp-server.js"],
            env: { WIDGETS: "1" },
          },
        },
      },
    ]);

    assert.deepEqual(built.serverNames, ["native-widgets"]);
    assert.equal(built.skippedServerNames.length, 0);
    assert.match(built.block, /\[mcp_servers\.native-widgets\]/);
    assert.match(built.block, /command = "node"/);
    const serverScript = join(tweakDir, "mcp-server.js");
    assert.match(built.block, new RegExp(`args = \\[${escapeRegExp(JSON.stringify(serverScript))}\\]`));
    assert.match(built.block, /env = \{ WIDGETS = "1" \}/);
  });
});

test("buildManagedMcpBlock skips user-managed server names", () => {
  withTempDir((root) => {
    const built = buildManagedMcpBlock(
      [
        {
          dir: root,
          manifest: {
            id: "co.bennett.project-home",
            mcp: { command: "node", args: ["server.js"] },
          },
        },
      ],
      `[mcp_servers.project-home]\ncommand = "node"\n`,
    );

    assert.equal(built.block, "");
    assert.deepEqual(built.serverNames, []);
    assert.deepEqual(built.skippedServerNames, ["project-home"]);
  });
});

test("syncManagedMcpServers updates only the managed config block", () => {
  withTempDir((root) => {
    const configPath = join(root, ".codex", "config.toml");
    mkdirSync(join(root, ".codex"), { recursive: true });
    writeFileSync(configPath, `[mcp_servers.project-home]\ncommand = "node"\n`);

    const first = syncManagedMcpServers({
      configPath,
      tweaks: [
        {
          dir: root,
          manifest: {
            id: "co.bennett.native-widgets",
            mcp: { command: "node", args: ["mcp-server.js"] },
          },
        },
      ],
    });
    const afterFirst = readFileSync(configPath, "utf8");

    assert.equal(first.changed, true);
    assert.match(afterFirst, /\[mcp_servers\.project-home\]/);
    assert.match(afterFirst, /# BEGIN CODEX\+\+ MANAGED MCP SERVERS/);
    assert.match(afterFirst, /\[mcp_servers\.native-widgets\]/);

    const second = syncManagedMcpServers({ configPath, tweaks: [] });
    const afterSecond = readFileSync(configPath, "utf8");

    assert.equal(second.changed, true);
    assert.match(afterSecond, /\[mcp_servers\.project-home\]/);
    assert.doesNotMatch(afterSecond, /native-widgets/);
    assert.doesNotMatch(afterSecond, /CODEX\+\+ MANAGED/);
  });
});

test("syncManagedMcpServers leaves user config untouched when there are no MCP tweaks", () => {
  withTempDir((root) => {
    const configPath = join(root, ".codex", "config.toml");
    mkdirSync(join(root, ".codex"), { recursive: true });
    const original = `[mcp_servers.project-home]\ncommand = "node"\n\n`;
    writeFileSync(configPath, original);

    const result = syncManagedMcpServers({ configPath, tweaks: [] });

    assert.equal(result.changed, false);
    assert.equal(readFileSync(configPath, "utf8"), original);
  });
});

test("syncManagedMcpServers creates the Codex config directory", () => {
  withTempDir((root) => {
    const configPath = join(root, ".codex", "config.toml");

    syncManagedMcpServers({
      configPath,
      tweaks: [
        {
          dir: root,
          manifest: { id: "co.bennett.native-widgets", mcp: { command: "node" } },
        },
      ],
    });

    assert.equal(existsSync(configPath), true);
  });
});

function withTempDir(fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), "codexpp-mcp-sync-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true, maxRetries: 5 });
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
