/**
 * TEST-ONLY / PLANNED newline-delimited JSON parser.
 *
 * REFERENCE (b-nnett/codex-subscription-router): stdin/stdout JSONL with a
 * trailing newline; stderr is diagnostics, not protocol. Production must stay
 * fail-closed until ChatGPT Desktop's real framing is proven.
 *
 * Bounds are BYTE-based (MAX_MESSAGE_BYTES / MAX_BUFFER_BYTES). UTF-8 is
 * decoded only after a complete newline-delimited frame exists, with fatal
 * decoding (no U+FFFD). Oversized/malformed fails THIS parser (the
 * child/session), not the Electron main process.
 */
import type { AppServerMessage } from "./types";
export interface NdjsonParserOptions {
    maxMessageBytes?: number;
    maxBufferBytes?: number;
}
export declare class NdjsonParser {
    private buffer;
    private readonly maxMessageBytes;
    private readonly maxBufferBytes;
    private failed;
    constructor(options?: NdjsonParserOptions);
    get pendingBytes(): number;
    get closed(): boolean;
    push(chunk: string | Buffer): AppServerMessage[];
    reset(): void;
    private fail;
}
export declare function encodeNdjson(message: AppServerMessage, serialize?: (m: AppServerMessage) => string, maxMessageBytes?: number): Buffer;
export declare function assertOutboundMessage(message: AppServerMessage, maxMessageBytes?: number): Buffer;
