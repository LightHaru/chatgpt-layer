import type { Readable, Writable } from "node:stream";
import { AbstractAppServerTransport } from "./transport";
/**
 * Internal stdio owner. Never exposed to tweaks.
 * MS-1 CodexManagedChild stays lifecycle-only; this is a separate stdio
 * adapter used by tests and (if ever proven) production app-server children.
 */
export interface CodexStdioPipes {
    stdin: Writable;
    stdout: Readable;
    stderr?: Readable | null;
    kill?: (signal?: NodeJS.Signals) => boolean;
    onExit?: (listener: (code: number | null, signal: NodeJS.Signals | null) => void) => () => void;
}
export interface StdioAppServerTransportOptions {
    sessionId: string;
    pipes: CodexStdioPipes;
    timeoutMs?: number;
}
/**
 * JSONL over child stdin/stdout. stderr is drained as diagnostics and never
 * parsed as protocol. Production callers must not construct this unless the
 * invocation is proven; tests inject pipes.
 */
export declare class StdioAppServerTransport extends AbstractAppServerTransport {
    private readonly pipes;
    private readonly parser;
    private readonly unsubExit?;
    private writeChain;
    constructor(options: StdioAppServerTransportOptions);
    private writeMessage;
    private shutdownPipes;
}
