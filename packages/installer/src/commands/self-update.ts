import kleur from "kleur";
import {
  chmodSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  renameSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { spawnSync } from "node:child_process";
import { extract as extractTar } from "tar";
import { ensureUserPaths } from "../paths.js";
import { CODEX_PLUSPLUS_VERSION, compareSemver } from "../version.js";
import { describeInstallationSource, findSourceRoot } from "../source-root.js";
import {
  readSelfUpdateState,
  type SelfUpdateChannel,
  type SelfUpdateState,
  writeSelfUpdateState,
} from "../self-update-state.js";
import {
  allowUnpinnedInstall,
  assertPinnedInstallRef,
  isLayerAutoUpdateEnabled,
} from "../release-pin.js";

interface Opts {
  repo?: string;
  ref?: string;
  repair?: boolean;
  quiet?: boolean;
  watcher?: boolean;
  force?: boolean;
}

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  body?: string;
  draft?: boolean;
  prerelease?: boolean;
}

interface RuntimeConfig {
  codexPlusPlus?: {
    autoUpdate?: boolean;
    updateChannel?: SelfUpdateChannel;
    updateRepo?: string;
    updateRef?: string;
  };
}

interface UpdateTarget {
  ref: string;
  version: string | null;
  releaseUrl: string | null;
  source: "explicit-ref" | "latest-release";
  channel: SelfUpdateChannel;
}

const here = dirname(fileURLToPath(import.meta.url));
const WATCHER_SELF_UPDATE_INTERVAL_MS = 60 * 60 * 1000;
const COMMAND_OUTPUT_TAIL_CHARS = 8_000;

interface RunOptions {
  quiet?: boolean;
}

export interface CommandResult {
  status: number;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  error?: Error;
}

export async function selfUpdate(opts: Opts = {}): Promise<void> {
  const paths = ensureUserPaths();
  const config = readRuntimeConfig(paths.configFile);
  const repo = opts.repo ?? process.env.CHATGPT_LAYER_REPO ?? process.env.CODEX_PLUSPLUS_REPO ?? config.updateRepo ?? "LightHaru/chatgpt-layer";
  const sourceRoot = findSourceRoot(here);
  const parent = dirname(sourceRoot);
  const work = mkdtempSync(join(tmpdir(), "codexpp-update-"));
  const archive = join(work, "source.tar.gz");
  const next = join(work, "source");
  const previous = `${sourceRoot}.previous`;
  let target: UpdateTarget | null = null;

  try {
    try {
      if (opts.watcher && !isLayerAutoUpdateEnabled(config.autoUpdate)) {
        writeSelfUpdateState(paths.selfUpdateStateFile, selfUpdateState({
          status: "disabled",
          repo,
          channel: config.updateChannel ?? "stable",
          sourceRoot,
        }));
        log(opts, "Codex++ auto-update is disabled; running repair only.");
        runRepairIfRequested(opts, sourceRoot, parent);
        return;
      }

      if (opts.watcher && !opts.force && !shouldRunWatcherSelfUpdate(paths.selfUpdateStateFile)) {
        log(opts, "Codex++ release check skipped; running repair only.");
        runRepairIfRequested(opts, sourceRoot, parent);
        return;
      }

      writeSelfUpdateState(paths.selfUpdateStateFile, selfUpdateState({
        status: "checking",
        repo,
        channel: config.updateChannel ?? "stable",
        sourceRoot,
      }));

      target = await resolveUpdateTarget(repo, opts, config);
      if (!shouldDownloadSelfUpdate(CODEX_PLUSPLUS_VERSION, target.ref, opts.force === true)) {
        writeSelfUpdateState(paths.selfUpdateStateFile, selfUpdateState({
          status: "up-to-date",
          repo,
          channel: target.channel,
          sourceRoot,
          target,
        }));
        log(opts, `Codex++ is already up to date (${CODEX_PLUSPLUS_VERSION}).`);
        runRepairIfRequested(opts, sourceRoot, parent);
        return;
      }

      log(opts, `Downloading codex-plusplus from https://github.com/${repo} (${target.ref})...`);
      await download(`https://codeload.github.com/${repo}/tar.gz/${target.ref}`, archive);
      mkdirSync(next, { recursive: true });
      await extractTar({ file: archive, cwd: next, strip: 1 });

      verifyDownloadedVersion(next, target);
      installDependencies(next, opts);
      run(npmCommand(), ["run", "build"], next, opts);

      rmSync(previous, { recursive: true, force: true });
      if (existsSync(sourceRoot)) renameSync(sourceRoot, previous);
      renameSync(next, sourceRoot);
      ensureCliExecutable(sourceRoot);
      refreshMovedWorkspaceLinks(sourceRoot);
      writeSelfUpdateState(paths.selfUpdateStateFile, selfUpdateState({
        status: "updated",
        repo,
        channel: target.channel,
        sourceRoot,
        target,
      }));
      log(opts, kleur.green(`Updated codex-plusplus source at ${sourceRoot}`));

      try {
        runRepairIfRequested(opts, sourceRoot, parent);
      } catch (e) {
        rollbackSource(sourceRoot, previous);
        throw e;
      }
    } catch (e) {
      writeSelfUpdateState(paths.selfUpdateStateFile, selfUpdateState({
        status: "failed",
        repo,
        channel: target?.channel ?? config.updateChannel ?? "stable",
        sourceRoot,
        target,
        error: e instanceof Error ? e.message : String(e),
      }));
      throw e;
    }
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

async function resolveUpdateTarget(
  repo: string,
  opts: Opts,
  config: NonNullable<RuntimeConfig["codexPlusPlus"]>,
): Promise<UpdateTarget> {
  const explicitRef =
    opts.ref ?? process.env.CODEX_PLUSPLUS_REF ?? (config.updateChannel === "custom" ? config.updateRef : undefined);
  if (explicitRef) {
    assertPinnedInstallRef(explicitRef, allowUnpinnedInstall());
    return {
      ref: explicitRef,
      version: releaseVersionFromTag(explicitRef),
      releaseUrl: null,
      source: "explicit-ref",
      channel: "custom",
    };
  }

  const channel = config.updateChannel === "prerelease" ? "prerelease" : "stable";
  const latest = channel === "prerelease"
    ? await fetchLatestAnyRelease(repo)
    : await fetchLatestRelease(repo);
  if (!latest.tag_name) throw new Error(`Latest release for ${repo} did not include a tag`);
  return {
    ref: latest.tag_name,
    version: releaseVersionFromTag(latest.tag_name),
    releaseUrl: latest.html_url ?? null,
    source: "latest-release",
    channel,
  };
}

async function fetchLatestRelease(repo: string): Promise<GitHubRelease> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { "User-Agent": "codex-plusplus-self-update" },
  });
  if (!res.ok) throw new Error(`Release check failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as GitHubRelease;
}

async function fetchLatestAnyRelease(repo: string): Promise<GitHubRelease> {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=20`, {
    headers: { "User-Agent": "codex-plusplus-self-update" },
  });
  if (!res.ok) throw new Error(`Release check failed: ${res.status} ${res.statusText}`);
  const releases = (await res.json()) as GitHubRelease[];
  const release = releases.find((r) => !r.draft);
  if (!release) throw new Error(`No published releases found for ${repo}`);
  return release;
}

