import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import { Writable } from "node:stream";
import {
  AbstractAppServerTransport,
  CodexAppServerError,
  MAX_BUFFER_BYTES,
  MAX_MESSAGE_BYTES,
  NdjsonParser,
  RequestMap,
  StdioAppServerTransport,
  assertOutboundMessage,
  classifyMessage,
  encodeNdjson,
  isUsableThreadId,
  parseAppServerMessage,
  parseJsonLine,
  requestIdKey,
  serializeAppServerMessage,
} from "../src/codex-app-server";

test("serialize and parse preserve unknown fields and omit jsonrpc", () => {
  const encoded = serializeAppServerMessage({
    id: "1",
    method: "thread/start",
    params: { prompt: "hi" },
    extra: { jsonrpc: "2.0", custom: true },
  });
  assert.equal(encoded.includes('"method":"thread/start"'), true);
  const parsed = parseJsonLine(encoded);
  assert.equal(parsed.id, "1");
  assert.equal(parsed.method, "thread/start");
  assert.deepEqual(parsed.params, { prompt: "hi" });
  assert.equal(parsed.extra?.jsonrpc, "2.0");
  assert.equal(parsed.extra?.custom, true);
});

test("parse distinguishes response, notification, and server-request", () => {
  const response = parseAppServerMessage({ id: 7, result: { ok: true } });
  assert.equal(classifyMessage(response, "inbound"), "response");
  const notification = parseAppServerMessage({ method: "thread/started", params: { thread: { id: "t1" } } });
  assert.equal(classifyMessage(notification, "inbound"), "notification");
  const serverReq = parseAppServerMessage({ id: "c1", method: "item/command/request", params: {} });
  assert.equal(classifyMessage(serverReq, "inbound"), "server-request");
  assert.equal(classifyMessage(serverReq, "outbound"), "request");
});

test("ndjson parser handles partial chunks and multiple messages", () => {
  const parser = new NdjsonParser();
  assert.deepEqual(parser.push('{"id":1,"result":{'), []);
  const first = parser.push('"ok":true}}\n{"method":"turn/completed","params":{}}\n{"id":2');
  assert.equal(first.length, 2);
  assert.equal(first[0]?.id, 1);
  assert.equal(first[1]?.method, "turn/completed");
  const second = parser.push(',"result":{"n":2}}\n');
  assert.equal(second[0]?.id, 2);
});

test("ndjson parser rejects malformed JSON for this session only", () => {
  const parser = new NdjsonParser();
  assert.throws(() => parser.push("{nope}\n"), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "malformed");
    return true;
  });
  assert.equal(parser.closed, true);
  assert.throws(() => parser.push('{"id":1}\n'), /already failed/);
});

test("ndjson parser bounds oversized messages and buffers", () => {
  const parser = new NdjsonParser({ maxMessageBytes: 32, maxBufferBytes: 64 });
  assert.throws(() => parser.push(`${"a".repeat(40)}\n`), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "oversized");
    return true;
  });
  const parser2 = new NdjsonParser({ maxMessageBytes: 100, maxBufferBytes: 20 });
  assert.throws(() => parser2.push("abcdefghijabcdefghijxyz"), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "oversized");
    return true;
  });
  assert.ok(MAX_MESSAGE_BYTES <= MAX_BUFFER_BYTES);
});

test("request map correlates ids, times out, and ignores duplicate responses", async () => {
  const map = new RequestMap({ timeoutMs: 30, maxPending: 4 });
  const id = map.allocateId();
  const pending = map.expect(id, 40);
  assert.equal(map.settle(id, { id, result: { ok: true } }), true);
  const response = await pending;
  assert.equal(response.result && (response.result as { ok: boolean }).ok, true);
  assert.equal(map.settle(id, { id, result: { again: true } }), false);

  const timed = map.allocateId();
  await assert.rejects(map.expect(timed, 15), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "timeout");
    return true;
  });
  assert.equal(map.size, 0);
});

test("child exit rejects all pending requests exactly once", async () => {
  const map = new RequestMap({ timeoutMs: 1000 });
  const a = map.allocateId();
  const b = map.allocateId();
  const pa = map.expect(a);
  const pb = map.expect(b);
  map.close(new CodexAppServerError("child-exit", "gone"));
  await assert.rejects(pa, /gone/);
  await assert.rejects(pb, /gone/);
  assert.equal(map.size, 0);
  await assert.rejects(map.expect(map.allocateId()), /closed/);
});

