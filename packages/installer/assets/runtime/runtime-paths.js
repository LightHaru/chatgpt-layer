"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CODEX_WINDOW_SERVICES_KEY = exports.TWEAK_STORE_INDEX_URL = exports.CODEX_PLUSPLUS_REPO = exports.CODEX_PLUSPLUS_VERSION = exports.SIGNED_CODEX_BACKUP = exports.SELF_UPDATE_STATE_FILE = exports.UPDATE_MODE_FILE = exports.INSTALLER_STATE_FILE = exports.CODEX_CONFIG_FILE = exports.CONFIG_FILE = exports.LOG_FILE = exports.LOG_DIR = exports.TWEAKS_DIR = exports.GUEST_PRELOAD_PATH = exports.PRELOAD_PATH = exports.runtimeDir = exports.userRoot = void 0;
exports.log = log;
/**
 * Runtime path constants and env gate. Leaf module: no imports from other
 * runtime feature modules.
 */
const node_fs_1 = require("node:fs");
const node_os_1 = require("node:os");
const node_path_1 = require("node:path");
const logging_1 = require("./logging");
const tweak_store_1 = require("./tweak-store");
const userRootEnv = process.env.CODEX_PLUSPLUS_USER_ROOT;
const runtimeDirEnv = process.env.CODEX_PLUSPLUS_RUNTIME;
if (!userRootEnv || !runtimeDirEnv) {
    throw new Error("codex-plusplus runtime started without CODEX_PLUSPLUS_USER_ROOT/RUNTIME envs");
}
exports.userRoot = userRootEnv;
exports.runtimeDir = runtimeDirEnv;
exports.PRELOAD_PATH = (0, node_path_1.resolve)(exports.runtimeDir, "preload.js");
exports.GUEST_PRELOAD_PATH = (0, node_path_1.resolve)(exports.runtimeDir, "guest-preload.js");
exports.TWEAKS_DIR = (0, node_path_1.join)(exports.userRoot, "tweaks");
exports.LOG_DIR = (0, node_path_1.join)(exports.userRoot, "log");
exports.LOG_FILE = (0, node_path_1.join)(exports.LOG_DIR, "main.log");
exports.CONFIG_FILE = (0, node_path_1.join)(exports.userRoot, "config.json");
exports.CODEX_CONFIG_FILE = (0, node_path_1.join)((0, node_os_1.homedir)(), ".codex", "config.toml");
exports.INSTALLER_STATE_FILE = (0, node_path_1.join)(exports.userRoot, "state.json");
exports.UPDATE_MODE_FILE = (0, node_path_1.join)(exports.userRoot, "update-mode.json");
exports.SELF_UPDATE_STATE_FILE = (0, node_path_1.join)(exports.userRoot, "self-update-state.json");
exports.SIGNED_CODEX_BACKUP = (0, node_path_1.join)(exports.userRoot, "backup", "Codex.app");
exports.CODEX_PLUSPLUS_VERSION = "1.1.4";
exports.CODEX_PLUSPLUS_REPO = "LightHaru/chatgpt-layer";
exports.TWEAK_STORE_INDEX_URL = (0, tweak_store_1.resolveTweakStoreIndexUrl)();
exports.CODEX_WINDOW_SERVICES_KEY = "__codexpp_window_services__";
(0, node_fs_1.mkdirSync)(exports.LOG_DIR, { recursive: true });
(0, node_fs_1.mkdirSync)(exports.TWEAKS_DIR, { recursive: true });
function log(level, ...args) {
    const line = `[${new Date().toISOString()}] [${level}] ${args
        .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
        .join(" ")}\n`;
    try {
        (0, logging_1.appendCappedLog)(exports.LOG_FILE, line);
    }
    catch { }
    if (level === "error")
        console.error("[codex-plusplus]", ...args);
}
//# sourceMappingURL=runtime-paths.js.map