# MCP Servers

Tweaks can declare MCP servers in `manifest.json`. Codex++ syncs enabled
tweak-declared servers into Codex's `~/.codex/config.toml`.

## Manifest

```json
{
  "id": "com.you.tools",
  "name": "Tools",
  "version": "0.1.0",
  "githubRepo": "you/tools",
  "scope": "main",
  "mcp": {
    "command": "node",
    "args": ["mcp-server.js"],
    "env": {
      "TOOLS_MODE": "codex"
    }
  }
}
```

## Generated Config

Codex++ writes managed entries between markers:

```toml
# BEGIN CODEX++ MANAGED MCP SERVERS
[mcp_servers.tools]
command = "node"
args = ["/absolute/path/to/tweak/mcp-server.js"]
env = { TOOLS_MODE = "codex" }
# END CODEX++ MANAGED MCP SERVERS
```

The managed block is rewritten when tweaks reload.

## Server Names

The default server name is derived from the tweak id:

- `co.bennett.project-home` -> `project-home`
- `com.you.tools` -> `com-you-tools`

If a generated name conflicts with another managed name, Codex++ appends
`-2`, `-3`, and so on.

If the user already has a manual `[mcp_servers.<name>]` entry outside the
managed block, Codex++ skips that managed server instead of overwriting it.

## Path Resolution

Rules:

- Absolute `command` values are used as-is.
- Relative/file-looking `command` values such as `./server.js` are resolved
  against the tweak directory.
- Command names such as `node`, `python`, or `uvx` are left as-is.
- `args` that are absolute or start with `-` are left as-is.
- Other `args` are resolved against the tweak directory only when the target
  file exists.

## Enable/Disable

Only enabled tweaks are synced. Disabling a tweak from Settings -> Tweaks
removes its managed MCP entry on the next reload.

## Validation

`manifest.mcp.command` must be a non-empty string. `args` must be string array
when present. `env` must be an object of string values.
