import { chmodSync, existsSync, mkdirSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import kleur from "kleur";

const COMMANDS = ["chatgpt-layer", "cgl", "codexplusplus", "codex-plusplus"] as const;

export interface CliShimResult {
  shimDir: string;
  pathDir: string | null;
  commands: readonly string[];
  managedBy?: "homebrew";
}

export function installCliShims(shimDir: string): CliShimResult {
  mkdirSync(shimDir, { recursive: true });
  for (const command of COMMANDS) {
    writeShim(join(shimDir, command));
  }

  if (isHomebrewCli()) {
    return { shimDir, pathDir: null, commands: COMMANDS, managedBy: "homebrew" };
  }

  const pathDir = installIntoPath(shimDir);
  return { shimDir, pathDir, commands: COMMANDS };
}

export function formatCliShimResult(result: CliShimResult): string {
  const command = kleur.cyan("chatgpt-layer");
  if (result.managedBy === "homebrew") {
    return `Installed CLI: ${command} (Homebrew)`;
  }
  if (result.pathDir) {
    return `Installed CLI: ${command} (${result.pathDir})`;
  }
  return (
    `Installed CLI shims to ${kleur.cyan(result.shimDir)}. ` +
    `Add that directory to PATH to run ${command} from any terminal.`
  );
}

function writeShim(path: string): void {
  if (platform() === "win32") {
    writeFileSync(
      `${path}.cmd`,
      `@echo off\r\n"${process.execPath}" "${currentCliPath()}" %*\r\n`,
      "utf8",
    );
    return;
  }

  writeFileSync(
    path,
    `#!/bin/sh\nexec "${process.execPath}" "${currentCliPath()}" "$@"\n`,
    "utf8",
  );
  chmodSync(path, 0o755);
}

function writeShimFile(path: string): void {
  if (platform() === "win32") {
    writeFileSync(
      path,
      `@echo off\r\n"${process.execPath}" "${currentCliPath()}" %*\r\n`,
      "utf8",
    );
    return;
  }
  writeFileSync(
    path,
    `#!/bin/sh\nexec "${process.execPath}" "${currentCliPath()}" "$@"\n`,
    "utf8",
  );
  chmodSync(path, 0o755);
}

function installIntoPath(shimDir: string): string | null {
  const targetDir = selectWritablePathDir();
  if (!targetDir) return null;
  mkdirSync(targetDir, { recursive: true });

  for (const command of COMMANDS) {
    const source = platform() === "win32" ? join(shimDir, `${command}.cmd`) : join(shimDir, command);
    const target = platform() === "win32" ? join(targetDir, `${command}.cmd`) : join(targetDir, command);
    replaceSymlink(source, target);
  }
  return targetDir;
}

function selectWritablePathDir(): string | null {
  const pathDirs = (process.env.PATH ?? "")
    .split(platform() === "win32" ? ";" : ":")
    .filter(Boolean);

  const preferred = platform() === "win32"
    ? [
        join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Microsoft", "WindowsApps"),
      ]
    : [
        "/opt/homebrew/bin",
        "/usr/local/bin",
        join(homedir(), ".local", "bin"),
        join(homedir(), "bin"),
      ];

  for (const dir of preferred.filter((dir) => pathDirs.includes(dir))) {
    if (isWritableDir(dir)) return dir;
  }

  const fallback = platform() === "win32"
    ? join(process.env.LOCALAPPDATA ?? join(homedir(), "AppData", "Local"), "Microsoft", "WindowsApps")
    : join(homedir(), ".local", "bin");
  return isWritableDir(dirname(fallback)) || ensureDir(fallback) ? fallback : null;
}

function ensureDir(path: string): boolean {
  try {
    mkdirSync(path, { recursive: true });
    return isWritableDir(path);
  } catch {
    return false;
  }
}

function isWritableDir(path: string): boolean {
  try {
    mkdirSync(path, { recursive: true });
    const probe = join(path, `.codexpp-${process.pid}`);
    writeFileSync(probe, "");
    unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
}

function replaceSymlink(source: string, target: string): void {
  try {
    unlinkSync(target);
  } catch {}
  try {
    symlinkSync(source, target, platform() === "win32" ? "file" : undefined);
  } catch {
    writeShimFile(target);
  }
}

function currentCliPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "cli.js");
}

function isHomebrewCli(): boolean {
  return /\/(?:Homebrew|homebrew)\/Cellar\/codexplusplus\//.test(currentCliPath());
}
