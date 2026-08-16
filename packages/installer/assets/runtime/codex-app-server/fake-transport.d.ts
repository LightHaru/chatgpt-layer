import { AbstractAppServerTransport } from "./transport";
import type { AppServerMessage } from "./types";
export type FakeHandlerResult = {
    result?: unknown;
    extra?: Record<string, unknown>;
} | {
    error: {
        code: number;
        message: string;
        data?: unknown;
    };
} | {
    notification: AppServerMessage;
    result?: unknown;
} | {
    crash: true;
} | {
    malformed: string;
} | {
    delayMs: number;
    then: Exclude<FakeHandlerResult, {
        delayMs: number;
        then: unknown;
    }>;
};
export type FakeRequestHandler = (method: string, params: unknown, id: string | number) => FakeHandlerResult | void | Promise<FakeHandlerResult | void>;
export interface FakeAppServerOptions {
    sessionId: string;
    timeoutMs?: number;
    onRequest?: FakeRequestHandler;
    onNotify?: (method: string, params: unknown) => void;
    threadIdPrefix?: string;
}
/**
 * In-process fake Codex app-server. No network, no ~/.codex, no real auth.
 */
export declare class FakeAppServer {
    readonly sessionId: string;
    private initialized;
    private initParams;
    private seq;
    private crashed;
    private readonly onRequest?;
    private readonly onNotify?;
    private readonly threadIdPrefix;
    readonly startedThreadIds: string[];
    constructor(options: FakeAppServerOptions);
    get didInitialize(): boolean;
    get lastInitializeParams(): unknown;
    get isCrashed(): boolean;
    crash(): void;
    handle(message: AppServerMessage): Promise<AppServerMessage[]>;
    private defaultHandle;
    private materialize;
}
export declare class InProcessAppServerTransport extends AbstractAppServerTransport {
    readonly server: FakeAppServer;
    constructor(server: FakeAppServer, timeoutMs?: number);
    private dispatch;
}
export declare function createFakeTransport(sessionId: string, options?: Omit<FakeAppServerOptions, "sessionId">): InProcessAppServerTransport;
