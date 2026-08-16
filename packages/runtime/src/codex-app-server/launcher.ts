import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";
import { tmpdir } from "node:os";
import type { CodexSessionLaunchIntent } from "../codex-sessions/launcher";
import { isolatedSessionEnv } from "../codex-sessions/launcher";
import { StdioAppServerTransport } from "./child-transport";
import {
  APP_SERVER_INVOCATION_STATUS,
  PRODUCTION_CHILD_TRANSPORT_ENABLED,
  REFERENCE_APP_SERVER_ARGV,
} from "./discovery";
import { CodexAppServerError } from "./errors";
import type { CodexAppServerTransport } from "./transport";

export interface AppServerLaunchIntent {
  sessionId: string;
  codexHome: string;
  sqliteHome: string;
}

export interface CodexAppServerLauncher {
  launchAppServer(intent: AppServerLaunchIntent): Promise<CodexAppServerTransport>;
}

/**
 * Production launcher. Fail-closed: the exact ChatGPT Desktop app-server
 * argv has not been proven in this tree. Callers cannot pass exe/argv/env.
 * The session registry does not call this — tests may use it to build a
 * fixture transport, then attach that transport to the registry.
 */
export function createFailClosedAppServerLauncher(): CodexAppServerLauncher {
  return {
    launchAppServer() {
      return Promise.reject(
        new CodexAppServerError(
          "not-proven",
          `Codex app-server invocation is ${APP_SERVER_INVOCATION_STATUS}; production child transport is disabled ` +
            `(reference argv ${JSON.stringify(REFERENCE_APP_SERVER_ARGV)} is not proven). ` +
            `productionChildTransportEnabled=${PRODUCTION_CHILD_TRANSPORT_ENABLED}`,
        ),
      );
    },
  };
}

export interface FixtureAppServerLauncherOptions {
  nodeExecutable: string;
  fixturePath: string;
  fixtureArgs?: readonly string[];
  spawnImpl?: typeof spawn;
  timeoutMs?: number;
}

/**
 * TEST-ONLY launcher. Spawns the in-repo fake app-server fixture with Node.
 * Still does not accept caller argv from tweaks — the fixture path is fixed
 * by the test harness.
 */
export function createFixtureAppServerLauncher(
  options: FixtureAppServerLauncherOptions,
): CodexAppServerLauncher {
  const spawnImpl = options.spawnImpl ?? spawn;
  const fixtureArgs = options.fixtureArgs ?? [];
  return {
    launchAppServer(intent: AppServerLaunchIntent) {
      let child: ChildProcess;
      try {
        child = spawnImpl(options.nodeExecutable, [options.fixturePath, ...fixtureArgs], {
          env: isolatedSessionEnv(intent as CodexSessionLaunchIntent),
          cwd: tmpdir(),
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true,
        } satisfies SpawnOptions);
      } catch (error) {
        return Promise.reject(
          new CodexAppServerError("spawn", error instanceof Error ? error.message : String(error), intent.sessionId),
        );
      }
      if (!child.stdin || !child.stdout) {
        try {
          child.kill("SIGKILL");
        } catch {}
        return Promise.reject(new CodexAppServerError("spawn", "fixture stdio pipes missing", intent.sessionId));
      }
      const transport = new StdioAppServerTransport({
        sessionId: intent.sessionId,
        timeoutMs: options.timeoutMs,
        pipes: {
          stdin: child.stdin,
          stdout: child.stdout,
          stderr: child.stderr,
          kill: (signal) => {
            try {
              return child.kill(signal);
            } catch {
              return false;
            }
          },
          onExit: (listener) => {
            const handler = (code: number | null, signal: NodeJS.Signals | null) => listener(code, signal);
            child.on("exit", handler);
            return () => child.off("exit", handler);
          },
        },
      });
      return new Promise((resolve, reject) => {
        const onError = (error: Error) => {
          child.off("spawn", onSpawn);
          void transport.close(new CodexAppServerError("spawn", error.message, intent.sessionId));
          reject(new CodexAppServerError("spawn", error.message, intent.sessionId));
        };
        const onSpawn = () => {
          child.off("error", onError);
          child.on("error", () => {});
          resolve(transport);
        };
        child.once("error", onError);
        child.once("spawn", onSpawn);
        if (child.pid != null) {
          child.off("error", onError);
          child.off("spawn", onSpawn);
          child.on("error", () => {});
          resolve(transport);
        }
      });
    },
  };
}

export function createInjectedAppServerLauncher(
  factory: (intent: AppServerLaunchIntent) => CodexAppServerTransport | Promise<CodexAppServerTransport>,
): CodexAppServerLauncher {
  return {
    async launchAppServer(intent) {
      return factory(intent);
    },
  };
}
