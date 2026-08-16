"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tweakDataDir = tweakDataDir;
exports.ensureTweakDataDir = ensureTweakDataDir;
exports.resolveTweakDataPath = resolveTweakDataPath;
/**
 * Per-tweak filesystem sandbox. Tweaks may only read/write under
 * `<userRoot>/tweak-data/<tweakId>/`. Identity is bound by the caller;
 * this helper never trusts a path that escapes that directory.
 */
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const native_paths_1 = require("./native-paths");
const tweak_permissions_1 = require("./tweak-permissions");
function tweakDataDir(userRoot, tweakId) {
    (0, tweak_permissions_1.assertValidTweakId)(tweakId);
    return (0, node_path_1.join)(userRoot, "tweak-data", tweakId);
}
function ensureTweakDataDir(userRoot, tweakId) {
    const dir = tweakDataDir(userRoot, tweakId);
    (0, node_fs_1.mkdirSync)(dir, { recursive: true });
    return dir;
}
function resolveTweakDataPath(userRoot, tweakId, relPath) {
    const dir = tweakDataDir(userRoot, tweakId);
    const full = (0, node_path_1.resolve)(dir, relPath);
    if (!(0, native_paths_1.isPathInside)(dir, full) || full === dir)
        throw new Error("path traversal");
    return { dir, full };
}
//# sourceMappingURL=tweak-fs-sandbox.js.map