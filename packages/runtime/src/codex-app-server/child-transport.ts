import type { Readable, Writable } from "node:stream";
import { CodexAppServerError } from "./errors";
import { NdjsonParser, assertOutboundMessage } from "./framing";
import { AbstractAppServerTransport } from "./transport";
import type { AppServerMessage } from "./types";

/**
 * Internal stdio owner. Never exposed to tweaks.
 *
 * MS-2A does not spawn a second Codex process beside the MS-1 lifecycle
 * child. This adapter wraps pipes the test harness (or a future unified
 * MS-2B session process) already owns. Production invocation stays BLOCKED.
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
    this.pipes.stdin.on("error", (error: Error) => {
      void this.close(
        new CodexAppServerError("internal", error.message || "app-server stdin error", options.sessionId),
      );
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
    if (this.isClosed) {
      return Promise.reject(new CodexAppServerError("closed", "app-server stdin is closed", this.sessionId));
    }
    let payload: Buffer;
    try {
      payload = assertOutboundMessage(message);
    } catch (error) {
      const wrapped =
        error instanceof CodexAppServerError
          ? error
          : new CodexAppServerError("malformed", "app-server outbound encode failed", this.sessionId);
      void this.close(wrapped);
      return Promise.reject(wrapped);
    }
    const write = this.writeChain.then(() => {
      if (this.isClosed) {
        return Promise.reject(new CodexAppServerError("closed", "app-server stdin is closed", this.sessionId));
      }
      return new Promise<void>((resolve, reject) => {
        const stdin = this.pipes.stdin;
        if (stdin.destroyed || stdin.writableEnded) {
          const err = new CodexAppServerError("closed", "app-server stdin is closed", this.sessionId);
          void this.close(err);
          reject(err);
          return;
        }
        stdin.write(payload, (error) => {
          if (error) {
            const wrapped = new CodexAppServerError(
              "internal",
              error.message || "app-server stdin write failed",
              this.sessionId,
            );
            void this.close(wrapped);
            reject(wrapped);
          } else {
            resolve();
          }
        });
      });
    });
    // Absorb rejection so the chain does not stay poisoned; isClosed blocks
    // subsequent writes after a failure.
    this.writeChain = write.then(
      () => undefined,
      () => undefined,
    );
    return write;
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
