import { type TweakStorePublishSubmission, type TweakStoreEntry, type TweakStoreRegistry, type TweakStorePlatform } from "./tweak-store";
export declare const VERSION_RE: RegExp;
export interface TweakStoreFetchResult {
    registry: TweakStoreRegistry;
    fetchedAt: string;
}
export interface StoreInstallMetadata {
    repo: string;
    approvedCommitSha: string;
    installedAt: string;
    storeIndexUrl: string;
    files?: Record<string, string>;
}
export interface StoreEntryPlatformCompatibility {
    current: NodeJS.Platform;
    supported: TweakStorePlatform[] | null;
    compatible: boolean;
    reason: string | null;
}
export interface StoreEntryRuntimeCompatibility {
    current: string;
    required: string | null;
    compatible: boolean;
    reason: string | null;
}
export declare class StoreTweakModifiedError extends Error {
    constructor(tweakName: string);
}
export declare function storeEntryPlatformCompatibility(entry: TweakStoreEntry): StoreEntryPlatformCompatibility;
export declare function assertStoreEntryPlatformCompatible(entry: TweakStoreEntry): void;
export declare function storeEntryRuntimeCompatibility(entry: TweakStoreEntry): StoreEntryRuntimeCompatibility;
export declare function assertStoreEntryRuntimeCompatible(entry: TweakStoreEntry): void;
export declare function cleanMinRuntime(value: unknown): string | null;
export declare function formatStorePlatforms(platforms: TweakStorePlatform[] | null): string;
export declare function readBundledStoreRegistry(): TweakStoreRegistry | null;
export declare function fetchTweakStoreRegistry(): Promise<TweakStoreFetchResult>;
export declare function installStoreTweak(entry: TweakStoreEntry): Promise<void>;
export declare function prepareTweakStoreSubmission(repoInput: string): Promise<TweakStorePublishSubmission>;
export declare function extractTarArchive(archive: string, targetDir: string): void;
export declare function validateStoreTweakSource(entry: TweakStoreEntry, source: string): void;
export declare function findTweakRoot(dir: string): string | null;
export declare function copyTweakSource(source: string, target: string): void;
export declare function readStoreInstallMetadata(target: string): StoreInstallMetadata | null;
export declare function hashTweakSource(root: string): Record<string, string>;
export declare function collectTweakFileHashes(root: string, dir: string, out: Record<string, string>): void;
export declare function sameFileHashes(a: Record<string, string>, b: Record<string, string>): boolean;
export declare function isHashRecord(value: unknown): value is Record<string, string>;
export declare function normalizeVersion(v: string): string;
export declare function compareVersions(a: string, b: string): number;
