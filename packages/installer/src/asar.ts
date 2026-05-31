/**
 * asar helpers. We don't crack open the binary header ourselves; we use
 * @electron/asar which is well-maintained and matches the format Electron expects.
 *
 * The integrity hash Electron checks is the SHA-256 of the asar **header JSON**
 * (the leading length-prefixed JSON blob), not the entire file. @electron/asar
 * exposes this via `getRawHeader()`.
 */
import asar from "@electron/asar";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, cpSync, existsSync, renameSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export interface AsarHeaderInfo {
  /** SHA-256 hex of the header JSON bytes Electron hashes. */
  headerHash: string;
  /** The decoded header object (the directory tree). */
  header: unknown;
}

export function readHeaderHash(asarPath: string): AsarHeaderInfo {
  // getRawHeader returns { header, headerString, headerSize }
  const raw = (asar as unknown as {
    getRawHeader: (p: string) => { header: unknown; headerString: string };
  }).getRawHeader(asarPath);
  const hash = createHash("sha256").update(raw.headerString).digest("hex");
  return { headerHash: hash, header: raw.header };
}

/**
 * Extract → mutate via callback → repack. The callback receives a temp dir
 * containing the unpacked asar contents and may modify files in place.
 * Returns the new header hash post-repack.
 *
 * We must preserve the original asar's unpacked-file set EXACTLY: marking a
 * file `unpacked: true` in the header tells Electron to read it from
 * `app.asar.unpacked/` instead of inline. If we accidentally mark a file
 * unpacked that isn't actually present in the .unpacked/ sibling dir,
 * `require` will fail with MODULE_NOT_FOUND.
 */
export async function patchAsar(
  asarPath: string,
  mutate: (extractedDir: string) => Promise<void> | void,
): Promise<AsarHeaderInfo> {
  const work = mkdtempSync(join(tmpdir(), "cxx-asar-"));
  const extractDir = join(work, "src");
  const outAsar = join(work, "app.asar");

  // Snapshot what was unpacked in the ORIGINAL asar before we touch anything;
  // we'll feed an equivalent compact set back to createPackageWithOptions.
  const originalUnpackOptions = collectUnpackOptions(asarPath);

  try {
    asar.extractAll(asarPath, extractDir);
    await mutate(extractDir);

    await asar.createPackageWithOptions(extractDir, outAsar, {
      globOptions: { dot: true },
      ...originalUnpackOptions,
    });

    // Atomic-ish replace: write next to the target, then rename. This prevents
    // a denied write (e.g. macOS App Management TCC) from leaving the bundle
    // without an app.asar. Both the staging file and target must be on the
    // same filesystem for `rename` to be atomic.
    const stagingPath = `${asarPath}.codexpp-new`;
    try {
      cpSync(outAsar, stagingPath);
    } catch (e) {
      throw annotatePermError(e, asarPath);
    }
    try {
      renameSync(stagingPath, asarPath);
    } catch (e) {
      try { unlinkSync(stagingPath); } catch { /* best effort */ }
      throw annotatePermError(e, asarPath);
    }
    return readHeaderHash(asarPath);
  } finally {
    await cleanupTempTree(work);
  }
}

export async function cleanupTempTree(path: string): Promise<void> {
  const retryDelaysMs = [25, 75, 150, 300, 600];
  for (const waitMs of [0, ...retryDelaysMs]) {
    if (waitMs > 0) await delay(waitMs);
    try {
      rmSync(path, { recursive: true, force: true });
      return;
    } catch (e) {
      if (!isTransientCleanupError(e)) return;
    }
  }
}

function isTransientCleanupError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "ENOTEMPTY" || code === "EBUSY" || code === "EPERM" || code === "EACCES";
}

/**
 * Walk the existing asar header and produce compact glob options that preserve
 * exactly what was unpacked. Prefer unpackDir for fully-unpacked directories,
 * falling back to unpack for individual files.
 *
 * Why this matters: if the header marks a file `unpacked: true` but the file
 * isn't on disk under `app.asar.unpacked/`, Electron's resolver throws
 * MODULE_NOT_FOUND when something requires the module. The current Owl app also
 * has hundreds of unpacked files, so preserving each file with one giant glob
 * can exceed minimatch's pattern length limit.
 */
export function collectUnpackOptions(asarPath: string): { unpack?: string; unpackDir?: string } {
  const sibling = `${asarPath}.unpacked`;
  if (!existsSync(sibling)) return {};
  const raw = (asar as unknown as {
    getRawHeader: (p: string) => { header: { files?: Record<string, unknown> } };
  }).getRawHeader(asarPath);
  const covers = unpackCovers(raw.header as Record<string, unknown>, "").covers;
  const dirs = covers
    .filter((cover) => cover.type === "dir")
    .map((cover) => stripLeadingSlash(cover.path));
  const files = covers
    .filter((cover) => cover.type === "file")
    .map((cover) => `**/${stripLeadingSlash(cover.path)}`);
  return {
    ...(files.length > 0 ? { unpack: bracePattern(files) } : {}),
    ...(dirs.length > 0 ? { unpackDir: bracePattern(dirs) } : {}),
  };
}

interface UnpackCover {
  type: "dir" | "file";
  path: string;
}

function unpackCovers(
  node: Record<string, unknown>,
  prefix: string,
): { total: number; unpacked: number; covers: UnpackCover[] } {
  const files = (node as { files?: Record<string, Record<string, unknown>> }).files;
  if (!files) return { total: 0, unpacked: 0, covers: [] };

  let total = 0;
  let unpacked = 0;
  const covers: UnpackCover[] = [];

  for (const [name, val] of Object.entries(files)) {
    const p = `${prefix}/${name}`;
    const isDir = !!(val as { files?: unknown }).files;
    if (isDir) {
      const child = unpackCovers(val, p);
      total += child.total;
      unpacked += child.unpacked;
      covers.push(...child.covers);
      continue;
    }

    total += 1;
    if ((val as { unpacked?: boolean }).unpacked) {
      unpacked += 1;
      covers.push({ type: "file", path: p });
    }
  }

  if (prefix && total > 0 && total === unpacked) {
    return { total, unpacked, covers: [{ type: "dir", path: prefix }] };
  }
  return { total, unpacked, covers };
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, "");
}

function bracePattern(patterns: string[]): string {
  return patterns.length === 1 ? patterns[0] : `{${patterns.join(",")}}`;
}

/** Backup helper: copy `from` to `to` if `to` doesn't already exist. */
export function backupOnce(from: string, to: string): void {
  if (!existsSync(to)) cpSync(from, to, { recursive: true });
}

/** Read a file inside the asar without extracting the whole thing. */
export function readFileInAsar(asarPath: string, relPath: string): Buffer {
  return asar.extractFile(asarPath, relPath) as Buffer;
}

/**
 * Wrap EPERM/EACCES errors writing into an app bundle with an actionable
 * message about macOS App Management permission. Other errors pass through.
 */
function annotatePermError(e: unknown, target: string): Error {
  const err = e as NodeJS.ErrnoException;
  if (err && (err.code === "EPERM" || err.code === "EACCES") && /\/Applications\//.test(target)) {
    const msg =
      `Permission denied writing to ${target}.\n\n` +
      `macOS App Management is blocking modification of /Applications/Codex.app.\n` +
      `Run "codexplusplus repair" in your terminal.\n\n` +
      `Original error: ${err.message}`;
    const wrapped = new Error(msg);
    (wrapped as NodeJS.ErrnoException).code = err.code;
    return wrapped;
  }
  return err instanceof Error ? err : new Error(String(err));
}
