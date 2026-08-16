import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { CodexSessionManager, type CodexManagedChild, type CodexProcessLauncher } from "../src/codex-sessions";
import {
  CodexAppServerError,
  CodexSessionRouter,
  CodexSessionTransportRegistry,
  createFailClosedAppServerLauncher,
  createFakeTransport,
  isQuotaExhaustionKind,
} from "../src/codex-app-server";
import { ThreadOwnerStore } from "../src/codex-app-server";

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
  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

class LifecycleLauncher implements CodexProcessLauncher {
  async launch(): Promise<CodexManagedChild> {
    return new FakeChild();
  }
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "codexpp-router-"));
}

async function stack() {
  const root = tempRoot();
  const mgr = new CodexSessionManager({
    userRoot: root,
    launcher: new LifecycleLauncher(),
    stopTimeoutMs: 30,
    killTimeoutMs: 30,
  });
  const a = mgr.createSession({ label: "A" });
  const b = mgr.createSession({ label: "B" });
  await mgr.startSession(a.id);
  await mgr.startSession(b.id);
  const owners = new ThreadOwnerStore(root);
  const registry = new CodexSessionTransportRegistry({
    userRoot: root,
    sessionManager: mgr,
    launcher: createFailClosedAppServerLauncher(),
  });
  const ta = createFakeTransport(a.id, { timeoutMs: 200, threadIdPrefix: "thread_a_" });
  const tb = createFakeTransport(b.id, { timeoutMs: 200, threadIdPrefix: "thread_b_" });
  registry.attach(a.id, ta);
  registry.attach(b.id, tb);
  const router = new CodexSessionRouter({
    registry,
    owners,
    selectSession: () => a.id,
    requestTimeoutMs: 200,
  });
  return { root, mgr, owners, registry, router, a, b, ta, tb };
}

test("new thread success persists owner; failure does not", async () => {
  const ctx = await stack();
  try {
    const ok = await ctx.router.routeNewThread({ sessionId: ctx.a.id });
    assert.equal(ok.ownerPersisted, true);
    assert.ok(ok.threadId);
    assert.equal(ctx.owners.getOwner(ok.threadId!), ctx.a.id);

    const failing = createFakeTransport(ctx.b.id, {
      timeoutMs: 200,
      onRequest: (method) =>
        method === "thread/start"
          ? { error: { code: -32000, message: "structured failure" } }
          : { result: {} },
    });
    await ctx.registry.stop(ctx.b.id);
    ctx.registry.attach(ctx.b.id, failing);
    const before = ctx.owners.listOwners().length;
    await assert.rejects(ctx.router.routeNewThread({ sessionId: ctx.b.id }), /structured failure/);
    assert.equal(ctx.owners.listOwners().length, before);

    const noId = createFakeTransport(ctx.b.id, {
      timeoutMs: 200,
      onRequest: (method) => (method === "thread/start" ? { result: { ok: true } } : { result: {} }),
    });
    await ctx.registry.stop(ctx.b.id);
    ctx.registry.attach(ctx.b.id, noId);
    const missing = await ctx.router.routeNewThread({ sessionId: ctx.b.id });
    assert.equal(missing.ownerPersisted, false);
    assert.equal(missing.threadId, null);
    assert.equal(ctx.owners.listOwners().length, before);
  } finally {
    await ctx.registry.closeAll();
    rmSync(ctx.root, { recursive: true, force: true });
  }
});

test("existing thread routes to owner; unknown owner needs explicit fallback", async () => {
  const ctx = await stack();
  try {
    const created = await ctx.router.routeNewThread({ sessionId: ctx.a.id });
    const routed = await ctx.router.routeExistingThread({
      method: "thread/read",
      params: { threadId: created.threadId },
    });
    assert.equal(routed.sessionId, ctx.a.id);
    assert.equal(routed.ownerPersisted, false);

    await assert.rejects(
      ctx.router.routeExistingThread({ method: "thread/read", params: { threadId: "thread_unknown" } }),
      (err: unknown) => err instanceof CodexAppServerError && err.kind === "fallback-required",
    );
    const fallback = await ctx.router.routeExistingThread({
      method: "thread/read",
      params: { threadId: "thread_unknown" },
      fallbackSessionId: ctx.b.id,
    });
    assert.equal(fallback.sessionId, ctx.b.id);
    assert.equal(ctx.owners.getOwner("thread_unknown"), null);
  } finally {
    await ctx.registry.closeAll();
    rmSync(ctx.root, { recursive: true, force: true });
  }
});

test("unavailable owner is a clear error and does not silently migrate", async () => {
  const ctx = await stack();
  try {
    const created = await ctx.router.routeNewThread({ sessionId: ctx.a.id });
    await ctx.registry.stop(ctx.a.id);
    await assert.rejects(
      ctx.router.routeExistingThread({ method: "turn/start", params: { threadId: created.threadId } }),
      (err: unknown) => err instanceof CodexAppServerError && err.kind === "unavailable",
    );
    assert.equal(ctx.owners.getOwner(created.threadId!), ctx.a.id);
    const fallback = await ctx.router.routeExistingThread({
      method: "turn/start",
      params: { threadId: created.threadId },
      fallbackSessionId: ctx.b.id,
    });
    assert.equal(fallback.sessionId, ctx.b.id);
    assert.equal(ctx.owners.getOwner(created.threadId!), ctx.a.id);
  } finally {
    await ctx.registry.closeAll();
    rmSync(ctx.root, { recursive: true, force: true });
  }
});

test("cross-session cannot steal ownership without explicit overwrite", async () => {
  const ctx = await stack();
  try {
    const created = await ctx.router.routeNewThread({ sessionId: ctx.a.id });
    assert.throws(
      () => ctx.router.recordThreadOwner(created.threadId!, ctx.b.id),
      (err: unknown) => err instanceof CodexAppServerError && err.kind === "owner-exists",
    );
    ctx.router.recordThreadOwner(created.threadId!, ctx.b.id, true);
    assert.equal(ctx.owners.getOwner(created.threadId!), ctx.b.id);
  } finally {
    await ctx.registry.closeAll();
    rmSync(ctx.root, { recursive: true, force: true });
  }
});

test("new thread may use internally selected session in tests", async () => {
  const ctx = await stack();
  try {
    const created = await ctx.router.routeNewThread({});
    assert.equal(created.sessionId, ctx.a.id);
    assert.equal(created.ownerPersisted, true);
  } finally {
    await ctx.registry.closeAll();
    rmSync(ctx.root, { recursive: true, force: true });
  }
});

test("timeout and malformed are not quota exhaustion", () => {
  assert.equal(isQuotaExhaustionKind("timeout"), false);
  assert.equal(isQuotaExhaustionKind("malformed"), false);
  assert.equal(isQuotaExhaustionKind("spawn"), false);
  assert.equal(isQuotaExhaustionKind("internal"), false);
  assert.equal(isQuotaExhaustionKind("child-exit"), false);
});