async function download(url: string, target: string): Promise<void> {
  const res = await fetch(url, {
    headers: { "User-Agent": "codex-plusplus-self-update" },
  });
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  await pipeline(res.body, createWriteStream(target));
}

export function shouldDownloadSelfUpdate(
  currentVersion: string,
  targetRef: string,
  force = false,
): boolean {
  if (force) return true;
  const targetVersion = releaseVersionFromTag(targetRef);
  if (!targetVersion) return true;
  return compareSemver(targetVersion, currentVersion) > 0;
}

export function shouldRunWatcherSelfUpdate(stateFile: string, now = Date.now()): boolean {
  const state = readSelfUpdateState(stateFile);
  if (!state) return true;
  const checkedAt = Date.parse(state.checkedAt);
  return !Number.isFinite(checkedAt) || now - checkedAt >= WATCHER_SELF_UPDATE_INTERVAL_MS;
}

export function ensureCliExecutable(sourceRoot: string): void {
  if (process.platform === "win32") return;
  chmodSync(join(sourceRoot, "packages", "installer", "dist", "cli.js"), 0o755);
}

export function releaseVersionFromTag(ref: string): string | null {
  return /^v?\d+\.\d+\.\d+(?:[-+].*)?$/.test(ref) ? ref.replace(/^v/, "") : null;
}

function verifyDownloadedVersion(sourceDir: string, target: UpdateTarget): void {
  if (!target.version) return;
  const packageVersion = readPackageVersion(sourceDir);
  if (!packageVersion) throw new Error("Downloaded source is missing package.json version");
  if (compareSemver(packageVersion, target.version) !== 0) {
    throw new Error(
      `Downloaded source version ${packageVersion} does not match ${target.ref}`,
    );
  }
}

function readPackageVersion(sourceDir: string): string | null {
  try {
    const pkg = JSON.parse(readFileSync(join(sourceDir, "package.json"), "utf8")) as {
      version?: unknown;
    };
    return typeof pkg.version === "string" ? pkg.version : null;
  } catch {
    return null;
  }
}

