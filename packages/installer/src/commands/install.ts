import kleur from "kleur";
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, existsSync, readFileSync, writeFileSync, mkdirSync, openSync, closeSync, unlinkSync, readdirSync, rmSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { locateCodex, type CodexInstall } from "../platform.js";
import { ensureUserPaths } from "../paths.js";
import { backupOnce, patchAsar, readFileInAsar, readHeaderHash } from "../asar.js";
import { setIntegrity, getIntegrity } from "../integrity.js";
import { writeFuse } from "../fuses.js";
import { clearQuarantine, prepareCodeSigning, signCodexApp, signatureInfo } from "../codesign.js";
import { readPlist } from "../plist.js";
import { writeState } from "../state.js";
import { installWatcher, type WatcherKind } from "../watcher.js";
import { CODEX_PLUSPLUS_VERSION } from "../version.js";
import { formatCliShimResult, installCliShims } from "../cli-shim.js";
import { findSourceRoot } from "../source-root.js";
import {
  CODEX_WINDOW_SERVICES_KEY,
  describeCodexWindowServicesSource,
  patchCodexWindowServicesSource,
  type CodexWindowServicesSourceDiagnostics,
} from "../codex-window-services.js";
import { chownForTargetUser } from "../ownership.js";

interface Opts {
  app?: string;
  fuse?: boolean; // sade --no-fuse → fuse: false
  resign?: boolean;
  localSigning?: boolean;
  watcher?: boolean;
  watcherKind?: WatcherKind;
  quiet?: boolean;
}

const here = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(here, "..", "..", "assets");
const sourceRoot = findSourceRoot(here);

