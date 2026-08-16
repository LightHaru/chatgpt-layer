import { spawn } from "node:child_process";
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
export declare function createFailClosedAppServerLauncher(): CodexAppServerLauncher;
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
export declare function createFixtureAppServerLauncher(options: FixtureAppServerLauncherOptions): CodexAppServerLauncher;
export declare function createInjectedAppServerLauncher(factory: (intent: AppServerLaunchIntent) => CodexAppServerTransport | Promise<CodexAppServerTransport>): CodexAppServerLauncher;
