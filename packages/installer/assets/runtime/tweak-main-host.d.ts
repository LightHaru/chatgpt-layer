import { type DiscoveredTweak } from "./tweak-discovery";
import { type DiskStorage } from "./storage";
import { type SetTweakEnabledAndReloadDeps } from "./tweak-lifecycle";
import { NativeBridge, type NativeTweakContext } from "./native-bridge";
import type { CodexRuntimeCapabilities, CodexRuntimeInfo, CodexViewCreateOptions, NativeHelperLaunchOptions, NativeModuleLoadOptions, NativePanelCreateOptions, NativeViewAttachOptions, TweakPermission } from "@codex-plusplus/sdk";
import { type TweakUpdateCheck } from "./config-state";
import { createCodexBrowserView, createCodexWindow } from "./codex-windows";
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
    manifest: import("@codex-plusplus/sdk").TweakManifest;
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
export declare function makeMainIpc(id: string): {
    on: (c: string, h: (...args: unknown[]) => void) => () => Electron.IpcMain;
    send: (_c: string) => never;
    invoke: (_c: string) => never;
    handle: (c: string, handler: (...args: unknown[]) => unknown) => void;
};
export declare function makeMainFs(id: string): {
    dataDir: string;
    read: (p: string) => Promise<string>;
    write: (p: string, c: string) => Promise<void>;
    exists: (p: string) => Promise<boolean>;
};
export declare function currentRuntimeInfo(): CodexRuntimeInfo;
export declare function currentRuntimeCapabilities(): CodexRuntimeCapabilities;
export declare function tweakContext(tweakId: string, permission?: TweakPermission): NativeTweakContext;
export declare function tweakById(tweakId: string): DiscoveredTweak;
export declare function assertTweakPermissionForId(tweakId: string, permission: TweakPermission): DiscoveredTweak;
export declare function assertTweakViewPermissionForId(tweakId: string): DiscoveredTweak;
export declare function assertTweakPermission(tweak: DiscoveredTweak, permission: TweakPermission): void;
export declare function assertTweakViewPermission(tweak: DiscoveredTweak): void;
export declare function assertTweakId(tweakId: string): void;
export declare function makeCodexApi(tweak: DiscoveredTweak): {
    runtime: {
        getInfo: () => Promise<CodexRuntimeInfo>;
        getCapabilities: () => Promise<CodexRuntimeCapabilities>;
    };
    windows: {
        create: typeof createCodexWindow;
        getPrimary: () => Promise<import("@codex-plusplus/sdk").CodexWindowRef | null>;
        focus: (windowId: number) => Promise<boolean>;
        show: (windowId: number) => Promise<boolean>;
    };
    views: {
        create: (options: CodexViewCreateOptions) => Promise<import("@codex-plusplus/sdk").CodexViewRef>;
    };
    cdp: {
        getStatus: () => Promise<import("@codex-plusplus/sdk").CodexCdpStatus>;
        listTargets: () => Promise<import("@codex-plusplus/sdk").CodexCdpTarget[]>;
    };
    native: {
        loadModule: (options: NativeModuleLoadOptions) => Promise<import("@codex-plusplus/sdk").NativeModuleRef>;
        createPanel: (options: NativePanelCreateOptions) => Promise<import("@codex-plusplus/sdk").NativePanelRef>;
        attachView: (options: NativeViewAttachOptions) => Promise<import("@codex-plusplus/sdk").NativeViewRef>;
        launchHelper: (options: NativeHelperLaunchOptions) => Promise<import("@codex-plusplus/sdk").NativeHelperRef>;
    };
    createBrowserView: typeof createCodexBrowserView;
    createWindow: typeof createCodexWindow;
};
export declare const tweakLifecycleDeps: SetTweakEnabledAndReloadDeps;
