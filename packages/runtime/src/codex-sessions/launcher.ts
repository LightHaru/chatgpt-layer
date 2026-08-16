import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export interface CodexSessionLaunchIntent {
  sessionId: string;
  codexHome: string;
  sqliteHome: string;
}

export interface CodexManagedChild {
  kill(signal?: NodeJS.Signals): boolean;
  onExit(listener: (code: number | null, signal: NodeJS.Signals | null) => void): () => void;
}

export interface CodexProcessLauncher {
  launch(intent: CodexSessionLaunchIntent): Promise<CodexManagedChild>;
}

export const ISOLATED_ENV_ALLOWLIST = [
  "PATH",
  "HOME",
  "USERPROFILE",
  "SYSTEMROOT",
  "WINDIR",
  "TEMP",
  "TMP",
  "LANG",
  "LC_ALL",
] as const;

export function isolatedSessionEnv(
  intent: CodexSessionLaunchIntent,
  sourceEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const key of ISOLATED_ENV_ALLOWLIST) {
    const value = sourceEnv[key];
    if (typeof value === "string") env[key] = value;
  }
  env.CODEX_HOME = intent.codexHome;
  env.CODEX_SQLITE_HOME = intent.sqliteHome;
  return env;
}

export function trustedCodexSearchRoots(opts: {
  platform?: NodeJS.Platform;
  resourcesPath?: string | null;
  appPath?: string | null;
}): string[] {
  const platform = opts.platform ?? process.platform;
  const roots: string[] = [];
  if (opts.resourcesPath) roots.push(opts.resourcesPath);
  if (opts.appPath) roots.push(opts.appPath);
  if (platform === "darwin" && opts.appPath) {
    roots.push(join(opts.appPath, "Contents", "Resources"));
  }
  return roots;
}

export function resolveTrustedCodexExecutable(opts: {
  platform?: NodeJS.Platform;
  resourcesPath?: string | null;
  appPath?: string | null;
  existsSync?: (path: string) => boolean;
}): string | null {
  const exists = opts.existsSync ?? existsSync;
  const candidates: string[] = [];
  for (const root of trustedCodexSearchRoots(opts)) {
    candidates.push(
      join(root, "codex"),
      join(root, "bin", "codex"),
      join(root, "Codex.exe"),
      join(root, "bin", "Codex.exe"),
    );
  }
  for (const candidate of candidates) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

export interface NodeCodexProcessLauncherOptions {
  resolveExecutable: () => string | null;
  spawnImpl?: typeof spawn;
}

export function createNodeCodexProcessLauncher(
  options: NodeCodexProcessLauncherOptions,
): CodexProcessLauncher {
  const spawnImpl = options.spawnImpl ?? spawn;
  return {
    launch(intent) {
      const exe = options.resolveExecutable();
      if (!exe) {
        return Promise.reject(new Error("trusted Codex executable is not available"));
      }
      let child: ChildProcess;
      try {
        child = spawnImpl(exe, [], {
          env: isolatedSessionEnv(intent),
          cwd: dirname(intent.codexHome),
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        } satisfies SpawnOptions);
      } catch (error) {
        return Promise.reject(error);
      }
      drain(child);
      return waitForSpawn(child);
    },
  };
}

function drain(child: ChildProcess): void {
  child.stdout?.on("data", () => {});
  child.stderr?.on("data", () => {});
  child.stdout?.resume();
  child.stderr?.resume();
}

function waitForSpawn(child: ChildProcess): Promise<CodexManagedChild> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      child.off("spawn", onSpawn);
      reject(error);
    };
    const onSpawn = () => {
      child.off("error", onError);
      child.on("error", () => {});
      resolve(wrapChild(child));
    };
    child.once("error", onError);
    child.once("spawn", onSpawn);
    if (child.pid != null) {
      child.off("error", onError);
      child.off("spawn", onSpawn);
      child.on("error", () => {});
      resolve(wrapChild(child));
    }
  });
}

function wrapChild(child: ChildProcess): CodexManagedChild {
  return {
    kill(signal) {
      try {
        return child.kill(signal);
      } catch {
        return false;
      }
    },
    onExit(listener) {
      const handler = (code: number | null, signal: NodeJS.Signals | null) => {
        listener(code, signal);
      };
      child.on("exit", handler);
      return () => {
        child.off("exit", handler);
      };
    },
  };
}
