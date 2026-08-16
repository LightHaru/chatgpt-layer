#!/usr/bin/env node
"use strict";

/**
 * TEST-ONLY fake Codex app-server.
 * Speaks newline-delimited JSON on stdin/stdout. No network, no ~/.codex,
 * no auth, no ChatGPT. stderr is diagnostics only.
 *
 * Flags:
 *   --crash              exit 2 after first request
 *   --delayed-ms=N       delay every response by N ms
 *   --malformed          write a non-JSON line then continue
 *   --structured-error   thread/start returns a protocol error
 *   --no-thread-id       thread/start succeeds without thread.id
 */

const args = process.argv.slice(2);
const crash = args.includes("--crash");
const malformed = args.includes("--malformed");
const structuredError = args.includes("--structured-error");
const noThreadId = args.includes("--no-thread-id");
const delayedMs = Number((args.find((a) => a.startsWith("--delayed-ms=")) || "--delayed-ms=0").slice("--delayed-ms=".length)) || 0;

let seq = 0;
let initialized = false;
let buffer = "";

function write(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handle(message) {
  if (delayedMs > 0) await delay(delayedMs);
  if (crash) process.exit(2);
  if (malformed) {
    process.stdout.write("this is not json\n");
    return;
  }
  if (!message || typeof message !== "object") return;
  if (message.method && message.id == null) {
    if (message.method === "initialized") initialized = true;
    return;
  }
  if (!message.method || message.id == null) {
    write({ id: message.id, error: { code: -32600, message: "Invalid Request" } });
    return;
  }
  if (message.method === "initialize") {
    write({ id: message.id, result: { protocolVersion: "test", fixture: true } });
    return;
  }
  if (message.method === "thread/start") {
    if (structuredError) {
      write({ id: message.id, error: { code: -32000, message: "structured failure", data: { reason: "test" } } });
      return;
    }
    if (noThreadId) {
      write({ id: message.id, result: { ok: true } });
      return;
    }
    seq += 1;
    const threadId = `thread_fixture_${seq}`;
    write({ id: message.id, result: { thread: { id: threadId } } });
    write({ method: "thread/started", params: { thread: { id: threadId } } });
    return;
  }
  if (message.method === "thread/read") {
    const threadId = message.params && message.params.threadId ? message.params.threadId : "thread_unknown";
    write({
      id: message.id,
      result: { thread: { id: threadId, path: `/tmp/fake/${threadId}.jsonl`, cwd: "/tmp" } },
    });
    return;
  }
  if (message.method === "turn/start") {
    seq += 1;
    write({ id: message.id, result: { turn: { id: `turn_${seq}` } } });
    return;
  }
  if (message.method === "server/ping") {
    write({ id: "child-1", method: "item/command/request", params: { prompt: "confirm" } });
    write({ id: message.id, result: { ok: true } });
    return;
  }
  write({ id: message.id, error: { code: -32601, message: `Method not found: ${message.method}` } });
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  while (true) {
    const nl = buffer.indexOf("\n");
    if (nl < 0) break;
    const line = buffer.slice(0, nl).replace(/\r$/, "");
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      process.stderr.write("fake-app-server: malformed inbound\n");
      continue;
    }
    void handle(message);
  }
});

function die() {
  process.exit(0);
}
process.on("SIGTERM", die);
process.on("SIGINT", die);
process.stdin.on("end", die);
