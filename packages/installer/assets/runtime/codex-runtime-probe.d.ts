import type { CodexCdpStatus, CodexCdpTarget, CodexRuntimeCapabilities, CodexRuntimeInfo, CodexRuntimeType } from "@codex-plusplus/sdk";
/**
 * Runtime compatibility is capability-driven. App/version strings are
 * diagnostic metadata only — they must not gate behavior. Probe adapters
 * inspect existing surfaces; they never create windows, mutate persistent
 * state, or touch the network.
 */
export type RuntimeSupportLevel = "supported" | "degraded" | "unknown";
export type PreloadRegistrationStrategy = "registerPreloadScript" | "setPreloads" | "unavailable";
export interface ProbeAppAdapter {
    getVersion?: () => string;
    getAppPath?: () => string;
    isPackaged?: boolean;
}
export interface ProbeSessionAdapter {
    registerPreloadScript?: unknown;
    setPreloads?: unknown;
    getPreloads?: unknown;
}
export interface ProbeWindowSample {
    addBrowserView?: unknown;
    fromId?: unknown;
    contentView?: unknown;
    addChildView?: unknown;
    removeChildView?: unknown;
}
export interface ProbeViewSample {
    present?: boolean;
    webContentsView?: unknown;
    setBounds?: unknown;
}
export interface RuntimeProbeEnv {
    platform?: NodeJS.Platform;
    execPath?: string;
    resourcesPath?: string | null;
    existsSync?: (path: string) => boolean;
    processEnv?: NodeJS.ProcessEnv;
    app?: ProbeAppAdapter | null;
    session?: {
        defaultSession?: ProbeSessionAdapter | null;
    } | ProbeSessionAdapter | null;
    browserWindow?: {
        fromId?: unknown;
        getFocusedWindow?: () => unknown;
        getAllWindows?: () => unknown[];
    } | null;
    browserView?: unknown;
    getWindowServices?: () => unknown | null;
    inspectExistingWindow?: () => ProbeWindowSample | null;
    inspectBrowserView?: () => ProbeViewSample | null;
}
export interface RuntimeProbeOptions {
    userRoot: string;
    runtimeDir: string;
    codexVersion: string | null;
    channel: string | null;
    getWindowServices(): unknown | null;
    getNativeCapabilities?(): CodexRuntimeCapabilities["native"];
    env?: RuntimeProbeEnv;
}
/** Internal snapshot. Not part of the public SDK. */
export interface RuntimeCompatibilitySnapshot {
    runtimeType: CodexRuntimeType;
    appVersion: string | null;
    buildFlavor: string | null;
    preload: {
        registerPreloadScript: boolean;
        setPreloadsFallback: boolean;
    };
    windows: {
        windowServices: boolean;
        createWindow: boolean;
        getPrimaryWindow: boolean;
        registerWindow: boolean;
    };
    views: {
        browserView: boolean;
        contentView: boolean;
        webContentsView: boolean;
        privateViewTree: boolean;
    };
    shell: {
        owl: boolean;
        electronCompatible: boolean;
    };
    support: {
        level: RuntimeSupportLevel;
        reasons: string[];
    };
}
export interface InspectedWindowServices {
    present: boolean;
    createWindow: boolean;
    createFreshWindow: boolean;
    createFreshLocalWindow: boolean;
    ensureHostWindow: boolean;
    getPrimaryWindow: boolean;
    getPrimaryWindowFromManager: boolean;
    registerWindow: boolean;
    canCreate: boolean;
}
export interface ViewAttachTargets {
    addBrowserView: boolean;
    contentView: boolean;
    addChildView: boolean;
    removeChildView: boolean;
    webContentsView: boolean;
    webContentsViewSetBounds: boolean;
}
export declare function probeRuntimeCompatibility(opts: RuntimeProbeOptions): RuntimeCompatibilitySnapshot;
export declare function getRuntimeInfo(opts: RuntimeProbeOptions): CodexRuntimeInfo;
export declare function getRuntimeCapabilities(opts: RuntimeProbeOptions): CodexRuntimeCapabilities;
export declare function capabilitiesFromSnapshot(snapshot: RuntimeCompatibilitySnapshot, native: CodexRuntimeCapabilities["native"], canFocus?: boolean): CodexRuntimeCapabilities;
export declare function viewsCapabilitiesFromSnapshot(snapshot: RuntimeCompatibilitySnapshot): CodexRuntimeCapabilities["views"];
export declare function getCdpStatus(): CodexCdpStatus;
export declare function listCdpTargets(): Promise<CodexCdpTarget[]>;
export declare function selectPreloadRegistration(sessionLike: unknown): PreloadRegistrationStrategy;
export declare function inspectWindowServices(services: unknown): InspectedWindowServices;
export declare function inspectViewAttachTargets(parent: unknown, view?: unknown): ViewAttachTargets;
export declare function windowSampleFrom(win: unknown): ProbeWindowSample | null;
export declare function viewSampleFromConstructor(browserView: unknown): ProbeViewSample | null;
export declare function createDefaultProbeEnv(opts?: Pick<RuntimeProbeOptions, "getWindowServices">): RuntimeProbeEnv;
export declare function asRecord(value: unknown): Record<string, unknown> | null;
