"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TWEAK_CAPABILITY_IPC_CHANNELS = exports.LAYER_ADMIN_IPC_CHANNELS = exports.TWEAK_PERMISSION_ALIASES = void 0;
exports.normalizePermission = normalizePermission;
exports.hasExplicitPermissions = hasExplicitPermissions;
exports.isLegacyPermissionManifest = isLegacyPermissionManifest;
exports.hasTweakPermission = hasTweakPermission;
exports.permissionDeniedMessage = permissionDeniedMessage;
exports.permissionDeniedError = permissionDeniedError;
exports.assertTweakHasPermission = assertTweakHasPermission;
exports.isValidTweakId = isValidTweakId;
exports.assertValidTweakId = assertValidTweakId;
exports.bindOwnedTweakId = bindOwnedTweakId;
exports.tweakApiSurface = tweakApiSurface;
exports.hasAnyCodexApi = hasAnyCodexApi;
exports.planTweakApi = planTweakApi;
exports.scopedTweakIpcChannel = scopedTweakIpcChannel;
exports.authorizeTweakCapability = authorizeTweakCapability;
exports.createDeniedMethod = createDeniedMethod;
exports.createDeniedAsyncMethod = createDeniedAsyncMethod;
exports.createDeniedTweakFs = createDeniedTweakFs;
exports.createBoundTweakFs = createBoundTweakFs;
exports.createDeniedTweakIpc = createDeniedTweakIpc;
exports.createBoundTweakIpc = createBoundTweakIpc;
exports.isLayerAdminIpcChannel = isLayerAdminIpcChannel;
exports.tweakPermissionForIpcChannel = tweakPermissionForIpcChannel;
exports.TWEAK_PERMISSION_ALIASES = {
    "codex.windows": "codex-windows",
    "codex.views": "codex-views",
};
/** Layer Settings / Store / self-update admin IPC. Not a third-party tweak. */
exports.LAYER_ADMIN_IPC_CHANNELS = [
    "codexpp:install-store-tweak",
    "codexpp:install-github-tweak",
    "codexpp:prepare-tweak-store-submission",
    "codexpp:run-codexpp-update",
    "codexpp:set-auto-update",
    "codexpp:set-update-config",
];
/**
 * Tweak-triggerable privileged/capability IPC. Main must resolve identity,
 * require discovered+enabled, and enforce the mapped permission.
 */
