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
import { readFileSync, writeFileSync, mkdtempSync, rmSync, cpSync, existsSync, renameSync, unlinkSync, chmodSync, lstatSync, readdirSync, openSync, fsyncSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setImmediate as yieldToEventLoop, setTimeout as delay } from "node:timers/promises";

export interface AsarHeaderInfo {
  /** SHA-256 hex of the header JSON bytes Electron hashes. */
  headerHash: string;
  /** The decoded header object (the directory tree). */
  header: unknown;
}

/** Filesystem operations used by Windows/Unix asar replacement. Injected in tests. */
export interface AsarReplaceFs {
  unlinkSync: (path: string) => void;
  renameSync: (from: string, to: string) => void;
  writeFileSync: (path: string, data: Uint8Array) => void;
  readFileSync: (path: string) => Buffer;
  chmodSync: (path: string, mode: number) => void;
  openSync: (path: string, flags: string) => number;
  fsyncSync: (fd: number) => void;
  closeSync: (fd: number) => void;
}

/** Optional replacement hooks so tests can assert the Windows overwrite path. */
export interface AsarReplaceHooks {
  platform?: NodeJS.Platform;
  fs?: Partial<AsarReplaceFs>;
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
 * True when the ROOT app.asar/package.json can be read from RAW asar file
 * bytes: header.files["package.json"] is a packed non-empty file, and those
 * payload bytes are non-empty, contain no NUL, and parse as JSON. Nested
 * package.json files are ignored. Does not use extractFile/getRawHeader
 * and does not log file contents.
 */
export function asarHasReadablePackageJson(asarPath: string): boolean {
  try {
    return inspectPackedAsar(readFileSync(asarPath)).ok;
  } catch {
    return false;
  }
}

export function asarBufferHasReadablePackageJson(bytes: Buffer): boolean {
  return inspectPackedAsar(bytes).ok;
}

interface PackedAsarInspection {
  ok: boolean;
  reason: string;
}

function inspectPackedAsar(bytes: Buffer): PackedAsarInspection {
  try {
    if (!bytes || bytes.length === 0) return { ok: false, reason: "empty" };
    if (bytes[0] === 0) return { ok: false, reason: "leading-nul" };
    if (bytes.length < 16) return { ok: false, reason: "truncated-header" };
    // Electron asar: 8-byte size pickle (uint32 payload size + uint32 header size).
    const headerPickleSize = bytes.readUInt32LE(4);
    if (headerPickleSize <= 4 || 8 + headerPickleSize > bytes.length) {
      return { ok: false, reason: "truncated-header" };
    }
    const headerPickle = bytes.subarray(8, 8 + headerPickleSize);
    const jsonLength = headerPickle.readInt32LE(4);
    if (jsonLength <= 0 || 8 + jsonLength > headerPickle.length) {
      return { ok: false, reason: "bad-pickle" };
    }
    const headerJson = headerPickle.subarray(8, 8 + jsonLength).toString("utf8");
    if (!headerJson || headerJson.includes("\0")) return { ok: false, reason: "bad-pickle" };
    const header = JSON.parse(headerJson) as { files?: Record<string, unknown> };
    // ChatGPT Layer injects the loader into app.asar/package.json at the archive
    // root. Nested node_modules/*/package.json must not satisfy this check.
    const entry = packedFileEntry(header.files?.["package.json"]);
    if (!entry) return { ok: false, reason: "no-package.json" };
    const dataStart = 8 + headerPickleSize;
    const start = dataStart + entry.offset;
    const end = start + entry.size;
    if (start < dataStart || end > bytes.length) return { ok: false, reason: "truncated-payload" };
    const payload = bytes.subarray(start, end);
    if (payload.length === 0) return { ok: false, reason: "empty-payload" };
    if (payload.includes(0)) return { ok: false, reason: "nul-payload" };
    const raw = payload.toString("utf8").trim();
    if (!raw) return { ok: false, reason: "empty-payload" };
    JSON.parse(raw);
    return { ok: true, reason: "ok" };
  } catch {
    return { ok: false, reason: "bad-json" };
  }
}

/**
 * @electron/asar createPackage resolves on writable.end(), which does not wait
 * for the stream 'finish' event. On Windows the file can still be truncated
 * when that promise resolves. Yield to the event loop until the packed bytes
 * parse, then fail closed. This is not a createPackage retry and not a sleep.
 */
/**
 * Terminal inspect reasons for a fully written archive that is simply not a
 * valid root package.json. Truncation / missing / pickle errors keep retrying.
 */
const SETTLED_PACK_FAILURES = new Set([
  "no-package.json",
  "bad-json",
  "empty-payload",
  "nul-payload",
  "leading-nul",
]);

/**
 * Yield until createPackage's stream has actually landed on disk. `ok` or a
 * content-level failure both count as settled. Truncated headers keep waiting.
 */
export async function waitForPackedAsarSettled(path: string, label = path): Promise<void> {
  const attempts = 40;
  let reason = "missing";
  let size = 0;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { fsyncPath(path); } catch { /* dest may still be opening */ }
    let bytes = Buffer.alloc(0);
    try { bytes = readFileSync(path); } catch { /* not visible yet */ }
    size = bytes.length;
    const info = inspectPackedAsar(bytes);
    reason = info.reason;
    if (info.ok || SETTLED_PACK_FAILURES.has(info.reason)) return;
    if (attempt < attempts) await yieldToEventLoop();
  }
  throw new Error(`${label} asar did not settle (${reason}, size=${size})`);
}

