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

export const APP_SERVER_INVOCATION_STATUS = "BLOCKED" as const;

/**
 * REFERENCE only. The subscription-router wrapper treats `app-server` in argv
 * as the interactive JSONL app-server mode and forwards those args to
 * `codex.real`. This tree has not executed a bundled ChatGPT/Codex binary, so
 * Layer MUST NOT spawn `["app-server"]` in production.
 */
export const REFERENCE_APP_SERVER_ARGV = ["app-server"] as const;

export const PRODUCTION_CHILD_TRANSPORT_ENABLED = false;

export const FRAMING_STATUS = "TEST-ONLY" as const;
export const FRAMING_PLAN = "newline-delimited JSON (JSONL), no Content-Length header" as const;

export const TRUSTED_EXECUTABLE_STATUS = "BLOCKED" as const;

export interface AppServerDiscoveryReport {
  invocation: typeof APP_SERVER_INVOCATION_STATUS;
  framing: typeof FRAMING_STATUS;
  trustedExecutable: typeof TRUSTED_EXECUTABLE_STATUS;
  productionChildTransportEnabled: typeof PRODUCTION_CHILD_TRANSPORT_ENABLED;
  referenceArgv: readonly string[];
  notes: string[];
}

export function appServerDiscoveryReport(): AppServerDiscoveryReport {
  return {
    invocation: APP_SERVER_INVOCATION_STATUS,
    framing: FRAMING_STATUS,
    trustedExecutable: TRUSTED_EXECUTABLE_STATUS,
    productionChildTransportEnabled: PRODUCTION_CHILD_TRANSPORT_ENABLED,
    referenceArgv: REFERENCE_APP_SERVER_ARGV,
    notes: [
      "ChatGPT Desktop was not present on the MS-2A build host.",
      "MS-1 resolveTrustedCodexExecutable is a conservative relative search and returns null when the binary is absent.",
      "MS-1 production spawn uses empty argv and drains stdio; that is lifecycle-only, not app-server.",
      "Do not invent production argv. Inject a test transport instead.",
    ],
  };
}
