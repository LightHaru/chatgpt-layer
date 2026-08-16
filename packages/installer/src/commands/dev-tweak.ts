import kleur from "kleur";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  watch,
  writeFileSync,
} from "node:fs";
import { platform } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { validateTweakManifest, type TweakManifest } from "../bundled-sdk.js";
import { ensureUserPaths } from "../paths.js";

interface DevTweakOpts {
  name?: string;
  replace?: boolean;
  watch?: boolean;
}

export async function devTweak(target = ".", opts: DevTweakOpts = {}): Promise<void> {
  const sourceDir = resolve(target);
  const manifestPath = join(sourceDir, "manifest.json");
  const manifest = readValidManifest(manifestPath);
  const paths = ensureUserPaths();
  const linkName = opts.name ?? manifest.id;
  const linkPath = join(paths.tweaks, linkName);

  ensureDevLink(sourceDir, linkPath, opts.replace === true);
  touchReloadMarker(linkPath);

  console.log(kleur.green().bold("✓ Codex++ dev link ready"));
  console.log(`  Source: ${kleur.cyan(sourceDir)}`);
  console.log(`  Linked: ${kleur.cyan(linkPath)}`);
  console.log(`  Tweak:  ${kleur.cyan(manifest.id)} (${manifest.scope ?? "both"})`);

  if (opts.watch === false) return;

  console.log();
  console.log(kleur.dim("Watching for changes. Press Ctrl+C to stop."));
  await watchForChanges(sourceDir, linkPath);
}

function readValidManifest(manifestPath: string): TweakManifest {
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest not found: ${manifestPath}`);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    throw new Error(`manifest is not valid JSON: ${(e as Error).message}`);
  }

  const validation = validateTweakManifest(manifest);
  if (!validation.ok) {
    throw new Error(
      validation.errors.map((issue) => `${issue.path}: ${issue.message}`).join("\n"),
    );
  }

  const typed = manifest as TweakManifest;
  const entry = resolveEntry(dirname(manifestPath), typed);
  if (!entry) {
    throw new Error(
      typed.main
        ? `entry file does not exist: ${typed.main}`
        : "entry file does not exist: index.js, index.cjs, or index.mjs",
    );
  }

  return typed;
}

function ensureDevLink(sourceDir: string, linkPath: string, replace: boolean): void {
  mkdirSync(dirname(linkPath), { recursive: true });

  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      const currentTarget = resolve(dirname(linkPath), readlinkSync(linkPath));
      if (currentTarget === sourceDir) return;
      if (!replace) {
        throw new Error(
          `tweak link already exists for ${basename(linkPath)}: ${currentTarget}\n` +
            "Pass --replace to point it at this source directory.",
        );
      }
      rmSync(linkPath, { recursive: true, force: true });
    } else {
      throw new Error(`target tweak path already exists and is not a symlink: ${linkPath}`);
    }
  }

  symlinkSync(sourceDir, linkPath, platform() === "win32" ? "junction" : "dir");
}

function resolveEntry(tweakDir: string, manifest: TweakManifest): string | null {
  if (manifest.main) {
    const explicit = resolve(tweakDir, manifest.main);
    return existsSync(explicit) ? explicit : null;
  }

  for (const candidate of ["index.js", "index.cjs", "index.mjs"]) {
    const entry = join(tweakDir, candidate);
    if (existsSync(entry)) return entry;
  }

  return null;
}

function touchReloadMarker(linkPath: string): void {
  try {
    writeFileSync(join(linkPath, ".codexpp-dev-reload"), String(Date.now()), "utf8");
  } catch {
    // Best effort only. Creating the symlink itself usually wakes the runtime watcher.
  }
}

function watchForChanges(sourceDir: string, linkPath: string): Promise<void> {
  let timer: NodeJS.Timeout | null = null;

  const rerun = (changedPath: string | null) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      try {
        readValidManifest(join(sourceDir, "manifest.json"));
        touchReloadMarker(linkPath);
        const suffix = changedPath ? ` (${relative(sourceDir, changedPath)})` : "";
        console.log(`${kleur.green("valid")} ${new Date().toLocaleTimeString()}${suffix}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`${kleur.red("invalid")} ${message}`);
      }
    }, 100);
  };

  const watcher = watch(sourceDir, { recursive: true }, (_event, filename) => {
    if (filename && String(filename).includes("node_modules")) return;
    if (filename === ".codexpp-dev-reload") return;
    rerun(filename ? join(sourceDir, String(filename)) : null);
  });

  return new Promise((resolvePromise) => {
    const stop = () => {
      if (timer) clearTimeout(timer);
      watcher.close();
      resolvePromise();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}
