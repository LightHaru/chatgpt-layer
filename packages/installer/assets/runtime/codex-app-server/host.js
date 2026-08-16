"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCodexAppServerHost = createCodexAppServerHost;
exports.setCodexAppServerHost = setCodexAppServerHost;
exports.getCodexAppServerHost = getCodexAppServerHost;
const launcher_1 = require("./launcher");
const registry_1 = require("./registry");
const router_1 = require("./router");
const thread_owner_store_1 = require("./thread-owner-store");
/**
 * Dormant host. Production uses the fail-closed launcher so no child is
 * spawned. No public IPC. No session auto-start.
 */
function createCodexAppServerHost(options) {
    const launcher = options.launcher ?? (0, launcher_1.createFailClosedAppServerLauncher)();
    const owners = new thread_owner_store_1.ThreadOwnerStore(options.userRoot);
    const registry = new registry_1.CodexSessionTransportRegistry({
        userRoot: options.userRoot,
        launcher,
        sessionManager: options.sessionManager,
        initializeParams: options.initializeParams,
        initializeTimeoutMs: options.initializeTimeoutMs,
    });
    const router = new router_1.CodexSessionRouter({
        registry,
        owners,
        selectSession: options.selectSession,
        requestTimeoutMs: options.initializeTimeoutMs,
    });
    return {
        owners,
        registry,
        router,
        closeAll: () => registry.closeAll(),
    };
}
let host = null;
function setCodexAppServerHost(next) {
    host = next;
}
function getCodexAppServerHost() {
    return host;
}
//# sourceMappingURL=host.js.map