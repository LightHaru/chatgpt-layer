import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { CodexSessionManager, type CodexManagedChild, type CodexProcessLauncher } from "../src/codex-sessions";
import { sessionCodexHome, sessionSqliteHome } from "../src/codex-sessions/paths";
import {
  CodexAppServerError,
  CodexSessionTransportRegistry,
  createFailClosedAppServerLauncher,
  createFakeTransport,
  createFixtureAppServerLauncher,
  createInjectedAppServerLauncher,
  performInitializeHandshake,
} from "../src/codex-app-server";

class FakeChild implements CodexManagedChild {
  alive = true;
  private readonly listeners = new Set<(code: number | null, signal: NodeJS.Signals | null) => void>();
  kill(): boolean {
    if (!this.alive) return false;
    this.alive = false;
    queueMicrotask(() => {
      for (const listener of this.listeners) listener(0, "SIGTERM");
    });
    return true;
  }
  crash(): void {
    this.alive = false;
    for (const listener of this.listeners) listener(1, null);
  }
  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class LifecycleLauncher implements CodexProcessLauncher {
  readonly children = new Map<string, FakeChild>();
  async launch(intent: { sessionId: string }): Promise<CodexManagedChild> {
    const child = new FakeChild();
    this.children.set(intent.sessionId, child);
    return child;
  }
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "codexpp-app-server-"));
}

async function removeRoot(root: string): Promise<void> {
  for (let i = 0; i < 8; i++) {
    try {
      rmSync(root, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "ENOTEMPTY" && code !== "EPERM") throw error;
      await new Promise((resolve) => setTimeout(resolve, 40 * (i + 1)));
    }
  }
  rmSync(root, { recursive: true, force: true });
}


async function runningSession(root: string) {
  const lifecycle = new LifecycleLauncher();
  const mgr = new CodexSessionManager({ userRoot: root, launcher: lifecycle, stopTimeoutMs: 30, killTimeoutMs: 30 });
  const a = mgr.createSession({ label: "A" });
  const b = mgr.createSession({ label: "B" });
  await mgr.startSession(a.id);
  await mgr.startSession(b.id);
  return { mgr, lifecycle, a, b };
}

test("production launcher is fail-closed and does not invent argv", async () => {
  const launcher = createFailClosedAppServerLauncher();
  await assert.rejects(
    launcher.launchAppServer({
      sessionId: "session_aaaaaaaaaaaaaaaaaaaaaaaa",
      codexHome: "/tmp/c",
      sqliteHome: "/tmp/s",
    }),
    (err: unknown) => {
      assert.ok(err instanceof CodexAppServerError);
      assert.equal(err.kind, "not-proven");
      assert.match(err.message, /app-server invocation is BLOCKED/);
      return true;
    },
  );
});

test("initialize handshake request/result and initialized notification", async () => {
  const transport = createFakeTransport("session_aaaaaaaaaaaaaaaaaaaaaaaa", {
    timeoutMs: 200,
  });
  const handshake = await performInitializeHandshake(transport, { clientInfo: "layer-test" });
  assert.equal(transport.server.didInitialize, true);
  assert.deepEqual(transport.server.lastInitializeParams, { clientInfo: "layer-test" });
  assert.equal((handshake.result as { protocolVersion: string }).protocolVersion, "test");
  await transport.close();
});

test("initialize failure and timeout", async () => {
  const failing = createFakeTransport("session_aaaaaaaaaaaaaaaaaaaaaaaa", {
    timeoutMs: 50,
    onRequest: () => ({ error: { code: -32000, message: "nope" } }),
  });
  await assert.rejects(performInitializeHandshake(failing, {}), /nope/);
  await failing.close();

  const slow = createFakeTransport("session_bbbbbbbbbbbbbbbbbbbbbbbb", {
    timeoutMs: 20,
    onRequest: () => ({ delayMs: 200, then: { result: {} } }),
  });
  await assert.rejects(performInitializeHandshake(slow, {}, 20), (err: unknown) => {
    assert.ok(err instanceof CodexAppServerError);
    assert.equal(err.kind, "timeout");
    return true;
  });
  await slow.close();
});

test("multi-session fake transports isolate correlation, notifications, and crashes", async () => {
  const root = tempRoot();
  try {
    const { mgr, a, b } = await runningSession(root);
    const registry = new CodexSessionTransportRegistry({
      userRoot: root,
      sessionManager: mgr,
    });
    const ta = createFakeTransport(a.id, { timeoutMs: 200, threadIdPrefix: "thread_a_" });
    const tb = createFakeTransport(b.id, {
      timeoutMs: 200,
      threadIdPrefix: "thread_b_",
      onRequest: (method) => {
        if (method === "thread/read") return { delayMs: 80, then: { result: { thread: { id: "late" } } } };
      },
    });
    registry.attach(a.id, ta);
    registry.attach(b.id, tb);

    const notesA: string[] = [];
    const notesB: string[] = [];
    ta.onNotification((m) => notesA.push(m.method ?? ""));
    tb.onNotification((m) => notesB.push(m.method ?? ""));

    const startedA = await ta.request("thread/start", {});
    const startedB = await tb.request("thread/start", {});
    const idA = (startedA.result as { thread: { id: string } }).thread.id;
    const idB = (startedB.result as { thread: { id: string } }).thread.id;
    assert.equal(idA.startsWith("thread_a_"), true);
    assert.equal(idB.startsWith("thread_b_"), true);
    assert.equal(notesA.includes("thread/started"), true);
    assert.equal(notesB.includes("thread/started"), true);
    assert.equal(notesA.includes("thread/started") && notesB.length > 0, true);

    const pendingB = tb.request("thread/read", { threadId: idB });
    tb.server.crash();
    await assert.rejects(
      tb.request("turn/start", { threadId: idB }),
      (err: unknown) => err instanceof CodexAppServerError && err.kind === "child-exit",
    );
    await assert.rejects(pendingB, (err: unknown) => err instanceof CodexAppServerError && err.kind === "child-exit");
    assert.equal(registry.get(b.id), undefined);
    const stillA = await ta.request("thread/read", { threadId: idA });
    assert.equal((stillA.result as { thread: { id: string } }).thread.id, idA);

    await registry.stop(a.id);
    await assert.rejects(ta.request("thread/read", { threadId: idA }), /closed/);
    assert.equal(registry.get(a.id), undefined);

    const ta2 = createFakeTransport(a.id, { timeoutMs: 200, threadIdPrefix: "thread_a2_" });
    registry.attach(a.id, ta2);
    const restarted = await ta2.request("thread/start", {});
    assert.equal((restarted.result as { thread: { id: string } }).thread.id.startsWith("thread_a2_"), true);
    await registry.closeAll();
  } finally {
    await removeRoot(root);
  }
});

