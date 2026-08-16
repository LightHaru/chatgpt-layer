import asar from "@electron/asar";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, platform, tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { userPaths, type UserPaths } from "../../src/paths";
import { cleanupTempTree, readFileInAsar, readHeaderHash, uncacheAsar } from "../../src/asar";
import { hasCodexPlusPlusAsarMarker } from "../../src/commands/install";
import { CODEX_WINDOW_SERVICES_KEY } from "../../src/codex-window-services";

/** Test-only fixture states. Not a production installer state machine. */
export const FIXTURE_STATES = [
  "CLEAN",
  "INSTALLED",
  "BROKEN_PATCH",
  "BROKEN_RUNTIME",
  "REPAIRED",
  "UNINSTALLED",
] as const;
export type FixtureState = (typeof FIXTURE_STATES)[number];

export const INSTALLER_ASSETS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "assets",
);

const REAL_HOME = homedir();
const REAL_ENV = { ...process.env };
const FORBIDDEN_MARKERS = [
  join(REAL_HOME, "Library", "Application Support", "codex-plusplus"),
  join(REAL_HOME, "Library", "LaunchAgents", "com.codexplusplus.watcher.plist"),
  join(REAL_HOME, "Library", "Logs", "codex-plusplus-watcher.log"),
  join(REAL_HOME, ".local", "share", "codex-plusplus"),
  join(REAL_HOME, ".config", "systemd", "user", "codex-plusplus-watcher.service"),
  join(REAL_HOME, ".config", "systemd", "user", "codex-plusplus-watcher.timer"),
  join(REAL_HOME, ".config", "systemd", "user", "codex-plusplus-watcher.path"),
  join(REAL_HOME, "AppData", "Roaming", "codex-plusplus"),
  join(REAL_HOME, "AppData", "Local", "codex-plusplus"),
];
const FORBIDDEN_EXISTED = new Map(FORBIDDEN_MARKERS.map((p) => [p, existsSync(p)]));

let envLock: Promise<void> = Promise.resolve();

export function withInstallerLock<T>(fn: () => Promise<T>): Promise<T> {
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const run = envLock.then(fn, fn);
  envLock = run.then(
    () => next,
    () => next,
  );
  return run.finally(release);
}

export interface FakeApp {
  appRoot: string;
  resourcesDir: string;
  asarPath: string;
  executable: string;
  metaPath: string | null;
  unrelatedAppFile: string;
  version: string;
}

export interface InstallerHarness {
  testRoot: string;
  homeDir: string;
  userData: string;
  tmpDir: string;
  app: FakeApp;
  paths: UserPaths;
  installOpts: {
    app: string;
    watcher: false;
    fuse: false;
    resign: false;
    quiet: true;
  };
  env: NodeJS.ProcessEnv;
  restore(): Promise<void>;
}

export const SAFE_INSTALL_OPTS = {
  watcher: false as const,
  fuse: false as const,
  resign: false as const,
  quiet: true as const,
};

/**
 * Tiny synthetic main-process source that matches the window-services
 * factory fingerprints install() looks for. Not ChatGPT source.
 */
export function syntheticMainJs(opts: { version?: string; extra?: string } = {}): string {
  const version = opts.version ?? "1.0.0-fixture";
  const extra = opts.extra ?? "";
  return `const fixtureVersion = ${JSON.stringify(version)};
const windowServices = createWindowServices({
  buildFlavor: "stable",
  allowDevtools: false,
  allowDebugMenu: true,
  allowInspectElement: true,
  globalState: { fixtureVersion },
  getGlobalStateForHost: () => ({ fixtureVersion }),
  desktopRoot: ".",
  preloadPath: "./preload.js",
  repoRoot: ".",
  canHideLastLocalWindowToTray: false,
  disposables: [],
});
function createWindowServices(opts) { return opts; }
console.log("chatgpt-layer-fixture", fixtureVersion, windowServices.buildFlavor);
${extra}
`;
}

export function syntheticPackageJson(main = "main.js"): string {
  return `${JSON.stringify(
    {
      name: "chatgpt-layer-synthetic-app",
      version: "0.0.0-fixture",
      main,
    },
    null,
    2,
  )}\n`;
}

