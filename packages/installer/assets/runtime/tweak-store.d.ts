import type { TweakManifest } from "@codex-plusplus/sdk";
/** Commit of store/index.json reviewed into this runtime. Not floating main. */
export declare const PINNED_TWEAK_STORE_INDEX_COMMIT = "7a0e95b161de5480261f17bbf84004d9be90dc6e";
/** SHA-256 of store/index.json at PINNED_TWEAK_STORE_INDEX_COMMIT. */
export declare const PINNED_TWEAK_STORE_INDEX_SHA256 = "378e88cc366ef6d50816a27838af146c34fef122c6bfee3ba03c9549b862d063";
export declare const DEFAULT_TWEAK_STORE_INDEX_URL = "https://raw.githubusercontent.com/LightHaru/chatgpt-layer/7a0e95b161de5480261f17bbf84004d9be90dc6e/store/index.json";
export declare const TWEAK_STORE_REVIEW_ISSUE_URL = "https://github.com/LightHaru/chatgpt-layer/issues/new";
export interface TweakStoreRegistry {
    schemaVersion: 1;
    generatedAt?: string;
    entries: TweakStoreEntry[];
}
export interface TweakStoreEntry {
    id: string;
    manifest: TweakManifest;
    repo: string;
    approvedCommitSha: string;
    approvedAt: string;
    approvedBy: string;
    platforms?: TweakStorePlatform[];
    releaseUrl?: string;
    reviewUrl?: string;
}
export type TweakStorePlatform = "darwin" | "win32" | "linux";
export interface TweakStorePublishSubmission {
    repo: string;
    defaultBranch: string;
    commitSha: string;
    commitUrl: string;
    manifest?: {
        id?: string;
        name?: string;
        version?: string;
        description?: string;
        iconUrl?: string;
    };
}
export declare function normalizeGitHubRepo(input: string): string;
export declare function normalizeStoreRegistry(input: unknown): TweakStoreRegistry;
export declare function shuffleStoreEntries<T>(entries: readonly T[], randomIndex?: (exclusiveMax: number) => number): T[];
export declare function normalizeStoreEntry(input: unknown): TweakStoreEntry;
export declare function storeArchiveUrl(entry: TweakStoreEntry): string;
export declare function buildTweakPublishIssueUrl(submission: TweakStorePublishSubmission): string;
export declare function isFullCommitSha(value: string): boolean;
export declare function resolveTweakStoreIndexUrl(env?: NodeJS.Dict<string | undefined>): string;
export declare function assertStoreInstallPin(entry: TweakStoreEntry, commitSha: string): void;
export declare function shortCommitSha(sha: string): string;
export declare function listedPinLabel(sha: string): string;
