/**
 * Per-tweak filesystem sandbox. Tweaks may only read/write under
 * `<userRoot>/tweak-data/<tweakId>/`. Identity is bound by the caller;
 * this helper never trusts a path that escapes that directory.
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { isPathInside } from "./native-paths";
import { assertValidTweakId } from "./tweak-permissions";

export function tweakDataDir(userRoot: string, tweakId: string): string {
  assertValidTweakId(tweakId);
  return join(userRoot, "tweak-data", tweakId);
}

export function ensureTweakDataDir(userRoot: string, tweakId: string): string {
  const dir = tweakDataDir(userRoot, tweakId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function resolveTweakDataPath(
  userRoot: string,
  tweakId: string,
  relPath: string,
): { dir: string; full: string } {
  const dir = tweakDataDir(userRoot, tweakId);
  const full = resolve(dir, relPath);
  if (!isPathInside(dir, full) || full === dir) throw new Error("path traversal");
  return { dir, full };
}
