const FLOATING_REFS = new Set(["main", "master", "head"]);

export function isFloatingGitRef(ref: string): boolean {
  return FLOATING_REFS.has(ref.trim().toLowerCase());
}

export function allowUnpinnedInstall(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  return env.CODEX_PLUSPLUS_ALLOW_UNPINNED === "1";
}

export function assertPinnedInstallRef(ref: string, allowUnpinned = false): void {
  if (isFloatingGitRef(ref) && !allowUnpinned) {
    throw new Error(`floating git ref is not allowed: ${ref}`);
  }
}

export function isLayerAutoUpdateEnabled(value: boolean | undefined | null): boolean {
  return value === true;
}

export function lockfileFallbackPolicy(): "fail-closed" {
  return "fail-closed";
}
