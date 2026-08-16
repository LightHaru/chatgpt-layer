import { realpathSync } from "node:fs";
import type {
  DesktopSpawnSeamStatus,
  PathIo,
  SanitizedSpawnObservation,
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
  private readonly platform: NodeJS.Platform;
  private readonly version: string;
  private readonly now: () => string;
  private readonly io: PathIo;
  private readonly status: DesktopSpawnSeamStatus = emptyDesktopSpawnSeamStatus();
  private readonly diagnostics: SanitizedSpawnObservation[] = [];
  private originalSpawn: SpawnModule["spawn"] | null = null;
  private inHook = false;

  constructor(options: CodexDesktopSpawnProbeOptions) {
    this.spawnModule = options.spawnModule;
    this.env = options.env;
    this.trustedRoots = options.trustedRoots;
    this.log = options.log;
    this.platform = options.platform ?? process.platform;
    this.version = options.version ?? "1.1.4";
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
    this.status.enabled = isAppServerProbeEnabled(this.env);
    if (!this.status.enabled) {
      this.status.hookInstalled = false;
      this.status.spawnApi = null;
      return;
    }
    const current = this.spawnModule.spawn as MarkedSpawn;
    if (current?.[HOOK_MARK]) {
      this.status.hookInstalled = true;
      this.status.spawnApi = "child_process.spawn";
      return;
    }
    if (this.originalSpawn) {
      this.status.hookInstalled = true;
      this.status.spawnApi = "child_process.spawn";
      return;
    }
    const original = this.spawnModule.spawn;
    this.originalSpawn = original;
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
    this.spawnModule.spawn = wrapped as SpawnModule["spawn"];
    this.status.hookInstalled = true;
    this.status.spawnApi = "child_process.spawn";
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
