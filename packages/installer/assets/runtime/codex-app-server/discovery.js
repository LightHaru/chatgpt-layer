"use strict";
/**
 * Production feasibility of a real Codex app-server child.
 *
 * Labels:
 *   PROVEN     — observed against ChatGPT Desktop / bundled Codex in this tree
 *   REFERENCE  — observed in b-nnett/codex-subscription-router (concepts only)
 *   TEST-ONLY  — implemented and tested with fixtures, not a production claim
 *   PLANNED    — designed, not enabled
 *   BLOCKED    — cannot ship until evidence exists
 *
 * This module does not spawn anything.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRUSTED_EXECUTABLE_STATUS = exports.FRAMING_PLAN = exports.FRAMING_STATUS = exports.PRODUCTION_CHILD_TRANSPORT_ENABLED = exports.REFERENCE_APP_SERVER_ARGV = exports.APP_SERVER_INVOCATION_STATUS = void 0;
exports.appServerDiscoveryReport = appServerDiscoveryReport;
exports.APP_SERVER_INVOCATION_STATUS = "BLOCKED";
/**
 * REFERENCE only. The subscription-router wrapper treats `app-server` in argv
 * as the interactive JSONL app-server mode and forwards those args to
 * `codex.real`. This tree has not executed a bundled ChatGPT/Codex binary, so
 * Layer MUST NOT spawn `["app-server"]` in production.
 */
exports.REFERENCE_APP_SERVER_ARGV = ["app-server"];
exports.PRODUCTION_CHILD_TRANSPORT_ENABLED = false;
exports.FRAMING_STATUS = "TEST-ONLY";
exports.FRAMING_PLAN = "newline-delimited JSON (JSONL), no Content-Length header";
exports.TRUSTED_EXECUTABLE_STATUS = "BLOCKED";
function appServerDiscoveryReport() {
    return {
        invocation: exports.APP_SERVER_INVOCATION_STATUS,
        framing: exports.FRAMING_STATUS,
        trustedExecutable: exports.TRUSTED_EXECUTABLE_STATUS,
        productionChildTransportEnabled: exports.PRODUCTION_CHILD_TRANSPORT_ENABLED,
        referenceArgv: exports.REFERENCE_APP_SERVER_ARGV,
        notes: [
            "ChatGPT Desktop was not present on the MS-2A build host.",
            "MS-1 resolveTrustedCodexExecutable is a conservative relative search and returns null when the binary is absent.",
            "MS-1 production spawn uses empty argv and drains stdio; that is lifecycle-only, not app-server.",
            "Do not invent production argv. Inject a test transport instead.",
        ],
    };
}
//# sourceMappingURL=discovery.js.map