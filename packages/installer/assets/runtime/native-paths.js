"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveNativeTweakPath = resolveNativeTweakPath;
exports.isPathInside = isPathInside;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
function resolveNativeTweakPath(tweakDir, path) {
    if (typeof path !== "string" || path.trim() === "")
        throw new Error("native path is required");
    const root = (0, node_fs_1.realpathSync)(tweakDir);
    const full = (0, node_path_1.resolve)(tweakDir, path);
    let target;
    try {
        target = (0, node_fs_1.realpathSync)(full);
    }
    catch {
        throw new Error("native path does not exist");
    }
    if (!isPathInside(root, target) || target === root) {
        throw new Error("native path must stay inside the tweak directory");
    }
    return target;
}
function isPathInside(parent, target) {
    const rel = (0, node_path_1.relative)((0, node_path_1.resolve)(parent), (0, node_path_1.resolve)(target));
    return rel === "" || (!!rel && !rel.startsWith("..") && !(0, node_path_1.isAbsolute)(rel));
}
//# sourceMappingURL=native-paths.js.map