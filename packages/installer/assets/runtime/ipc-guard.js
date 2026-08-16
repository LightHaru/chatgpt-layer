"use strict";
/**
 * Privileged IPC allowlisting. Guest BrowserViews, webviews, and other
 * untrusted frames must not invoke install/self-update/native/fs/clipboard
 * handlers even if a session-level preload leaked into them.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIVILEGED_IPC_CHANNELS = void 0;
exports.isPrivilegedIpcChannel = isPrivilegedIpcChannel;
exports.classifyIpcSender = classifyIpcSender;
exports.isPrivilegedIpcSender = isPrivilegedIpcSender;
exports.assertPrivilegedIpcSender = assertPrivilegedIpcSender;
exports.isLayerAutoUpdateEnabled = isLayerAutoUpdateEnabled;
exports.stripRendererUpdateRepo = stripRendererUpdateRepo;
exports.PRIVILEGED_IPC_CHANNELS = [
    "codexpp:install-store-tweak",
    "codexpp:install-github-tweak",
    "codexpp:prepare-tweak-store-submission",
    "codexpp:run-codexpp-update",
    "codexpp:set-auto-update",
    "codexpp:set-update-config",
    "codexpp:native-load-module",
    "codexpp:native-module-request",
    "codexpp:native-module-dispose",
    "codexpp:native-create-panel",
    "codexpp:native-attach-view",
    "codexpp:native-instance-call",
    "codexpp:native-launch-helper",
    "codexpp:native-helper-call",
    "codexpp:codex-window-create",
    "codexpp:codex-window-primary",
    "codexpp:codex-window-focus",
    "codexpp:codex-window-show",
    "codexpp:codex-view-create",
    "codexpp:codex-view-call",
    "codexpp:tweak-fs",
    "codexpp:codex-sessions-list",
    "codexpp:codex-sessions-status",
    "codexpp:copy-text",
    "codexpp:reveal",
];
function isPrivilegedIpcChannel(channel) {
    return exports.PRIVILEGED_IPC_CHANNELS.includes(channel);
}
function classifyIpcSender(sender, untrustedIds = new Set()) {
    if (sender.isDestroyed?.())
        return "guest";
    if (untrustedIds.has(sender.id))
        return "guest";
    const type = sender.getType?.() ?? "window";
    if (type === "webview" || type === "offscreen")
        return "guest";
    if (type === "window" || type === "browserView")
        return "privileged";
    return "guest";
}
function isPrivilegedIpcSender(sender, untrustedIds = new Set()) {
    return classifyIpcSender(sender, untrustedIds) === "privileged";
}
function assertPrivilegedIpcSender(channel, sender, untrustedIds = new Set()) {
    if (!isPrivilegedIpcSender(sender, untrustedIds)) {
        throw new Error(`blocked ${channel} from untrusted frame`);
    }
}
/** Layer self-update is opt-in. Missing/undefined means OFF. */
function isLayerAutoUpdateEnabled(value) {
    return value === true;
}
function stripRendererUpdateRepo(config) {
    const { updateRepo: _ignored, ...rest } = config;
    return rest;
}
//# sourceMappingURL=ipc-guard.js.map