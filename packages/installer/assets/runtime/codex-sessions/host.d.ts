import type { CodexSessionManager } from "./manager";
export declare function setCodexSessionManager(next: CodexSessionManager | null): void;
export declare function getCodexSessionManager(): CodexSessionManager | null;
export declare function requireCodexSessionManager(): CodexSessionManager;