export async function writeSyntheticAsar(
  dest: string,
  opts: { version?: string; extra?: string; extraFiles?: Record<string, string> } = {},
): Promise<void> {
  const work = mkdtempSync(join(tmpdir(), "cgl-asar-src-"));
  try {
    writeFileSync(join(work, "package.json"), syntheticPackageJson());
    writeFileSync(join(work, "main.js"), syntheticMainJs(opts));
    writeFileSync(join(work, "unrelated-keep.txt"), "preserve-me\n");
    writeFileSync(join(work, "preload.js"), "module.exports = {};\n");
    for (const [name, body] of Object.entries(opts.extraFiles ?? {})) {
      const target = join(work, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, body);
    }
    mkdirSync(dirname(dest), { recursive: true });
    const packed = `${dest}.packed`;
    await asar.createPackageWithOptions(work, packed, { globOptions: { dot: true } });
    uncacheAsar(packed);
    const bytes = readFileSync(packed);
    uncacheAsar(packed);
    try { unlinkSync(packed); } catch { /* packed leftover */ }
    try { unlinkSync(dest); } catch { /* dest may not exist */ }
    writeFileSync(dest, bytes);
  } finally {
    await cleanupTempTree(work);
  }
}

function macInfoPlist(version: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleDisplayName</key><string>ChatGPT</string>
  <key>CFBundleName</key><string>ChatGPT</string>
  <key>CFBundleExecutable</key><string>ChatGPT</string>
  <key>CFBundleIdentifier</key><string>com.openai.codex</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
</dict></plist>
`;
}


function writeFakeElectronFramework(appRoot: string): void {
  const frameworkRoot = join(appRoot, "Contents", "Frameworks", "Electron Framework.framework");
  const versionA = join(frameworkRoot, "Versions", "A");
  mkdirSync(join(versionA, "Resources"), { recursive: true });
  writeFileSync(join(versionA, "Electron Framework"), "fake-electron-framework\n");
  writeFileSync(
    join(versionA, "Resources", "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleExecutable</key><string>Electron Framework</string>
  <key>CFBundleIdentifier</key><string>com.github.Electron.framework</string>
  <key>CFBundleName</key><string>Electron Framework</string>
  <key>CFBundlePackageType</key><string>FMWK</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
</dict></plist>
`,
  );
  symlinkSync("A", join(frameworkRoot, "Versions", "Current"));
  symlinkSync("Versions/Current/Electron Framework", join(frameworkRoot, "Electron Framework"));
  symlinkSync("Versions/Current/Resources", join(frameworkRoot, "Resources"));
}

