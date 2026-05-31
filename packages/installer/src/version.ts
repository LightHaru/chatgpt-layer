export const CODEX_PLUSPLUS_VERSION = "1.0.0";

const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export function compareSemver(a: string, b: string): number {
  const av = SEMVER_RE.exec(a);
  const bv = SEMVER_RE.exec(b);
  if (!av || !bv) return a === b ? 0 : 1;
  for (let i = 1; i <= 3; i++) {
    const diff = Number(av[i]) - Number(bv[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}
