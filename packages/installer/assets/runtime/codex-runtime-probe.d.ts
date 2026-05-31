import type { CodexCdpStatus, CodexCdpTarget, CodexRuntimeCapabilities, CodexRuntimeInfo } from "@codex-plusplus/sdk";
export interface RuntimeProbeOptions {
    userRoot: string;
    runtimeDir: string;
    codexVersion: string | null;
    channel: string | null;
    getWindowServices(): unknown | null;
    getNativeCapabilities?(): CodexRuntimeCapabilities["native"];
    getViewCapabilities?(): CodexRuntimeCapabilities["views"];
}
export declare function getRuntimeInfo(opts: RuntimeProbeOptions): CodexRuntimeInfo;
export declare function getRuntimeCapabilities(opts: RuntimeProbeOptions): CodexRuntimeCapabilities;
export declare function getCdpStatus(): CodexCdpStatus;
export declare function listCdpTargets(): Promise<CodexCdpTarget[]>;
