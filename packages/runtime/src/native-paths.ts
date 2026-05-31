import { realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export function resolveNativeTweakPath(tweakDir: string, path: string): string {
  if (typeof path !== "string" || path.trim() === "") throw new Error("native path is required");
  const root = realpathSync(tweakDir);
  const full = resolve(tweakDir, path);
  let target: string;
  try {
    target = realpathSync(full);
  } catch {
    throw new Error("native path does not exist");
  }
  if (!isPathInside(root, target) || target === root) {
    throw new Error("native path must stay inside the tweak directory");
  }
  return target;
}

export function isPathInside(parent: string, target: string): boolean {
  const rel = relative(resolve(parent), resolve(target));
  return rel === "" || (!!rel && !rel.startsWith("..") && !isAbsolute(rel));
}
