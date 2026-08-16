import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import {
  CodexSessionManager,
  ISOLATED_ENV_ALLOWLIST,
  SESSION_ID_RE,
  assertSessionId,
  collectForbiddenDeleteTargets,
  createNodeCodexProcessLauncher,
  generateSessionId,
  isolatedSessionEnv,
  isForbiddenSessionDeleteTarget,
  isSessionId,
  resolveTrustedCodexExecutable,
  sessionCodexHome,
  sessionDir,
  sessionSqliteHome,
  sessionsRoot,
  stripCredentials,
  type CodexManagedChild,
  type CodexProcessLauncher,
  type CodexSessionLaunchIntent,
} from "../src/codex-sessions";

class FakeChild implements CodexManagedChild {
  alive = true;
  ignoreTerm = false;
  private readonly listeners = new Set<(code: number | null, signal: NodeJS.Signals | null) => void>();

  kill(signal?: NodeJS.Signals): boolean {
    if (!this.alive) return false;
    if (signal !== "SIGKILL" && this.ignoreTerm) return true;
    this.alive = false;
    const sig = signal ?? "SIGTERM";
    const code = signal === "SIGKILL" ? null : 0;
    queueMicrotask(() => this.emitExit(code, sig));
    return true;
  }

  crash(code = 1): void {
    if (!this.alive) return;
    this.alive = false;
    this.emitExit(code, null);
  }

  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitExit(code: number | null, signal: NodeJS.Signals | null): void {
    for (const listener of this.listeners) listener(code, signal);
  }
}

class FakeLauncher implements CodexProcessLauncher {
  readonly children = new Map<string, FakeChild>();
  readonly failFor = new Set<string>();
  lastIntent: CodexSessionLaunchIntent | null = null;

  async launch(intent: CodexSessionLaunchIntent): Promise<CodexManagedChild> {
    this.lastIntent = intent;
    if (this.failFor.has(intent.sessionId)) throw new Error("spawn failed");
    const child = new FakeChild();
    this.children.set(intent.sessionId, child);
    return child;
  }
}

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "codexpp-sessions-"));
}

function managerFor(root: string, launcher = new FakeLauncher()) {
  let tick = 0;
  const mgr = new CodexSessionManager({
    userRoot: root,
    launcher,
    now: () => new Date(1_700_000_000_000 + tick++ * 1000),
    stopTimeoutMs: 30,
    killTimeoutMs: 30,
  });
  return { mgr, launcher };
}

test("session ids are opaque 24-hex tokens", () => {
  const id = generateSessionId();
  assert.match(id, SESSION_ID_RE);
  assert.equal(isSessionId(id), true);
  assert.doesNotThrow(() => assertSessionId(id));
  assert.notEqual(generateSessionId(), generateSessionId());
});

test("session ids reject path, email, and label shapes", () => {
  for (const value of [
    "",
    "../etc",
    "session_../abcdef",
    "/tmp/session",
    "C:\\foo",
    "\\\\unc\\x",
    "user@host.com",
    "Work account",
    "session_SHORT",
    "session_zzzzzzzzzzzzzzzzzzzzzzzz",
    "session_ABCDEF0123456789abcdef01",
  ]) {
    assert.throws(() => assertSessionId(value), /invalid session id/, value);
    assert.equal(isSessionId(value), false, value);
  }
});