export async function waitForReadablePackedAsar(path: string, label: string): Promise<void> {
  await waitForPackedAsarSettled(path, label);
  let bytes = Buffer.alloc(0);
  try { bytes = readFileSync(path); } catch { /* missing */ }
  const info = inspectPackedAsar(bytes);
  if (!info.ok) {
    throw new Error(`${label} asar is unreadable (${info.reason}, size=${bytes.length})`);
  }
}

function packedFileEntry(node: unknown): { size: number; offset: number } | null {
  if (!node || typeof node !== "object") return null;
  const rec = node as { files?: unknown; size?: unknown; offset?: unknown; unpacked?: unknown };
  if (rec.files) return null;
  if (rec.unpacked) return null;
  const size = Number(rec.size);
  const offset = Number(rec.offset ?? 0);
  if (!Number.isFinite(size) || size <= 0) return null;
  if (!Number.isFinite(offset) || offset < 0) return null;
  return { size, offset };
}

function defaultReplaceFs(): AsarReplaceFs {
  return {
    unlinkSync,
    renameSync,
    writeFileSync: (path, data) => { writeFileSync(path, data); },
    readFileSync: (path) => readFileSync(path),
    chmodSync,
    openSync: (path, flags) => openSync(path, flags),
    fsyncSync,
    closeSync,
  };
}

function resolveReplaceFs(partial?: Partial<AsarReplaceFs>): AsarReplaceFs {
  return { ...defaultReplaceFs(), ...partial };
}

function fsyncPathWith(fs: AsarReplaceFs, path: string): void {
  const fd = fs.openSync(path, "r+");
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}

function fsyncPath(path: string): void {
  fsyncPathWith(defaultReplaceFs(), path);
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
  hooks?: AsarReplaceHooks,
): Promise<AsarHeaderInfo> {
  const work = mkdtempSync(join(tmpdir(), "cxx-asar-"));
  const extractDir = join(work, "src");
  const outAsar = join(work, "app.asar");

  // Never extractAll/getRawHeader the live dest: @electron/asar can keep that
  // path mapped, and Windows then refuses to rename over it (EPERM) for the
  // rest of the process. Read dest as bytes into a snapshot inode instead.
  const snapshot = join(work, "src.asar");
  asar.uncache(asarPath);

  try {
    writeFileSync(snapshot, readFileSync(asarPath));
    asar.uncache(asarPath);
    const originalUnpackOptions = collectUnpackOptions(snapshot);
    asar.uncache(snapshot);
    asar.extractAll(snapshot, extractDir);
    asar.uncache(snapshot);
    await mutate(extractDir);

    await asar.createPackageWithOptions(extractDir, outAsar, {
      globOptions: { dot: true },
      ...originalUnpackOptions,
    });
    uncacheAsar(outAsar);
    await waitForReadablePackedAsar(outAsar, "packed");

    // Atomic-ish replace: write next to the target, then rename on Unix. This
    // prevents a denied write (e.g. macOS App Management TCC) from leaving the
    // bundle without an app.asar. Both the staging file and target must be on
    // the same filesystem for `rename` to be atomic. Windows overwrites dest
    // in place instead of unlink-then-rename (see replaceAsarAtomically).
    const stagingPath = `${asarPath}.codexpp-new`;
    try {
      cpSync(outAsar, stagingPath);
      fsyncPath(stagingPath);
    } catch (e) {
      throw annotatePermError(e, asarPath);
    }
    uncacheAsar(stagingPath);
    try {
      await waitForReadablePackedAsar(stagingPath, "staged");
    } catch (e) {
      try { unlinkSync(stagingPath); } catch { /* dest was not touched */ }
      throw e;
    }
    try {
      await replaceAsarAtomically(stagingPath, asarPath, hooks);
    } catch (e) {
      throw annotatePermError(e, asarPath);
    }
    // @electron/asar caches Filesystem objects by path. Replacing app.asar
    // in place must drop that cache or later extractFile/extractAll reads
    // the old header against the new bytes.
    uncacheAsar(asarPath);
    if (!asarHasReadablePackageJson(asarPath)) {
      throw new Error("replaced asar is unreadable");
    }
    uncacheAsar(asarPath);
    const info = readHeaderHash(asarPath);
    uncacheAsar(asarPath);
    return info;
  } finally {
    try {
      await cleanupTempTree(work);
    } catch {
      // Best-effort: a leftover temp dir must not fail a successful patch.
    }
  }
}

