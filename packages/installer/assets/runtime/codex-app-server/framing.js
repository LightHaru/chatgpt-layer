"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NdjsonParser = void 0;
exports.encodeNdjson = encodeNdjson;
exports.assertOutboundMessage = assertOutboundMessage;
const errors_1 = require("./errors");
const protocol_1 = require("./protocol");
const types_1 = require("./types");
const utf8Fatal = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
class NdjsonParser {
    buffer = Buffer.alloc(0);
    maxMessageBytes;
    maxBufferBytes;
    failed = false;
    constructor(options = {}) {
        this.maxMessageBytes = options.maxMessageBytes ?? types_1.MAX_MESSAGE_BYTES;
        this.maxBufferBytes = options.maxBufferBytes ?? types_1.MAX_BUFFER_BYTES;
    }
    get pendingBytes() {
        return this.buffer.length;
    }
    get closed() {
        return this.failed;
    }
    push(chunk) {
        if (this.failed) {
            throw new errors_1.CodexAppServerError("malformed", "ndjson parser already failed");
        }
        const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
        if (this.buffer.length + bytes.length > this.maxBufferBytes) {
            this.fail();
            throw new errors_1.CodexAppServerError("oversized", "app-server read buffer exceeded");
        }
        this.buffer = this.buffer.length === 0 ? Buffer.from(bytes) : Buffer.concat([this.buffer, bytes]);
        const messages = [];
        while (true) {
            const nl = this.buffer.indexOf(0x0a);
            if (nl < 0) {
                if (this.buffer.length > this.maxMessageBytes) {
                    this.fail();
                    throw new errors_1.CodexAppServerError("oversized", "app-server message exceeded max size before newline");
                }
                break;
            }
            let line = this.buffer.subarray(0, nl);
            this.buffer = Buffer.from(this.buffer.subarray(nl + 1));
            if (line.length > 0 && line[line.length - 1] === 0x0d) {
                line = line.subarray(0, line.length - 1);
            }
            if (line.length === 0)
                continue;
            if (line.length > this.maxMessageBytes) {
                this.fail();
                throw new errors_1.CodexAppServerError("oversized", "app-server message exceeded max size");
            }
            let text;
            try {
                text = utf8Fatal.decode(line);
            }
            catch {
                this.fail();
                throw new errors_1.CodexAppServerError("malformed", "app-server line is not valid UTF-8");
            }
            try {
                messages.push((0, protocol_1.parseJsonLine)(text));
            }
            catch (error) {
                this.fail();
                throw error;
            }
        }
        return messages;
    }
    reset() {
        this.buffer = Buffer.alloc(0);
        this.failed = false;
    }
    fail() {
        this.failed = true;
        this.buffer = Buffer.alloc(0);
    }
}
exports.NdjsonParser = NdjsonParser;
function encodeNdjson(message, serialize = protocol_1.serializeAppServerMessage, maxMessageBytes = types_1.MAX_MESSAGE_BYTES) {
    let json;
    try {
        json = serialize(message);
    }
    catch (error) {
        if (error instanceof errors_1.CodexAppServerError)
            throw error;
        throw new errors_1.CodexAppServerError("malformed", "app-server message is not serializable");
    }
    const byteLength = Buffer.byteLength(json, "utf8");
    if (byteLength > maxMessageBytes) {
        throw new errors_1.CodexAppServerError("oversized", "app-server outbound message exceeded max size");
    }
    return Buffer.from(`${json}\n`, "utf8");
}
function assertOutboundMessage(message, maxMessageBytes = types_1.MAX_MESSAGE_BYTES) {
    return encodeNdjson(message, protocol_1.serializeAppServerMessage, maxMessageBytes);
}
//# sourceMappingURL=framing.js.map