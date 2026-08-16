/**
 * Obtain the shared Node CommonJS `child_process` export.
 *
 * Do not use `import * as child_process` / ESM namespace objects. esbuild's
 * `__toESM(require("node:child_process"))` copies `spawn` onto getter-only
 * properties, so assigning `.spawn` either throws or patches a wrapper that
 * later `require("node:child_process").spawn` never sees.
 */
import { createRequire } from "node:module";
import type { SpawnModule } from "./types";

export function getSharedChildProcessModule(fromFile: string = __filename): SpawnModule | null {
  try {
    const require = createRequire(fromFile);
    const exported = require("node:child_process") as SpawnModule | null;
    if (!exported || typeof exported.spawn !== "function") return null;
    return exported;
  } catch {
    return null;
  }
}
