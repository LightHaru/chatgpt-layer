/**
 * Privileged IPC allowlisting. Guest BrowserViews, webviews, and other
 * untrusted frames must not invoke install/self-update/native/fs/clipboard
 * handlers even if a session-level preload leaked into them.
 */
export declare const PRIVILEGED_IPC_CHANNELS: readonly ["codexpp:install-store-tweak", "codexpp:install-github-tweak", "codexpp:prepare-tweak-store-submission", "codexpp:run-codexpp-update", "codexpp:set-auto-update", "codexpp:set-update-config", "codexpp:native-load-module", "codexpp:native-module-request", "codexpp:native-module-dispose", "codexpp:native-create-panel", "codexpp:native-attach-view", "codexpp:native-instance-call", "codexpp:native-launch-helper", "codexpp:native-helper-call", "codexpp:codex-window-create", "codexpp:codex-view-create", "codexpp:codex-view-call", "codexpp:tweak-fs", "codexpp:copy-text", "codexpp:reveal"];
export type PrivilegedIpcChannel = (typeof PRIVILEGED_IPC_CHANNELS)[number];
export type WebContentsTrust = "privileged" | "guest";
export interface IpcSenderLike {
    id: number;
    isDestroyed?: () => boolean;
    getType?: () => string;
}
export declare function isPrivilegedIpcChannel(channel: string): channel is PrivilegedIpcChannel;
export declare function classifyIpcSender(sender: IpcSenderLike, untrustedIds?: ReadonlySet<number>): WebContentsTrust;
export declare function isPrivilegedIpcSender(sender: IpcSenderLike, untrustedIds?: ReadonlySet<number>): boolean;
export declare function assertPrivilegedIpcSender(channel: string, sender: IpcSenderLike, untrustedIds?: ReadonlySet<number>): void;
/** Layer self-update is opt-in. Missing/undefined means OFF. */
export declare function isLayerAutoUpdateEnabled(value: boolean | undefined | null): boolean;
export declare function stripRendererUpdateRepo<T extends {
    updateRepo?: unknown;
}>(config: T): Omit<T, "updateRepo">;