export async function install(opts: Opts = {}): Promise<void> {
  const wantsFuseFlip = opts.fuse !== false;
  const resign = opts.resign !== false;
  let localSigning = opts.localSigning === true;
  const wantWatcher = opts.watcher !== false;

  const step = makeStepper(opts.quiet === true);
  const codex = locateCodex(opts.app);
  const fuseFlip = shouldFlipElectronFuse(codex, wantsFuseFlip);
  step(`Located Codex at ${kleur.cyan(codex.appRoot)}`);
  if (wantsFuseFlip && !fuseFlip) {
    step("Skipping Electron fuse flip; Electron Framework binary was not found");
  }
  preflightSystemTools(codex.platform, resign, codex.metaPath !== null);
  preflightAppClosed(codex);

  // Pre-flight every app-bundle target we will mutate so permission failures
  // surface before we patch app.asar or touch backups.
  preflightWritableTargets(codex, { fuseFlip });
  step("Bundle is writable");

  let preparedSigning: ReturnType<typeof prepareCodeSigning> = null;
  if (resign && codex.platform === "darwin") {
    try {
      preparedSigning = prepareCodeSigning({ useLocalIdentity: localSigning });
    } catch (e) {
      if (!localSigning) throw e;
      localSigning = false;
      console.warn(
        kleur.yellow(
          `Local signing setup failed; falling back to ad-hoc signing.\n${(e as Error).message}`,
        ),
      );
    }
  }

  const codexVersion = readCodexVersion(codex.metaPath);
  if (codexVersion) step(`Codex version: ${kleur.cyan(codexVersion)}`);
  step(`Codex channel: ${kleur.cyan(codex.channel)}`);

  const paths = ensureUserPaths();
  step(`User dir: ${kleur.cyan(paths.root)}`);
  step(formatCliShimResult(installCliShims(paths.binDir)));
  const launcher = installWindowsManagedAppLauncher(codex);
  if (launcher) step(`Installed patched Codex++ launcher${launcher.shortcutPaths.length === 1 ? "" : "s"}: ${launcher.shortcutPaths.map((p) => kleur.cyan(p)).join(", ")}`);

  // 1. Backup originals.
  const pristineAppBackup = codex.platform === "darwin" ? join(paths.backup, "Codex.app") : null;
  const backupAsar = join(paths.backup, "app.asar");
  const backupAsarUnpacked = join(paths.backup, "app.asar.unpacked");
  const backupPlist = codex.metaPath ? join(paths.backup, "Info.plist") : null;
  const backupFramework = join(paths.backup, "Electron Framework");
  if (pristineAppBackup) {
    backupUnpatchedApp(codex.appRoot, pristineAppBackup, {
      hasPatchMarker: hasCodexPlusPlusAsarMarker(codex.asarPath),
      step,
    });
  }
  backupOnce(codex.asarPath, backupAsar);
  if (existsSync(`${codex.asarPath}.unpacked`)) {
    backupOnce(`${codex.asarPath}.unpacked`, backupAsarUnpacked);
  }
  if (codex.metaPath && backupPlist) backupOnce(codex.metaPath, backupPlist);
  if (fuseFlip) backupOnce(codex.electronBinary, backupFramework);
  step("Backed up originals");

  const { headerHash: originalAsarHash } = readHeaderHash(codex.asarPath);

  // 2. Stage runtime + loader into the user dir.
  stageAssets(paths.runtime);
  step(`Staged runtime to ${kleur.cyan(paths.runtime)}`);

  // 3. Patch app.asar entry point to require our loader.
  const originalEntry = await injectLoader(codex.asarPath, paths.root, step);
  const { headerHash: patchedAsarHash } = readHeaderHash(codex.asarPath);
  step(`Patched app.asar (entry was ${kleur.dim(originalEntry)})`);

  // 4. Update Info.plist hash so Electron's integrity check passes.
  if (codex.metaPath) {
    setIntegrity(codex, patchedAsarHash);
    step(`Updated ElectronAsarIntegrity → ${kleur.dim(patchedAsarHash.slice(0, 12))}…`);
  }

  // 5. Belt-and-suspenders: flip the integrity validation fuse off.
  let fuseFlipped = false;
  if (fuseFlip) {
    try {
      const r = writeFuse(
        codex.electronBinary,
        "EnableEmbeddedAsarIntegrityValidation",
        "off",
      );
      step(`Fuse EnableEmbeddedAsarIntegrityValidation: ${r.from} → ${r.to}`);
      fuseFlipped = true;
    } catch (e) {
      console.warn(kleur.yellow(`Fuse flip failed: ${(e as Error).message}`));
    }
  }

  // 6. Re-sign on macOS.
  let resigned = false;
  let signingMode: "local-identity" | "adhoc" | undefined;
  let signingIdentity: string | undefined;
  let signingIdentityHash: string | undefined;
  if (resign && codex.platform === "darwin") {
    clearQuarantine(codex.appRoot);
    const signing = signCodexApp(codex.appRoot, {
      useLocalIdentity: localSigning,
      preparedIdentity: preparedSigning,
    });
    resigned = true;
    signingMode = signing?.mode;
    signingIdentity = signing?.identity;
    signingIdentityHash = signing?.identityHash;
    if (signing?.mode === "local-identity") {
      step(
        `${signing.createdIdentity ? "Created and used" : "Used"} local signing identity ${kleur.cyan(signing.identity)}`,
      );
    } else {
      step("Re-signed ad-hoc");
    }
  }

  // 7. Auto-repair watcher.
  let watcher: WatcherKind = opts.watcherKind ?? "none";
  if (wantWatcher) {
    try {
      watcher = installWatcher(codex.appRoot);
      step(`Installed watcher (${watcher})`);
    } catch (e) {
      console.warn(kleur.yellow(`Watcher install failed: ${(e as Error).message}`));
    }
  }

  // 8. Persist state.
  writeState(paths.stateFile, {
    version: CODEX_PLUSPLUS_VERSION,
    installedAt: new Date().toISOString(),
    appRoot: codex.appRoot,
    originalAsarHash,
    patchedAsarHash,
    codexVersion,
    codexChannel: codex.channel,
    codexBundleId: codex.bundleId,
    fuseFlipped,
    resigned,
    signingMode,
    signingIdentity,
    signingIdentityHash,
    originalEntryPoint: originalEntry,
    watcher,
    sourceRoot,
  });
  chownForTargetUser(paths.root, { recursive: true });

  if (!opts.quiet) {
    console.log();
    console.log(kleur.green().bold("✓ codex-plusplus installed."));
    console.log(`  Tweaks dir: ${kleur.cyan(paths.tweaks)}`);
    console.log(`  Logs:       ${kleur.cyan(paths.logDir)}`);
    if (launcher) {
      console.log(`  Launch ${kleur.cyan("Codex++")} from Start Menu or Desktop.`);
      console.log(`  Opening the Microsoft Store ${kleur.cyan("Codex")} app directly will launch the unpatched app.`);
    } else {
      console.log(`  Launch Codex normally; the Tweaks tab will appear in Settings.`);
    }
  }
}

