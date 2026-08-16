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

import { CodexAppServerError } from "./errors";
import { parseJsonLine } from "./protocol";
import type { AppServerMessage } from "./types";
import { MAX_BUFFER_BYTES, MAX_MESSAGE_BYTES } from "./types";

export interface NdjsonParserOptions {
  maxMessageBytes?: number;
  maxBufferBytes?: number;
}

export class NdjsonParser {
  private buffer = "";
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
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    if (this.buffer.length + text.length > this.maxBufferBytes) {
      this.fail();
      throw new CodexAppServerError("oversized", "app-server read buffer exceeded");
    }
    this.buffer += text;
    const messages: AppServerMessage[] = [];
    while (true) {
      const nl = this.buffer.indexOf("\n");
      if (nl < 0) {
        if (this.buffer.length > this.maxMessageBytes) {
          this.fail();
          throw new CodexAppServerError("oversized", "app-server message exceeded max size before newline");
        }
        break;
      }
      let line = this.buffer.slice(0, nl);
      this.buffer = this.buffer.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.length === 0) continue;
      if (line.length > this.maxMessageBytes) {
        this.fail();
        throw new CodexAppServerError("oversized", "app-server message exceeded max size");
      }
      try {
        messages.push(parseJsonLine(line));
      } catch (error) {
        this.fail();
        throw error;
      }
    }
    return messages;
  }

  reset(): void {
    this.buffer = "";
    this.failed = false;
  }

  private fail(): void {
    this.failed = true;
    this.buffer = "";
  }
}

export function encodeNdjson(message: AppServerMessage, serialize: (m: AppServerMessage) => string): Buffer {
  return Buffer.from(`${serialize(message)}\n`, "utf8");
}
