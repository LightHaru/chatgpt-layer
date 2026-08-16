import { basename as posixBasename, isAbsolute as posixIsAbsolute, relative as posixRelative } from "node:path/posix";
import { basename as win32Basename, isAbsolute as win32IsAbsolute, relative as win32Relative } from "node:path/win32";
import type {
  ClassifySpawnResult,
  DesktopStdioTransportMode,
  PathIo,
} from "./types";

const CODEX_BASENAME_RE = /^(codex)(\.exe)?$/i;

export function isAppServerProbeEnabled(env: NodeJS.ProcessEnv | undefined): boolean {
  return env?.CODEXPP_APP_SERVER_PROBE === "1";
}

export function looksLikeCodexRuntimeBasename(name: string | null | undefined): boolean {
  if (typeof name !== "string" || name.length === 0) return false;
  return CODEX_BASENAME_RE.test(name);
}

export function commandBasename(command: string, platform: NodeJS.Platform): string {
  return platform === "win32" ? win32Basename(command) : posixBasename(command);
}

/**
 * Skip Layer-recognized config prefixes. Values are discarded and must never
 * be logged. Discovery only; Desktop argv is not rewritten.
 */
export function skipConfigPrefixes(argv: readonly string[]): string[] {
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--config" || token === "-c") {
      i += 1;
      continue;
    }
    rest.push(token);
  }
  return rest;
}

export function detectAppServerSubcommand(argv: readonly string[]): boolean {
  return skipConfigPrefixes(argv).includes("app-server");
}

export function detectStdioTransport(argv: readonly string[]): DesktopStdioTransportMode | null {
  const tokens = skipConfigPrefixes(argv);
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token === "--stdio") return "stdio-flag";
    if (token === "--listen") {
      const value = tokens[i + 1];
      if (typeof value === "string" && value.toLowerCase() === "stdio://") {
        return "listen-stdio";
      }
    }
  }
  return null;
}

export function isPathInsideRoot(
  parent: string,
  target: string,
  platform: NodeJS.Platform,
): boolean {
  const relative = platform === "win32" ? win32Relative : posixRelative;
  const isAbs = platform === "win32" ? win32IsAbsolute : posixIsAbsolute;
  const from = platform === "win32" ? parent.toLowerCase() : parent;
  const to = platform === "win32" ? target.toLowerCase() : target;
  const rel = relative(from, to);
  if (rel === "") return true;
  if (!rel || rel.startsWith("..") || isAbs(rel)) return false;
  return !rel.split(/[/\\]/).includes("..");
}

export function resolveTrustedCommandPath(
  command: string,
  trustedRoots: readonly string[],
  platform: NodeJS.Platform,
  io: PathIo,
): { trusted: boolean; relativeResourcePath: string | null } {
  if (typeof command !== "string" || command.length === 0) {
    return { trusted: false, relativeResourcePath: null };
  }
  let resolved: string;
  try {
    resolved = io.realpathSync(command);
  } catch {
    return { trusted: false, relativeResourcePath: null };
  }
  const relative = platform === "win32" ? win32Relative : posixRelative;
  for (const root of trustedRoots) {
    if (typeof root !== "string" || root.length === 0) continue;
    let resolvedRoot: string;
    try {
      resolvedRoot = io.realpathSync(root);
    } catch {
      continue;
    }
    if (!isPathInsideRoot(resolvedRoot, resolved, platform)) continue;
    const rel = relative(
      platform === "win32" ? resolvedRoot.toLowerCase() : resolvedRoot,
      platform === "win32" ? resolved.toLowerCase() : resolved,
    );
    if (!rel || rel.startsWith("..") || rel.includes("..")) {
      return { trusted: true, relativeResourcePath: null };
    }
    return { trusted: true, relativeResourcePath: rel.replace(/\\/g, "/") };
  }
  return { trusted: false, relativeResourcePath: null };
}

export function extractSpawnCommandAndArgv(callArgs: unknown[]): {
  command: unknown;
  argv: unknown;
} {
  const command = callArgs[0];
  const second = callArgs[1];
  if (Array.isArray(second)) return { command, argv: second };
  return { command, argv: [] };
}

export function asStringArgv(argv: unknown): string[] | null {
  if (!Array.isArray(argv)) return null;
  const out: string[] = [];
  for (const item of argv) {
    if (typeof item !== "string") return null;
    out.push(item);
  }
  return out;
}

export function classifySpawnCall(opts: {
  callArgs: unknown[];
  trustedRoots: readonly string[];
  platform: NodeJS.Platform;
  io: PathIo;
}): ClassifySpawnResult {
  const empty: ClassifySpawnResult = {
    candidate: false,
    trustedExecutable: false,
    appServerSubcommand: false,
    transportMode: null,
    executableBasename: null,
    relativeResourcePath: null,
    argumentCount: null,
  };
  const { command, argv } = extractSpawnCommandAndArgv(opts.callArgs);
  const strings = asStringArgv(argv);
  const argumentCount = strings ? strings.length : Array.isArray(argv) ? argv.length : null;
  if (typeof command !== "string" || command.length === 0) {
    return { ...empty, argumentCount };
  }
  const executableBasename = commandBasename(command, opts.platform);
  const looksCodex = looksLikeCodexRuntimeBasename(executableBasename);
  const { trusted, relativeResourcePath } = looksCodex
    ? resolveTrustedCommandPath(command, opts.trustedRoots, opts.platform, opts.io)
    : { trusted: false, relativeResourcePath: null };
  const appServerSubcommand = strings ? detectAppServerSubcommand(strings) : false;
  const transportMode = strings && appServerSubcommand ? detectStdioTransport(strings) : null;
  const candidate = Boolean(
    looksCodex && trusted && appServerSubcommand && transportMode !== null,
  );
  return {
    candidate,
    trustedExecutable: trusted,
    appServerSubcommand,
    transportMode,
    executableBasename,
    relativeResourcePath: trusted ? relativeResourcePath : null,
    argumentCount,
  };
}
