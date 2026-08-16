"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRUSTED_EXECUTABLE_STATUS = exports.FRAMING_PLAN = exports.FRAMING_STATUS = exports.PRODUCTION_CHILD_TRANSPORT_ENABLED = exports.REFERENCE_APP_SERVER_ARGV = exports.DESKTOP_LIVE_INTERCEPTION = exports.DESKTOP_SPAWN_SEAM = exports.DESKTOP_BUNDLED_APP_SERVER_SUPPORT = exports.UPSTREAM_APP_SERVER_STDIO_SHORTHAND = exports.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED = exports.UPSTREAM_APP_SERVER_STDIO_ARGV = exports.UPSTREAM_APP_SERVER_PROTOCOL = exports.APP_SERVER_INVOCATION_STATUS = void 0;
exports.appServerDiscoveryReport = appServerDiscoveryReport;
/** Production Layer-owned child invocation. Still fail-closed. */
exports.APP_SERVER_INVOCATION_STATUS = "BLOCKED";
exports.UPSTREAM_APP_SERVER_PROTOCOL = "PROVEN";
exports.UPSTREAM_APP_SERVER_STDIO_ARGV = "PROVEN";
/**
 * Layer-owned internal argv matching current official Codex CLI / Python SDK.
 * Not a public API. Tweaks cannot change it. Desktop argv is never rewritten.
 */
exports.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED = ["app-server", "--listen", "stdio://"];
/** Discovery-only shorthand recognized by the spawn probe. */
exports.UPSTREAM_APP_SERVER_STDIO_SHORTHAND = ["app-server", "--stdio"];
exports.DESKTOP_BUNDLED_APP_SERVER_SUPPORT = "UNVERIFIED";
exports.DESKTOP_SPAWN_SEAM = "UNVERIFIED";
exports.DESKTOP_LIVE_INTERCEPTION = "BLOCKED";
/**
 * REFERENCE only. The subscription-router wrapper treats `app-server` in argv
 * as the interactive JSONL app-server mode and forwards those args to
 * `codex.real`. Desktop's exact bundled spawn is still UNVERIFIED, so Layer
 * MUST NOT spawn this in production merely because upstream CLI argv is known.
 */
exports.REFERENCE_APP_SERVER_ARGV = ["app-server"];
exports.PRODUCTION_CHILD_TRANSPORT_ENABLED = false;
exports.FRAMING_STATUS = "TEST-ONLY";
exports.FRAMING_PLAN = "newline-delimited JSON (JSONL), no Content-Length header";
exports.TRUSTED_EXECUTABLE_STATUS = "UNVERIFIED";
function appServerDiscoveryReport() {
    return {
        invocation: exports.APP_SERVER_INVOCATION_STATUS,
        framing: exports.FRAMING_STATUS,
        trustedExecutable: exports.TRUSTED_EXECUTABLE_STATUS,
        productionChildTransportEnabled: exports.PRODUCTION_CHILD_TRANSPORT_ENABLED,
        referenceArgv: exports.REFERENCE_APP_SERVER_ARGV,
        upstreamProtocol: exports.UPSTREAM_APP_SERVER_PROTOCOL,
        upstreamStdioArgv: exports.UPSTREAM_APP_SERVER_STDIO_ARGV,
        upstreamStdioArgvFixed: exports.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED,
        desktopBundledAppServerSupport: exports.DESKTOP_BUNDLED_APP_SERVER_SUPPORT,
        desktopSpawnSeam: exports.DESKTOP_SPAWN_SEAM,
        desktopLiveInterception: exports.DESKTOP_LIVE_INTERCEPTION,
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
//# sourceMappingURL=discovery.js.map