export function readCodexVersion(metaPath: string | null): string | null {
  if (!metaPath || !existsSync(metaPath)) return null;
  try {
    const pl = readPlist(metaPath);
    return (pl["CFBundleShortVersionString"] as string) ?? null;
  } catch {
    return null;
  }
}

export function shouldFlipElectronFuse(
  codex: Pick<CodexInstall, "electronBinary">,
  requested: boolean,
): boolean {
  return requested && existsSync(codex.electronBinary);
}

export function shouldBackupUnpatchedApp(input: { hasPatchMarker: boolean; signature: ReturnType<typeof signatureInfo> }): boolean {
  if (input.hasPatchMarker) return false;
  return input.signature.ok;
}

export function backupUnpatchedApp(
  appRoot: string,
  backupPath: string,
  opts: { hasPatchMarker: boolean; step?: (msg: string) => void },
): boolean {
  const sig = signatureInfo(appRoot);
  if (!shouldBackupUnpatchedApp({ hasPatchMarker: opts.hasPatchMarker, signature: sig })) return false;

  rmSync(backupPath, { recursive: true, force: true });
  execFileSync("ditto", [appRoot, backupPath], { stdio: "ignore" });
  opts.step?.(`Backed up unpatched Codex.app to ${kleur.cyan(backupPath)}`);
  return true;
}

export function hasCodexPlusPlusAsarMarker(asarPath: string): boolean {
  try {
    const pkg = JSON.parse(readFileInAsar(asarPath, "package.json").toString("utf8")) as {
      main?: unknown;
      __codexpp?: unknown;
    };
    return pkg.main === "codex-plusplus-loader.cjs" || typeof pkg.__codexpp === "object";
  } catch {
    return false;
  }
}

/**
 * Replace app.asar's package.json `main` with our loader, copying the
 * loader.cjs into the asar so it can resolve. Returns the original entry path.
 */