test("create, list, rename keep labels independent from ids", () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession({ label: "Work" });
    assert.match(created.id, SESSION_ID_RE);
    assert.equal(created.label, "Work");
    assert.equal(created.enabled, true);
    assert.equal(mgr.getSessionStatus(created.id).lifecycle, "STOPPED");
    const listed = mgr.listSessions();
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.id, created.id);
    const renamed = mgr.renameSession(created.id, "Personal");
    assert.equal(renamed.id, created.id);
    assert.equal(renamed.label, "Personal");
    assert.equal(mgr.getSession(created.id).label, "Personal");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("duplicate session id is rejected", () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession({ id: "session_aaaaaaaaaaaaaaaaaaaaaaaa" });
    assert.throws(
      () => mgr.createSession({ id: created.id, label: "other" }),
      /session already exists/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("poisoned session.json credential keys are stripped", () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession({ label: "Safe" });
    const metaPath = join(sessionDir(root, created.id), "session.json");
    writeFileSync(
      metaPath,
      JSON.stringify({
        ...created,
        access_token: "secret",
        refresh_token: "secret",
        OPENAI_API_KEY: "sk-secret",
        cookies: "sid=1",
        auth: { token: "nope" },
        authorization: "Bearer x",
      }),
    );
    const reloaded = new CodexSessionManager({
      userRoot: root,
      launcher: new FakeLauncher(),
    });
    const meta = reloaded.getSession(created.id);
    assert.equal(meta.id, created.id);
    assert.equal("access_token" in meta, false);
    assert.equal("OPENAI_API_KEY" in meta, false);
    assert.equal("cookies" in meta, false);
    assert.equal("auth" in meta, false);
    assert.deepEqual(
      Object.keys(meta).sort(),
      ["createdAt", "enabled", "id", "label"].sort(),
    );
    const stripped = stripCredentials(
      { id: "user@x.com", access_token: "t", label: "L", enabled: true, createdAt: created.createdAt },
      created.id,
    );
    assert.equal(stripped.id, created.id);
    assert.equal("access_token" in stripped, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("session directories live under userRoot/codex-sessions/accounts/<id>", () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    const dir = sessionDir(root, created.id);
    assert.equal(dir.startsWith(join(root, "codex-sessions", "accounts")), true);
    assert.equal(existsSync(dir), true);
    assert.equal(existsSync(sessionCodexHome(root, created.id)), true);
    assert.equal(existsSync(sessionSqliteHome(root, created.id)), true);
    assert.equal(existsSync(join(sessionsRoot(root), "accounts", created.id, "session.json")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("path traversal and absolute ids are rejected before mkdir", () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    for (const id of ["../evil", "/tmp/x", "C:\\foo", "\\\\unc\\x", "session_../../../../tmp"]) {
      assert.throws(() => mgr.createSession({ id }), /invalid session id/);
    }
    assert.equal(existsSync(join(root, "evil")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("remove cannot escape the accounts root or delete siblings", async () => {
  const root = tempRoot();
  const outsideCodex = mkdtempSync(join(tmpdir(), "fake-codex-home-"));
  try {
    mkdirSync(join(outsideCodex, ".codex"), { recursive: true });
    writeFileSync(join(outsideCodex, ".codex", "auth.json"), "{}");
    const { mgr } = managerFor(root);
    const a = mgr.createSession({ label: "A" });
    const b = mgr.createSession({ label: "B" });
    const siblingDir = sessionDir(root, b.id);
    await mgr.removeSession(a.id);
    assert.equal(existsSync(sessionDir(root, a.id)), false);
    assert.equal(existsSync(siblingDir), true);
    assert.equal(existsSync(root), true);
    assert.equal(existsSync(join(outsideCodex, ".codex", "auth.json")), true);
    assert.equal(isForbiddenSessionDeleteTarget(root, root), true);
    assert.equal(isForbiddenSessionDeleteTarget(root, join(root, "tweak-data")), true);
    const forbidden = collectForbiddenDeleteTargets(root);
    assert.equal(forbidden.includes(root), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outsideCodex, { recursive: true, force: true });
  }
});

test("create does not touch ~/.codex", () => {
  const root = tempRoot();
  const home = mkdtempSync(join(tmpdir(), "codexpp-home-"));
  const prevHome = process.env.HOME;
  process.env.HOME = home;
  try {
    const { mgr } = managerFor(root);
    mgr.createSession({ label: "isolated" });
    assert.equal(existsSync(join(home, ".codex")), false);
  } finally {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    rmSync(root, { recursive: true, force: true });
    rmSync(home, { recursive: true, force: true });
  }
});

test("STOPPED starts into RUNNING", async () => {
  const root = tempRoot();
  try {
    const { mgr, launcher } = managerFor(root);
    const created = mgr.createSession();
    assert.equal(mgr.getSessionStatus(created.id).lifecycle, "STOPPED");
    const status = await mgr.startSession(created.id);
    assert.equal(status.lifecycle, "RUNNING");
    assert.equal(launcher.lastIntent?.sessionId, created.id);
    assert.equal(launcher.lastIntent?.codexHome, sessionCodexHome(root, created.id));
    assert.ok(status.metadata.lastStartedAt);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("RUNNING stops into STOPPED", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    const status = await mgr.stopSession(created.id);
    assert.equal(status.lifecycle, "STOPPED");
    assert.equal(status.metadata.lastExit?.reason, "requested");
    assert.ok(status.metadata.lastStoppedAt);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("double start is rejected and double stop is safe", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    await assert.rejects(mgr.startSession(created.id), /already starting\/running/);
    await mgr.stopSession(created.id);
    const again = await mgr.stopSession(created.id);
    assert.equal(again.lifecycle, "STOPPED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("disabled sessions cannot start but disable is allowed while running", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    mgr.disableSession(created.id);
    await assert.rejects(mgr.startSession(created.id), /session is disabled/);
    mgr.enableSession(created.id);
    await mgr.startSession(created.id);
    mgr.disableSession(created.id);
    assert.equal(mgr.getSessionStatus(created.id).lifecycle, "RUNNING");
    assert.equal(mgr.getSession(created.id).enabled, false);
    await assert.rejects(mgr.startSession(created.id), /session is disabled/);
    await mgr.stopSession(created.id);
    await assert.rejects(mgr.startSession(created.id), /session is disabled/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("spawn failure becomes FAILED", async () => {
  const root = tempRoot();
  try {
    const { mgr, launcher } = managerFor(root);
    const created = mgr.createSession();
    launcher.failFor.add(created.id);
    await assert.rejects(mgr.startSession(created.id), /spawn failed/);
    const status = mgr.getSessionStatus(created.id);
    assert.equal(status.lifecycle, "FAILED");
    assert.equal(status.metadata.lastExit?.reason, "launch-failed");
    const stopped = await mgr.stopSession(created.id);
    assert.equal(stopped.lifecycle, "FAILED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("unexpected child exit becomes FAILED", async () => {
  const root = tempRoot();
  try {
    const { mgr, launcher } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    launcher.children.get(created.id)?.crash(7);
    await new Promise((resolve) => setImmediate(resolve));
    const status = mgr.getSessionStatus(created.id);
    assert.equal(status.lifecycle, "FAILED");
    assert.equal(status.metadata.lastExit?.reason, "unexpected");
    assert.equal(status.metadata.lastExit?.code, 7);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("remove running without forceStop is rejected", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    await assert.rejects(mgr.removeSession(created.id), /session is running/);
    assert.equal(existsSync(sessionDir(root, created.id)), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("remove running with forceStop stops then deletes", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    await mgr.removeSession(created.id, { forceStop: true });
    assert.equal(existsSync(sessionDir(root, created.id)), false);
    assert.throws(() => mgr.getSession(created.id), /unknown session/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("shutdownAll stops live children", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const a = mgr.createSession({ label: "a" });
    const b = mgr.createSession({ label: "b" });
    await mgr.startSession(a.id);
    await mgr.startSession(b.id);
    assert.equal(mgr.hasLiveChildren(), true);
    await mgr.shutdownAll({ timeoutMs: 200 });
    assert.equal(mgr.getSessionStatus(a.id).lifecycle, "STOPPED");
    assert.equal(mgr.getSessionStatus(b.id).lifecycle, "STOPPED");
    assert.equal(mgr.hasLiveChildren(), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("stop uses SIGKILL after SIGTERM timeout", async () => {
  const root = tempRoot();
  try {
    const { mgr, launcher } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    const child = launcher.children.get(created.id);
    assert.ok(child);
    child.ignoreTerm = true;
    const status = await mgr.stopSession(created.id);
    assert.equal(status.lifecycle, "STOPPED");
    assert.equal(child.alive, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("restart stops then starts", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    await mgr.startSession(created.id);
    const status = await mgr.restartSession(created.id);
    assert.equal(status.lifecycle, "RUNNING");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("renderer-safe status omits process handles", async () => {
  const root = tempRoot();
  try {
    const { mgr } = managerFor(root);
    const created = mgr.createSession();
    const status = await mgr.startSession(created.id);
    assert.equal("pid" in status, false);
    assert.equal("child" in status, false);
    assert.equal("stdout" in status, false);
    assert.equal("env" in status, false);
    assert.equal("codexHome" in status, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("trusted executable resolver is conservative and never takes a user path", () => {
  const existing = new Set([join("/app", "Contents", "Resources", "codex")]);
  const found = resolveTrustedCodexExecutable({
    platform: "darwin",
    appPath: "/app",
    resourcesPath: "/resources",
    existsSync: (path) => existing.has(path),
  });
  assert.equal(found, join("/app", "Contents", "Resources", "codex"));
  assert.equal(
    resolveTrustedCodexExecutable({
      platform: "linux",
      resourcesPath: "/r",
      appPath: "/a",
      existsSync: () => false,
    }),
    null,
  );
});

test("node launcher rejects missing trusted executable", async () => {
  const launcher = createNodeCodexProcessLauncher({ resolveExecutable: () => null });
  await assert.rejects(
    launcher.launch({
      sessionId: "session_bbbbbbbbbbbbbbbbbbbbbbbb",
      codexHome: "/tmp/c",
      sqliteHome: "/tmp/s",
    }),
    /trusted Codex executable is not available/,
  );
});

test("node launcher spawns empty args with isolated env", async () => {
  const calls: Array<{ exe: string; args: readonly string[]; env: NodeJS.ProcessEnv; stdio: unknown; windowsHide: unknown }> = [];
  const launcher = createNodeCodexProcessLauncher({
    resolveExecutable: () => "/trusted/codex",
    spawnImpl: ((exe: string, args: readonly string[], options: { env?: NodeJS.ProcessEnv; stdio?: unknown; windowsHide?: unknown }) => {
      calls.push({
        exe,
        args,
        env: options.env ?? {},
        stdio: options.stdio,
        windowsHide: options.windowsHide,
      });
      const child = new EventEmitter() as ChildProcess;
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.kill = () => true;
      queueMicrotask(() => child.emit("spawn"));
      return child;
    }) as typeof spawn,
  });
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "should-not-copy";
  try {
    await launcher.launch({
      sessionId: "session_cccccccccccccccccccccccc",
      codexHome: "/tmp/session/codex-home",
      sqliteHome: "/tmp/session/sqlite-home",
    });
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.exe, "/trusted/codex");
  assert.deepEqual(calls[0]?.args, []);
  assert.deepEqual(calls[0]?.stdio, ["ignore", "pipe", "pipe"]);
  assert.equal(calls[0]?.windowsHide, true);
  assert.equal(calls[0]?.env.CODEX_HOME, "/tmp/session/codex-home");
  assert.equal(calls[0]?.env.CODEX_SQLITE_HOME, "/tmp/session/sqlite-home");
  assert.equal("OPENAI_API_KEY" in (calls[0]?.env ?? {}), false);
  for (const key of Object.keys(calls[0]?.env ?? {})) {
    assert.ok(
      key === "CODEX_HOME" || key === "CODEX_SQLITE_HOME" || (ISOLATED_ENV_ALLOWLIST as readonly string[]).includes(key),
      key,
    );
  }
});

test("isolated env copies only the allowlist plus session homes", () => {
  const env = isolatedSessionEnv(
    { sessionId: "session_dddddddddddddddddddddddd", codexHome: "/c", sqliteHome: "/s" },
    { PATH: "/bin", OPENAI_API_KEY: "no", HOME: "/home/me", SECRET: "nope" },
  );
  assert.equal(env.PATH, "/bin");
  assert.equal(env.HOME, "/home/me");
  assert.equal(env.CODEX_HOME, "/c");
  assert.equal(env.CODEX_SQLITE_HOME, "/s");
  assert.equal(env.OPENAI_API_KEY, undefined);
  assert.equal(env.SECRET, undefined);
});

test("optional fixture child can be spawned via node for integration", async () => {
  const fixture = join(process.cwd(), "packages/runtime/test/fixtures/fake-codex-child.js");
  chmodSync(fixture, 0o755);
  const root = tempRoot();
  const launcher: CodexProcessLauncher = {
    async launch(intent) {
      const child = spawn(process.execPath, [fixture], {
        env: isolatedSessionEnv(intent),
        cwd: dirname(intent.codexHome),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      child.stdout?.resume();
      child.stderr?.resume();
      return {
        kill: (signal) => child.kill(signal),
        onExit: (listener) => {
          const handler = (code: number | null, signal: NodeJS.Signals | null) => listener(code, signal);
          child.on("exit", handler);
          return () => child.off("exit", handler);
        },
      };
    },
  };
  try {
    const mgr = new CodexSessionManager({
      userRoot: root,
      launcher,
      stopTimeoutMs: 200,
      killTimeoutMs: 200,
    });
    const created = mgr.createSession({ label: "fixture" });
    const started = await mgr.startSession(created.id);
    assert.equal(started.lifecycle, "RUNNING");
    const stopped = await mgr.stopSession(created.id);
    assert.equal(stopped.lifecycle, "STOPPED");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
