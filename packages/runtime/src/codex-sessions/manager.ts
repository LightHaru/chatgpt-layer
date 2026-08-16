import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { assertSessionId, generateSessionId, isSessionId } from "./ids";
import type { CodexProcessLauncher, CodexManagedChild } from "./launcher";
import {
  assertSafeSessionLayout,
  ensureSafeSessionLayout,
  rmSessionDir,
  sessionCodexHome,
  sessionDir,
  sessionMetaPath,
  sessionSqliteHome,
} from "./paths";
import type { CodexSessionLifecycle, CodexSessionMetadata, CodexSessionStatus } from "./types";

export interface CodexSessionManagerOptions {
  userRoot: string;
  launcher: CodexProcessLauncher;
  now?: () => Date;
  log?: (level: "info" | "warn" | "error", ...args: unknown[]) => void;
  stopTimeoutMs?: number;
  killTimeoutMs?: number;
}

export interface CreateCodexSessionInput {
  label?: string;
  id?: string;
}

export interface RemoveCodexSessionOptions {
  forceStop?: boolean;
}

interface SessionRecord {
  metadata: CodexSessionMetadata;
  lifecycle: CodexSessionLifecycle;
  child: CodexManagedChild | null;
  unsubExit: (() => void) | null;
  inFlight: Promise<unknown> | null;
}

// MS-2 may add transport/routing over these process primitives.

export class CodexSessionManager {
  private readonly userRoot: string;
  private readonly launcher: CodexProcessLauncher;
  private readonly now: () => Date;
  private readonly log?: CodexSessionManagerOptions["log"];
  private readonly stopTimeoutMs: number;
  private readonly killTimeoutMs: number;
  private readonly records = new Map<string, SessionRecord>();
  private readonly timers = new Set<NodeJS.Timeout>();

  constructor(options: CodexSessionManagerOptions) {
    this.userRoot = options.userRoot;
    this.launcher = options.launcher;
    this.now = options.now ?? (() => new Date());
    this.log = options.log;
    this.stopTimeoutMs = options.stopTimeoutMs ?? 2000;
    this.killTimeoutMs = options.killTimeoutMs ?? 1000;
    this.loadFromDisk();
  }

  listSessions(): CodexSessionMetadata[] {
    assertSafeSessionLayout(this.userRoot);
    return [...this.records.values()]
      .map((record) => cloneMetadata(record.metadata))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  }

  getSession(id: string): CodexSessionMetadata {
    return cloneMetadata(this.require(id).metadata);
  }

  getSessionStatus(id: string): CodexSessionStatus {
    const record = this.require(id);
    return {
      id: record.metadata.id,
      lifecycle: record.lifecycle,
      metadata: cloneMetadata(record.metadata),
    };
  }