async function injectLoader(
  asarPath: string,
  userRoot: string,
  step: (msg: string) => void = () => {},
): Promise<string> {
  let originalMain = "";
  await patchAsar(asarPath, (dir) => {
    const pkgPath = join(dir, "package.json");
    if (!existsSync(pkgPath)) {
      throw new Error("app.asar has no package.json — Codex layout changed?");
    }
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    originalMain = String(pkg.main ?? "");
    if (!originalMain) throw new Error("app.asar package.json has no `main` field");

    // Already patched? Bail.
    if (pkg["__codexpp"]) {
      originalMain = String(pkg["__codexpp"].originalMain);
    } else {
      pkg["__codexpp"] = {
        originalMain,
        userRoot,
        loader: "codex-plusplus-loader.cjs",
      };
      pkg.main = "codex-plusplus-loader.cjs";
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    // Copy our loader stub into the asar root.
    const loaderSrc = join(assetsDir, "loader.cjs");
    if (!existsSync(loaderSrc)) {
      // Fall back to the in-repo path during development.
      const devLoader = resolve(here, "..", "..", "..", "..", "loader", "loader.cjs");
      if (!existsSync(devLoader)) {
        throw new Error(`loader.cjs not found at ${loaderSrc} or ${devLoader}`);
      }
      cpSync(devLoader, join(dir, "codex-plusplus-loader.cjs"));
    } else {
      cpSync(loaderSrc, join(dir, "codex-plusplus-loader.cjs"));
    }

    patchCodexWindowServices(dir, originalMain, step);
  });
  return originalMain;
}

interface CodexWindowServicesCandidateDiagnostic {
  relativePath: string;
  bytes: number;
  diagnostics: CodexWindowServicesSourceDiagnostics;
  parserError?: string;
}

function patchCodexWindowServices(
  appDir: string,
  originalMain: string,
  step: (msg: string) => void = () => {},
): void {
  const candidates = findCodexMainCandidates(appDir, originalMain);
  const candidateNames = candidates.map((p) => relative(appDir, p) || basename(p));
  step(
    `Scanning Codex window services hook candidates (${candidates.length}): ${
      candidateNames.length ? candidateNames.map((p) => kleur.dim(p)).join(", ") : kleur.yellow("none")
    }`,
  );
  const diagnostics: CodexWindowServicesCandidateDiagnostic[] = [];

  for (const mainPath of candidates) {
    const source = readFileSync(mainPath, "utf8");
    const relativePath = relative(appDir, mainPath) || basename(mainPath);
    const candidateDiagnostic: CodexWindowServicesCandidateDiagnostic = {
      relativePath,
      bytes: source.length,
      diagnostics: describeCodexWindowServicesSource(source, CODEX_WINDOW_SERVICES_KEY),
    };
    diagnostics.push(candidateDiagnostic);

    let patched: ReturnType<typeof patchCodexWindowServicesSource> = null;
    try {
      patched = patchCodexWindowServicesSource(source, CODEX_WINDOW_SERVICES_KEY);
    } catch (e) {
      candidateDiagnostic.parserError = (e as Error).message;
      continue;
    }

    if (patched) {
      if (patched.changed) writeFileSync(mainPath, patched.source);
      step(
        `Exposed Codex window services from ${kleur.dim(relativePath)} using ${kleur.cyan(patched.strategy)}${
          patched.serviceVar ? ` (${patched.serviceVar})` : ""
        }`,
      );
      return;
    }
  }

  throw new Error(formatWindowServicesHookFailure(originalMain, diagnostics));
}

export function findCodexMainCandidates(appDir: string, originalMain: string): string[] {
  const originalPath = resolve(appDir, originalMain);
  const out = existsSync(originalPath) ? [originalPath] : [];
  const buildDir = resolve(appDir, ".vite", "build");
  const roots: Array<{ dir: string; recursive: boolean }> = [
    { dir: appDir, recursive: false },
    { dir: buildDir, recursive: true },
  ];
  const originalDir = dirname(originalPath);
  if (originalDir !== appDir && !isSameOrInside(originalDir, buildDir)) {
    roots.push({ dir: originalDir, recursive: true });
  }

  const discovered = roots
    .flatMap((root) => collectJavaScriptFiles(root.dir, root.recursive))
    .sort((a, b) => {
      const rank = candidateRank(basename(a)) - candidateRank(basename(b));
      if (rank !== 0) return rank;
      const name = basename(a).localeCompare(basename(b));
      if (name !== 0) return name;
      return relative(appDir, a).localeCompare(relative(appDir, b));
    });

  const seen = new Set(out);
  for (const candidate of discovered) {
    if (seen.has(candidate)) continue;
    seen.add(candidate);
    out.push(candidate);
  }
  return out;
}

function candidateRank(name: string): number {
  if (/^main(?:[-.].*)?\.js$/.test(name)) return 0;
  if (/^bootstrap(?:[-.].*)?\.js$/.test(name)) return 1;
  if (/^(app|desktop|src)(?:[-.].*)?\.js$/.test(name)) return 2;
  if (/preload|worker|service/i.test(name)) return 4;
  return 3;
}

function collectJavaScriptFiles(dir: string, recursive: boolean): string[] {
  const out: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const target = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) out.push(...collectJavaScriptFiles(target, true));
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        out.push(target);
      }
    }
  } catch {}
  return out;
}

function isSameOrInside(child: string, parent: string): boolean {
  const rel = relative(parent, child);
  return rel === "" || (rel !== "" && !rel.startsWith("..") && !isAbsolute(rel));
}

function formatWindowServicesHookFailure(
  originalMain: string,
  diagnostics: CodexWindowServicesCandidateDiagnostic[],
): string {
  const lines = [
    "Codex window services hook point not found.",
    "",
    "Codex++ could not identify Codex's main-process window services factory.",
    "This usually means Codex changed its bundled main-process layout or renamed the service object properties.",
    "",
    `Original entry point: ${originalMain}`,
    `Candidate files scanned: ${diagnostics.length}`,
  ];

  if (diagnostics.length === 0) {
    lines.push("No candidate files existed inside app.asar.");
    return lines.join("\n");
  }

  for (const candidate of diagnostics) {
    const fingerprints = candidate.diagnostics.matchedFingerprints;
    lines.push(
      "",
      `Candidate: ${candidate.relativePath}`,
      `  Bytes: ${candidate.bytes}`,
      `  Marker already present: ${candidate.diagnostics.hasMarker ? "yes" : "no"}`,
      `  Object factory calls: ${candidate.diagnostics.objectCalls}`,
      `  buildFlavor properties: ${candidate.diagnostics.buildFlavorProperties}`,
      `  Window-service fingerprints: ${fingerprints.length ? fingerprints.join(", ") : "none"}`,
    );
    if (candidate.parserError) {
      lines.push(`  Parser error: ${candidate.parserError}`);
    }
    if (candidate.diagnostics.snippet) {
      lines.push(`  Nearby source: ${candidate.diagnostics.snippet}`);
    }
  }

  return lines.join("\n");
}

