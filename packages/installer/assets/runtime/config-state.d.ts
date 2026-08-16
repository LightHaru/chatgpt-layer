export interface PersistedState {
    codexPlusPlus?: {
        autoUpdate?: boolean;
        safeMode?: boolean;
        updateChannel?: SelfUpdateChannel;
        updateRepo?: string;
        updateRef?: string;
        updateCheck?: CodexPlusPlusUpdateCheck;
    };
    /** Per-tweak enable flags. Missing entries default to enabled. */
    tweaks?: Record<string, {
        enabled?: boolean;
    }>;
    /** Cached GitHub release checks. Runtime never auto-installs; the user can click Update on the Tweaks page. */
    tweakUpdateChecks?: Record<string, TweakUpdateCheck>;
}
export interface CodexPlusPlusUpdateCheck {
    checkedAt: string;
    currentVersion: string;
    latestVersion: string | null;
    releaseUrl: string | null;
    releaseNotes: string | null;
    updateAvailable: boolean;
    error?: string;
}
export type SelfUpdateChannel = "stable" | "prerelease" | "custom";
export type SelfUpdateStatus = "checking" | "up-to-date" | "updated" | "failed" | "disabled";
export interface SelfUpdateState {
    checkedAt: string;
    completedAt?: string;
    status: SelfUpdateStatus;
    currentVersion: string;
    latestVersion: string | null;
    targetRef: string | null;
    releaseUrl: string | null;
    repo: string;
    channel: SelfUpdateChannel;
    sourceRoot: string;
    installationSource?: InstallationSource;
    error?: string;
}
export interface InstallationSource {
    kind: "github-source" | "homebrew" | "local-dev" | "source-archive" | "unknown";
    label: string;
    detail: string;
}
export interface TweakUpdateCheck {
    checkedAt: string;
    repo: string;
    currentVersion: string;
    latestVersion: string | null;
    latestTag: string | null;
    releaseUrl: string | null;
    updateAvailable: boolean;
    pinnedSha?: string;
    error?: string;
}
export declare function readState(): PersistedState;
export declare function writeState(s: PersistedState): void;
export declare function isCodexPlusPlusAutoUpdateEnabled(): boolean;
export declare function setCodexPlusPlusAutoUpdate(enabled: boolean): void;
export declare function setCodexPlusPlusUpdateConfig(config: {
    updateChannel?: SelfUpdateChannel;
    updateRepo?: string;
    updateRef?: string;
}): void;
export declare function isCodexPlusPlusSafeModeEnabled(): boolean;
export declare function isTweakEnabled(id: string): boolean;
export declare function setTweakEnabled(id: string, enabled: boolean): void;
export interface InstallerState {
    appRoot: string;
    codexVersion: string | null;
    sourceRoot?: string;
}
export declare function readInstallerState(): InstallerState | null;
export declare function readSelfUpdateState(): SelfUpdateState | null;
export declare function writeSelfUpdateState(state: SelfUpdateState): void;
export declare function cleanOptionalString(value: unknown): string | undefined;
