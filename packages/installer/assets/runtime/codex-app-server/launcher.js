"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFailClosedAppServerLauncher = createFailClosedAppServerLauncher;
exports.createFixtureAppServerLauncher = createFixtureAppServerLauncher;
exports.createInjectedAppServerLauncher = createInjectedAppServerLauncher;
const node_child_process_1 = require("node:child_process");
const node_os_1 = require("node:os");
const launcher_1 = require("../codex-sessions/launcher");
const child_transport_1 = require("./child-transport");
const discovery_1 = require("./discovery");
const errors_1 = require("./errors");
/**
 * Production launcher. Fail-closed: the exact ChatGPT Desktop app-server
 * argv has not been proven in this tree. Callers cannot pass exe/argv/env.
 * The session registry does not call this — tests may use it to build a
 * fixture transport, then attach that transport to the registry.
 */
function createFailClosedAppServerLauncher() {
    return {
        launchAppServer() {
            return Promise.reject(new errors_1.CodexAppServerError("not-proven", `Codex app-server invocation is ${discovery_1.APP_SERVER_INVOCATION_STATUS}; production child transport is disabled ` +
                `(reference argv ${JSON.stringify(discovery_1.REFERENCE_APP_SERVER_ARGV)} is not proven). ` +
                `productionChildTransportEnabled=${discovery_1.PRODUCTION_CHILD_TRANSPORT_ENABLED}`));
        },
    };
}
/**
 * TEST-ONLY launcher. Spawns the in-repo fake app-server fixture with Node.
 * Still does not accept caller argv from tweaks — the fixture path is fixed
 * by the test harness.
 */
function createFixtureAppServerLauncher(options) {
    const spawnImpl = options.spawnImpl ?? node_child_process_1.spawn;
    const fixtureArgs = options.fixtureArgs ?? [];
    return {
        launchAppServer(intent) {
            let child;
            try {
                child = spawnImpl(options.nodeExecutable, [options.fixturePath, ...fixtureArgs], {
                    env: (0, launcher_1.isolatedSessionEnv)(intent),
                    cwd: (0, node_os_1.tmpdir)(),
                    stdio: ["pipe", "pipe", "pipe"],
                    windowsHide: true,
                });
            }
            catch (error) {
                return Promise.reject(new errors_1.CodexAppServerError("spawn", error instanceof Error ? error.message : String(error), intent.sessionId));
            }
            if (!child.stdin || !child.stdout) {
                try {
                    child.kill("SIGKILL");
                }
                catch { }
                return Promise.reject(new errors_1.CodexAppServerError("spawn", "fixture stdio pipes missing", intent.sessionId));
            }
            const transport = new child_transport_1.StdioAppServerTransport({
                sessionId: intent.sessionId,
                timeoutMs: options.timeoutMs,
                pipes: {
                    stdin: child.stdin,
                    stdout: child.stdout,
                    stderr: child.stderr,
                    kill: (signal) => {
                        try {
                            return child.kill(signal);
                        }
                        catch {
                            return false;
                        }
                    },
                    onExit: (listener) => {
                        const handler = (code, signal) => listener(code, signal);
                        child.on("exit", handler);
                        return () => child.off("exit", handler);
                    },
                },
            });
            return new Promise((resolve, reject) => {
                const onError = (error) => {
                    child.off("spawn", onSpawn);
                    void transport.close(new errors_1.CodexAppServerError("spawn", error.message, intent.sessionId));
                    reject(new errors_1.CodexAppServerError("spawn", error.message, intent.sessionId));
                };
                const onSpawn = () => {
                    child.off("error", onError);
                    child.on("error", () => { });
                    resolve(transport);
                };
                child.once("error", onError);
                child.once("spawn", onSpawn);
                if (child.pid != null) {
                    child.off("error", onError);
                    child.off("spawn", onSpawn);
                    child.on("error", () => { });
                    resolve(transport);
                }
            });
        },
    };
}
function createInjectedAppServerLauncher(factory) {
    return {
        async launchAppServer(intent) {
            return factory(intent);
        },
    };
}
//# sourceMappingURL=launcher.js.map