export function stageAssets(runtimeDir: string): void {
  mkdirSync(runtimeDir, { recursive: true });
  const src = join(assetsDir, "runtime");
  if (existsSync(src)) {
    cpSync(src, runtimeDir, { recursive: true });
    chownForTargetUser(runtimeDir, { recursive: true });
    return;
  }
  // Dev fallback: copy from the in-tree built runtime.
  const devSrc = resolve(here, "..", "..", "..", "..", "runtime", "dist");
  if (existsSync(devSrc)) {
    cpSync(devSrc, runtimeDir, { recursive: true });
    chownForTargetUser(runtimeDir, { recursive: true });
    return;
  }
  throw new Error(
    `Runtime assets not found. Expected at ${src} (built package) or ${devSrc} (dev).\n` +
      `Run \`npm run build\` from the workspace root.`,
  );
}

function makeStepper(quiet = false) {
  let n = 1;
  return (msg: string) => {
    if (!quiet) console.log(`${kleur.dim(`[${n++}]`)} ${msg}`);
  };
}

export function preflightWritableTargets(
  codex: Pick<CodexInstall, "resourcesDir" | "asarPath" | "metaPath" | "electronBinary" | "platform">,
  opts: { fuseFlip: boolean },
): void {
  preflightWritableDirectory(codex.resourcesDir, codex.platform);
  preflightWritableFile(codex.asarPath, codex.platform);
  if (codex.metaPath) preflightWritableFile(codex.metaPath, codex.platform);
  if (opts.fuseFlip) preflightWritableFile(codex.electronBinary, codex.platform);
}

/**
 * Touch a probe file inside the app bundle to surface (and trigger) macOS
 * App Management TCC denials before we begin destructive work.
 */
function preflightWritableDirectory(targetDir: string, platform: string): void {
  const probe = join(targetDir, ".codexpp-write-probe");
  const copyProbe = join(targetDir, ".codexpp-copy-probe");
  try {
    const fd = openSync(probe, "w");
    closeSync(fd);
    copyFileSync(probe, copyProbe);
    unlinkSync(probe);
    unlinkSync(copyProbe);
  } catch (e) {
    try {
      unlinkSync(probe);
    } catch {}
    try {
      unlinkSync(copyProbe);
    } catch {}
    throw writableError(e, targetDir, platform);
  }
}

function preflightWritableFile(targetFile: string, platform: string): void {
  try {
    const fd = openSync(targetFile, "r+");
    closeSync(fd);
  } catch (e) {
    throw writableError(e, targetFile, platform);
  }
}

function writableError(e: unknown, target: string, platform: string): unknown {
  const err = e as NodeJS.ErrnoException;
  if (err.code !== "EPERM" && err.code !== "EACCES") return e;

  const isMac = platform === "darwin";
  const inWindowsApps =
    platform === "win32" && /\\WindowsApps\\/i.test(`${target}\\`);
  const msg =
    `Cannot write to ${target}.\n\n` +
    (isMac
      ? macAppManagementFix(target, err.code)
      : inWindowsApps
        ? `Windows Store installs live under WindowsApps and Windows is blocking the patch write.\n` +
          `Fix:\n` +
          `  1. Quit Codex completely\n` +
          `  2. Re-open PowerShell as Administrator\n` +
          `  3. Re-run this command.\n\n` +
          `If Administrator still cannot write here, this Store install is locked by Windows package protections.\n` +
          `Use a writable Codex install folder and rerun with --app pointing at it.\n`
        : `Check filesystem permissions for the Codex install folder.\n`) +
    `\nOriginal error: ${err.message}`;
  return new Error(msg);
}

function macAppManagementFix(target: string, code: string | undefined): string {
  const permissionSteps =
    `macOS App Management is blocking modification of ${target}.\n` +
    `Run "codexplusplus repair" in your terminal.\n`;
  const sudoFallback =
    code === "EACCES"
      ? `If Codex.app is root-owned and repair still cannot write to it, run "sudo codexplusplus repair".\n`
      : "";

  return permissionSteps + sudoFallback;
}

