/**
 * Privileged IPC allowlisting. Guest BrowserViews, webviews, and other
 * untrusted frames must not invoke install/self-update/native/fs/clipboard
 * handlers even if a session-level preload leaked into them.
 */

export const PRIVILEGED_IPC_CHANNELS = [
  "codexpp:install-store-tweak",
  "codexpp:install-github-tweak",
  "codexpp:prepare-tweak-store-submission",
  "codexpp:run-codexpp-update",
  "codexpp:set-auto-update",
  "codexpp:set-update-config",
  "codexpp:native-load-module",
  "codexpp:native-module-request",
  "codexpp:native-module-dispose",
  "codexpp:native-create-panel",
  "codexpp:native-attach-view",
  "codexpp:native-instance-call",
  "codexpp:native-launch-helper",
  "codexpp:native-helper-call",
  "codexpp:codex-window-create",
  "codexpp:codex-window-primary",
  "codexpp:codex-window-focus",
  "codexpp:codex-window-show",
  "codexpp:codex-view-create",
  "codexpp:codex-view-call",
  "codexpp:tweak-fs",
  "codexpp:codex-sessions-list",
  "codexpp:codex-sessions-status",
  "codexpp:copy-text",
  "codexpp:reveal",
] as const;

export type PrivilegedIpcChannel = (typeof PRIVILEGED_IPC_CHANNELS)[number];
export type WebContentsTrust = "privileged" | "guest";

export interface IpcSenderLike {
  id: number;
  isDestroyed?: () => boolean;
  getType?: () => string;
}

export function isPrivilegedIpcChannel(channel: string): channel is PrivilegedIpcChannel {
  return (PRIVILEGED_IPC_CHANNELS as readonly string[]).includes(channel);
}

export function classifyIpcSender(
  sender: IpcSenderLike,
  untrustedIds: ReadonlySet<number> = new Set(),
): WebContentsTrust {
  if (sender.isDestroyed?.()) return "guest";
  if (untrustedIds.has(sender.id)) return "guest";
  const type = sender.getType?.() ?? "window";
  if (type === "webview" || type === "offscreen") return "guest";
  if (type === "window" || type === "browserView") return "privileged";
  return "guest";
}

export function isPrivilegedIpcSender(
  sender: IpcSenderLike,
  untrustedIds: ReadonlySet<number> = new Set(),
): boolean {
  return classifyIpcSender(sender, untrustedIds) === "privileged";
}

export function assertPrivilegedIpcSender(
  channel: string,
  sender: IpcSenderLike,
  untrustedIds: ReadonlySet<number> = new Set(),
): void {
  if (!isPrivilegedIpcSender(sender, untrustedIds)) {
    throw new Error(`blocked ${channel} from untrusted frame`);
  }
}

/** Layer self-update is opt-in. Missing/undefined means OFF. */
export function isLayerAutoUpdateEnabled(value: boolean | undefined | null): boolean {
  return value === true;
}

export function stripRendererUpdateRepo<T extends { updateRepo?: unknown }>(config: T): Omit<T, "updateRepo"> {
  const { updateRepo: _ignored, ...rest } = config;
  return rest;
}
