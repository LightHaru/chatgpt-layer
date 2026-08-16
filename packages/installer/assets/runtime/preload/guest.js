"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Minimal preload for untrusted BrowserViews / guest sessions.
 * Does not boot the tweak host, settings injector, or privileged IPC wrappers.
 */
const electron_1 = require("electron");
try {
    electron_1.ipcRenderer.send("codexpp:preload-log", "info", `[codex-plusplus guest-preload] ${location.href}`);
}
catch { }
//# sourceMappingURL=guest.js.map