function preflightAppClosed(codex: CodexInstall): void {
  if (codex.platform !== "win32") return;

  const exePath = codex.executable;
  const processName = basename(exePath, ".exe");
  try {
    const out = execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        [
          `$exe = '${escapePowerShellSingleQuotedString(exePath)}';`,
          `$name = '${escapePowerShellSingleQuotedString(processName)}';`,
          "$match = Get-Process -ErrorAction SilentlyContinue | Where-Object {",
          "$path = $null; try { $path = $_.Path } catch {}",
          "($path -and $path -ieq $exe) -or ($_.ProcessName -ieq $name)",
          "} | Select-Object -First 1 Id, ProcessName, Path;",
          "if ($match) { $match | ConvertTo-Json -Compress }",
        ].join(" "),
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10_000 },
    ).trim();
    if (!out) return;
    const process = JSON.parse(out) as { Id?: unknown; ProcessName?: unknown; Path?: unknown };
    const id = typeof process.Id === "number" ? process.Id : null;
    const name = typeof process.ProcessName === "string" ? process.ProcessName : processName;
    const path = typeof process.Path === "string" ? process.Path : exePath;
    throw new Error(
      `[!] Close Codex before patching\n\n` +
        `Codex is currently running:\n` +
        `  ${name}${id === null ? "" : ` (PID ${id})`}\n` +
        `  ${path}\n\n` +
        `Quit Codex completely, then rerun this command.\n` +
        (id === null ? "" : `If it is stuck, run:\n  Stop-Process -Id ${id}\n`),
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("[!] Close Codex before patching")) {
      throw error;
    }
  }
}

function escapePowerShellSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
}

function installWindowsManagedAppLauncher(codex: CodexInstall): { shortcutPaths: string[] } | null {
  if (codex.platform !== "win32") return null;
  if (!/\\codex-plusplus\\store-apps\\/i.test(`${codex.appRoot.replace(/\//g, "\\")}\\`)) {
    return null;
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) return null;

  const shimDir = join(localAppData, "Microsoft", "WindowsApps");
  mkdirSync(shimDir, { recursive: true });
  const commandPath = join(shimDir, "codex-plusplus-codex.cmd");
  writeFileSync(
    commandPath,
    `@echo off\r\nstart "" "${codex.executable}" %*\r\n`,
    "utf8",
  );
  const shortcutPaths = [commandPath];

  const startMenuRoot = process.env.APPDATA
    ? join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs")
    : null;
  if (!startMenuRoot) return { shortcutPaths };

  const startMenuShortcut = join(startMenuRoot, "Codex++.lnk");
  if (createWindowsCodexShortcut(startMenuShortcut, codex.executable)) {
    shortcutPaths.push(startMenuShortcut);
  }
  const desktopShortcut = join(homedir(), "Desktop", "Codex++.lnk");
  if (createWindowsCodexShortcut(desktopShortcut, codex.executable)) {
    shortcutPaths.push(desktopShortcut);
  }

  return { shortcutPaths };
}

function createWindowsCodexShortcut(shortcutPath: string, targetPath: string): boolean {
  try {
    mkdirSync(dirname(shortcutPath), { recursive: true });
    const script = [
      `$shortcutPath = '${escapePowerShellSingleQuotedString(shortcutPath)}'`,
      `$targetPath = '${escapePowerShellSingleQuotedString(targetPath)}'`,
      `$workingDirectory = '${escapePowerShellSingleQuotedString(dirname(targetPath))}'`,
      "$shell = New-Object -ComObject WScript.Shell",
      "$shortcut = $shell.CreateShortcut($shortcutPath)",
      "$shortcut.TargetPath = $targetPath",
      "$shortcut.WorkingDirectory = $workingDirectory",
      "$shortcut.IconLocation = \"$targetPath,0\"",
      "$shortcut.Save()",
    ].join("; ");
    execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
      { stdio: "ignore" },
    );
    return true;
  } catch {
    return false;
  }
}

function preflightSystemTools(platform: string, resign: boolean, hasPlist: boolean): void {
  if (platform !== "darwin") return;
  if (resign) requireCommand("codesign", "macOS codesign is required to re-sign Codex.app after patching.");
  if (hasPlist) requireCommand("plutil", "macOS plutil is required to update Codex.app's Info.plist.");
}

function requireCommand(command: string, message: string): void {
  const result = spawnSync("/bin/sh", ["-c", `command -v ${command}`], {
    stdio: "ignore",
  });
  if (result.status !== 0) {
    throw new Error(`[!] ${command} not installed\n\n${message}\nPaste this error into Codex if you need help.`);
  }
}