exports.TWEAK_CAPABILITY_IPC_CHANNELS = {
    "codexpp:tweak-fs": "filesystem",
    "codexpp:codex-window-create": "codex-windows",
    "codexpp:codex-window-primary": "codex-windows",
    "codexpp:codex-window-focus": "codex-windows",
    "codexpp:codex-window-show": "codex-windows",
    "codexpp:codex-view-create": "codex-views",
    "codexpp:codex-view-call": "codex-views",
    "codexpp:native-load-module": "native-module",
    "codexpp:native-module-request": "native-module",
    "codexpp:native-module-dispose": "native-module",
    "codexpp:native-create-panel": "native-view",
    "codexpp:native-attach-view": "native-view",
    "codexpp:native-instance-call": "native-view",
    "codexpp:native-launch-helper": "native-helper",
    "codexpp:native-helper-call": "native-helper",
    "codexpp:codex-runtime-info": "codex-runtime",
    "codexpp:codex-runtime-capabilities": "codex-runtime",
    "codexpp:codex-cdp-status": "codex-cdp",
    "codexpp:codex-cdp-targets": "codex-cdp",
    "codexpp:codex-sessions-list": "codex-sessions",
    "codexpp:codex-sessions-status": "codex-sessions",
};
const TWEAK_ID_RE = /^[a-zA-Z0-9._-]+$/;
function normalizePermission(permission) {
    const aliased = exports.TWEAK_PERMISSION_ALIASES[permission] ?? permission;
    return aliased;
}
function hasExplicitPermissions(manifest) {
    return Array.isArray(manifest.permissions);
}
function isLegacyPermissionManifest(manifest) {
    return manifest.permissions === undefined;
}
function hasTweakPermission(manifest, permission) {
    if (!hasExplicitPermissions(manifest))
        return true;
    const wanted = normalizePermission(permission);
    return (manifest.permissions ?? []).some((entry) => normalizePermission(entry) === wanted);
}
function permissionDeniedMessage(tweakId, permission) {
    return `tweak ${tweakId} must declare ${normalizePermission(permission)} permission`;
}
function permissionDeniedError(tweakId, permission) {
    return new Error(permissionDeniedMessage(tweakId, permission));
}
function assertTweakHasPermission(manifest, permission) {
    if (!hasTweakPermission(manifest, permission)) {
        throw permissionDeniedError(manifest.id, permission);
    }
}
function isValidTweakId(value) {
    return typeof value === "string" && TWEAK_ID_RE.test(value);
}
function assertValidTweakId(value) {
    if (!isValidTweakId(value))
        throw new Error("bad tweak id");
}
function bindOwnedTweakId(ownerId, requestedId) {
    assertValidTweakId(ownerId);
    assertValidTweakId(requestedId);
    if (ownerId !== requestedId) {
        throw new Error(`tweak ${ownerId} cannot use tweak ${requestedId}'s identity`);
    }
    return ownerId;
}
function tweakApiSurface(manifest) {
    return {
        settings: hasTweakPermission(manifest, "settings"),
        ipc: hasTweakPermission(manifest, "ipc"),
        filesystem: hasTweakPermission(manifest, "filesystem"),
        network: hasTweakPermission(manifest, "network"),
        codexRuntime: hasTweakPermission(manifest, "codex-runtime"),
        codexWindows: hasTweakPermission(manifest, "codex-windows"),
        codexViews: hasTweakPermission(manifest, "codex-views"),
        codexCdp: hasTweakPermission(manifest, "codex-cdp"),
        nativeModule: hasTweakPermission(manifest, "native-module"),
        nativeView: hasTweakPermission(manifest, "native-view"),
        nativeHelper: hasTweakPermission(manifest, "native-helper"),
        codexSessions: hasTweakPermission(manifest, "codex-sessions"),
    };
}
function hasAnyCodexApi(surface) {
    return (surface.codexRuntime ||
        surface.codexWindows ||
        surface.codexViews ||
        surface.codexCdp ||
        surface.nativeModule ||
        surface.nativeView ||
        surface.nativeHelper ||
        surface.codexSessions);
}
function slot(allowed, whenDenied) {
    return allowed ? "present" : whenDenied;
}
function planTweakApi(manifest) {
    const surface = tweakApiSurface(manifest);
    const anyCodex = hasAnyCodexApi(surface);
    return {
        settings: slot(surface.settings, "omitted"),
        ipc: slot(surface.ipc, "denied"),
        fs: slot(surface.filesystem, "denied"),
        react: "present",
        codex: slot(anyCodex, "omitted"),
        codexRuntime: slot(surface.codexRuntime, "denied"),
        codexWindows: slot(surface.codexWindows, "denied"),
        codexViews: slot(surface.codexViews, "denied"),
        codexCdp: slot(surface.codexCdp, "denied"),
        nativeModule: slot(surface.nativeModule, "denied"),
        nativeView: slot(surface.nativeView, "denied"),
        nativeHelper: slot(surface.nativeHelper, "denied"),
        codexSessions: slot(surface.codexSessions, "denied"),
    };
}
function scopedTweakIpcChannel(tweakId, channel) {
    return `codexpp:${tweakId}:${channel}`;
}
function authorizeTweakCapability(snapshot, requestedId, permission, ownerId) {
    assertValidTweakId(requestedId);
    if (ownerId !== undefined)
        bindOwnedTweakId(ownerId, requestedId);
    if (!snapshot || snapshot.id !== requestedId) {
        throw new Error(`unknown tweak: ${requestedId}`);
    }
    if (!snapshot.enabled) {
        throw new Error(`tweak is disabled: ${requestedId}`);
    }
    assertTweakHasPermission(snapshot.manifest, permission);
    return snapshot;
}
function createDeniedMethod(tweakId, permission) {
    return () => {
        throw permissionDeniedError(tweakId, permission);
    };
}
function createDeniedAsyncMethod(tweakId, permission) {
    return async () => {
        throw permissionDeniedError(tweakId, permission);
    };
}
function createDeniedTweakFs(tweakId) {
    const deny = createDeniedAsyncMethod(tweakId, "filesystem");
    return {
        dataDir: `<denied>/tweak-data/${tweakId}`,
        read: deny,
        write: deny,
        exists: deny,
    };
}
function createBoundTweakFs(ownerId, invoke) {
    const id = bindOwnedTweakId(ownerId, ownerId);
    return {
        dataDir: `<remote>/tweak-data/${id}`,
        read: (relPath) => invoke("codexpp:tweak-fs", "read", id, relPath),
        write: (relPath, contents) => invoke("codexpp:tweak-fs", "write", id, relPath, contents),
        exists: (relPath) => invoke("codexpp:tweak-fs", "exists", id, relPath),
    };
}
function createDeniedTweakIpc(tweakId) {
    const deny = createDeniedMethod(tweakId, "ipc");
    return {
        on: deny,
        send: deny,
        invoke: deny,
        handle: deny,
    };
}
function createBoundTweakIpc(ownerId, bridge) {
    const id = bindOwnedTweakId(ownerId, ownerId);
    const channelName = (channel) => scopedTweakIpcChannel(id, channel);
    return {
        on: (channel, handler) => {
            const wrapped = (_event, ...args) => handler(...args);
            bridge.on(channelName(channel), wrapped);
            return () => bridge.removeListener(channelName(channel), wrapped);
        },
        send: (channel, ...args) => bridge.send(channelName(channel), ...args),
        invoke: (channel, ...args) => bridge.invoke(channelName(channel), ...args),
    };
}
function isLayerAdminIpcChannel(channel) {
    return exports.LAYER_ADMIN_IPC_CHANNELS.includes(channel);
}
function tweakPermissionForIpcChannel(channel) {
    return exports.TWEAK_CAPABILITY_IPC_CHANNELS[channel];
}
//# sourceMappingURL=tweak-permissions.js.map