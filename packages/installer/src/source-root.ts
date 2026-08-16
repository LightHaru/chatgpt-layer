import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

interface PackageJson {
  name?: string;
  workspaces?: unknown;
  bin?: unknown;
}

function readPackageJson(dir: string): PackageJson | null {
  const pkgPath = join(dir, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    return JSON.parse(readFileSync(pkgPath, "utf8")) as PackageJson;
  } catch {
    return null;
  }
}

function isInstallerPackage(pkg: PackageJson): boolean {
  if (pkg.name === "chatgpt-layer" || pkg.name === "codex-plusplus") return true;
  if (pkg.bin && typeof pkg.bin === "object" && pkg.bin !== null && !Array.isArray(pkg.bin)) {
    return "chatgpt-layer" in pkg.bin || "codexplusplus" in pkg.bin;
  }
  return false;
}

export function findSourceRoot(start: string): string {
  let dir = resolve(start);
  let installerPackageDir: string | null = null;
  for (let i = 0; i < 10; i++) {
    const pkg = readPackageJson(dir);
    if (pkg) {
      if (Array.isArray(pkg.workspaces)) return dir;
      if (!installerPackageDir && isInstallerPackage(pkg)) installerPackageDir = dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (installerPackageDir) return installerPackageDir;
  return resolve(start, "..", "..", "..", "..");
}

export type InstallationSourceKind = "github-source" | "homebrew" | "local-dev" | "registry" | "source-archive" | "unknown";

export interface InstallationSource {
  kind: InstallationSourceKind;
  label: string;
  detail: string;
}

export function describeInstallationSource(sourceRoot: string | null | undefined): InstallationSource {
  if (!sourceRoot) {
    return {
      kind: "unknown",
      label: "Unknown",
      detail: "Codex++ source location is not recorded yet. Run codexplusplus install or repair.",
    };
  }

  const normalized = sourceRoot.replace(/\\/g, "/");
  if (/\/(?:Homebrew|homebrew)\/Cellar\/codexplusplus\//.test(normalized)) {
    return { kind: "homebrew", label: "Homebrew", detail: sourceRoot };
  }
  if (existsSync(join(sourceRoot, ".git"))) {
    return { kind: "local-dev", label: "Local development checkout", detail: sourceRoot };
  }
  if (normalized.endsWith("/.codex-plusplus/source") || normalized.includes("/.codex-plusplus/source/")) {
    return { kind: "github-source", label: "GitHub source installer", detail: sourceRoot };
  }
  if (existsSync(join(sourceRoot, "package.json"))) {
    const pkg = readPackageJson(sourceRoot);
    if (pkg && isInstallerPackage(pkg) && !Array.isArray(pkg.workspaces)) {
      return { kind: "registry", label: "Registry package", detail: sourceRoot };
    }
    return { kind: "source-archive", label: "Source archive", detail: sourceRoot };
  }
  return { kind: "unknown", label: "Unknown", detail: sourceRoot };
}
