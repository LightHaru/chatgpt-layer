import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import type { TweakManifest } from "@codex-plusplus/sdk";
import { assertStoreIndexMatchesPin } from "./tweak-store-integrity";
import {
  normalizeGitHubRepo,
  normalizeStoreRegistry,
  storeArchiveUrl,
  type TweakStorePublishSubmission,
  type TweakStoreEntry,
  type TweakStoreRegistry,
  type TweakStorePlatform,
} from "./tweak-store";
import {
  CODEX_PLUSPLUS_VERSION,
  TWEAK_STORE_INDEX_URL,
  TWEAKS_DIR,
  log,
  runtimeDir,
} from "./runtime-paths";

export const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export interface TweakStoreFetchResult {
  registry: TweakStoreRegistry;
  fetchedAt: string;
}

export interface StoreInstallMetadata {
  repo: string;
  approvedCommitSha: string;
  installedAt: string;
  storeIndexUrl: string;
  files?: Record<string, string>;
}

export interface StoreEntryPlatformCompatibility {
  current: NodeJS.Platform;
  supported: TweakStorePlatform[] | null;
  compatible: boolean;
  reason: string | null;
}

export interface StoreEntryRuntimeCompatibility {
  current: string;
  required: string | null;
  compatible: boolean;
  reason: string | null;
}

export class StoreTweakModifiedError extends Error {
  constructor(tweakName: string) {
    super(
      `${tweakName} has local source changes, so Codex++ can't auto-update it. Revert your local changes or reinstall the tweak manually.`,
    );
    this.name = "StoreTweakModifiedError";
  }
}

export function storeEntryPlatformCompatibility(entry: TweakStoreEntry): StoreEntryPlatformCompatibility {
  const supported = entry.platforms ?? null;
  const compatible = !supported || supported.includes(process.platform as TweakStorePlatform);
  return {
    current: process.platform,
    supported,
    compatible,
    reason: compatible ? null : `${entry.manifest.name} is only available on ${formatStorePlatforms(supported)}.`,
  };
}

export function assertStoreEntryPlatformCompatible(entry: TweakStoreEntry): void {
  const platform = storeEntryPlatformCompatibility(entry);
  if (!platform.compatible) {
    throw new Error(platform.reason ?? `${entry.manifest.name} is not available on this platform.`);
  }
}

export function storeEntryRuntimeCompatibility(entry: TweakStoreEntry): StoreEntryRuntimeCompatibility {
  const required = cleanMinRuntime(entry.manifest.minRuntime);
  const compatible = !required || compareVersions(CODEX_PLUSPLUS_VERSION, required) >= 0;
  return {
    current: CODEX_PLUSPLUS_VERSION,
    required,
    compatible,
    reason: compatible || !required
      ? null
      : `${entry.manifest.name} requires Codex++ ${required} or newer.`,
  };
}

export function assertStoreEntryRuntimeCompatible(entry: TweakStoreEntry): void {
  const runtime = storeEntryRuntimeCompatibility(entry);
  if (!runtime.compatible) {
    throw new Error(runtime.reason ?? `${entry.manifest.name} requires a newer Codex++ runtime.`);
  }
}

export function cleanMinRuntime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const version = normalizeVersion(value.replace(/^>=?\s*/, ""));
  return VERSION_RE.test(version) ? version : null;
}

export function formatStorePlatforms(platforms: TweakStorePlatform[] | null): string {
  if (!platforms || platforms.length === 0) return "supported platforms";
  return platforms.map((platform) => {
    if (platform === "darwin") return "macOS";
    if (platform === "win32") return "Windows";
    return "Linux";
  }).join(", ");
}

export function readBundledStoreRegistry(): TweakStoreRegistry | null {
  const bundled = join(runtimeDir!, "store-index.json");
  if (!existsSync(bundled)) return null;
  try {
    const body = readFileSync(bundled);
    if (!process.env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE) {
      assertStoreIndexMatchesPin(body);
    }
    return normalizeStoreRegistry(JSON.parse(body.toString("utf8")));
  } catch (e) {
    log("warn", "bundled store index rejected:", String((e as Error).message));
    return null;
  }
}

