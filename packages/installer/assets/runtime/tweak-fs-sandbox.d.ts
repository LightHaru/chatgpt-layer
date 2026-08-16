export declare function tweakDataDir(userRoot: string, tweakId: string): string;
export declare function ensureTweakDataDir(userRoot: string, tweakId: string): string;
export declare function resolveTweakDataPath(userRoot: string, tweakId: string, relPath: string): {
    dir: string;
    full: string;
};