  createSession(input: CreateCodexSessionInput = {}): CodexSessionMetadata {
    assertSafeSessionLayout(this.userRoot);
    const id = input.id === undefined ? this.allocateId() : (assertSessionId(input.id), input.id);
    if (this.records.has(id) || existsSync(sessionDir(this.userRoot, id))) {
      throw new Error("session already exists");
    }
    const createdAt = this.isoNow();
    const metadata: CodexSessionMetadata = {
      id,
      label: normalizeLabel(input.label),
      enabled: true,
      createdAt,
    };
    ensureSafeSessionLayout(this.userRoot);
    const dir = sessionDir(this.userRoot, id);
    try {
      mkdirSync(dir);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === "EEXIST") throw new Error("session already exists");
      throw error;
    }
    mkdirSync(sessionCodexHome(this.userRoot, id), { recursive: true });
    mkdirSync(sessionSqliteHome(this.userRoot, id), { recursive: true });
    writeJsonAtomic(sessionMetaPath(this.userRoot, id), metadata);
    this.records.set(id, {
      metadata,
      lifecycle: "STOPPED",
      child: null,
      unsubExit: null,
      inFlight: null,
    });
    this.log?.("info", `created session ${id}`);
    return cloneMetadata(metadata);
  }

  renameSession(id: string, label: string): CodexSessionMetadata {
    const record = this.require(id);
    record.metadata.label = normalizeLabel(label);
    record.metadata.updatedAt = this.isoNow();
    this.persist(record);
    return cloneMetadata(record.metadata);
  }

  enableSession(id: string): CodexSessionMetadata {
    return this.setEnabled(id, true);
  }

  disableSession(id: string): CodexSessionMetadata {
    return this.setEnabled(id, false);
  }

  async removeSession(id: string, options: RemoveCodexSessionOptions = {}): Promise<void> {
    assertSafeSessionLayout(this.userRoot);
    const record = this.require(id);
    if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING") {
      if (!options.forceStop) {
        throw new Error("session is running");
      }
      await this.stopSession(id);
    }
    this.detach(record);
    this.records.delete(id);
    rmSessionDir(this.userRoot, id);
    this.log?.("info", `removed session ${id}`);
  }

  async startSession(id: string): Promise<CodexSessionStatus> {
    const record = this.require(id);
    if (!record.metadata.enabled) throw new Error("session is disabled");
    if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING") {
      throw new Error("session already starting/running");
    }
    if (record.lifecycle === "STOPPING") throw new Error("session is stopping");
    record.lifecycle = "STARTING";
    const work = this.launchRecord(record);
    record.inFlight = work;
    try {
      await work;
    } finally {
      if (record.inFlight === work) record.inFlight = null;
    }
    return this.getSessionStatus(id);
  }

  async stopSession(id: string): Promise<CodexSessionStatus> {
    const record = this.require(id);
    if (record.lifecycle === "STOPPED") return this.getSessionStatus(id);
    if (record.lifecycle === "FAILED" && !record.child) return this.getSessionStatus(id);
    if (record.lifecycle === "STOPPING" && record.inFlight) {
      await record.inFlight.catch(() => {});
      return this.getSessionStatus(id);
    }
    record.lifecycle = "STOPPING";
    const work = this.stopRecord(record);
    record.inFlight = work;
    try {
      await work;
    } finally {
      if (record.inFlight === work) record.inFlight = null;
    }
    return this.getSessionStatus(id);
  }

  async restartSession(id: string): Promise<CodexSessionStatus> {
    await this.stopSession(id);
    return this.startSession(id);
  }

  async shutdownAll(options: { timeoutMs?: number } = {}): Promise<void> {
    const timeoutMs = options.timeoutMs ?? this.stopTimeoutMs + this.killTimeoutMs;
    const live = [...this.records.values()].filter((record) => this.isLive(record));
    const stopping = Promise.all(live.map((record) => this.stopSession(record.metadata.id).catch(() => {})));
    await Promise.race([stopping, this.delay(timeoutMs)]);
    for (const record of this.records.values()) {
      this.detach(record);
      if (record.lifecycle === "STARTING" || record.lifecycle === "RUNNING" || record.lifecycle === "STOPPING") {
        record.lifecycle = "STOPPED";
      }
    }
    this.clearTimers();
  }

  hasLiveChildren(): boolean {
    for (const record of this.records.values()) {
      if (this.isLive(record)) return true;
    }
    return false;
  }

  private isLive(record: SessionRecord): boolean {
    return (
      record.child !== null ||
      record.lifecycle === "STARTING" ||
      record.lifecycle === "RUNNING" ||
      record.lifecycle === "STOPPING"
    );
  }

  private setEnabled(id: string, enabled: boolean): CodexSessionMetadata {
    const record = this.require(id);
    record.metadata.enabled = enabled;
    record.metadata.updatedAt = this.isoNow();
    this.persist(record);
    return cloneMetadata(record.metadata);
  }

  private async launchRecord(record: SessionRecord): Promise<void> {
    try {
      const child = await this.launcher.launch({
        sessionId: record.metadata.id,
        codexHome: sessionCodexHome(this.userRoot, record.metadata.id),
        sqliteHome: sessionSqliteHome(this.userRoot, record.metadata.id),
      });
      record.child = child;
      record.unsubExit = child.onExit((code, signal) => {
        this.onChildExit(record, code, signal);
      });
      record.lifecycle = "RUNNING";
      record.metadata.lastStartedAt = this.isoNow();
      record.metadata.updatedAt = record.metadata.lastStartedAt;
      this.persist(record);
    } catch (error) {
      record.lifecycle = "FAILED";
      record.child = null;
      record.unsubExit = null;
      record.metadata.lastExit = {
        at: this.isoNow(),
        code: null,
        signal: null,
        reason: "launch-failed",
      };
      record.metadata.updatedAt = record.metadata.lastExit.at;
      this.persist(record);
      throw error;
    }
  }

  private async stopRecord(record: SessionRecord): Promise<void> {
    const child = record.child;
    if (!child) {
      record.lifecycle = "STOPPED";
      record.metadata.lastStoppedAt = this.isoNow();
      record.metadata.updatedAt = record.metadata.lastStoppedAt;
      this.persist(record);
      return;
    }
    let exitCode: number | null = null;
    let exitSignal: NodeJS.Signals | null = null;
    const waitExit = new Promise<void>((resolve) => {
      const unsub = child.onExit((code, signal) => {
        exitCode = code;
        exitSignal = signal;
        unsub();
        resolve();
      });
    });
    child.kill("SIGTERM");
    const termExited = await this.waitWithTimeout(waitExit, this.stopTimeoutMs);
    if (!termExited) {
      child.kill("SIGKILL");
      await this.waitWithTimeout(waitExit, this.killTimeoutMs);
    }
    this.detach(record);
    record.lifecycle = "STOPPED";
    record.metadata.lastStoppedAt = this.isoNow();
    record.metadata.lastExit = {
      at: record.metadata.lastStoppedAt,
      code: exitCode,
      signal: exitSignal,
      reason: "requested",
    };
    record.metadata.updatedAt = record.metadata.lastStoppedAt;
    this.persist(record);
  }

  private onChildExit(
    record: SessionRecord,
    code: number | null,
    signal: NodeJS.Signals | null,
  ): void {
    if (record.lifecycle === "STOPPING") return;
    if (record.lifecycle !== "RUNNING" && record.lifecycle !== "STARTING") return;
    this.detach(record);
    record.lifecycle = "FAILED";
    record.metadata.lastExit = {
      at: this.isoNow(),
      code,
      signal,
      reason: "unexpected",
    };
    record.metadata.updatedAt = record.metadata.lastExit.at;
    this.persist(record);
    this.log?.("warn", `session ${record.metadata.id} exited unexpectedly`);
  }

  private detach(record: SessionRecord): void {
    record.unsubExit?.();
    record.unsubExit = null;
    if (record.child) {
      try {
        record.child.kill("SIGKILL");
      } catch {}
      record.child = null;
    }
  }

  private require(id: string): SessionRecord {
    assertSessionId(id);
    assertSafeSessionLayout(this.userRoot);
    const record = this.records.get(id);
    if (!record) throw new Error(`unknown session: ${id}`);
    return record;
  }

  private allocateId(): string {
    const layout = assertSafeSessionLayout(this.userRoot);
    for (let i = 0; i < 8; i++) {
      const id = generateSessionId();
      if (!this.records.has(id) && !existsSync(join(layout.realAccountsRoot, id))) return id;
    }
    throw new Error("failed to allocate session id");
  }

  private persist(record: SessionRecord): void {
    assertSafeSessionLayout(this.userRoot);
    writeJsonAtomic(sessionMetaPath(this.userRoot, record.metadata.id), record.metadata);
  }

  private loadFromDisk(): void {
    const layout = assertSafeSessionLayout(this.userRoot);
    const root = layout.realAccountsRoot;
    if (!existsSync(root)) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(root);
    } catch {
      return;
    }
    for (const name of entries) {
      if (!isSessionId(name)) continue;
      try {
        const metaPath = sessionMetaPath(this.userRoot, name);
        if (!existsSync(metaPath)) continue;
        const raw = JSON.parse(readFileSync(metaPath, "utf8")) as unknown;
        const metadata = stripCredentials(raw, name);
        this.records.set(name, {
          metadata,
          lifecycle: "STOPPED",
          child: null,
          unsubExit: null,
          inFlight: null,
        });
      } catch (error) {
        this.log?.("warn", `failed to load session ${name}`);
      }
    }
  }

  private isoNow(): string {
    return this.now().toISOString();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        resolve();
      }, ms);
      this.timers.add(timer);
    });
  }

  private async waitWithTimeout(promise: Promise<void>, timeoutMs: number): Promise<boolean> {
    let settled = false;
    const timeout = this.delay(timeoutMs).then(() => {
      if (settled) return false;
      return false;
    });
    const winner = await Promise.race([
      promise.then(() => {
        settled = true;
        return true;
      }),
      timeout,
    ]);
    return winner;
  }

  private clearTimers(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}

