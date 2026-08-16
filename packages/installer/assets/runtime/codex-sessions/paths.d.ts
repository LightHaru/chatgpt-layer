export interface SafeSessionLayout {
    realUserRoot: string;
    realSessionsRoot: string;
    realAccountsRoot: string;
}
export declare function sessionsRoot(userRoot: string): string;
export declare function accountsRoot(userRoot: string): string;
/**
 * Fail closed if `<userRoot>/codex-sessions` or `.../accounts` is a
 * symlink/junction, or if a real directory's realpath escapes the real user
 * root. userRoot itself may resolve through a user-selected symlink.
 */
export declare function assertSafeSessionLayout(userRoot: string): SafeSessionLayout;
/**
 * Create missing structural dirs as real directories, then re-lstat so a
 * TOCTOU replace with a symlink/junction cannot be written through.
 */
export declare function ensureSafeSessionLayout(userRoot: string): SafeSessionLayout;
export declare function sessionDir(userRoot: string, id: string): string;
export declare function sessionMetaPath(userRoot: string, id: string): string;
export declare function sessionCodexHome(userRoot: string, id: string): string;
export declare function sessionSqliteHome(userRoot: string, id: string): string;
export declare function collectForbiddenDeleteTargets(userRoot: string): string[];
export declare function isForbiddenSessionDeleteTarget(userRoot: string, target: string): boolean;
export declare function rmSessionDir(userRoot: string, id: string): void;
