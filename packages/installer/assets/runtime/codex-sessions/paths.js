"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionsRoot = sessionsRoot;
exports.accountsRoot = accountsRoot;
exports.assertSafeSessionLayout = assertSafeSessionLayout;
exports.ensureSafeSessionLayout = ensureSafeSessionLayout;
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
function realUserRootOf(userRoot) {
    try {
        return (0, node_fs_1.realpathSync)(userRoot);
    }
    catch {
        return (0, node_path_1.resolve)(userRoot);
    }
}
function assertStrictlyInside(parent, child, message) {
    if (!(0, native_paths_1.isPathInside)(parent, child) || child === parent) {
        throw new Error(message);
    }
}
function assertSafeStructuralDir(realUserRoot, lexicalPath, relativeParts, label) {
    const stat = lstatIfExists(lexicalPath);
    if (!stat) {
        const intended = (0, node_path_1.join)(realUserRoot, ...relativeParts);
        assertStrictlyInside(realUserRoot, intended, `${label} must stay inside user root`);
        return intended;
    }
    if (stat.isSymbolicLink()) {
        throw new Error(`${label} must not be a symlink`);
    }
    if (!stat.isDirectory()) {
        throw new Error(`${label} must be a directory`);
    }
    const realDir = (0, node_fs_1.realpathSync)(lexicalPath);
    assertStrictlyInside(realUserRoot, realDir, `${label} must stay inside user root`);
    return realDir;
}
/**
 * Fail closed if `<userRoot>/codex-sessions` or `.../accounts` is a
 * symlink/junction, or if a real directory's realpath escapes the real user
 * root. userRoot itself may resolve through a user-selected symlink.
 */
function assertSafeSessionLayout(userRoot) {
    const realUserRoot = realUserRootOf(userRoot);
    const realSessionsRoot = assertSafeStructuralDir(realUserRoot, sessionsRoot(userRoot), ["codex-sessions"], "session root");
    const realAccountsRoot = assertSafeStructuralDir(realUserRoot, accountsRoot(userRoot), ["codex-sessions", "accounts"], "accounts root");
    assertStrictlyInside(realUserRoot, realAccountsRoot, "accounts root must stay inside user root");
    return { realUserRoot, realSessionsRoot, realAccountsRoot };
}
function mkdirRealDir(path) {
    if (lstatIfExists(path))
        return;
    (0, node_fs_1.mkdirSync)(path, { recursive: true });
}
/**
 * Create missing structural dirs as real directories, then re-lstat so a
 * TOCTOU replace with a symlink/junction cannot be written through.
 */
function ensureSafeSessionLayout(userRoot) {
    assertSafeSessionLayout(userRoot);
    mkdirRealDir(sessionsRoot(userRoot));
    assertSafeSessionLayout(userRoot);
    mkdirRealDir(accountsRoot(userRoot));
    return assertSafeSessionLayout(userRoot);
}
function sessionDirUnderLayout(layout, id) {
    (0, ids_1.assertSessionId)(id);
    const dir = (0, node_path_1.join)(layout.realAccountsRoot, id);
    assertStrictlyInside(layout.realAccountsRoot, dir, "session path must stay inside accounts root");
    return dir;
}
function assertSafeExistingSessionDir(layout, dir) {
    const stat = lstatIfExists(dir);
    if (!stat)
        return dir;
    if (stat.isSymbolicLink()) {
        throw new Error("session directory must not be a symlink");
    }
    if (!stat.isDirectory()) {
        throw new Error("session path must be a directory");
    }
    const realDir = (0, node_fs_1.realpathSync)(dir);
    assertStrictlyInside(layout.realAccountsRoot, realDir, "session path must stay inside accounts root");
    return realDir;
}
function sessionDir(userRoot, id) {
    const layout = assertSafeSessionLayout(userRoot);
    const dir = sessionDirUnderLayout(layout, id);
    return assertSafeExistingSessionDir(layout, dir);
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
        (0, node_path_1.resolve)(accountsRoot(userRoot)),
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
    try {
        out.push((0, node_fs_1.realpathSync)(userRoot));
    }
    catch {
        // userRoot may not exist yet
    }
    return [...new Set(out)];
}
function isForbiddenSessionDeleteTarget(userRoot, target) {
    const resolved = (0, node_path_1.resolve)(target);
    const forbidden = collectForbiddenDeleteTargets(userRoot);
    if (forbidden.includes(resolved))
        return true;
    try {
        return forbidden.includes((0, node_fs_1.realpathSync)(target));
    }
    catch {
        return false;
    }
}
function rmSessionDir(userRoot, id) {
    (0, ids_1.assertSessionId)(id);
    const layout = assertSafeSessionLayout(userRoot);
    const dir = sessionDirUnderLayout(layout, id);
    const stat = lstatIfExists(dir);
    if (!stat)
        return;
    if (stat.isSymbolicLink()) {
        throw new Error("session directory must not be a symlink");
    }
    if (!stat.isDirectory()) {
        throw new Error("session path must be a directory");
    }
    const realDir = (0, node_fs_1.realpathSync)(dir);
    assertStrictlyInside(layout.realAccountsRoot, realDir, "refusing to delete path outside accounts root");
    if (isForbiddenSessionDeleteTarget(userRoot, realDir)) {
        throw new Error("refusing to delete protected path");
    }
    (0, node_fs_1.rmSync)(realDir, { recursive: true, force: true });
}
//# sourceMappingURL=paths.js.map