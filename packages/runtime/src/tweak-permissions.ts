/**
 * Tweak capability authorization. This is the single source of truth for
 * `TweakManifest.permissions` enforcement.
 *
 * Policy:
 *   1. permissions ABSENT: legacy — preserve existing API behavior
 *   2. permissions PRESENT: enforce the declared list strictly
 *   3. permissions: [] is NOT legacy — explicitly no optional capabilities
 *
 * Historical aliases (`codex.windows` → `codex-windows`, `codex.views` →
 * `codex-views`) are preserved and treated as equivalent.
 *
 * This is capability authorization / least privilege, not a process sandbox.
 * Tweaks remain local code. Renderer filtering is defense-in-depth; main
 * authorizes when a tweak identity is present.
 */
import type {
  TweakFs,
  TweakIpc,
  TweakManifest,
  TweakPermission,
} from "@codex-plusplus/sdk";

export const TWEAK_PERMISSION_ALIASES = {
  "codex.windows": "codex-windows",
  "codex.views": "codex-views",
} as const;

export type CanonicalTweakPermission =
  | "ipc"
  | "filesystem"
  | "network"
  | "settings"
  | "codex-runtime"
  | "codex-windows"
  | "codex-views"
  | "codex-cdp"
  | "native-module"
  | "native-view"
  | "native-helper";

/** Layer Settings / Store / self-update admin IPC. Not a third-party tweak. */
export const LAYER_ADMIN_IPC_CHANNELS = [
  "codexpp:install-store-tweak",
  "codexpp:install-github-tweak",
  "codexpp:prepare-tweak-store-submission",
  "codexpp:run-codexpp-update",
  "codexpp:set-auto-update",
  "codexpp:set-update-config",
] as const;

/**
 * Tweak-triggerable privileged/capability IPC. Main must resolve identity,
 * require discovered+enabled, and enforce the mapped permission.
 */
export const TWEAK_CAPABILITY_IPC_CHANNELS = {
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
} as const;

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
}

export interface TweakIpcBridge {
  on(channel: string, listener: (...args: unknown[]) => void): void;
  removeListener(channel: string, listener: (...args: unknown[]) => void): void;
  send(channel: string, ...args: unknown[]): void;
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
}

const TWEAK_ID_RE = /^[a-zA-Z0-9._-]+$/;

export function normalizePermission(permission: string): CanonicalTweakPermission {
  const aliased = (TWEAK_PERMISSION_ALIASES as Record<string, string>)[permission] ?? permission;
  return aliased as CanonicalTweakPermission;
}

export function hasExplicitPermissions(
  manifest: Pick<TweakManifest, "permissions">,
): boolean {
  return Array.isArray(manifest.permissions);
}

export function isLegacyPermissionManifest(
  manifest: Pick<TweakManifest, "permissions">,
): boolean {
  return manifest.permissions === undefined;
}

export function hasTweakPermission(
  manifest: Pick<TweakManifest, "permissions">,
  permission: TweakPermission | CanonicalTweakPermission,
): boolean {
  if (!hasExplicitPermissions(manifest)) return true;
  const wanted = normalizePermission(permission);
  return (manifest.permissions ?? []).some((entry) => normalizePermission(entry) === wanted);
}

export function permissionDeniedMessage(
  tweakId: string,
  permission: TweakPermission | CanonicalTweakPermission,
): string {
  return `tweak ${tweakId} must declare ${normalizePermission(permission)} permission`;
}

export function permissionDeniedError(
  tweakId: string,
  permission: TweakPermission | CanonicalTweakPermission,
): Error {
  return new Error(permissionDeniedMessage(tweakId, permission));
}

export function assertTweakHasPermission(
  manifest: TweakManifest,
  permission: TweakPermission | CanonicalTweakPermission,
): void {
  if (!hasTweakPermission(manifest, permission)) {
    throw permissionDeniedError(manifest.id, permission);
  }
}

export function isValidTweakId(value: unknown): value is string {
  return typeof value === "string" && TWEAK_ID_RE.test(value);
}

export function assertValidTweakId(value: unknown): asserts value is string {
  if (!isValidTweakId(value)) throw new Error("bad tweak id");
}

export function bindOwnedTweakId(ownerId: string, requestedId: string): string {
  assertValidTweakId(ownerId);
  assertValidTweakId(requestedId);
  if (ownerId !== requestedId) {
    throw new Error(`tweak ${ownerId} cannot use tweak ${requestedId}'s identity`);
  }
  return ownerId;
}