/**
 * Replace dest with a fully-built staging asar.
 *
 * Windows: do not unlink the live mapped dest first. Overwrite dest with the
 * validated staging bytes, fsync, uncache, then require a readable
 * package.json before treating the replace as success.
 *
 * Unix: renameSync staging onto dest (existing atomic-ish behavior).
 */
export async function replaceAsarAtomically(
  stagingPath: string,
  asarPath: string,
  hooks?: AsarReplaceHooks,
): Promise<void> {
  const win = (hooks?.platform ?? process.platform) === "win32";
  const fs = resolveReplaceFs(hooks?.fs);
  const attempts = win ? 40 : 8;
  const delayMs = win ? 150 : 50;
  const bytes = fs.readFileSync(stagingPath);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    asar.uncache(asarPath);
    asar.uncache(stagingPath);
    try {
      if (win) {
        try { fs.chmodSync(asarPath, 0o666); } catch { /* dest may not exist */ }
        // Overwrite in place. Unlink-then-rename on Windows can leave dest as a
        // delete-pending zero-filled file while this process still has it mapped.
        fs.writeFileSync(asarPath, bytes);
        fsyncPathWith(fs, asarPath);
      } else {
        fs.renameSync(stagingPath, asarPath);
      }
      uncacheAsar(asarPath);
      if (!asarHasReadablePackageJson(asarPath)) {
        throw new Error("replaced asar is unreadable");
      }
      if (win) {
        try { fs.unlinkSync(stagingPath); } catch { /* staging leftover is ok */ }
      }
      uncacheAsar(asarPath);
      return;
    } catch (e) {
      lastError = e;
      const unreadable = e instanceof Error && e.message.includes("replaced asar is unreadable");
      if (unreadable || !isTransientCleanupError(e) || attempt === attempts) throw e;
      await delay(delayMs);
    }
  }
  if (lastError) throw lastError;
}

export async function cleanupTempTree(path: string): Promise<void> {
  // Node's fs.rmSync maxRetries only retries unlink EPERM/EBUSY, not the
  // ENOTEMPTY that Windows rimraf throws from rmdirSync. Retry the whole
  // recursive remove ourselves, and clear read-only bits first on Windows.
  const attempts = 20;
  const delayMs = 100;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      if (process.platform === "win32") chmodTreeWritable(path);
      rmSync(path, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
      return;
    } catch (e) {
      lastError = e;
      if (!isTransientCleanupError(e) || attempt === attempts) throw e;
      await delay(delayMs);
    }
  }
  if (lastError) throw lastError;
}

function chmodTreeWritable(root: string): void {
  try {
    const st = lstatSync(root);
    if (st.isSymbolicLink()) return;
    chmodSync(root, st.isDirectory() ? 0o777 : 0o666);
    if (!st.isDirectory()) return;
    for (const name of readdirSync(root)) {
      chmodTreeWritable(join(root, name));
    }
  } catch {
    // Best-effort: a locked file should still be retried by rmSync.
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
  uncacheAsar(asarPath);
  const out = asar.extractFile(asarPath, relPath) as Buffer;
  uncacheAsar(asarPath);
  return out;
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

export function uncacheAsar(asarPath: string): void {
  asar.uncache(asarPath);
  const uncacheAll = (asar as { uncacheAll?: () => void }).uncacheAll;
  if (typeof uncacheAll === "function") uncacheAll();
}
