"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCodexSessionManager = setCodexSessionManager;
exports.getCodexSessionManager = getCodexSessionManager;
exports.requireCodexSessionManager = requireCodexSessionManager;
let manager = null;
function setCodexSessionManager(next) {
    manager = next;
}
function getCodexSessionManager() {
    return manager;
}
function requireCodexSessionManager() {
    if (!manager)
        throw new Error("codex session manager is not available");
    return manager;
}
//# sourceMappingURL=host.js.map