import type { ClassifySpawnResult, DesktopStdioTransportMode, PathIo } from "./types";
export declare function isAppServerProbeEnabled(env: NodeJS.ProcessEnv | undefined): boolean;
export declare function looksLikeCodexRuntimeBasename(name: string | null | undefined): boolean;
export declare function commandBasename(command: string, platform: NodeJS.Platform): string;
/**
 * Skip Layer-recognized config prefixes. Values are discarded and must never
 * be logged. Discovery only; Desktop argv is not rewritten.
 */
export declare function skipConfigPrefixes(argv: readonly string[]): string[];
export declare function detectAppServerSubcommand(argv: readonly string[]): boolean;
export declare function detectStdioTransport(argv: readonly string[]): DesktopStdioTransportMode | null;
export declare function isPathInsideRoot(parent: string, target: string, platform: NodeJS.Platform): boolean;
export declare function resolveTrustedCommandPath(command: string, trustedRoots: readonly string[], platform: NodeJS.Platform, io: PathIo): {
    trusted: boolean;
    relativeResourcePath: string | null;
};
export declare function extractSpawnCommandAndArgv(callArgs: unknown[]): {
    command: unknown;
    argv: unknown;
};
export declare function asStringArgv(argv: unknown): string[] | null;
export declare function classifySpawnCall(opts: {
    callArgs: unknown[];
    trustedRoots: readonly string[];
    platform: NodeJS.Platform;
    io: PathIo;
}): ClassifySpawnResult;
