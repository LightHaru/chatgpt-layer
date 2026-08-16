import {
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { basename, dirname, join } from "node:path";
import { assertSessionId, isSessionId } from "../codex-sessions/ids";
import { assertSafeSessionLayout, sessionsRoot } from "../codex-sessions/paths";
import { CodexAppServerError } from "./errors";
import { assertThreadId, isUsableThreadId } from "./thread-id";
import {
  MAX_OWNER_STORE_BYTES,
  MAX_THREAD_OWNERS,
  THREAD_OWNER_STORE_VERSION,
} from "./types";

export interface ThreadOwnerEntry {
  threadId: string;
  sessionId: string;
}

export interface ThreadOwnerStoreFile {
  version: number;
  owners: Record<string, string>;
}

export interface SetOwnerOptions {
  overwrite?: boolean;
}

/**
 * Persist threadId → sessionId under Layer userRoot.
 * Path: <userRoot>/codex-sessions/thread-owners.json
 *
 * Reuses MS-1 assertSafeSessionLayout. Poisoned/symlink session root fails
 * closed. No credentials, auth, or filesystem paths in the file.
 */
export class ThreadOwnerStore {
  private readonly userRoot: string;
  private owners = new Map<string, string>();
  private loaded = false;

  constructor(userRoot: string) {
    this.userRoot = userRoot;
  }

  getOwner(threadId: string): string | null {
    assertThreadId(threadId);
    this.ensureLoaded();
    return this.owners.get(threadId) ?? null;
  }

  setOwner(threadId: string, sessionId: string, options: SetOwnerOptions = {}): void {
    assertThreadId(threadId);
    assertSessionId(sessionId);
    this.ensureLoaded();
    const existing = this.owners.get(threadId);
    if (existing && existing !== sessionId && !options.overwrite) {
      throw new CodexAppServerError(
        "owner-exists",
        `thread ${threadId} is already owned by another session`,
      );
    }
    if (!existing && this.owners.size >= MAX_THREAD_OWNERS) {
      throw new CodexAppServerError("store-corrupt", "thread owner store is full");
    }
    this.owners.set(threadId, sessionId);
    this.persist();
  }

  removeOwner(threadId: string): boolean {
    assertThreadId(threadId);
    this.ensureLoaded();
    const deleted = this.owners.delete(threadId);
    if (deleted) this.persist();
    return deleted;
  }

  listOwners(): ThreadOwnerEntry[] {
    this.ensureLoaded();
    return [...this.owners.entries()]
      .map(([threadId, sessionId]) => ({ threadId, sessionId }))
      .sort((a, b) => a.threadId.localeCompare(b.threadId));
  }

  removeSessionOwners(sessionId: string): number {
    assertSessionId(sessionId);
    this.ensureLoaded();
    let removed = 0;
    for (const [threadId, owner] of [...this.owners.entries()]) {
      if (owner === sessionId) {
        this.owners.delete(threadId);
        removed += 1;
      }
    }
    if (removed > 0) this.persist();
    return removed;
  }

  private storePath(): string {
    const layout = assertSafeSessionLayout(this.userRoot);
    const path = join(layout.realSessionsRoot, "thread-owners.json");
    if (!path.startsWith(layout.realSessionsRoot)) {
      throw new CodexAppServerError("store-corrupt", "thread owner path escaped session root");
    }
    return path;
  }

  private ensureLoaded(): void {
    if (this.loaded) return;
    assertSafeSessionLayout(this.userRoot);
    const path = this.storePath();
    const stat = lstatIfExists(path);
    if (!stat) {
      this.owners = new Map();
      this.loaded = true;
      return;
    }
    if (stat.isSymbolicLink()) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json must not be a symlink");
    }
    if (!stat.isFile()) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json must be a file");
    }
    if (stat.size > MAX_OWNER_STORE_BYTES) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json exceeds size bound");
    }
    let rawText: string;
    try {
      rawText = readFileSync(path, "utf8");
    } catch (error) {
      throw new CodexAppServerError("store-corrupt", "failed to read thread-owners.json");
    }
    if (rawText.length > MAX_OWNER_STORE_BYTES) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json exceeds size bound");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json is not JSON");
    }
    this.owners = parseOwnerFile(parsed);
    this.loaded = true;
  }

  private persist(): void {
    const layout = assertSafeSessionLayout(this.userRoot);
    mkdirSync(layout.realSessionsRoot, { recursive: true });
    assertSafeSessionLayout(this.userRoot);
    const path = this.storePath();
    const existing = lstatIfExists(path);
    if (existing?.isSymbolicLink()) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json must not be a symlink");
    }
    const body: ThreadOwnerStoreFile = {
      version: THREAD_OWNER_STORE_VERSION,
      owners: Object.fromEntries(this.owners),
    };
    const encoded = `${JSON.stringify(body, null, 2)}\n`;
    if (Buffer.byteLength(encoded, "utf8") > MAX_OWNER_STORE_BYTES) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json would exceed size bound");
    }
    writeJsonAtomic(path, encoded);
  }
}

export function threadOwnerStorePath(userRoot: string): string {
  assertSafeSessionLayout(userRoot);
  return join(sessionsRoot(userRoot), "thread-owners.json");
}

function parseOwnerFile(raw: unknown): Map<string, string> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CodexAppServerError("store-corrupt", "thread-owners.json must be an object");
  }
  const rec = raw as Record<string, unknown>;
  const allowed = new Set(["version", "owners"]);
  for (const key of Object.keys(rec)) {
    if (!allowed.has(key)) {
      throw new CodexAppServerError("store-corrupt", "thread-owners.json contains unknown fields");
    }
  }
  if (rec.version !== THREAD_OWNER_STORE_VERSION) {
    throw new CodexAppServerError("store-corrupt", "unsupported thread-owners.json version");
  }
  if (rec.owners === null || typeof rec.owners !== "object" || Array.isArray(rec.owners)) {
    throw new CodexAppServerError("store-corrupt", "owners must be an object");
  }
  const owners = rec.owners as Record<string, unknown>;
  const map = new Map<string, string>();
  for (const [threadId, sessionId] of Object.entries(owners)) {
    if (!isUsableThreadId(threadId) || typeof sessionId !== "string" || !isSessionId(sessionId)) {
      throw new CodexAppServerError("store-corrupt", "malformed thread owner entry");
    }
    if (looksLikeCredential(threadId) || looksLikeCredential(sessionId)) {
      throw new CodexAppServerError("store-corrupt", "credential-like field rejected");
    }
    map.set(threadId, sessionId);
    if (map.size > MAX_THREAD_OWNERS) {
      throw new CodexAppServerError("store-corrupt", "too many thread owners");
    }
  }
  return map;
}

function looksLikeCredential(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    lower.includes("token") ||
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("auth.json") ||
    lower.includes("sk-") ||
    lower.includes("bearer")
  );
}

function lstatIfExists(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function writeJsonAtomic(filePath: string, encoded: string): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${basename(filePath)}.${process.pid}.tmp`);
  writeFileSync(tmp, encoded, "utf8");
  try {
    renameSync(tmp, filePath);
  } catch {
    try {
      unlinkSync(filePath);
    } catch {}
    renameSync(tmp, filePath);
  }
}