test("stdio transport correlates requests and does not leak stderr", async () => {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const written: string[] = [];
  stdin.on("data", (chunk) => written.push(String(chunk)));
  const transport = new StdioAppServerTransport({
    sessionId: "session_aaaaaaaaaaaaaaaaaaaaaaaa",
    timeoutMs: 200,
    pipes: { stdin, stdout, stderr },
  });
  const pending = transport.request("initialize", { client: "test" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(written.length, 1);
  const sent = JSON.parse(written[0]!.trim()) as { id: string; method: string };
  assert.equal(sent.method, "initialize");
  stdout.write(JSON.stringify({ id: sent.id, result: { protocolVersion: "test" } }) + "\n");
  const result = await pending;
  assert.deepEqual(result.result, { protocolVersion: "test" });
  stderr.write("diagnostic noise\n");
  await transport.close();
});

class CaptureTransport extends AbstractAppServerTransport {
  sent: string[] = [];
  constructor() {
    super({
      sessionId: "session_bbbbbbbbbbbbbbbbbbbbbbbb",
      timeoutMs: 50,
      send: (message) => {
        this.sent.push(JSON.stringify(message));
      },
    });
  }
  inbound(message: Parameters<AbstractAppServerTransport["handleInbound"]>[0]) {
    this.handleInbound(message);
  }
}

test("unhandled server request is fail-closed with method-not-found reply", async () => {
  const transport = new CaptureTransport();
  transport.inbound({ id: "child-9", method: "item/command/request", params: { x: 1 } });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(transport.sent.length, 1);
  const reply = JSON.parse(transport.sent[0]!) as { id: string; error: { code: number } };
  assert.equal(reply.id, "child-9");
  assert.equal(reply.error.code, -32601);
  await transport.close();
});

test("requestIdKey distinguishes number 1, string 1, and string #1", () => {
  const keys = [requestIdKey(1), requestIdKey("1"), requestIdKey("#1")];
  assert.equal(new Set(keys).size, 3);
  assert.equal(requestIdKey(1).startsWith("n:"), true);
  assert.equal(requestIdKey("#1").startsWith("s:"), true);
  const map = new RequestMap({ timeoutMs: 200, maxPending: 8 });
  const pendingNum = map.expect(1);
  const pendingStr = map.expect("1");
  assert.equal(map.settle(1, { id: 1, result: "number" }), true);
  assert.equal(map.settle("1", { id: "1", result: "string" }), true);
  return Promise.all([pendingNum, pendingStr]).then(([a, b]) => {
    assert.equal(a.result, "number");
    assert.equal(b.result, "string");
  });
});

test("ndjson parser splits ASCII JSON across chunks and accepts multiple messages", () => {
  const parser = new NdjsonParser();
  assert.deepEqual(parser.push('{"id":'), []);
  const first = parser.push('3,"result":{"ok":true}}\n{"id":4,"result":{}}\n');
  assert.equal(first.length, 2);
  assert.equal(first[0]?.id, 3);
  assert.equal(first[1]?.id, 4);
});

test("ndjson parser reassembles UTF-8 split inside a code point", () => {
  const parser = new NdjsonParser();
  const line = Buffer.from('{"id":1,"result":{"t":"こんにちは"}}\n', "utf8");
  const prefix = Buffer.from('{"id":1,"result":{"t":"', "utf8").length;
  // こ is 3 bytes; split after the first byte of that code point
  const splitAt = prefix + 1;
  assert.deepEqual(parser.push(line.subarray(0, splitAt)), []);
  assert.equal(parser.pendingBytes, splitAt);
  const messages = parser.push(line.subarray(splitAt));
  assert.equal(messages.length, 1);
  assert.equal((messages[0]?.result as { t: string }).t, "こんにちは");
});

test("ndjson parser reassembles emoji split inside its UTF-8 sequence", () => {
  const parser = new NdjsonParser();
  const line = Buffer.from('{"id":1,"result":{"e":"😀"}}\n', "utf8");
  const prefix = Buffer.from('{"id":1,"result":{"e":"', "utf8").length;
  const splitAt = prefix + 2; // 😀 is 4 bytes
  assert.deepEqual(parser.push(line.subarray(0, splitAt)), []);
  const messages = parser.push(line.subarray(splitAt));
  assert.equal((messages[0]?.result as { e: string }).e, "😀");
});

test("ndjson parser fails closed on malformed UTF-8", () => {
  const parser = new NdjsonParser();
  assert.throws(() => parser.push(Buffer.from([0xff, 0xfe, 0x0a])), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "malformed");
    return true;
  });
  assert.equal(parser.closed, true);
});

