/**
 * Tweak capability authorization. This is the single source of truth for
 * `TweakManifest.permissions` enforcement.
 *
 * Policy:
 *   1. permissions ABSENT: legacy — preserve historical API behavior
 *   2. permissions PRESENT: enforce the declared list strictly
 *   3. permissions: [] is NOT legacy — explicitly no optional capabilities
 *   4. EXPLICIT_ONLY_PERMISSIONS (`codex-sessions`) are never implied by an
 *      omitted field. They require the name to appear in the array.
 *
 * Historical aliases (`codex.windows` → `codex-windows`, `codex.views` →
 * `codex-views`) are preserved and treated as equivalent.
 *
 * This is capability authorization / least privilege, not a process sandbox.
 * Tweaks remain local code. Renderer filtering is defense-in-depth; main
 * authorizes when a tweak identity is present.
 */
import type { TweakFs, TweakIpc, TweakManifest, TweakPermission } from "@codex-plusplus/sdk";
export declare const TWEAK_PERMISSION_ALIASES: {
    readonly "codex.windows": "codex-windows";
    readonly "codex.views": "codex-views";
};
export type CanonicalTweakPermission = "ipc" | "filesystem" | "network" | "settings" | "codex-runtime" | "codex-windows" | "codex-views" | "codex-cdp" | "codex-sessions" | "native-module" | "native-view" | "native-helper";
/** Layer Settings / Store / self-update admin IPC. Not a third-party tweak. */
export declare const LAYER_ADMIN_IPC_CHANNELS: readonly ["codexpp:install-store-tweak", "codexpp:install-github-tweak", "codexpp:prepare-tweak-store-submission", "codexpp:run-codexpp-update", "codexpp:set-auto-update", "codexpp:set-update-config"];
/**
 * Tweak-triggerable privileged/capability IPC. Main must resolve identity,
 * require discovered+enabled, and enforce the mapped permission.
 */
export declare const TWEAK_CAPABILITY_IPC_CHANNELS: {
    readonly "codexpp:tweak-fs": "filesystem";
    readonly "codexpp:codex-window-create": "codex-windows";
    readonly "codexpp:codex-window-primary": "codex-windows";
    readonly "codexpp:codex-window-focus": "codex-windows";
    readonly "codexpp:codex-window-show": "codex-windows";
    readonly "codexpp:codex-view-create": "codex-views";
    readonly "codexpp:codex-view-call": "codex-views";
    readonly "codexpp:native-load-module": "native-module";
    readonly "codexpp:native-module-request": "native-module";
    readonly "codexpp:native-module-dispose": "native-module";
    readonly "codexpp:native-create-panel": "native-view";
    readonly "codexpp:native-attach-view": "native-view";
    readonly "codexpp:native-instance-call": "native-view";
    readonly "codexpp:native-launch-helper": "native-helper";
    readonly "codexpp:native-helper-call": "native-helper";
    readonly "codexpp:codex-runtime-info": "codex-runtime";
    readonly "codexpp:codex-runtime-capabilities": "codex-runtime";
    readonly "codexpp:codex-cdp-status": "codex-cdp";
    readonly "codexpp:codex-cdp-targets": "codex-cdp";
    readonly "codexpp:codex-sessions-list": "codex-sessions";
    readonly "codexpp:codex-sessions-status": "codex-sessions";
};
export type TweakCapabilityIpcChannel = keyof typeof TWEAK_CAPABILITY_IPC_CHANNELS;
export interface TweakIdentitySnapshot {
    id: string;
    enabled: boolean;
    dir: string;
    manifest: TweakManifest;
}
export interface TweakApiSurface {
    settings: boolean;
    ipc: boolean;
    filesystem: boolean;
    /** Declarative only — preload cannot block web `fetch`. */
    network: boolean;
    codexRuntime: boolean;
    codexWindows: boolean;
    codexViews: boolean;
    codexCdp: boolean;
    nativeModule: boolean;
    nativeView: boolean;
    nativeHelper: boolean;
    codexSessions: boolean;
}
export type TweakApiSlot = "present" | "denied" | "omitted";
export interface TweakApiPlan {
    settings: TweakApiSlot;
    ipc: TweakApiSlot;
    fs: TweakApiSlot;
    react: TweakApiSlot;
    codex: TweakApiSlot;
    codexRuntime: TweakApiSlot;
    codexWindows: TweakApiSlot;
    codexViews: TweakApiSlot;
    codexCdp: TweakApiSlot;
    nativeModule: TweakApiSlot;
    nativeView: TweakApiSlot;
    nativeHelper: TweakApiSlot;
    codexSessions: TweakApiSlot;
}
export interface TweakIpcBridge {
    on(channel: string, listener: (...args: unknown[]) => void): void;
    removeListener(channel: string, listener: (...args: unknown[]) => void): void;
    send(channel: string, ...args: unknown[]): void;
    invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}
export declare function normalizePermission(permission: string): CanonicalTweakPermission;
export declare function hasExplicitPermissions(manifest: Pick<TweakManifest, "permissions">): boolean;
export declare function isLegacyPermissionManifest(manifest: Pick<TweakManifest, "permissions">): boolean;
export declare const EXPLICIT_ONLY_PERMISSIONS: Set<CanonicalTweakPermission>;
export declare function hasTweakPermission(manifest: Pick<TweakManifest, "permissions">, permission: TweakPermission | CanonicalTweakPermission): boolean;
export declare function permissionDeniedMessage(tweakId: string, permission: TweakPermission | CanonicalTweakPermission): string;
export declare function permissionDeniedError(tweakId: string, permission: TweakPermission | CanonicalTweakPermission): Error;
export declare function assertTweakHasPermission(manifest: TweakManifest, permission: TweakPermission | CanonicalTweakPermission): void;
export declare function isValidTweakId(value: unknown): value is string;
export declare function assertValidTweakId(value: unknown): asserts value is string;
export declare function bindOwnedTweakId(ownerId: string, requestedId: string): string;
export declare function tweakApiSurface(manifest: Pick<TweakManifest, "permissions">): TweakApiSurface;
export declare function hasAnyCodexApi(surface: TweakApiSurface): boolean;
export declare function planTweakApi(manifest: Pick<TweakManifest, "permissions">): TweakApiPlan;
export declare function scopedTweakIpcChannel(tweakId: string, channel: string): string;
export declare function authorizeTweakCapability(snapshot: TweakIdentitySnapshot | undefined, requestedId: unknown, permission: TweakPermission | CanonicalTweakPermission, ownerId?: string): TweakIdentitySnapshot;
export declare function createDeniedMethod(tweakId: string, permission: TweakPermission | CanonicalTweakPermission): (...args: never[]) => never;
export declare function createDeniedAsyncMethod(tweakId: string, permission: TweakPermission | CanonicalTweakPermission): (...args: never[]) => Promise<never>;
export declare function createDeniedTweakFs(tweakId: string): TweakFs;
export declare function createBoundTweakFs(ownerId: string, invoke: (channel: string, ...args: unknown[]) => Promise<unknown>): TweakFs;
export declare function createDeniedTweakIpc(tweakId: string): TweakIpc;
export declare function createBoundTweakIpc(ownerId: string, bridge: TweakIpcBridge): TweakIpc;
export declare function isLayerAdminIpcChannel(channel: string): boolean;
export declare function tweakPermissionForIpcChannel(channel: string): CanonicalTweakPermission | undefined;
