"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_ID_RE = void 0;
exports.generateSessionId = generateSessionId;
exports.isSessionId = isSessionId;
exports.assertSessionId = assertSessionId;
const node_crypto_1 = require("node:crypto");
exports.SESSION_ID_RE = /^session_[a-f0-9]{24}$/;
function generateSessionId() {
    return `session_${(0, node_crypto_1.randomBytes)(12).toString("hex")}`;
}
function isSessionId(value) {
    return typeof value === "string" && exports.SESSION_ID_RE.test(value);
}
function assertSessionId(value) {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error("invalid session id");
    }
    if (value.includes("..") ||
        value.includes("/") ||
        value.includes("\\") ||
        value.includes(":") ||
        value.includes("@") ||
        value.includes(" ") ||
        value.startsWith("\\\\") ||
        /^[A-Za-z]:/.test(value)) {
        throw new Error("invalid session id");
    }
    if (!exports.SESSION_ID_RE.test(value)) {
        throw new Error("invalid session id");
    }
}
//# sourceMappingURL=ids.js.map