test("concurrent correlation stays isolated per transport", async () => {
  const a = createFakeTransport("session_aaaaaaaaaaaaaaaaaaaaaaaa", { timeoutMs: 300 });
  const b = createFakeTransport("session_bbbbbbbbbbbbbbbbbbbbbbbb", { timeoutMs: 300 });
  const results = await Promise.all([
    a.request("thread/start", {}),
    a.request("thread/start", {}),
    b.request("thread/start", {}),
    b.request("thread/start", {}),
  ]);
  const ids = results.map((r) => (r.result as { thread: { id: string } }).thread.id);
  assert.equal(new Set(ids).size, 4);
  await a.close();
  await b.close();
});

test("registry attaches a transport without launching a second child", async () => {
  const root = tempRoot();
  try {
    const lifecycle = new LifecycleLauncher();
    const mgr = new CodexSessionManager({ userRoot: root, launcher: lifecycle, stopTimeoutMs: 30, killTimeoutMs: 30 });
    const stopped = mgr.createSession({ label: "stopped" });
    let launches = 0;
    const launcher = createInjectedAppServerLauncher((intent) => {
      launches += 1;
      return createFakeTransport(intent.sessionId, { timeoutMs: 200 });
    });
    const registry = new CodexSessionTransportRegistry({
      userRoot: root,
      sessionManager: mgr,
      initializeTimeoutMs: 200,
    });
    assert.equal(mgr.getSessionStatus(stopped.id).lifecycle, "STOPPED");
    const transport = createFakeTransport(stopped.id, { timeoutMs: 200 });
    const record = await registry.attachAndInitialize(stopped.id, transport);
    assert.equal(record.ready, true);
    assert.ok(registry.get(stopped.id));
    assert.equal(launches, 0);
    assert.equal(lifecycle.children.size, 0);
    void launcher;
    await registry.closeAll();
  } finally {
    await removeRoot(root);
  }
});

test("fixture child stdio initialize, thread/start, crash, malformed, delayed", async () => {
  const root = tempRoot();
  const fixture = fileURLToPath(new URL("./fixtures/fake-app-server.js", import.meta.url));
  try {
    const lifecycle = new LifecycleLauncher();
    const mgr = new CodexSessionManager({ userRoot: root, launcher: lifecycle, stopTimeoutMs: 30, killTimeoutMs: 30 });
    const a = mgr.createSession({ label: "A" });
    const intent = {
      sessionId: a.id,
      codexHome: sessionCodexHome(root, a.id),
      sqliteHome: sessionSqliteHome(root, a.id),
    };
    const healthy = new CodexSessionTransportRegistry({
      userRoot: root,
      sessionManager: mgr,
      initializeTimeoutMs: 500,
    });
    const healthyTransport = await createFixtureAppServerLauncher({
      nodeExecutable: process.execPath,
      fixturePath: fixture,
      timeoutMs: 500,
    }).launchAppServer(intent);
    const record = await healthy.attachAndInitialize(a.id, healthyTransport);
    assert.equal(record.ready, true);
    assert.equal(lifecycle.children.size, 0);
    const started = await record.transport.request("thread/start", { prompt: "hi" });
    const threadId = (started.result as { thread: { id: string } }).thread.id;
    assert.match(threadId, /^thread_fixture_/);
    const read = await record.transport.request("thread/read", { threadId });
    assert.equal((read.result as { thread: { id: string } }).thread.id, threadId);
    await healthy.closeAll();

    const crashing = new CodexSessionTransportRegistry({
      userRoot: root,
      sessionManager: mgr,
      initializeTimeoutMs: 500,
    });
    const crashTransport = await createFixtureAppServerLauncher({
      nodeExecutable: process.execPath,
      fixturePath: fixture,
      fixtureArgs: ["--crash"],
      timeoutMs: 500,
    }).launchAppServer(intent);
    await assert.rejects(
      crashing.attachAndInitialize(a.id, crashTransport),
      (err: unknown) => err instanceof CodexAppServerError,
    );
    await crashing.closeAll();

    const bad = new CodexSessionTransportRegistry({
      userRoot: root,
      sessionManager: mgr,
      initializeTimeoutMs: 500,
    });
    const badTransport = await createFixtureAppServerLauncher({
      nodeExecutable: process.execPath,
      fixturePath: fixture,
      fixtureArgs: ["--malformed"],
      timeoutMs: 500,
    }).launchAppServer(intent);
    await assert.rejects(
      bad.attachAndInitialize(a.id, badTransport),
      (err: unknown) => err instanceof CodexAppServerError,
    );
    await bad.closeAll();
  } finally {
    await removeRoot(root);
  }
});
