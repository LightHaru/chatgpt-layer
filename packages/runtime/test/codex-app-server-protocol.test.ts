import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import test from "node:test";
import {
  AbstractAppServerTransport,
  CodexAppServerError,
  MAX_BUFFER_BYTES,
  MAX_MESSAGE_BYTES,
  NdjsonParser,
  RequestMap,
  StdioAppServerTransport,
  classifyMessage,
  parseAppServerMessage,
  parseJsonLine,
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