export async function fetchTweakStoreRegistry(): Promise<TweakStoreFetchResult> {
  const fetchedAt = new Date().toISOString();
  const allowOverride = process.env.CODEX_PLUSPLUS_ALLOW_STORE_INDEX_OVERRIDE === "1";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(TWEAK_STORE_INDEX_URL, {
        headers: {
          "Accept": "application/json",
          "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}`,
        },
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`store returned ${res.status}`);
      const body = Buffer.from(await res.arrayBuffer());
      if (!allowOverride) assertStoreIndexMatchesPin(body);
      return {
        registry: normalizeStoreRegistry(JSON.parse(body.toString("utf8"))),
        fetchedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const bundled = readBundledStoreRegistry();
    if (bundled) {
      log("warn", "using bundled store index pin:", error.message);
      return { registry: bundled, fetchedAt };
    }
    log("warn", "failed to fetch tweak store registry:", error.message);
    throw error;
  }
}

export async function installStoreTweak(entry: TweakStoreEntry): Promise<void> {
  const url = storeArchiveUrl(entry);
  const work = mkdtempSync(join(tmpdir(), "codexpp-store-tweak-"));
  const archive = join(work, "source.tar.gz");
  const extractDir = join(work, "extract");
  const target = join(TWEAKS_DIR, entry.id);
  const stagedTarget = join(work, "staged", entry.id);

  try {
    log("info", `installing store tweak ${entry.id} from ${entry.repo}@${entry.approvedCommitSha}`);
    const res = await fetch(url, {
      headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    writeFileSync(archive, bytes);
    mkdirSync(extractDir, { recursive: true });
    extractTarArchive(archive, extractDir);
    const source = findTweakRoot(extractDir);
    if (!source) throw new Error("downloaded archive did not contain manifest.json");
    validateStoreTweakSource(entry, source);
    rmSync(stagedTarget, { recursive: true, force: true });
    copyTweakSource(source, stagedTarget);
    const stagedFiles = hashTweakSource(stagedTarget);
    writeFileSync(
      join(stagedTarget, ".codexpp-store.json"),
      JSON.stringify(
        {
          repo: entry.repo,
          approvedCommitSha: entry.approvedCommitSha,
          installedAt: new Date().toISOString(),
          storeIndexUrl: TWEAK_STORE_INDEX_URL,
          files: stagedFiles,
        },
        null,
        2,
      ),
    );
    await assertStoreTweakCleanForAutoUpdate(entry, target, work);
    rmSync(target, { recursive: true, force: true });
    cpSync(stagedTarget, target, { recursive: true });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

export async function prepareTweakStoreSubmission(repoInput: string): Promise<TweakStorePublishSubmission> {
  const repo = normalizeGitHubRepo(repoInput);
  const repoInfo = await fetchGithubJson<{ default_branch?: string }>(`https://api.github.com/repos/${repo}`);
  const defaultBranch = repoInfo.default_branch;
  if (!defaultBranch) throw new Error(`Could not resolve default branch for ${repo}`);

  const commit = await fetchGithubJson<{
    sha?: string;
    html_url?: string;
  }>(`https://api.github.com/repos/${repo}/commits/${encodeURIComponent(defaultBranch)}`);
  if (!commit.sha) throw new Error(`Could not resolve current commit for ${repo}`);

  const manifest = await fetchManifestAtCommit(repo, commit.sha).catch((e) => {
    log("warn", `could not read manifest for store submission ${repo}@${commit.sha}:`, e);
    return undefined;
  });

  return {
    repo,
    defaultBranch,
    commitSha: commit.sha,
    commitUrl: commit.html_url ?? `https://github.com/${repo}/commit/${commit.sha}`,
    manifest: manifest
      ? {
          id: typeof manifest.id === "string" ? manifest.id : undefined,
          name: typeof manifest.name === "string" ? manifest.name : undefined,
          version: typeof manifest.version === "string" ? manifest.version : undefined,
          description: typeof manifest.description === "string" ? manifest.description : undefined,
          iconUrl: typeof manifest.iconUrl === "string" ? manifest.iconUrl : undefined,
        }
      : undefined,
  };
}

async function fetchGithubJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}`,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
    return await res.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchManifestAtCommit(repo: string, commitSha: string): Promise<Partial<TweakManifest>> {
  const res = await fetch(`https://raw.githubusercontent.com/${repo}/${commitSha}/manifest.json`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}`,
    },
  });
  if (!res.ok) throw new Error(`manifest fetch returned ${res.status}`);
  return await res.json() as Partial<TweakManifest>;
}

export function extractTarArchive(archive: string, targetDir: string): void {
  const result = spawnSync("tar", ["-xzf", archive, "-C", targetDir], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`tar extraction failed: ${result.stderr || result.stdout || result.status}`);
  }
}