function normalizeLabel(label: unknown): string {
  if (label === undefined || label === null) return "";
  if (typeof label !== "string") throw new Error("session label must be a string");
  return label.slice(0, 200);
}

function cloneMetadata(metadata: CodexSessionMetadata): CodexSessionMetadata {
  return {
    ...metadata,
    ...(metadata.lastExit ? { lastExit: { ...metadata.lastExit } } : {}),
  };
}

export function stripCredentials(raw: unknown, fallbackId: string): CodexSessionMetadata {
  const rec = isRecord(raw) ? raw : {};
  const lastExitRaw = isRecord(rec.lastExit) ? rec.lastExit : undefined;
  let reason: "requested" | "unexpected" | "launch-failed" = "unexpected";
  if (
    lastExitRaw &&
    (lastExitRaw.reason === "requested" ||
      lastExitRaw.reason === "unexpected" ||
      lastExitRaw.reason === "launch-failed")
  ) {
    reason = lastExitRaw.reason;
  }
  const lastExit = lastExitRaw
    ? {
        at: typeof lastExitRaw.at === "string" ? lastExitRaw.at : new Date(0).toISOString(),
        code: typeof lastExitRaw.code === "number" ? lastExitRaw.code : null,
        signal: typeof lastExitRaw.signal === "string" ? lastExitRaw.signal : null,
        reason,
      }
    : undefined;
  const metadata: CodexSessionMetadata = {
    id: fallbackId,
    label: typeof rec.label === "string" ? rec.label : "",
    enabled: rec.enabled !== false,
    createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date(0).toISOString(),
  };
  if (typeof rec.updatedAt === "string") metadata.updatedAt = rec.updatedAt;
  if (typeof rec.lastStartedAt === "string") metadata.lastStartedAt = rec.lastStartedAt;
  if (typeof rec.lastStoppedAt === "string") metadata.lastStoppedAt = rec.lastStoppedAt;
  if (lastExit) metadata.lastExit = lastExit;
  return metadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `.${basename(filePath)}.${process.pid}.tmp`);
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  try {
    renameSync(tmp, filePath);
  } catch {
    try {
      unlinkSync(filePath);
    } catch {}
    renameSync(tmp, filePath);
  }
}
