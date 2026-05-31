import type { CodexRuntimeCapabilities, NativeHelperLaunchOptions, NativeHelperRef, NativeModuleLoadOptions, NativeModuleRef, NativePanelCreateOptions, NativePanelRef, NativeViewAttachOptions, NativeViewRef } from "@codex-plusplus/sdk";
export interface NativeTweakContext {
    id: string;
    dir: string;
}
type NativeLog = (level: "info" | "warn" | "error", ...args: unknown[]) => void;
export interface NativeBridgeOptions {
    nativeHostPath?: string;
}
export declare class NativeBridge {
    private readonly log;
    private readonly options;
    private modules;
    private instances;
    private helpers;
    private nativeHostExports;
    private nativeHostLoadError;
    constructor(log: NativeLog, options?: NativeBridgeOptions);
    getCapabilities(): CodexRuntimeCapabilities["native"];
    loadModule(ctx: NativeTweakContext, options: NativeModuleLoadOptions): NativeModuleRef;
    createPanel(ctx: NativeTweakContext, options: NativePanelCreateOptions): Promise<NativePanelRef>;
    attachView(ctx: NativeTweakContext, options: NativeViewAttachOptions): Promise<NativeViewRef>;
    launchHelper(ctx: NativeTweakContext, options: NativeHelperLaunchOptions): NativeHelperRef;
    disposeTweak(tweakId: string): void;
    disposeAll(): void;
    callInstance(tweakId: string, kind: "panel" | "view", id: string, method: string, arg?: unknown): Promise<void>;
    callHelper(tweakId: string, helperId: string, method: string, payload?: unknown, timeoutMs?: number): Promise<unknown>;
    private moduleRef;
    private panelRef;
    private viewRef;
    private helperRef;
    requestModule(tweakId: string, id: string, method: string, payload?: unknown, _timeoutMs?: number): Promise<unknown>;
    disposeModule(tweakId: string, id: string): Promise<void>;
    private createNativeInstance;
    private loadNativeHost;
    private readNativeHostCapabilities;
    private invokeInstance;
    private disposeInstanceById;
    private disposeInstance;
    private bindInstanceToParent;
    private syncParentState;
    private signalParentState;
    private callFirstOptionalInstance;
    private sendHelper;
    private requestHelper;
    private stopHelperById;
    private stopHelper;
    private handleHelperLine;
    private moduleFor;
    private instanceFor;
    private helperFor;
}
export {};
