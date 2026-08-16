import { type DiscoveredTweak } from "./tweak-discovery";
import { type DiskStorage } from "./storage";
import { type SetTweakEnabledAndReloadDeps } from "./tweak-lifecycle";
import { NativeBridge, type NativeTweakContext } from "./native-bridge";
import type { CodexApi, CodexRuntimeCapabilities, CodexRuntimeInfo, TweakFs, TweakIpc, TweakManifest, TweakPermission } from "@codex-plusplus/sdk";
import { type TweakIdentitySnapshot } from "./tweak-permissions";
import { type TweakUpdateCheck } from "./config-state";
export interface LoadedMainTweak {
    stop?: () => void;
    storage: DiskStorage;
}
export declare const tweakState: {
    discovered: DiscoveredTweak[];
    loadedMain: Map<string, LoadedMainTweak>;
};
export declare const nativeBridge: NativeBridge;
export declare function loadAllMainTweaks(): void;
export declare function syncMcpServersFromEnabledTweaks(): void;
export declare function stopAllMainTweaks(): void;
export declare function clearTweakModuleCache(): void;
export declare function safeRealpath(filePath: string): string;
export declare function listedTweaksSnapshot(): {
    manifest: TweakManifest;
    entry: string;
    dir: string;
    entryExists: boolean;
    enabled: boolean;
    update: TweakUpdateCheck;
}[];
export declare function ensureTweakUpdateCheck(t: DiscoveredTweak, force?: boolean): Promise<void>;
export declare function installGithubReleaseTweak(id: string): Promise<{
    installed: string;
    version: string;
    commitSha: string;
}>;
export declare function broadcastReload(): void;
export declare function makeLogger(scope: string): {
    debug: (...a: unknown[]) => void;
    info: (...a: unknown[]) => void;
    warn: (...a: unknown[]) => void;
    error: (...a: unknown[]) => void;
};
export declare function makeMainIpc(manifest: TweakManifest): TweakIpc;
export declare function makeMainFs(manifest: TweakManifest): TweakFs;
export declare function currentRuntimeInfo(): CodexRuntimeInfo;
export declare function currentRuntimeCapabilities(): CodexRuntimeCapabilities;
export declare function tweakContext(tweakId: string, permission?: TweakPermission): NativeTweakContext;
export declare function discoveredTweakSnapshot(tweakId: string): TweakIdentitySnapshot | undefined;
export declare function tweakById(tweakId: string): DiscoveredTweak;
export declare function authorizeEnabledTweak(tweakId: unknown): TweakIdentitySnapshot;
export declare function assertAuthorizedTweak(tweakId: unknown, permission: TweakPermission, ownerId?: string): DiscoveredTweak;
/** @deprecated Use assertAuthorizedTweak */
export declare function assertTweakPermissionForId(tweakId: string, permission: TweakPermission): DiscoveredTweak;
/** @deprecated Use assertAuthorizedTweak(tweakId, "codex-views") */
export declare function assertTweakViewPermissionForId(tweakId: string): DiscoveredTweak;
export declare function assertTweakPermission(tweak: DiscoveredTweak, permission: TweakPermission): void;
export declare function assertTweakViewPermission(tweak: DiscoveredTweak): void;
export declare function assertTweakId(tweakId: string): void;
export declare function makeCodexApi(tweak: DiscoveredTweak): CodexApi | undefined;
export declare const tweakLifecycleDeps: SetTweakEnabledAndReloadDeps;
