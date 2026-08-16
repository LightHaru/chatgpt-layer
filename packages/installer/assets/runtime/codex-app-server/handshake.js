"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.performInitializeHandshake = performInitializeHandshake;
const errors_1 = require("./errors");
const types_1 = require("./types");
/**
 * initialize request + initialized notification.
 * Params are cached by the caller (registry) for future MS-2B replay.
 * Not broadcast blindly: only sent on the transport that just launched.
 */
async function performInitializeHandshake(transport, params = {}, timeoutMs) {
    let result;
    try {
        const response = await transport.request(types_1.METHOD_INITIALIZE, params, { timeoutMs });
        result = response.result;
    }
    catch (error) {
        if (error instanceof errors_1.CodexAppServerError)
            throw error;
        throw new errors_1.CodexAppServerError("protocol", error instanceof Error ? error.message : "initialize failed", transport.sessionId);
    }
    await transport.notify(types_1.METHOD_INITIALIZED, {});
    return { result, params };
}
//# sourceMappingURL=handshake.js.map