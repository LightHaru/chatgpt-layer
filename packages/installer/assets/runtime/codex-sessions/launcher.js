"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISOLATED_ENV_ALLOWLIST = void 0;
exports.isolatedSessionEnv = isolatedSessionEnv;
exports.resolveTrustedCodexExecutable = resolveTrustedCodexExecutable;
exports.createNodeCodexProcessLauncher = createNodeCodexProcessLauncher;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
exports.ISOLATED_ENV_ALLOWLIST = [
    "PATH",
    "HOME",
    "USERPROFILE",
    "SYSTEMROOT",
    "WINDIR",
    "TEMP",
    "TMP",
    "LANG",
    "LC_ALL",
];
function isolatedSessionEnv(intent, sourceEnv = process.env) {
    const env = {};
    for (const key of exports.ISOLATED_ENV_ALLOWLIST) {
        const value = sourceEnv[key];
        if (typeof value === "string")
            env[key] = value;
    }
    env.CODEX_HOME = intent.codexHome;
    env.CODEX_SQLITE_HOME = intent.sqliteHome;
    return env;
}
function resolveTrustedCodexExecutable(opts) {
    const exists = opts.existsSync ?? node_fs_1.existsSync;
    const platform = opts.platform ?? process.platform;
    const candidates = [];
    const addRelatives = (root) => {
        if (!root)
            return;
        candidates.push((0, node_path_1.join)(root, "codex"), (0, node_path_1.join)(root, "bin", "codex"), (0, node_path_1.join)(root, "Codex.exe"), (0, node_path_1.join)(root, "bin", "Codex.exe"));
    };
    addRelatives(opts.resourcesPath ?? undefined);
    addRelatives(opts.appPath ?? undefined);
    if (platform === "darwin" && opts.appPath) {
        addRelatives((0, node_path_1.join)(opts.appPath, "Contents", "Resources"));
    }
    for (const candidate of candidates) {
        if (exists(candidate))
            return candidate;
    }
    return null;
}
function createNodeCodexProcessLauncher(options) {
    const spawnImpl = options.spawnImpl ?? node_child_process_1.spawn;
    return {
        launch(intent) {
            const exe = options.resolveExecutable();
            if (!exe) {
                return Promise.reject(new Error("trusted Codex executable is not available"));
            }
            let child;
            try {
                child = spawnImpl(exe, [], {
                    env: isolatedSessionEnv(intent),
                    cwd: (0, node_path_1.dirname)(intent.codexHome),
                    stdio: ["ignore", "pipe", "pipe"],
                    windowsHide: true,
                });
            }
            catch (error) {
                return Promise.reject(error);
            }
            drain(child);
            return waitForSpawn(child);
        },
    };
}
function drain(child) {
    child.stdout?.on("data", () => { });
    child.stderr?.on("data", () => { });
    child.stdout?.resume();
    child.stderr?.resume();
}
function waitForSpawn(child) {
    return new Promise((resolve, reject) => {
        const onError = (error) => {
            child.off("spawn", onSpawn);
            reject(error);
        };
        const onSpawn = () => {
            child.off("error", onError);
            child.on("error", () => { });
            resolve(wrapChild(child));
        };
        child.once("error", onError);
        child.once("spawn", onSpawn);
        if (child.pid != null) {
            child.off("error", onError);
            child.off("spawn", onSpawn);
            child.on("error", () => { });
            resolve(wrapChild(child));
        }
    });
}
function wrapChild(child) {
    return {
        kill(signal) {
            try {
                return child.kill(signal);
            }
            catch {
                return false;
            }
        },
        onExit(listener) {
            const handler = (code, signal) => {
                listener(code, signal);
            };
            child.on("exit", handler);
            return () => {
                child.off("exit", handler);
            };
        },
    };
}
//# sourceMappingURL=launcher.js.map