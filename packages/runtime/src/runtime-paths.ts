/**
 * Runtime path constants and env gate. Leaf module: no imports from other
 * runtime feature modules.
 */
import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { appendCappedLog } from "./logging";
import { resolveTweakStoreIndexUrl } from "./tweak-store";

const userRootEnv = process.env.CODEX_PLUSPLUS_USER_ROOT;
const runtimeDirEnv = process.env.CODEX_PLUSPLUS_RUNTIME;

if (!userRootEnv || !runtimeDirEnv) {
  throw new Error(
    "codex-plusplus runtime started without CODEX_PLUSPLUS_USER_ROOT/RUNTIME envs",
  );
}

export const userRoot: string = userRootEnv;
export const runtimeDir: string = runtimeDirEnv;

export const PRELOAD_PATH = resolve(runtimeDir, "preload.js");
export const GUEST_PRELOAD_PATH = resolve(runtimeDir, "guest-preload.js");
export const TWEAKS_DIR = join(userRoot, "tweaks");
export const LOG_DIR = join(userRoot, "log");
export const LOG_FILE = join(LOG_DIR, "main.log");
export const CONFIG_FILE = join(userRoot, "config.json");
export const CODEX_CONFIG_FILE = join(homedir(), ".codex", "config.toml");
export const INSTALLER_STATE_FILE = join(userRoot, "state.json");
export const UPDATE_MODE_FILE = join(userRoot, "update-mode.json");
export const SELF_UPDATE_STATE_FILE = join(userRoot, "self-update-state.json");
export const SIGNED_CODEX_BACKUP = join(userRoot, "backup", "Codex.app");
export const CODEX_PLUSPLUS_VERSION = "1.1.5";
export const CODEX_PLUSPLUS_REPO = "LightHaru/chatgpt-layer";
export const TWEAK_STORE_INDEX_URL = resolveTweakStoreIndexUrl();
export const CODEX_WINDOW_SERVICES_KEY = "__codexpp_window_services__";

mkdirSync(LOG_DIR, { recursive: true });
mkdirSync(TWEAKS_DIR, { recursive: true });

export type RuntimeLog = (level: "info" | "warn" | "error", ...args: unknown[]) => void;

export function log(level: "info" | "warn" | "error", ...args: unknown[]): void {
  const line = `[${new Date().toISOString()}] [${level}] ${args
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join(" ")}\n`;
  try {
    appendCappedLog(LOG_FILE, line);
  } catch {}
  if (level === "error") console.error("[codex-plusplus]", ...args);
}
