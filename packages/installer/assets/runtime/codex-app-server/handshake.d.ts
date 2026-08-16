import type { CodexAppServerTransport } from "./transport";
export interface InitializeHandshakeResult {
    result: unknown;
    params: unknown;
}
/**
 * initialize request + initialized notification.
 * Params are cached by the caller (registry) for future MS-2B replay.
 * Not broadcast blindly: only sent on the transport that just launched.
 */
export declare function performInitializeHandshake(transport: CodexAppServerTransport, params?: unknown, timeoutMs?: number): Promise<InitializeHandshakeResult>;
