import type { Readable, Writable } from "node:stream";
import { CodexAppServerError } from "./errors";
import { NdjsonParser } from "./framing";
import { AbstractAppServerTransport, encodeForStdio } from "./transport";
import type { AppServerMessage } from "./types";

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
export class StdioAppServerTransport extends AbstractAppServerTransport {
  private readonly pipes: CodexStdioPipes;
  private readonly parser = new NdjsonParser();
  private readonly unsubExit?: () => void;
  private writeChain: Promise<void> = Promise.resolve();

  constructor(options: StdioAppServerTransportOptions) {
    super({
      sessionId: options.sessionId,
      timeoutMs: options.timeoutMs,
      send: (message) => this.writeMessage(message),
      closeSink: () => this.shutdownPipes(),
    });
    this.pipes = options.pipes;
    this.pipes.stdout.on("data", (chunk: Buffer | string) => {
      try {
        const messages = this.parser.push(chunk);
        for (const message of messages) this.handleInbound(message);
      } catch (error) {
        void this.close(
          error instanceof CodexAppServerError
            ? error
            : new CodexAppServerError("malformed", "app-server stdout parse failed", options.sessionId),
        );
      }
    });
    this.pipes.stdout.on("error", () => {
      void this.close(new CodexAppServerError("child-exit", "app-server stdout error", options.sessionId));
    });
    this.pipes.stderr?.on("data", () => {});
    this.pipes.stderr?.resume?.();
    this.unsubExit = this.pipes.onExit?.((code, signal) => {
      void this.close(
        new CodexAppServerError(
          "child-exit",
          `app-server child exited (code=${code}, signal=${signal})`,
          options.sessionId,
        ),
      );
    });
  }

  private writeMessage(message: AppServerMessage): Promise<void> {
    const payload = encodeForStdio(message);
    this.writeChain = this.writeChain.then(
      () =>
        new Promise<void>((resolve, reject) => {
          const stdin = this.pipes.stdin;
          if (stdin.destroyed || stdin.writableEnded) {
            reject(new CodexAppServerError("closed", "app-server stdin is closed", this.sessionId));
            return;
          }
          stdin.write(payload, (error) => {
            if (error) reject(error);
            else resolve();
          });
        }),
    );
    return this.writeChain;
  }

  private shutdownPipes(): void {
    this.unsubExit?.();
    try {
      this.pipes.stdin.end();
    } catch {}
    try {
      this.pipes.kill?.("SIGTERM");
    } catch {}
  }
}