export function validateStoreTweakSource(entry: TweakStoreEntry, source: string): void {
  const manifestPath = join(source, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as TweakManifest;
  if (manifest.id !== entry.manifest.id) {
    throw new Error(`downloaded tweak id ${manifest.id} does not match approved id ${entry.manifest.id}`);
  }
  if (manifest.githubRepo !== entry.repo) {
    throw new Error(`downloaded tweak repo ${manifest.githubRepo} does not match approved repo ${entry.repo}`);
  }
  if (manifest.version !== entry.manifest.version) {
    throw new Error(`downloaded tweak version ${manifest.version} does not match approved version ${entry.manifest.version}`);
  }
}

export function findTweakRoot(dir: string): string | null {
  if (!existsSync(dir)) return null;
  if (existsSync(join(dir, "manifest.json"))) return dir;
  for (const name of readdirSync(dir)) {
    const child = join(dir, name);
    try {
      if (!statSync(child).isDirectory()) continue;
    } catch {
      continue;
    }
    const found = findTweakRoot(child);
    if (found) return found;
  }
  return null;
}

export function copyTweakSource(source: string, target: string): void {
  cpSync(source, target, {
    recursive: true,
    filter: (src) => !/(^|[/\\])(?:\.git|node_modules)(?:[/\\]|$)/.test(src),
  });
}

async function assertStoreTweakCleanForAutoUpdate(
  entry: TweakStoreEntry,
  target: string,
  work: string,
): Promise<void> {
  if (!existsSync(target)) return;
  const metadata = readStoreInstallMetadata(target);
  if (!metadata) return;
  if (metadata.repo !== entry.repo) {
    throw new StoreTweakModifiedError(entry.manifest.name);
  }
  const currentFiles = hashTweakSource(target);
  const baselineFiles = metadata.files ?? await fetchBaselineStoreTweakHashes(metadata, work);
  if (!sameFileHashes(currentFiles, baselineFiles)) {
    throw new StoreTweakModifiedError(entry.manifest.name);
  }
}

export function readStoreInstallMetadata(target: string): StoreInstallMetadata | null {
  const metadataPath = join(target, ".codexpp-store.json");
  if (!existsSync(metadataPath)) return null;
  try {
    const parsed = JSON.parse(readFileSync(metadataPath, "utf8")) as Partial<StoreInstallMetadata>;
    if (typeof parsed.repo !== "string" || typeof parsed.approvedCommitSha !== "string") return null;
    return {
      repo: parsed.repo,
      approvedCommitSha: parsed.approvedCommitSha,
      installedAt: typeof parsed.installedAt === "string" ? parsed.installedAt : "",
      storeIndexUrl: typeof parsed.storeIndexUrl === "string" ? parsed.storeIndexUrl : "",
      files: isHashRecord(parsed.files) ? parsed.files : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchBaselineStoreTweakHashes(
  metadata: StoreInstallMetadata,
  work: string,
): Promise<Record<string, string>> {
  const baselineDir = join(work, "baseline");
  const archive = join(work, "baseline.tar.gz");
  const res = await fetch(`https://codeload.github.com/${metadata.repo}/tar.gz/${metadata.approvedCommitSha}`, {
    headers: { "User-Agent": `codex-plusplus/${CODEX_PLUSPLUS_VERSION}` },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Could not verify local tweak changes before update: ${res.status}`);
  writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
  mkdirSync(baselineDir, { recursive: true });
  extractTarArchive(archive, baselineDir);
  const source = findTweakRoot(baselineDir);
  if (!source) throw new Error("Could not verify local tweak changes before update: baseline manifest missing");
  return hashTweakSource(source);
}

export function hashTweakSource(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  collectTweakFileHashes(root, root, out);
  return out;
}

export function collectTweakFileHashes(root: string, dir: string, out: Record<string, string>): void {
  for (const name of readdirSync(dir).sort()) {
    if (name === ".git" || name === "node_modules" || name === ".codexpp-store.json") continue;
    const full = join(dir, name);
    const rel = relative(root, full).split("\\").join("/");
    const stat = statSync(full);
    if (stat.isDirectory()) {
      collectTweakFileHashes(root, full, out);
      continue;
    }
    if (!stat.isFile()) continue;
    out[rel] = createHash("sha256").update(readFileSync(full)).digest("hex");
  }
}

export function sameFileHashes(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a).sort();
  const bk = Object.keys(b).sort();
  if (ak.length !== bk.length) return false;
  for (let i = 0; i < ak.length; i++) {
    const key = ak[i];
    if (key !== bk[i] || a[key] !== b[key]) return false;
  }
  return true;
}

export function isHashRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every((v) => typeof v === "string");
}

export function normalizeVersion(v: string): string {
  return v.trim().replace(/^v/i, "");
}

export function compareVersions(a: string, b: string): number {
  const av = VERSION_RE.exec(a);
  const bv = VERSION_RE.exec(b);
  if (!av || !bv) return 0;
  for (let i = 1; i <= 3; i++) {
    const diff = Number(av[i]) - Number(bv[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}
