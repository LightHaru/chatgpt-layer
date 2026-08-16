"use strict";
/**
 * TEST-ONLY / PLANNED newline-delimited JSON parser.
 *
 * REFERENCE (b-nnett/codex-subscription-router): stdin/stdout JSONL with a
 * trailing newline; stderr is diagnostics, not protocol. Production must stay
 * fail-closed until ChatGPT Desktop's real framing is proven.
 *
 * Bounds prevent unbounded memory. Oversized/malformed fails THIS parser
 * (the child/session), not the Electron main process.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NdjsonParser = void 0;
exports.encodeNdjson = encodeNdjson;
const errors_1 = require("./errors");
const protocol_1 = require("./protocol");
const types_1 = require("./types");
class NdjsonParser {
    buffer = "";
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
        const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
        if (this.buffer.length + text.length > this.maxBufferBytes) {
            this.fail();
            throw new errors_1.CodexAppServerError("oversized", "app-server read buffer exceeded");
        }
        this.buffer += text;
        const messages = [];
        while (true) {
            const nl = this.buffer.indexOf("\n");
            if (nl < 0) {
                if (this.buffer.length > this.maxMessageBytes) {
                    this.fail();
                    throw new errors_1.CodexAppServerError("oversized", "app-server message exceeded max size before newline");
                }
                break;
            }
            let line = this.buffer.slice(0, nl);
            this.buffer = this.buffer.slice(nl + 1);
            if (line.endsWith("\r"))
                line = line.slice(0, -1);
            if (line.length === 0)
                continue;
            if (line.length > this.maxMessageBytes) {
                this.fail();
                throw new errors_1.CodexAppServerError("oversized", "app-server message exceeded max size");
            }
            try {
                messages.push((0, protocol_1.parseJsonLine)(line));
            }
            catch (error) {
                this.fail();
                throw error;
            }
        }
        return messages;
    }
    reset() {
        this.buffer = "";
        this.failed = false;
    }
    fail() {
        this.failed = true;
        this.buffer = "";
    }
}
exports.NdjsonParser = NdjsonParser;
function encodeNdjson(message, serialize) {
    return Buffer.from(`${serialize(message)}\n`, "utf8");
}
//# sourceMappingURL=framing.js.map