export async function createFakeChatGptApp(
  parent: string,
  opts: { version?: string; extra?: string } = {},
): Promise<FakeApp> {
  const version = opts.version ?? "1.0.0-fixture";
  const plat = platform();
  if (plat === "darwin") {
    const appRoot = join(parent, "ChatGPT.app");
    const resourcesDir = join(appRoot, "Contents", "Resources");
    const macosDir = join(appRoot, "Contents", "MacOS");
    mkdirSync(resourcesDir, { recursive: true });
    mkdirSync(macosDir, { recursive: true });
    writeFakeElectronFramework(appRoot);
    const asarPath = join(resourcesDir, "app.asar");
    await writeSyntheticAsar(asarPath, opts);
    writeFileSync(join(appRoot, "Contents", "Info.plist"), macInfoPlist(version));
    const executable = join(macosDir, "ChatGPT");
    writeFileSync(executable, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    chmodSync(executable, 0o755);
    const unrelatedAppFile = join(resourcesDir, "unrelated-keep.txt");
    writeFileSync(unrelatedAppFile, "app-unrelated\n");
    return {
      appRoot,
      resourcesDir,
      asarPath,
      executable,
      metaPath: join(appRoot, "Contents", "Info.plist"),
      unrelatedAppFile,
      version,
    };
  }

  const appRoot = join(parent, plat === "win32" ? "ChatGPT" : "codex-desktop");
  const resourcesDir = join(appRoot, "resources");
  mkdirSync(resourcesDir, { recursive: true });
  const asarPath = join(resourcesDir, "app.asar");
  await writeSyntheticAsar(asarPath, opts);
  const executable =
    plat === "win32" ? join(appRoot, "ChatGPT.exe") : join(appRoot, "Codex");
  writeFileSync(executable, plat === "win32" ? "MZ" : "#!/bin/sh\nexit 0\n");
  if (plat !== "win32") chmodSync(executable, 0o755);
  const unrelatedAppFile = join(appRoot, "unrelated-keep.txt");
  writeFileSync(unrelatedAppFile, "app-unrelated\n");
  return {
    appRoot,
    resourcesDir,
    asarPath,
    executable,
    metaPath: null,
    unrelatedAppFile,
    version,
  };
}

const PARENT_OVERRIDE_KEYS = [
  "CODEX_PLUSPLUS_HOME",
  "CODEX_PLUSPLUS_DISABLE_WATCHER",
  "CODEX_PLUSPLUS_DISABLE_PATH_SHIMS",
  "TMPDIR",
  "TMP",
  "TEMP",
] as const;

function isolatedChildEnv(testRoot: string): NodeJS.ProcessEnv {
  const homeDir = join(testRoot, "home");
  const userData = join(testRoot, "user-data");
  const tmpDir = join(testRoot, "tmp");
  const binDir = join(testRoot, "bin");
  mkdirSync(homeDir, { recursive: true });
  mkdirSync(userData, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(binDir, { recursive: true });
  mkdirSync(join(testRoot, "appdata"), { recursive: true });
  mkdirSync(join(testRoot, "localappdata"), { recursive: true });
  const nodeDir = dirname(process.execPath);
  const pathSep = platform() === "win32" ? ";" : ":";
  return {
    ...REAL_ENV,
    HOME: homeDir,
    USERPROFILE: homeDir,
    APPDATA: join(testRoot, "appdata"),
    LOCALAPPDATA: join(testRoot, "localappdata"),
    XDG_DATA_HOME: join(testRoot, "xdg-data"),
    XDG_CONFIG_HOME: join(testRoot, "xdg-config"),
    XDG_CACHE_HOME: join(testRoot, "xdg-cache"),
    TMPDIR: tmpDir,
    TMP: tmpDir,
    TEMP: tmpDir,
    CODEX_PLUSPLUS_HOME: userData,
    CODEX_PLUSPLUS_DISABLE_WATCHER: "1",
    CODEX_PLUSPLUS_DISABLE_PATH_SHIMS: "1",
    PATH: [binDir, nodeDir, "/usr/bin", "/bin", "/usr/sbin"].join(pathSep),
    ProgramFiles: join(testRoot, "ProgramFiles"),
    "ProgramFiles(x86)": join(testRoot, "ProgramFilesX86"),
    SUDO_USER: "",
    SUDO_UID: "",
    SUDO_GID: "",
  };
}

function applyParentOverrides(userData: string, tmpDir: string): () => void {
  const previous: Record<string, string | undefined> = {};
  for (const key of PARENT_OVERRIDE_KEYS) previous[key] = process.env[key];
  process.env.CODEX_PLUSPLUS_HOME = userData;
  process.env.CODEX_PLUSPLUS_DISABLE_WATCHER = "1";
  process.env.CODEX_PLUSPLUS_DISABLE_PATH_SHIMS = "1";
  process.env.TMPDIR = tmpDir;
  process.env.TMP = tmpDir;
  process.env.TEMP = tmpDir;
  return () => {
    for (const key of PARENT_OVERRIDE_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  };
}

export async function createInstallerHarness(): Promise<InstallerHarness> {
  const testRoot = mkdtempSync(join(tmpdir(), "cgl-installer-it-"));
  const env = isolatedChildEnv(testRoot);
  const restoreEnv = applyParentOverrides(env.CODEX_PLUSPLUS_HOME!, env.TMPDIR!);
  mkdirSync(join(testRoot, "app"), { recursive: true });
  const app = await createFakeChatGptApp(join(testRoot, "app"));
  const paths = userPaths();
  return {
    testRoot,
    homeDir: env.HOME!,
    userData: env.CODEX_PLUSPLUS_HOME!,
    tmpDir: env.TMPDIR!,
    app,
    paths,
    installOpts: { app: app.appRoot, ...SAFE_INSTALL_OPTS },
    env,
    async restore() {
      restoreEnv();
      try { uncacheAsar(app.asarPath); } catch { /* already gone */ }
      try { (asar as { uncacheAll?: () => void }).uncacheAll?.(); } catch { /* optional */ }
      await cleanupTempTree(testRoot);
    },
  };
}

export async function withIsolatedInstaller<T>(
  fn: (h: InstallerHarness) => Promise<T>,
): Promise<T> {
  return withInstallerLock(async () => {
    const h = await createInstallerHarness();
    try {
      const result = await fn(h);
      assertPathSafety(h);
      return result;
    } finally {
      await h.restore();
    }
  });
}

export function assertPathSafety(h: InstallerHarness): void {
  const roots = [h.testRoot].map((p) => resolve(p));
  function allowed(path: string): boolean {
    const resolved = resolve(path);
    if (roots.some((root) => resolved === root || resolved.startsWith(root + sep))) return true;
    return false;
  }
  if (!allowed(h.userData) || !allowed(h.app.appRoot)) {
    throw new Error(`fixture escaped test root: ${h.userData} ${h.app.appRoot}`);
  }
  if (h.userData === REAL_HOME || h.userData.startsWith(REAL_HOME + sep)) {
    throw new Error("user data must not be real HOME");
  }
  for (const marker of FORBIDDEN_MARKERS) {
    if (!FORBIDDEN_EXISTED.get(marker) && existsSync(marker)) {
      throw new Error(`test wrote outside fixture: ${marker}`);
    }
  }
}

export function readAsarPackage(asarPath: string): {
  main?: string;
  __codexpp?: { originalMain?: string; userRoot?: string; loader?: string };
} {
  return JSON.parse(readFileInAsar(asarPath, "package.json").toString("utf8")) as {
    main?: string;
    __codexpp?: { originalMain?: string; userRoot?: string; loader?: string };
  };
}

export function asarHasLoader(asarPath: string): boolean {
  try {
    readFileInAsar(asarPath, "codex-plusplus-loader.cjs");
    return true;
  } catch {
    return false;
  }
}

export function asarHasFile(asarPath: string, relPath: string): boolean {
  try {
    readFileInAsar(asarPath, relPath.split("/").join(sep));
    return true;
  } catch {
    try {
      readFileInAsar(asarPath, relPath.split(sep).join("/"));
      return true;
    } catch {
      return false;
    }
  }
}

export function asarMainSource(asarPath: string): string {
  try {
    return readFileInAsar(asarPath, "main.js").toString("utf8");
  } catch {
    return readFileInAsar(asarPath, ["main.js"].join(sep)).toString("utf8");
  }
}

export function isPatchedAsar(asarPath: string): boolean {
  return hasCodexPlusPlusAsarMarker(asarPath);
}

export function runtimeIntact(paths: UserPaths): boolean {
  return existsSync(join(paths.runtime, "main.js"));
}

export function builtRuntimePresent(): boolean {
  return existsSync(join(INSTALLER_ASSETS_DIR, "runtime", "main.js"))
    && existsSync(join(INSTALLER_ASSETS_DIR, "loader.cjs"));
}

export function countLoaderCopies(asarPath: string): number {
  const pkg = readAsarPackage(asarPath);
  let n = 0;
  if (asarHasLoader(asarPath)) n += 1;
  if (pkg.main === "codex-plusplus-loader.cjs") n += 0;
  return n;
}

export function backupAsarPath(paths: UserPaths): string {
  return join(paths.backup, "app.asar");
}

export async function replaceAsarWithOriginal(h: InstallerHarness): Promise<void> {
  const backup = backupAsarPath(h.paths);
  if (!existsSync(backup)) throw new Error("no asar backup to restore for damage");
  cpSync(backup, h.app.asarPath);
  asar.uncache(h.app.asarPath);
}

export async function replaceAsarWithUpdatedPackage(
  h: InstallerHarness,
  version = "2.0.0-fixture",
): Promise<void> {
  await writeSyntheticAsar(h.app.asarPath, {
    version,
    extra: "// updated-upstream-package\n",
  });
  if (h.app.metaPath) writeFileSync(h.app.metaPath, macInfoPlist(version));
  h.app.version = version;
}

export async function stripLoaderFromAsarAsync(h: InstallerHarness): Promise<void> {
  const work = mkdtempSync(join(h.tmpDir, "strip-"));
  try {
    asar.extractAll(h.app.asarPath, work);
    const loader = join(work, "codex-plusplus-loader.cjs");
    if (existsSync(loader)) rmSync(loader);
    const pkgPath = join(work, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
    pkg.main = "main.js";
    delete pkg.__codexpp;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    await asar.createPackageWithOptions(work, h.app.asarPath, { globOptions: { dot: true } });
    uncacheAsar(h.app.asarPath);
  } finally {
    await cleanupTempTree(work);
  }
}

export function removeRuntime(h: InstallerHarness): void {
  rmSync(h.paths.runtime, { recursive: true, force: true });
}

export function seedTweakAndConfig(h: InstallerHarness): void {
  mkdirSync(join(h.paths.tweaks, "com.example.keep"), { recursive: true });
  writeFileSync(
    join(h.paths.tweaks, "com.example.keep", "manifest.json"),
    JSON.stringify({ id: "com.example.keep", name: "Keep Me", entry: "index.js" }),
  );
  writeFileSync(
    join(h.paths.tweaks, "com.example.keep", "index.js"),
    "module.exports = { start() {}, stop() {} };\n",
  );
  mkdirSync(join(h.paths.root, "tweak-data", "com.example.keep"), { recursive: true });
  writeFileSync(join(h.paths.root, "tweak-data", "com.example.keep", "saved.json"), '{"keep":true}\n');
  writeFileSync(
    h.paths.configFile,
    JSON.stringify({ tweaks: { "com.example.keep": { enabled: true } }, codexPlusPlus: { safeMode: false } }, null, 2),
  );
}

export function tweakDataIntact(h: InstallerHarness): boolean {
  return (
    existsSync(join(h.paths.tweaks, "com.example.keep", "manifest.json"))
    && existsSync(join(h.paths.root, "tweak-data", "com.example.keep", "saved.json"))
    && existsSync(h.paths.configFile)
  );
}

export async function captureLogs(fn: () => Promise<void> | void): Promise<string> {
  const lines: string[] = [];
  const log = console.log;
  const warn = console.warn;
  const error = console.error;
  const push = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === "string" ? a : String(a))).join(" "));
  };
  console.log = push;
  console.warn = push;
  console.error = push;
  try {
    await fn();
    return lines.join("\n");
  } finally {
    console.log = log;
    console.warn = warn;
    console.error = error;
  }
}

