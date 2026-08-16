/**
 * Production feasibility of a real Codex app-server child.
 *
 * Labels:
 *   PROVEN     — observed against official Codex upstream or this tree
 *   UNVERIFIED — no local Desktop/bundled evidence yet
 *   REFERENCE  — observed in b-nnett/codex-subscription-router (concepts only)
 *   TEST-ONLY  — implemented and tested with fixtures, not a production claim
 *   PLANNED    — designed, not enabled
 *   BLOCKED    — cannot ship until evidence exists
 *
 * Two separate facts:
 *   A. Upstream Codex app-server invocation (CLI / SDK) is PROVEN.
 *   B. ChatGPT Desktop's bundled spawn site / executable / argv is UNVERIFIED.
 *
 * This module does not spawn anything.
 */

/** Production Layer-owned child invocation. Still fail-closed. */
export const APP_SERVER_INVOCATION_STATUS = "BLOCKED" as const;

export const UPSTREAM_APP_SERVER_PROTOCOL = "PROVEN" as const;
export const UPSTREAM_APP_SERVER_STDIO_ARGV = "PROVEN" as const;

/**
 * Layer-owned internal argv matching current official Codex CLI / Python SDK.
 * Not a public API. Tweaks cannot change it. Desktop argv is never rewritten.
 */
export const UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED = ["app-server", "--listen", "stdio://"] as const;

/** Discovery-only shorthand recognized by the spawn probe. */
export const UPSTREAM_APP_SERVER_STDIO_SHORTHAND = ["app-server", "--stdio"] as const;

export const DESKTOP_BUNDLED_APP_SERVER_SUPPORT = "UNVERIFIED" as const;
export const DESKTOP_SPAWN_SEAM = "UNVERIFIED" as const;
export const DESKTOP_LIVE_INTERCEPTION = "BLOCKED" as const;

/**
 * REFERENCE only. The subscription-router wrapper treats `app-server` in argv
 * as the interactive JSONL app-server mode and forwards those args to
 * `codex.real`. Desktop's exact bundled spawn is still UNVERIFIED, so Layer
 * MUST NOT spawn this in production merely because upstream CLI argv is known.
 */
export const REFERENCE_APP_SERVER_ARGV = ["app-server"] as const;

export const PRODUCTION_CHILD_TRANSPORT_ENABLED = false;

export const FRAMING_STATUS = "TEST-ONLY" as const;
export const FRAMING_PLAN = "newline-delimited JSON (JSONL), no Content-Length header" as const;

export const TRUSTED_EXECUTABLE_STATUS = "UNVERIFIED" as const;

export interface AppServerDiscoveryReport {
  invocation: typeof APP_SERVER_INVOCATION_STATUS;
  framing: typeof FRAMING_STATUS;
  trustedExecutable: typeof TRUSTED_EXECUTABLE_STATUS;
  productionChildTransportEnabled: typeof PRODUCTION_CHILD_TRANSPORT_ENABLED;
  referenceArgv: readonly string[];
  upstreamProtocol: typeof UPSTREAM_APP_SERVER_PROTOCOL;
  upstreamStdioArgv: typeof UPSTREAM_APP_SERVER_STDIO_ARGV;
  upstreamStdioArgvFixed: readonly string[];
  desktopBundledAppServerSupport: typeof DESKTOP_BUNDLED_APP_SERVER_SUPPORT;
  desktopSpawnSeam: typeof DESKTOP_SPAWN_SEAM;
  desktopLiveInterception: typeof DESKTOP_LIVE_INTERCEPTION;
  notes: string[];
}

export function appServerDiscoveryReport(): AppServerDiscoveryReport {
  return {
    invocation: APP_SERVER_INVOCATION_STATUS,
    framing: FRAMING_STATUS,
    trustedExecutable: TRUSTED_EXECUTABLE_STATUS,
    productionChildTransportEnabled: PRODUCTION_CHILD_TRANSPORT_ENABLED,
    referenceArgv: REFERENCE_APP_SERVER_ARGV,
    upstreamProtocol: UPSTREAM_APP_SERVER_PROTOCOL,
    upstreamStdioArgv: UPSTREAM_APP_SERVER_STDIO_ARGV,
    upstreamStdioArgvFixed: UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED,
    desktopBundledAppServerSupport: DESKTOP_BUNDLED_APP_SERVER_SUPPORT,
    desktopSpawnSeam: DESKTOP_SPAWN_SEAM,
    desktopLiveInterception: DESKTOP_LIVE_INTERCEPTION,
    notes: [
      "Official Codex CLI documents `codex app-server` with stdio `--listen stdio://` or `--stdio` (JSONL; initialize then initialized).",
      "Official Python SDK launches `<codex binary> [--config ...] app-server --listen stdio://`.",
      "Upstream app-server stdio argv is PROVEN. The exact Desktop bundled spawn invocation remains UNVERIFIED until observed.",
      "MS-1 resolveTrustedCodexExecutable is a conservative relative search and returns null when the binary is absent.",
      "MS-1 production spawn uses empty argv and drains stdio; that is lifecycle-only, not app-server.",
      "PRODUCTION_CHILD_TRANSPORT_ENABLED stays false until trusted exe, bundled app-server mode, stdio, one-child-per-session, and integration tests are all proven.",
      "Do not invent production argv. Inject a test transport instead.",
    ],
  };
}
