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
export declare const APP_SERVER_INVOCATION_STATUS: "BLOCKED";
/**
 * REFERENCE only. The subscription-router wrapper treats `app-server` in argv
 * as the interactive JSONL app-server mode and forwards those args to
 * `codex.real`. This tree has not executed a bundled ChatGPT/Codex binary, so
 * Layer MUST NOT spawn `["app-server"]` in production.
 */
export declare const REFERENCE_APP_SERVER_ARGV: readonly ["app-server"];
export declare const PRODUCTION_CHILD_TRANSPORT_ENABLED = false;
export declare const FRAMING_STATUS: "TEST-ONLY";
export declare const FRAMING_PLAN: "newline-delimited JSON (JSONL), no Content-Length header";
export declare const TRUSTED_EXECUTABLE_STATUS: "BLOCKED";
export interface AppServerDiscoveryReport {
    invocation: typeof APP_SERVER_INVOCATION_STATUS;
    framing: typeof FRAMING_STATUS;
    trustedExecutable: typeof TRUSTED_EXECUTABLE_STATUS;
    productionChildTransportEnabled: typeof PRODUCTION_CHILD_TRANSPORT_ENABLED;
    referenceArgv: readonly string[];
    notes: string[];
}
export declare function appServerDiscoveryReport(): AppServerDiscoveryReport;