export function walkFiles(root: string): string[] {
  const out: string[] = [];
  if (!existsSync(root)) return out;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const name of readdirSync(dir)) {
      const target = join(dir, name);
      try {
        const st = statSync(target);
        if (st.isDirectory()) stack.push(target);
        else out.push(target);
      } catch {}
    }
  }
  return out;
}

export function assertAllWritesUnder(h: InstallerHarness, extraAllowed: string[] = []): void {
  const allowed = [h.testRoot, ...extraAllowed].map((p) => resolve(p));
  for (const file of [...walkFiles(h.userData), ...walkFiles(h.app.appRoot)]) {
    const resolved = resolve(file);
    const ok =
      allowed.some((root) => resolved === root || resolved.startsWith(root + sep))
      || resolved === osTmp
      || resolved.startsWith(osTmp + sep);
    if (!ok) throw new Error(`write escaped fixture: ${resolved}`);
  }
  assertPathSafety(h);
}

export function headerHash(asarPath: string): string {
  return readHeaderHash(asarPath).headerHash;
}

export function windowServicesPatched(asarPath: string): boolean {
  return asarMainSource(asarPath).includes(CODEX_WINDOW_SERVICES_KEY);
}

export function builtCliPath(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist", "cli.js");
}

export function installerPackageRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

