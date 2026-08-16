"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSharedChildProcessModule = getSharedChildProcessModule;
/**
 * Obtain the shared Node CommonJS `child_process` export.
 *
 * Do not use `import * as child_process` / ESM namespace objects. esbuild's
 * `__toESM(require("node:child_process"))` copies `spawn` onto getter-only
 * properties, so assigning `.spawn` either throws or patches a wrapper that
 * later `require("node:child_process").spawn` never sees.
 */
const node_module_1 = require("node:module");
function getSharedChildProcessModule(fromFile = __filename) {
    try {
        const require = (0, node_module_1.createRequire)(fromFile);
        const exported = require("node:child_process");
        if (!exported || typeof exported.spawn !== "function")
            return null;
        return exported;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=child-process-module.js.map