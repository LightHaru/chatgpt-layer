"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreadOwnerStore = void 0;
exports.threadOwnerStorePath = threadOwnerStorePath;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const ids_1 = require("../codex-sessions/ids");
const paths_1 = require("../codex-sessions/paths");
const errors_1 = require("./errors");
const thread_id_1 = require("./thread-id");
const types_1 = require("./types");
/**
 * Persist threadId → sessionId under Layer userRoot.
 * Path: <userRoot>/codex-sessions/thread-owners.json
 *
 * Reuses MS-1 assertSafeSessionLayout. Poisoned/symlink session root fails
 * closed. No credentials, auth, or filesystem paths in the file.
 */
class ThreadOwnerStore {
    userRoot;
    owners = new Map();
    loaded = false;
    constructor(userRoot) {
        this.userRoot = userRoot;
    }
    getOwner(threadId) {
        (0, thread_id_1.assertThreadId)(threadId);
        this.ensureLoaded();
        return this.owners.get(threadId) ?? null;
    }
    setOwner(threadId, sessionId, options = {}) {
        (0, thread_id_1.assertThreadId)(threadId);
        (0, ids_1.assertSessionId)(sessionId);
        this.ensureLoaded();
        const existing = this.owners.get(threadId);
        if (existing && existing !== sessionId && !options.overwrite) {
            throw new errors_1.CodexAppServerError("owner-exists", `thread ${threadId} is already owned by another session`);
        }
        if (!existing && this.owners.size >= types_1.MAX_THREAD_OWNERS) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread owner store is full");
        }
        this.owners.set(threadId, sessionId);
        this.persist();
    }
    removeOwner(threadId) {
        (0, thread_id_1.assertThreadId)(threadId);
        this.ensureLoaded();
        const deleted = this.owners.delete(threadId);
        if (deleted)
            this.persist();
        return deleted;
    }
    listOwners() {
        this.ensureLoaded();
        return [...this.owners.entries()]
            .map(([threadId, sessionId]) => ({ threadId, sessionId }))
            .sort((a, b) => a.threadId.localeCompare(b.threadId));
    }
    removeSessionOwners(sessionId) {
        (0, ids_1.assertSessionId)(sessionId);
        this.ensureLoaded();
        let removed = 0;
        for (const [threadId, owner] of [...this.owners.entries()]) {
            if (owner === sessionId) {
                this.owners.delete(threadId);
                removed += 1;
            }
        }
        if (removed > 0)
            this.persist();
        return removed;
    }
    storePath() {
        const layout = (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const path = (0, node_path_1.join)(layout.realSessionsRoot, "thread-owners.json");
        if (!path.startsWith(layout.realSessionsRoot)) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread owner path escaped session root");
        }
        return path;
    }
    ensureLoaded() {
        if (this.loaded)
            return;
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const path = this.storePath();
        const stat = lstatIfExists(path);
        if (!stat) {
            this.owners = new Map();
            this.loaded = true;
            return;
        }
        if (stat.isSymbolicLink()) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json must not be a symlink");
        }
        if (!stat.isFile()) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json must be a file");
        }
        if (stat.size > types_1.MAX_OWNER_STORE_BYTES) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json exceeds size bound");
        }
        let rawText;
        try {
            rawText = (0, node_fs_1.readFileSync)(path, "utf8");
        }
        catch (error) {
            throw new errors_1.CodexAppServerError("store-corrupt", "failed to read thread-owners.json");
        }
        if (rawText.length > types_1.MAX_OWNER_STORE_BYTES) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json exceeds size bound");
        }
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        }
        catch {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json is not JSON");
        }
        this.owners = parseOwnerFile(parsed);
        this.loaded = true;
    }
    persist() {
        const layout = (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        (0, node_fs_1.mkdirSync)(layout.realSessionsRoot, { recursive: true });
        (0, paths_1.assertSafeSessionLayout)(this.userRoot);
        const path = this.storePath();
        const existing = lstatIfExists(path);
        if (existing?.isSymbolicLink()) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json must not be a symlink");
        }
        const body = {
            version: types_1.THREAD_OWNER_STORE_VERSION,
            owners: Object.fromEntries(this.owners),
        };
        const encoded = `${JSON.stringify(body, null, 2)}\n`;
        if (Buffer.byteLength(encoded, "utf8") > types_1.MAX_OWNER_STORE_BYTES) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json would exceed size bound");
        }
        writeJsonAtomic(path, encoded);
    }
}
exports.ThreadOwnerStore = ThreadOwnerStore;
function threadOwnerStorePath(userRoot) {
    (0, paths_1.assertSafeSessionLayout)(userRoot);
    return (0, node_path_1.join)((0, paths_1.sessionsRoot)(userRoot), "thread-owners.json");
}
function parseOwnerFile(raw) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json must be an object");
    }
    const rec = raw;
    const allowed = new Set(["version", "owners"]);
    for (const key of Object.keys(rec)) {
        if (!allowed.has(key)) {
            throw new errors_1.CodexAppServerError("store-corrupt", "thread-owners.json contains unknown fields");
        }
    }
    if (rec.version !== types_1.THREAD_OWNER_STORE_VERSION) {
        throw new errors_1.CodexAppServerError("store-corrupt", "unsupported thread-owners.json version");
    }
    if (rec.owners === null || typeof rec.owners !== "object" || Array.isArray(rec.owners)) {
        throw new errors_1.CodexAppServerError("store-corrupt", "owners must be an object");
    }
    const owners = rec.owners;
    const map = new Map();
    for (const [threadId, sessionId] of Object.entries(owners)) {
        if (!(0, thread_id_1.isUsableThreadId)(threadId) || typeof sessionId !== "string" || !(0, ids_1.isSessionId)(sessionId)) {
            throw new errors_1.CodexAppServerError("store-corrupt", "malformed thread owner entry");
        }
        if (looksLikeCredential(threadId) || looksLikeCredential(sessionId)) {
            throw new errors_1.CodexAppServerError("store-corrupt", "credential-like field rejected");
        }
        map.set(threadId, sessionId);
        if (map.size > types_1.MAX_THREAD_OWNERS) {
            throw new errors_1.CodexAppServerError("store-corrupt", "too many thread owners");
        }
    }
    return map;
}
function looksLikeCredential(value) {
    const lower = value.toLowerCase();
    return (lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("password") ||
        lower.includes("auth.json") ||
        lower.includes("sk-") ||
        lower.includes("bearer"));
}
function lstatIfExists(path) {
    try {
        return (0, node_fs_1.lstatSync)(path);
    }
    catch (error) {
        const code = error.code;
        if (code === "ENOENT")
            return null;
        throw error;
    }
}
function writeJsonAtomic(filePath, encoded) {
    const dir = (0, node_path_1.dirname)(filePath);
    (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    const tmp = (0, node_path_1.join)(dir, `.${(0, node_path_1.basename)(filePath)}.${process.pid}.tmp`);
    (0, node_fs_1.writeFileSync)(tmp, encoded, "utf8");
    try {
        (0, node_fs_1.renameSync)(tmp, filePath);
    }
    catch {
        try {
            (0, node_fs_1.unlinkSync)(filePath);
        }
        catch { }
        (0, node_fs_1.renameSync)(tmp, filePath);
    }
}
//# sourceMappingURL=thread-owner-store.js.map