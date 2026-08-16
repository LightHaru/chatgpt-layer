export interface ThreadOwnerEntry {
    threadId: string;
    sessionId: string;
}
export interface ThreadOwnerStoreFile {
    version: number;
    owners: Record<string, string>;
}
export interface SetOwnerOptions {
    overwrite?: boolean;
}
/**
 * Persist threadId → sessionId under Layer userRoot.
 * Path: <userRoot>/codex-sessions/thread-owners.json
 *
 * Reuses MS-1 assertSafeSessionLayout. Poisoned/symlink session root fails
 * closed. No credentials, auth, or filesystem paths in the file.
 */
export declare class ThreadOwnerStore {
    private readonly userRoot;
    private owners;
    private loaded;
    constructor(userRoot: string);
    getOwner(threadId: string): string | null;
    setOwner(threadId: string, sessionId: string, options?: SetOwnerOptions): void;
    removeOwner(threadId: string): boolean;
    listOwners(): ThreadOwnerEntry[];
    removeSessionOwners(sessionId: string): number;
    private storePath;
    private ensureLoaded;
    private persist;
}
export declare function threadOwnerStorePath(userRoot: string): string;
