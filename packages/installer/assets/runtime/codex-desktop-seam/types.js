"use strict";
/**
 * MS-2B1 Desktop spawn-seam types.
 *
 * Observation only. No ChildProcess wrapping, no stdio sniffing, no public API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UPSTREAM_APP_SERVER_STDIO_SHORTHAND = exports.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED = exports.APP_SERVER_PROBE_ENV = void 0;
exports.APP_SERVER_PROBE_ENV = "CODEXPP_APP_SERVER_PROBE";
exports.UPSTREAM_APP_SERVER_STDIO_ARGV_FIXED = ["app-server", "--listen", "stdio://"];
exports.UPSTREAM_APP_SERVER_STDIO_SHORTHAND = ["app-server", "--stdio"];
//# sourceMappingURL=types.js.map