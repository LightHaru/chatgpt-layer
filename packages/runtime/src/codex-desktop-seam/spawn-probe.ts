import { realpathSync } from "node:fs";
import type {
  DesktopSpawnSeamStatus,
  PathIo,
  SanitizedSpawnObservation,
  SpawnHookInstallError,
  SpawnModule,
} from "./types";
import { classifySpawnCall, isAppServerProbeEnabled } from "./candidate";
import { emptyDesktopSpawnSeamStatus, recordObservation } from "./status";

const HOOK_MARK = Symbol.for("codexpp.desktopAppServerSpawnProbe");
const MAX_DIAGNOSTICS = 32;

export interface CodexDesktopSpawnProbeOptions {
  spawnModule: SpawnModule;
  env?: NodeJS.ProcessEnv;
  trustedRoots: () => readonly string[];
  log?: (observation: SanitizedSpawnObservation) => void;
  onInstallError?: (category: SpawnHookInstallError) => void;
  platform?: NodeJS.Platform;
  version?: string;
  now?: () => string;
  io?: PathIo;
}

type MarkedSpawn = ((...args: never[]) => unknown) & { [HOOK_MARK]?: true };

export class CodexDesktopSpawnProbe {
  private readonly spawnModule: SpawnModule;
  private readonly env: NodeJS.ProcessEnv | undefined;
  private readonly trustedRoots: () => readonly string[];
  private readonly log: ((observation: SanitizedSpawnObservation) => void) | undefined;
  private readonly onInstallError: ((category: SpawnHookInstallError) => void) | undefined;
  private readonly platform: NodeJS.Platform;
  private readonly version: string;
  private readonly now: () => string;
  private readonly io: PathIo;
  private readonly status: DesktopSpawnSeamStatus = emptyDesktopSpawnSeamStatus();
  private readonly diagnostics: SanitizedSpawnObservation[] = [];
  private originalSpawn: SpawnModule["spawn"] | null = null;
  private wrapped: MarkedSpawn | null = null;
  private inHook = false;

  constructor(options: CodexDesktopSpawnProbeOptions) {
    this.spawnModule = options.spawnModule;
    this.env = options.env;
    this.trustedRoots = options.trustedRoots;
    this.log = options.log;
    this.onInstallError = options.onInstallError;
    this.platform = options.platform ?? process.platform;
    this.version = options.version ?? "1.1.5";
    this.now = options.now ?? (() => new Date().toISOString());
    this.io = options.io ?? { realpathSync };
    this.status.enabled = isAppServerProbeEnabled(this.env);
  }

  getStatus(): DesktopSpawnSeamStatus {
    return { ...this.status };
  }

  getDiagnostics(): readonly SanitizedSpawnObservation[] {
    return this.diagnostics.slice();
  }

  install(): void {
    try {
      this.status.enabled = isAppServerProbeEnabled(this.env);
      if (!this.status.enabled) {
        this.status.hookInstalled = false;
        this.status.spawnApi = null;
        this.status.hookInstallError = null;
        return;
      }
      const current = this.readSpawn();
      if (this.wrapped && current === this.wrapped) {
        this.status.hookInstalled = true;
        this.status.spawnApi = "child_process.spawn";
        this.status.hookInstallError = null;
        return;
      }
      if (typeof current !== "function") {
        this.failClosed();
        return;
      }
      if (this.isMarked(current) && current !== this.wrapped) {
        this.failClosed();
        return;
      }
      const original = current as SpawnModule["spawn"];
      const wrapped = this.makeWrapped(original);
      this.originalSpawn = original;
      this.wrapped = wrapped;
      if (!this.assignSpawn(wrapped) || this.readSpawn() !== wrapped) {
        this.tryRestore(original);
        this.wrapped = null;
        this.failClosed();
        return;
      }
      this.status.hookInstalled = true;
      this.status.spawnApi = "child_process.spawn";
      this.status.hookInstallError = null;
    } catch {
      this.failClosed();
    }
  }

  /**
   * Internal test restore. Restores only if `.spawn` is still this probe's wrapper.
   * A stale instance must not overwrite a newer wrapper.
   */
  uninstall(): boolean {
    if (!this.wrapped || !this.originalSpawn) return false;
    if (this.readSpawn() !== this.wrapped) return false;
    const original = this.originalSpawn;
    if (!this.assignSpawn(original) || this.readSpawn() !== original) return false;
    this.wrapped = null;
    this.status.hookInstalled = false;
    this.status.spawnApi = null;
    this.status.hookInstallError = null;
    return true;
  }

  private makeWrapped(original: SpawnModule["spawn"]): MarkedSpawn {
    const probe = this;
    const wrapped: MarkedSpawn = function desktopSpawnProbe(this: unknown, ...args: unknown[]) {
      if (probe.inHook) {
        return Function.prototype.apply.call(original, this, args);
      }
      probe.inHook = true;
      try {
        try {
          probe.observe(args);
        } catch {
          // Classification must never block or alter the original spawn.
        }
        return Function.prototype.apply.call(original, this, args);
      } finally {
        probe.inHook = false;
      }
    };
    wrapped[HOOK_MARK] = true;
    return wrapped;
  }

  private readSpawn(): unknown {
    try {
      return this.spawnModule.spawn;
    } catch {
      return undefined;
    }
  }

  private assignSpawn(value: SpawnModule["spawn"]): boolean {
    try {
      this.spawnModule.spawn = value;
      return true;
    } catch {
      return false;
    }
  }

  private tryRestore(original: SpawnModule["spawn"]): void {
    try {
      if (this.readSpawn() === this.wrapped) this.assignSpawn(original);
    } catch {
      // Best-effort restore only.
    }
  }

  private isMarked(value: unknown): value is MarkedSpawn {
    return typeof value === "function" && Boolean((value as MarkedSpawn)[HOOK_MARK]);
  }

  private failClosed(): void {
    this.status.hookInstalled = false;
    this.status.spawnApi = null;
    this.status.hookInstallError = "spawn-hook-unavailable";
    try {
      this.onInstallError?.("spawn-hook-unavailable");
    } catch {
      // Logging must never abort Layer boot.
    }
  }

  private observe(callArgs: unknown[]): void {
    const classified = classifySpawnCall({
      callArgs,
      trustedRoots: this.trustedRoots() ?? [],
      platform: this.platform,
      io: this.io,
    });
    recordObservation(this.status, {
      trustedExecutable: classified.trustedExecutable,
      appServerSubcommand: classified.appServerSubcommand,
      candidate: classified.candidate,
      transportMode: classified.transportMode,
      spawnApi: "child_process.spawn",
    });
    const observation: SanitizedSpawnObservation = {
      timestamp: this.now(),
      processApi: "child_process.spawn",
      candidate: classified.candidate,
      executableBasename: classified.executableBasename,
      trustedResourceRoot: classified.trustedExecutable,
      relativeResourcePath: classified.relativeResourcePath,
      appServerSubcommand: classified.appServerSubcommand,
      transportMode: classified.transportMode,
      argumentCount: classified.argumentCount,
      platform: this.platform,
      layerVersion: this.version,
    };
    this.diagnostics.push(observation);
    if (this.diagnostics.length > MAX_DIAGNOSTICS) this.diagnostics.shift();
    this.log?.(observation);
  }
}
