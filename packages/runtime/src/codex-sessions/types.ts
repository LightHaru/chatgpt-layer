export type {
  CodexSessionLifecycle,
  CodexSessionMetadata,
  CodexSessionStatus,
} from "@codex-plusplus/sdk";

export const CODEX_SESSION_METADATA_KEYS = [
  "id",
  "label",
  "enabled",
  "createdAt",
  "updatedAt",
  "lastStartedAt",
  "lastStoppedAt",
  "lastExit",
] as const;

export const CODEX_SESSION_LAST_EXIT_KEYS = ["at", "code", "signal", "reason"] as const;
