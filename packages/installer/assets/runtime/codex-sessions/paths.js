"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsRoot = sessionsRoot;
exports.accountsRoot = accountsRoot;
exports.sessionDir = sessionDir;
exports.sessionMetaPath = sessionMetaPath;
exports.sessionCodexHome = sessionCodexHome;
exports.sessionSqliteHome = sessionSqliteHome;
exports.collectForbiddenDeleteTargets = collectForbiddenDeleteTargets;
exports.isForbiddenSessionDeleteTarget = isForbiddenSessionDeleteTarget;
exports.rmSessionDir = rmSessionDir;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const native_paths_1 = require("../native-paths");
const ids_1 = require("./ids");
function sessionsRoot(userRoot) {
    return (0, node_path_1.join)(userRoot, "codex-sessions");
}
function accountsRoot(userRoot) {
    return (0, node_path_1.join)(sessionsRoot(userRoot), "accounts");
}
function resolvedAccountsRoot(userRoot) {
    return (0, node_path_1.resolve)(accountsRoot(userRoot));
}
function assertStrictlyInsideAccountsRoot(userRoot, target) {
    const root = resolvedAccountsRoot(userRoot);
    const dir = (0, node_path_1.resolve)(target);
    if (!(0, native_paths_1.isPathInside)(root, dir) || dir === root) {
        throw new Error("session path must stay inside accounts root");
    }
    return dir;
}
function sessionDir(userRoot, id) {
    (0, ids_1.assertSessionId)(id);
    return assertStrictlyInsideAccountsRoot(userRoot, (0, node_path_1.join)(resolvedAccountsRoot(userRoot), id));
}
function sessionMetaPath(userRoot, id) {
    return (0, node_path_1.join)(sessionDir(userRoot, id), "session.json");
}
function sessionCodexHome(userRoot, id) {
    return (0, node_path_1.join)(sessionDir(userRoot, id), "codex-home");
}
function sessionSqliteHome(userRoot, id) {
    return (0, node_path_1.join)(sessionDir(userRoot, id), "sqlite-home");
}
function collectForbiddenDeleteTargets(userRoot) {
    const out = [
        (0, node_path_1.resolve)(userRoot),
        (0, node_path_1.resolve)(userRoot, "tweak-data"),
        (0, node_path_1.resolve)(userRoot, "tweaks"),
        (0, node_path_1.resolve)(userRoot, "runtime"),
        (0, node_path_1.resolve)(userRoot, "config.json"),
        (0, node_path_1.resolve)(userRoot, "state.json"),
        (0, node_path_1.resolve)(sessionsRoot(userRoot)),
        resolvedAccountsRoot(userRoot),
    ];
    if (process.env.HOME) {
        out.push((0, node_path_1.resolve)(process.env.HOME));
        out.push((0, node_path_1.resolve)(process.env.HOME, ".codex"));
    }
    if (process.env.USERPROFILE) {
        out.push((0, node_path_1.resolve)(process.env.USERPROFILE));
        out.push((0, node_path_1.resolve)(process.env.USERPROFILE, ".codex"));
    }
    if (process.env.APPDATA)
        out.push((0, node_path_1.resolve)(process.env.APPDATA));
    return [...new Set(out)];
}
function isForbiddenSessionDeleteTarget(userRoot, target) {
    const resolved = (0, node_path_1.resolve)(target);
    return collectForbiddenDeleteTargets(userRoot).some((path) => path === resolved);
}
function rmSessionDir(userRoot, id) {
    const accounts = resolvedAccountsRoot(userRoot);
    const dir = sessionDir(userRoot, id);
    let target = dir;
    if ((0, node_fs_1.existsSync)(dir)) {
        const stat = (0, node_fs_1.lstatSync)(dir);
        target = stat.isSymbolicLink() ? (0, node_fs_1.realpathSync)(dir) : (0, node_fs_1.realpathSync)(dir);
    }
    const resolvedAccounts = (0, node_fs_1.existsSync)(accounts) ? (0, node_fs_1.realpathSync)(accounts) : accounts;
    if (!(0, native_paths_1.isPathInside)(resolvedAccounts, target) || target === resolvedAccounts) {
        throw new Error("refusing to delete path outside accounts root");
    }
    if (isForbiddenSessionDeleteTarget(userRoot, target)) {
        throw new Error("refusing to delete protected path");
    }
    (0, node_fs_1.rmSync)(target, { recursive: true, force: true });
}
//# sourceMappingURL=paths.js.map