import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateSessionId } from "../src/codex-sessions";
import {
  CodexAppServerError,
  THREAD_OWNER_STORE_VERSION,
  ThreadOwnerStore,
  isUsableThreadId,
  threadOwnerStorePath,
} from "../src/codex-app-server";

function tempRoot(): string {
  return mkdtempSync(join(tmpdir(), "codexpp-owners-"));
}

function linkDir(target: string, dest: string): void {
  const types: Array<"junction" | "dir"> = process.platform === "win32" ? ["junction", "dir"] : ["dir", "junction"];
  const errors: string[] = [];
  for (const type of types) {
    try {
      symlinkSync(target, dest, type);
      return;
    } catch (error) {
      errors.push(`${type}: ${(error as Error).message}`);
    }
  }
  assert.fail(`unable to create directory link (${errors.join("; ")})`);
}

test("set/get, explicit overwrite, persist/reload", () => {
  const root = tempRoot();
  try {
    const sessionA = generateSessionId();
    const sessionB = generateSessionId();
    const store = new ThreadOwnerStore(root);
    store.setOwner("thread_one", sessionA);
    assert.equal(store.getOwner("thread_one"), sessionA);
    assert.throws(
      () => store.setOwner("thread_one", sessionB),
      (err: unknown) => err instanceof CodexAppServerError && err.kind === "owner-exists",
    );
    store.setOwner("thread_one", sessionB, { overwrite: true });
    assert.equal(store.getOwner("thread_one"), sessionB);
    const path = threadOwnerStorePath(root);
    assert.equal(existsSync(path), true);
    const disk = JSON.parse(readFileSync(path, "utf8")) as { version: number; owners: Record<string, string> };
    assert.equal(disk.version, THREAD_OWNER_STORE_VERSION);
    assert.equal(disk.owners.thread_one, sessionB);
    assert.equal("token" in disk, false);
    assert.equal("auth" in disk, false);

    const reloaded = new ThreadOwnerStore(root);
    assert.equal(reloaded.getOwner("thread_one"), sessionB);
    assert.deepEqual(reloaded.listOwners(), [{ threadId: "thread_one", sessionId: sessionB }]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("remove owner and removeSessionOwners", () => {
  const root = tempRoot();
  try {
    const a = generateSessionId();
    const b = generateSessionId();
    const store = new ThreadOwnerStore(root);
    store.setOwner("thread_a1", a);
    store.setOwner("thread_a2", a);
    store.setOwner("thread_b1", b);
    assert.equal(store.removeOwner("thread_a1"), true);
    assert.equal(store.getOwner("thread_a1"), null);
    assert.equal(store.removeSessionOwners(a), 1);
    assert.equal(store.getOwner("thread_a2"), null);
    assert.equal(store.getOwner("thread_b1"), b);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("malformed session and thread ids are rejected", () => {
  const root = tempRoot();
  try {
    const store = new ThreadOwnerStore(root);
    const good = generateSessionId();
    assert.throws(() => store.setOwner("../etc/passwd", good), /invalid thread id/);
    assert.throws(() => store.setOwner("thread/abs", good), /invalid thread id/);
    assert.throws(() => store.setOwner("thread_ok", "not-a-session"), /invalid session id/);
    assert.throws(() => store.setOwner("thread_ok", "session_ZZZZZZZZZZZZZZZZZZZZZZZZ"), /invalid session id/);
    assert.throws(() => store.getOwner("bad id"), /invalid thread id/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("corrupt, oversized, and credential-like stores fail closed", () => {
  const root = tempRoot();
  try {
    mkdirSync(join(root, "codex-sessions"), { recursive: true });
    writeFileSync(join(root, "codex-sessions", "thread-owners.json"), "{not json", "utf8");
    const corrupt = new ThreadOwnerStore(root);
    assert.throws(() => corrupt.getOwner("thread_one"), (err: unknown) => {
      assert.ok(err instanceof CodexAppServerError);
      assert.equal(err.kind, "store-corrupt");
      return true;
    });

    const root2 = tempRoot();
    mkdirSync(join(root2, "codex-sessions"), { recursive: true });
    writeFileSync(
      join(root2, "codex-sessions", "thread-owners.json"),
      JSON.stringify({ version: 1, owners: { thread_one: generateSessionId() }, token: "sk-secret" }),
      "utf8",
    );
    const extra = new ThreadOwnerStore(root2);
    assert.throws(() => extra.listOwners(), /unknown fields|store-corrupt/);
    rmSync(root2, { recursive: true, force: true });

    const root3 = tempRoot();
    mkdirSync(join(root3, "codex-sessions"), { recursive: true });
    writeFileSync(join(root3, "codex-sessions", "thread-owners.json"), `${"x".repeat(600_000)}`, "utf8");
    const huge = new ThreadOwnerStore(root3);
    assert.throws(() => huge.listOwners(), (err: unknown) => {
      assert.ok(err instanceof CodexAppServerError);
      assert.equal(err.kind, "store-corrupt");
      return true;
    });
    rmSync(root3, { recursive: true, force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("poisoned symlink session root fails closed", () => {
  const root = tempRoot();
  const outside = tempRoot();
  try {
    mkdirSync(outside, { recursive: true });
    linkDir(outside, join(root, "codex-sessions"));
    const store = new ThreadOwnerStore(root);
    assert.throws(() => store.setOwner("thread_one", generateSessionId()), /symlink|session root/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("atomic write replaces the store file", () => {
  const root = tempRoot();
  try {
    const store = new ThreadOwnerStore(root);
    const session = generateSessionId();
    store.setOwner("thread_one", session);
    store.setOwner("thread_two", session);
    const parsed = JSON.parse(readFileSync(threadOwnerStorePath(root), "utf8")) as { owners: Record<string, string> };
    assert.equal(Object.keys(parsed.owners).length, 2);
    assert.equal(parsed.owners.thread_one, session);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("owner store rejects actual NUL and control characters in thread ids", () => {
  const root = tempRoot();
  try {
    const store = new ThreadOwnerStore(root);
    const session = generateSessionId();
    const withNul = "thread" + String.fromCharCode(0) + "x";
    const withDel = "thread" + String.fromCharCode(0x7f) + "x";
    assert.equal(isUsableThreadId(withNul), false);
    assert.throws(() => store.setOwner(withNul, session), /invalid thread id/);
    assert.throws(() => store.setOwner(withDel, session), /invalid thread id/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