function readRuntimeConfig(configFile: string): NonNullable<RuntimeConfig["codexPlusPlus"]> {
  if (!existsSync(configFile)) return {};
  try {
    const config = JSON.parse(readFileSync(configFile, "utf8")) as RuntimeConfig;
    return config.codexPlusPlus ?? {};
  } catch {
    return {};
  }
}

function selfUpdateState(opts: {
  status: SelfUpdateState["status"];
  repo: string;
  channel: SelfUpdateChannel;
  sourceRoot: string;
  target?: UpdateTarget | null;
  error?: string;
}): SelfUpdateState {
  const now = new Date().toISOString();
  return {
    checkedAt: now,
    completedAt: opts.status === "checking" ? undefined : now,
    status: opts.status,
    currentVersion: CODEX_PLUSPLUS_VERSION,
    latestVersion: opts.target?.version ?? null,
    targetRef: opts.target?.ref ?? null,
    releaseUrl: opts.target?.releaseUrl ?? null,
    repo: opts.repo,
    channel: opts.channel,
    sourceRoot: opts.sourceRoot,
    installationSource: describeInstallationSource(opts.sourceRoot),
    ...(opts.error ? { error: opts.error } : {}),
  };
}

function installDependencies(cwd: string, opts: RunOptions = {}): void {
  if (!existsSync(join(cwd, "package-lock.json"))) {
    throw new Error("lockfile required");
  }
  const ci = runMaybe(npmCommand(), ["ci", "--workspaces", "--include-workspace-root", "--ignore-scripts"], cwd, opts);
  if (ci.status === 0) return;
  throw new Error("dependency install failed");
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function refreshMovedWorkspaceLinks(sourceRoot: string): void {
  if (process.platform !== "win32") return;
  installDependencies(sourceRoot);
}

function runRepairIfRequested(opts: Opts, sourceRoot: string, cwd: string): void {
  if (opts.repair === false) return;
  const cli = join(sourceRoot, "packages", "installer", "dist", "cli.js");
  const args = [cli, "repair"];
  if (opts.watcher) args.push("--watcher");
  if (opts.quiet) args.push("--quiet");
  run(process.execPath, args, cwd, opts);
}

function run(command: string, args: string[], cwd: string, opts: RunOptions = {}): void {
  const result = runMaybe(command, args, cwd, opts);
  if (result.status !== 0) throw new Error(formatCommandFailure(command, args, result));
}

function runMaybe(command: string, args: string[], cwd: string, opts: RunOptions = {}): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  });
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  if (!opts.quiet) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }
  return {
    status: result.status ?? 1,
    signal: result.signal,
    stdout,
    stderr,
    error: result.error,
  };
}

export function formatCommandFailure(command: string, args: string[], result: CommandResult): string {
  const status = result.signal ? `signal ${result.signal}` : `exit code ${result.status}`;
  const details = result.error ? ` (${result.error.message})` : "";
  const output = commandOutputTail(result);
  return [
    `${formatCommand(command, args)} failed with ${status}${details}`,
    output ? `Command output:\n${output}` : null,
  ].filter(Boolean).join("\n\n");
}

function commandOutputTail(result: CommandResult): string {
  const parts = [
    ["stderr", result.stderr] as const,
    ["stdout", result.stdout] as const,
  ].flatMap(([name, value]) => {
    const text = value.trim();
    if (!text) return [];
    return [`${name}:\n${tail(text, COMMAND_OUTPUT_TAIL_CHARS)}`];
  });
  return parts.join("\n\n");
}

function tail(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `[last ${maxChars} chars]\n${text.slice(-maxChars)}`;
}

function formatCommand(command: string, args: string[]): string {
  return [command, ...args].map(shellQuoteArg).join(" ");
}

function shellQuoteArg(value: string): string {
  if (/^[A-Za-z0-9_./:=@%+-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function rollbackSource(sourceRoot: string, previous: string): void {
  if (!existsSync(previous)) return;
  const failed = `${sourceRoot}.failed`;
  rmSync(failed, { recursive: true, force: true });
  if (existsSync(sourceRoot)) renameSync(sourceRoot, failed);
  renameSync(previous, sourceRoot);
}

function isAutoUpdateEnabled(configFile: string): boolean {
  if (!existsSync(configFile)) return false;
  try {
    const config = JSON.parse(readFileSync(configFile, "utf8")) as RuntimeConfig;
    return isLayerAutoUpdateEnabled(config.codexPlusPlus?.autoUpdate);
  } catch {
    return false;
  }
}

function log(opts: Opts, message: string): void {
  if (!opts.quiet) console.log(message);
}
