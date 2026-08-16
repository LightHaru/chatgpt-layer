"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdioAppServerTransport = void 0;
const errors_1 = require("./errors");
const framing_1 = require("./framing");
const transport_1 = require("./transport");
/**
 * JSONL over child stdin/stdout. stderr is drained as diagnostics and never
 * parsed as protocol. Production callers must not construct this unless the
 * invocation is proven; tests inject pipes.
 */
class StdioAppServerTransport extends transport_1.AbstractAppServerTransport {
    pipes;
    parser = new framing_1.NdjsonParser();
    unsubExit;
    writeChain = Promise.resolve();
    constructor(options) {
        super({
            sessionId: options.sessionId,
            timeoutMs: options.timeoutMs,
            send: (message) => this.writeMessage(message),
            closeSink: () => this.shutdownPipes(),
        });
        this.pipes = options.pipes;
        this.pipes.stdout.on("data", (chunk) => {
            try {
                const messages = this.parser.push(chunk);
                for (const message of messages)
                    this.handleInbound(message);
            }
            catch (error) {
                void this.close(error instanceof errors_1.CodexAppServerError
                    ? error
                    : new errors_1.CodexAppServerError("malformed", "app-server stdout parse failed", options.sessionId));
            }
        });
        this.pipes.stdout.on("error", () => {
            void this.close(new errors_1.CodexAppServerError("child-exit", "app-server stdout error", options.sessionId));
        });
        this.pipes.stderr?.on("data", () => { });
        this.pipes.stderr?.resume?.();
        this.unsubExit = this.pipes.onExit?.((code, signal) => {
            void this.close(new errors_1.CodexAppServerError("child-exit", `app-server child exited (code=${code}, signal=${signal})`, options.sessionId));
        });
    }
    writeMessage(message) {
        const payload = (0, transport_1.encodeForStdio)(message);
        this.writeChain = this.writeChain.then(() => new Promise((resolve, reject) => {
            const stdin = this.pipes.stdin;
            if (stdin.destroyed || stdin.writableEnded) {
                reject(new errors_1.CodexAppServerError("closed", "app-server stdin is closed", this.sessionId));
                return;
            }
            stdin.write(payload, (error) => {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        }));
        return this.writeChain;
    }
    shutdownPipes() {
        this.unsubExit?.();
        try {
            this.pipes.stdin.end();
        }
        catch { }
        try {
            this.pipes.kill?.("SIGTERM");
        }
        catch { }
    }
}
exports.StdioAppServerTransport = StdioAppServerTransport;
//# sourceMappingURL=child-transport.js.map