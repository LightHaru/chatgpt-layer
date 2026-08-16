"use strict";
/**
 * JSON-RPC-like app-server envelope.
 *
 * Codex app-server (REFERENCE: b-nnett/codex-subscription-router
 * internal/protocol) uses {id, method, params, result, error} and
 * intentionally omits the JSON-RPC 2.0 `jsonrpc` field. Do not require it.
 * Unknown fields are preserved when forwarding internally.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OWNER_RECORDING_METHODS = exports.METHOD_TURN_START = exports.METHOD_THREAD_STARTED = exports.METHOD_THREAD_UNARCHIVE = exports.METHOD_THREAD_FORK = exports.METHOD_THREAD_RESUME = exports.METHOD_THREAD_READ = exports.METHOD_THREAD_START = exports.METHOD_INITIALIZED = exports.METHOD_INITIALIZE = exports.THREAD_OWNER_STORE_RELATIVE = exports.THREAD_OWNER_STORE_VERSION = exports.MAX_OWNER_STORE_BYTES = exports.MAX_THREAD_OWNERS = exports.MAX_THREAD_ID_LENGTH = exports.DEFAULT_REQUEST_TIMEOUT_MS = exports.MAX_SERVER_REQUESTS_IN_FLIGHT = exports.MAX_INBOUND_QUEUE = exports.MAX_NOTIFICATION_LISTENERS = exports.MAX_PENDING_REQUESTS = exports.MAX_BUFFER_BYTES = exports.MAX_MESSAGE_BYTES = exports.KNOWN_MESSAGE_KEYS = void 0;
exports.KNOWN_MESSAGE_KEYS = ["id", "method", "params", "result", "error"];
/** Conservative bounds. Fail the child/session, never the Electron main process. */
exports.MAX_MESSAGE_BYTES = 256 * 1024;
exports.MAX_BUFFER_BYTES = 512 * 1024;
exports.MAX_PENDING_REQUESTS = 256;
exports.MAX_NOTIFICATION_LISTENERS = 16;
exports.MAX_INBOUND_QUEUE = 256;
exports.MAX_SERVER_REQUESTS_IN_FLIGHT = 16;
exports.DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
exports.MAX_THREAD_ID_LENGTH = 200;
exports.MAX_THREAD_OWNERS = 4096;
exports.MAX_OWNER_STORE_BYTES = 512 * 1024;
exports.THREAD_OWNER_STORE_VERSION = 1;
exports.THREAD_OWNER_STORE_RELATIVE = ["codex-sessions", "thread-owners.json"];
/** Known methods used by MS-2A routing / handshake. */
exports.METHOD_INITIALIZE = "initialize";
exports.METHOD_INITIALIZED = "initialized";
exports.METHOD_THREAD_START = "thread/start";
exports.METHOD_THREAD_READ = "thread/read";
exports.METHOD_THREAD_RESUME = "thread/resume";
exports.METHOD_THREAD_FORK = "thread/fork";
exports.METHOD_THREAD_UNARCHIVE = "thread/unarchive";
exports.METHOD_THREAD_STARTED = "thread/started";
exports.METHOD_TURN_START = "turn/start";
exports.OWNER_RECORDING_METHODS = [
    exports.METHOD_THREAD_START,
    exports.METHOD_THREAD_FORK,
    exports.METHOD_THREAD_RESUME,
    exports.METHOD_THREAD_UNARCHIVE,
];
//# sourceMappingURL=types.js.map