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
export declare const APP_SERVER_INVOCATION_STATUS: "BLOCKED";
export declare const UPSTREAM_APP_SERVER_PROTOCOL: "PROVEN";
export declare const UPSTREAM_APP_SERVER_STDIO_ARGV: "PROVEN";
/**
 * Layer-owned internal argv matching current official Codex CLI / Python SDK.
 * Not a public API. Tweaks cannot change it. Desktop argv is never rewritten.
 */
export declare const UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED: readonly ["app-server", "--listen", "stdio://"];
/** Discovery-only shorthand recognized by the spawn probe. */
export declare const UPSTREAM_APP_SERVER_STDIO_SHORTHAND: readonly ["app-server", "--stdio"];
export declare const DESKTOP_BUNDLED_APP_SERVER_SUPPORT: "UNVERIFIED";
export declare const DESKTOP_SPAWN_SEAM: "UNVERIFIED";
export declare const DESKTOP_LIVE_INTERCEPTION: "BLOCKED";
/**
 * REFERENCE only. The subscription-router wrapper treats `app-server` in argv
 * as the interactive JSONL app-server mode and forwards those args to
 * `codex.real`. Desktop's exact bundled spawn is still UNVERIFIED, so Layer
 * MUST NOT spawn this in production merely because upstream CLI argv is known.
 */
export declare const REFERENCE_APP_SERVER_ARGV: readonly ["app-server"];
export declare const PRODUCTION_CHILD_TRANSPORT_ENABLED = false;
export declare const FRAMING_STATUS: "TEST-ONLY";
export declare const FRAMING_PLAN: "newline-delimited JSON (JSONL), no Content-Length header";
export declare const TRUSTED_EXECUTABLE_STATUS: "UNVERIFIED";
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
export declare function appServerDiscoveryReport(): AppServerDiscoveryReport;
