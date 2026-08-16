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

import { CodexAppServerError } from "./errors";
import { parseJsonLine, serializeAppServerMessage } from "./protocol";
import type { AppServerMessage } from "./types";
import { MAX_BUFFER_BYTES, MAX_MESSAGE_BYTES } from "./types";

const utf8Fatal = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export interface NdjsonParserOptions {
  maxMessageBytes?: number;
  maxBufferBytes?: number;
}

export class NdjsonParser {
  private buffer = Buffer.alloc(0);
  private readonly maxMessageBytes: number;
  private readonly maxBufferBytes: number;
  private failed = false;

  constructor(options: NdjsonParserOptions = {}) {
    this.maxMessageBytes = options.maxMessageBytes ?? MAX_MESSAGE_BYTES;
    this.maxBufferBytes = options.maxBufferBytes ?? MAX_BUFFER_BYTES;
  }

  get pendingBytes(): number {
    return this.buffer.length;
  }

  get closed(): boolean {
    return this.failed;
  }

  push(chunk: string | Buffer): AppServerMessage[] {
    if (this.failed) {
      throw new CodexAppServerError("malformed", "ndjson parser already failed");
    }
    const bytes = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    if (this.buffer.length + bytes.length > this.maxBufferBytes) {
      this.fail();
      throw new CodexAppServerError("oversized", "app-server read buffer exceeded");
    }
    this.buffer = this.buffer.length === 0 ? Buffer.from(bytes) : Buffer.concat([this.buffer, bytes]);
    const messages: AppServerMessage[] = [];
    while (true) {
      const nl = this.buffer.indexOf(0x0a);
      if (nl < 0) {
        if (this.buffer.length > this.maxMessageBytes) {
          this.fail();
          throw new CodexAppServerError("oversized", "app-server message exceeded max size before newline");
        }
        break;
      }
      let line = this.buffer.subarray(0, nl);
      this.buffer = Buffer.from(this.buffer.subarray(nl + 1));
      if (line.length > 0 && line[line.length - 1] === 0x0d) {
        line = line.subarray(0, line.length - 1);
      }
      if (line.length === 0) continue;
      if (line.length > this.maxMessageBytes) {
        this.fail();
        throw new CodexAppServerError("oversized", "app-server message exceeded max size");
      }
      let text: string;
      try {
        text = utf8Fatal.decode(line);
      } catch {
        this.fail();
        throw new CodexAppServerError("malformed", "app-server line is not valid UTF-8");
      }
      try {
        messages.push(parseJsonLine(text));
      } catch (error) {
        this.fail();
        throw error;
      }
    }
    return messages;
  }

  reset(): void {
    this.buffer = Buffer.alloc(0);
    this.failed = false;
  }

  private fail(): void {
    this.failed = true;
    this.buffer = Buffer.alloc(0);
  }
}

export function encodeNdjson(
  message: AppServerMessage,
  serialize: (m: AppServerMessage) => string = serializeAppServerMessage,
  maxMessageBytes = MAX_MESSAGE_BYTES,
): Buffer {
  let json: string;
  try {
    json = serialize(message);
  } catch (error) {
    if (error instanceof CodexAppServerError) throw error;
    throw new CodexAppServerError("malformed", "app-server message is not serializable");
  }
  const byteLength = Buffer.byteLength(json, "utf8");
  if (byteLength > maxMessageBytes) {
    throw new CodexAppServerError("oversized", "app-server outbound message exceeded max size");
  }
  return Buffer.from(`${json}\n`, "utf8");
}

export function assertOutboundMessage(
  message: AppServerMessage,
  maxMessageBytes = MAX_MESSAGE_BYTES,
): Buffer {
  return encodeNdjson(message, serializeAppServerMessage, maxMessageBytes);
}