test("ndjson parser rejects UTF-8 byte length over MAX_MESSAGE_BYTES even if JS length is smaller", () => {
  const max = 24;
  const parser = new NdjsonParser({ maxMessageBytes: max, maxBufferBytes: 256 });
  const payload = `{"t":"${"ä".repeat(20)}"}`;
  assert.equal(payload.length < 60, true);
  assert.equal(Buffer.byteLength(payload, "utf8") > max, true);
  assert.throws(() => parser.push(`${payload}\n`), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "oversized");
    return true;
  });
});

test("ndjson parser rejects UTF-8 byte length over MAX_BUFFER_BYTES", () => {
  const parser = new NdjsonParser({ maxMessageBytes: 100, maxBufferBytes: 20 });
  const chunk = Buffer.from("ä".repeat(20), "utf8"); // 40 bytes, no newline
  assert.equal(chunk.length > 20, true);
  assert.throws(() => parser.push(chunk), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "oversized");
    return true;
  });
});

test("ndjson parser keeps CRLF support", () => {
  const parser = new NdjsonParser();
  const messages = parser.push('{"id":9,"result":{"ok":true}}\r\n');
  assert.equal(messages[0]?.id, 9);
});

test("outbound encode enforces MAX_MESSAGE_BYTES and rejects circular JSON", () => {
  const huge = { id: 1, result: { t: "x".repeat(MAX_MESSAGE_BYTES) } };
  assert.throws(() => encodeNdjson(huge), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "oversized");
    return true;
  });
  const circular: { id: number; params?: unknown } = { id: 1 };
  circular.params = circular;
  assert.throws(() => serializeAppServerMessage(circular), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "malformed");
    return true;
  });
  const ok = assertOutboundMessage({ id: 1, result: { ok: true } });
  assert.equal(ok.includes(0x0a), true);
});

test("server request handler replies once; async in-flight is bounded", async () => {
  class Capture extends AbstractAppServerTransport {
    sent: string[] = [];
    constructor() {
      super({
        sessionId: "session_cccccccccccccccccccccccc",
        timeoutMs: 200,
        maxServerRequestsInFlight: 1,
        send: (message) => {
          this.sent.push(JSON.stringify(message));
        },
      });
    }
    inbound(message: Parameters<AbstractAppServerTransport["handleInbound"]>[0]) {
      this.handleInbound(message);
    }
  }
  const transport = new Capture();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  transport.onServerRequest(async () => {
    await gate;
    return { result: { ok: true } };
  });
  transport.inbound({ id: "a", method: "item/command/request" });
  transport.inbound({ id: "b", method: "item/command/request" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(transport.inFlightServerRequests, 1);
  const overflow = transport.sent.map((s) => JSON.parse(s) as { id: string; error?: { code: number } });
  assert.equal(overflow.some((m) => m.id === "b" && m.error?.code === -32000), true);
  release();
  await new Promise((resolve) => setTimeout(resolve, 20));
  const done = transport.sent.map((s) => JSON.parse(s) as { id: string; result?: unknown });
  assert.equal(done.some((m) => m.id === "a" && m.result && (m.result as { ok: boolean }).ok), true);
  await transport.close();
});

test("stdio write failure closes the transport instead of poisoning the write chain", async () => {
  const stdin = new Writable({
    write(_chunk, _enc, cb) {
      cb(new Error("EPIPE"));
    },
  });
  const stdout = new PassThrough();
  const transport = new StdioAppServerTransport({
    sessionId: "session_dddddddddddddddddddddddd",
    timeoutMs: 200,
    pipes: { stdin, stdout },
  });
  await assert.rejects(transport.request("initialize", {}), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    return true;
  });
  assert.equal(transport.isClosed, true);
  await assert.rejects(transport.request("thread/start", {}), /closed/);
});

test("thread ids reject actual NUL and other control characters", () => {
  assert.equal(isUsableThreadId("thread_ok"), true);
  assert.equal(isUsableThreadId("thread\u0000id"), false);
  assert.equal(isUsableThreadId("thread\nid"), false);
  assert.equal(isUsableThreadId("thread\u007Fid"), false);
});
