/**
 * Minimal preload for untrusted BrowserViews / guest sessions.
 * Does not boot the tweak host, settings injector, or privileged IPC wrappers.
 */
import { ipcRenderer } from "electron";

try {
  ipcRenderer.send("codexpp:preload-log", "info", `[codex-plusplus guest-preload] ${location.href}`);
} catch {}
