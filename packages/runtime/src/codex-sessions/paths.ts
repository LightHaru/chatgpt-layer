import { existsSync, lstatSync, realpathSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { isPathInside } from "../native-paths";
import { assertSessionId } from "./ids";

export function sessionsRoot(userRoot: string): string {
  return join(userRoot, "codex-sessions");
}

export function accountsRoot(userRoot: string): string {
  return join(sessionsRoot(userRoot), "accounts");
}

function resolvedAccountsRoot(userRoot: string): string {
  return resolve(accountsRoot(userRoot));
}

function assertStrictlyInsideAccountsRoot(userRoot: string, target: string): string {
  const root = resolvedAccountsRoot(userRoot);
  const dir = resolve(target);
  if (!isPathInside(root, dir) || dir === root) {
    throw new Error("session path must stay inside accounts root");
  }
  return dir;
}

export function sessionDir(userRoot: string, id: string): string {
  assertSessionId(id);
  return assertStrictlyInsideAccountsRoot(userRoot, join(resolvedAccountsRoot(userRoot), id));
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
    resolvedAccountsRoot(userRoot),
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
  return [...new Set(out)];
}

export function isForbiddenSessionDeleteTarget(userRoot: string, target: string): boolean {
  const resolved = resolve(target);
  return collectForbiddenDeleteTargets(userRoot).some((path) => path === resolved);
}

export function rmSessionDir(userRoot: string, id: string): void {
  const accounts = resolvedAccountsRoot(userRoot);
  const dir = sessionDir(userRoot, id);
  let target = dir;
  if (existsSync(dir)) {
    const stat = lstatSync(dir);
    target = stat.isSymbolicLink() ? realpathSync(dir) : realpathSync(dir);
  }
  const resolvedAccounts = existsSync(accounts) ? realpathSync(accounts) : accounts;
  if (!isPathInside(resolvedAccounts, target) || target === resolvedAccounts) {
    throw new Error("refusing to delete path outside accounts root");
  }
  if (isForbiddenSessionDeleteTarget(userRoot, target)) {
    throw new Error("refusing to delete protected path");
  }
  rmSync(target, { recursive: true, force: true });
}