export function tweakApiSurface(
  manifest: Pick<TweakManifest, "permissions">,
): TweakApiSurface {
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
  };
}

export function hasAnyCodexApi(surface: TweakApiSurface): boolean {
  return (
    surface.codexRuntime ||
    surface.codexWindows ||
    surface.codexViews ||
    surface.codexCdp ||
    surface.nativeModule ||
    surface.nativeView ||
    surface.nativeHelper
  );
}

function slot(allowed: boolean, whenDenied: TweakApiSlot): TweakApiSlot {
  return allowed ? "present" : whenDenied;
}

export function planTweakApi(manifest: Pick<TweakManifest, "permissions">): TweakApiPlan {
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
  };
}

export function scopedTweakIpcChannel(tweakId: string, channel: string): string {
  return `codexpp:${tweakId}:${channel}`;
}

export function authorizeTweakCapability(
  snapshot: TweakIdentitySnapshot | undefined,
  requestedId: unknown,
  permission: TweakPermission | CanonicalTweakPermission,
  ownerId?: string,
): TweakIdentitySnapshot {
  assertValidTweakId(requestedId);
  if (ownerId !== undefined) bindOwnedTweakId(ownerId, requestedId);
  if (!snapshot || snapshot.id !== requestedId) {
    throw new Error(`unknown tweak: ${requestedId}`);
  }
  if (!snapshot.enabled) {
    throw new Error(`tweak is disabled: ${requestedId}`);
  }
  assertTweakHasPermission(snapshot.manifest, permission);
  return snapshot;
}

export function createDeniedMethod(
  tweakId: string,
  permission: TweakPermission | CanonicalTweakPermission,
): (...args: never[]) => never {
  return () => {
    throw permissionDeniedError(tweakId, permission);
  };
}

export function createDeniedAsyncMethod(
  tweakId: string,
  permission: TweakPermission | CanonicalTweakPermission,
): (...args: never[]) => Promise<never> {
  return async () => {
    throw permissionDeniedError(tweakId, permission);
  };
}

export function createDeniedTweakFs(tweakId: string): TweakFs {
  const deny = createDeniedAsyncMethod(tweakId, "filesystem");
  return {
    dataDir: `<denied>/tweak-data/${tweakId}`,
    read: deny,
    write: deny,
    exists: deny,
  };
}

export function createBoundTweakFs(
  ownerId: string,
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>,
): TweakFs {
  const id = bindOwnedTweakId(ownerId, ownerId);
  return {
    dataDir: `<remote>/tweak-data/${id}`,
    read: (relPath: string) =>
      invoke("codexpp:tweak-fs", "read", id, relPath) as Promise<string>,
    write: (relPath: string, contents: string) =>
      invoke("codexpp:tweak-fs", "write", id, relPath, contents) as Promise<void>,
    exists: (relPath: string) =>
      invoke("codexpp:tweak-fs", "exists", id, relPath) as Promise<boolean>,
  };
}

export function createDeniedTweakIpc(tweakId: string): TweakIpc {
  const deny = createDeniedMethod(tweakId, "ipc");
  return {
    on: deny,
    send: deny,
    invoke: deny,
    handle: deny,
  };
}

export function createBoundTweakIpc(ownerId: string, bridge: TweakIpcBridge): TweakIpc {
  const id = bindOwnedTweakId(ownerId, ownerId);
  const channelName = (channel: string) => scopedTweakIpcChannel(id, channel);
  return {
    on: (channel, handler) => {
      const wrapped = (_event: unknown, ...args: unknown[]) => handler(...args);
      bridge.on(channelName(channel), wrapped);
      return () => bridge.removeListener(channelName(channel), wrapped);
    },
    send: (channel, ...args) => bridge.send(channelName(channel), ...args),
    invoke: (channel, ...args) =>
      bridge.invoke(channelName(channel), ...args) as Promise<never>,
  };
}

export function isLayerAdminIpcChannel(channel: string): boolean {
  return (LAYER_ADMIN_IPC_CHANNELS as readonly string[]).includes(channel);
}

export function tweakPermissionForIpcChannel(
  channel: string,
): CanonicalTweakPermission | undefined {
  return (TWEAK_CAPABILITY_IPC_CHANNELS as Record<string, CanonicalTweakPermission | undefined>)[
    channel
  ];
}
