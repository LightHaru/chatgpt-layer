import { existsSync, lstatSync, mkdirSync, realpathSync, rmSync, type Stats } from "node:fs";
import { join, resolve } from "node:path";
import { isPathInside } from "../native-paths";
import { assertSessionId } from "./ids";

export interface SafeSessionLayout {
  realUserRoot: string;
  realSessionsRoot: string;
  realAccountsRoot: string;
}

export function sessionsRoot(userRoot: string): string {
  return join(userRoot, "codex-sessions");
}

export function accountsRoot(userRoot: string): string {
  return join(sessionsRoot(userRoot), "accounts");
}

function lstatIfExists(path: string): Stats | null {
  try {
    return lstatSync(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw error;
  }
}

function realUserRootOf(userRoot: string): string {
  try {
    return realpathSync(userRoot);
  } catch {
    return resolve(userRoot);
  }
}

function assertStrictlyInside(parent: string, child: string, message: string): void {
  if (!isPathInside(parent, child) || child === parent) {
    throw new Error(message);
  }
}

function assertSafeStructuralDir(
  realUserRoot: string,
  lexicalPath: string,
  relativeParts: readonly string[],
  label: string,
): string {
  const stat = lstatIfExists(lexicalPath);
  if (!stat) {
    const intended = join(realUserRoot, ...relativeParts);
    assertStrictlyInside(realUserRoot, intended, `${label} must stay inside user root`);
    return intended;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`${label} must be a directory`);
  }
  const realDir = realpathSync(lexicalPath);
  assertStrictlyInside(realUserRoot, realDir, `${label} must stay inside user root`);
  return realDir;
}

/**
 * Fail closed if `<userRoot>/codex-sessions` or `.../accounts` is a
 * symlink/junction, or if a real directory's realpath escapes the real user
 * root. userRoot itself may resolve through a user-selected symlink.
 */
export function assertSafeSessionLayout(userRoot: string): SafeSessionLayout {
  const realUserRoot = realUserRootOf(userRoot);
  const realSessionsRoot = assertSafeStructuralDir(
    realUserRoot,
    sessionsRoot(userRoot),
    ["codex-sessions"],
    "session root",
  );
  const realAccountsRoot = assertSafeStructuralDir(
    realUserRoot,
    accountsRoot(userRoot),
    ["codex-sessions", "accounts"],
    "accounts root",
  );
  assertStrictlyInside(realUserRoot, realAccountsRoot, "accounts root must stay inside user root");
  return { realUserRoot, realSessionsRoot, realAccountsRoot };
}

function mkdirRealDir(path: string): void {
  if (lstatIfExists(path)) return;
  mkdirSync(path, { recursive: true });
}

/**
 * Create missing structural dirs as real directories, then re-lstat so a
 * TOCTOU replace with a symlink/junction cannot be written through.
 */
export function ensureSafeSessionLayout(userRoot: string): SafeSessionLayout {
  assertSafeSessionLayout(userRoot);
  mkdirRealDir(sessionsRoot(userRoot));
  assertSafeSessionLayout(userRoot);
  mkdirRealDir(accountsRoot(userRoot));
  return assertSafeSessionLayout(userRoot);
}

function sessionDirUnderLayout(layout: SafeSessionLayout, id: string): string {
  assertSessionId(id);
  const dir = join(layout.realAccountsRoot, id);
  assertStrictlyInside(layout.realAccountsRoot, dir, "session path must stay inside accounts root");
  return dir;
}

function assertSafeExistingSessionDir(layout: SafeSessionLayout, dir: string): string {
  const stat = lstatIfExists(dir);
  if (!stat) return dir;
  if (stat.isSymbolicLink()) {
    throw new Error("session directory must not be a symlink");
  }
  if (!stat.isDirectory()) {
    throw new Error("session path must be a directory");
  }
  const realDir = realpathSync(dir);
  assertStrictlyInside(layout.realAccountsRoot, realDir, "session path must stay inside accounts root");
  return realDir;
}

export function sessionDir(userRoot: string, id: string): string {
  const layout = assertSafeSessionLayout(userRoot);
  const dir = sessionDirUnderLayout(layout, id);
  return assertSafeExistingSessionDir(layout, dir);
}

export function sessionMetaPath(userRoot: string, id: string): string {
  return join(sessionDir(userRoot, id), "session.json");
}

export function sessionCodexHome(userRoot: string, id: string): string {
  return join(sessionDir(userRoot, id), "codex-home");
}

export function sessionSqliteHome(userRoot: string, id: string): string {
  return join(sessionDir(userRoot, id), "sqlite-home");
}

export function collectForbiddenDeleteTargets(userRoot: string): string[] {
  const out = [
    resolve(userRoot),
    resolve(userRoot, "tweak-data"),
    resolve(userRoot, "tweaks"),
    resolve(userRoot, "runtime"),
    resolve(userRoot, "config.json"),
    resolve(userRoot, "state.json"),
    resolve(sessionsRoot(userRoot)),
    resolve(accountsRoot(userRoot)),
  ];
  if (process.env.HOME) {
    out.push(resolve(process.env.HOME));
    out.push(resolve(process.env.HOME, ".codex"));
  }
  if (process.env.USERPROFILE) {
    out.push(resolve(process.env.USERPROFILE));
    out.push(resolve(process.env.USERPROFILE, ".codex"));
  }
  if (process.env.APPDATA) out.push(resolve(process.env.APPDATA));
  try {
    out.push(realpathSync(userRoot));
  } catch {
    // userRoot may not exist yet
  }
  return [...new Set(out)];
}

export function isForbiddenSessionDeleteTarget(userRoot: string, target: string): boolean {
  const resolved = resolve(target);
  const forbidden = collectForbiddenDeleteTargets(userRoot);
  if (forbidden.includes(resolved)) return true;
  try {
    return forbidden.includes(realpathSync(target));
  } catch {
    return false;
  }
}

export function rmSessionDir(userRoot: string, id: string): void {
  assertSessionId(id);
  const layout = assertSafeSessionLayout(userRoot);
  const dir = sessionDirUnderLayout(layout, id);
  const stat = lstatIfExists(dir);
  if (!stat) return;
  if (stat.isSymbolicLink()) {
    throw new Error("session directory must not be a symlink");
  }
  if (!stat.isDirectory()) {
    throw new Error("session path must be a directory");
  }
  const realDir = realpathSync(dir);
  assertStrictlyInside(
    layout.realAccountsRoot,
    realDir,
    "refusing to delete path outside accounts root",
  );
  if (isForbiddenSessionDeleteTarget(userRoot, realDir)) {
    throw new Error("refusing to delete protected path");
  }
  rmSync(realDir, { recursive: true, force: true });
}
