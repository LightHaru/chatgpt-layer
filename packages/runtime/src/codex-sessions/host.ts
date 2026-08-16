import type { CodexSessionManager } from "./manager";

let manager: CodexSessionManager | null = null;

export function setCodexSessionManager(next: CodexSessionManager | null): void {
  manager = next;
}

export function getCodexSessionManager(): CodexSessionManager | null {
  return manager;
}

export function requireCodexSessionManager(): CodexSessionManager {
  if (!manager) throw new Error("codex session manager is not available");
  return manager;
}
