"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCodexAppServerHost = createCodexAppServerHost;
exports.setCodexAppServerHost = setCodexAppServerHost;
exports.getCodexAppServerHost = getCodexAppServerHost;
const registry_1 = require("./registry");
const router_1 = require("./router");
const thread_owner_store_1 = require("./thread-owner-store");
/**
 * Dormant host. No production launcher: invocation is BLOCKED, so MS-2A
 * never spawns an app-server child (and never a second child beside MS-1).
 * Tests attach fake/fixture transports. No public IPC. No session auto-start.
 */
function createCodexAppServerHost(options) {
    const owners = new thread_owner_store_1.ThreadOwnerStore(options.userRoot);
    const registry = new registry_1.CodexSessionTransportRegistry({
        userRoot: options.userRoot,
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
    void options.log;
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