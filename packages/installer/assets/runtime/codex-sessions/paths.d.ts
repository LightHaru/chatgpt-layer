export declare function sessionsRoot(userRoot: string): string;
export declare function accountsRoot(userRoot: string): string;
export declare function sessionDir(userRoot: string, id: string): string;
export declare function sessionMetaPath(userRoot: string, id: string): string;
export declare function sessionCodexHome(userRoot: string, id: string): string;
export declare function sessionSqliteHome(userRoot: string, id: string): string;
export declare function collectForbiddenDeleteTargets(userRoot: string): string[];
export declare function isForbiddenSessionDeleteTarget(userRoot: string, target: string): boolean;
export declare function rmSessionDir(userRoot: string, id: string): void;
