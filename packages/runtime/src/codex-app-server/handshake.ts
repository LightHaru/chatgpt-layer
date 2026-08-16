import { CodexAppServerError } from "./errors";
import type { CodexAppServerTransport } from "./transport";
import { METHOD_INITIALIZE, METHOD_INITIALIZED } from "./types";

export interface InitializeHandshakeResult {
  result: unknown;
  params: unknown;
}

/**
 * initialize request + initialized notification.
 * Params are cached by the caller (registry) for future MS-2B replay.
 * Not broadcast blindly: only sent on the transport that just launched.
 */
export async function performInitializeHandshake(
  transport: CodexAppServerTransport,
  params: unknown = {},
  timeoutMs?: number,
): Promise<InitializeHandshakeResult> {
  let result: unknown;
  try {
    const response = await transport.request(METHOD_INITIALIZE, params, { timeoutMs });
    result = response.result;
  } catch (error) {
    if (error instanceof CodexAppServerError) throw error;
    throw new CodexAppServerError(
      "protocol",
      error instanceof Error ? error.message : "initialize failed",
      transport.sessionId,
    );
  }
  await transport.notify(METHOD_INITIALIZED, {});
  return { result, params };
}
