import kleur from "kleur";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { validateTweakManifest, type TweakManifest } from "../bundled-sdk.js";

const ENTRY_CANDIDATES = ["index.js", "index.cjs", "index.mjs"];

export function validateTweak(target = "."): void {
  const manifestPath = resolveManifestPath(target);
  const tweakDir = dirname(manifestPath);
  const manifest = readManifest(manifestPath);
  const validation = validateTweakManifest(manifest);
  const errors = [...validation.errors];
  const warnings = [...validation.warnings];

  if (validation.ok) {
    const entry = resolveEntry(tweakDir, manifest as TweakManifest);
    if (!entry) {
      errors.push({
        path: "main",
        message:
          typeof (manifest as TweakManifest).main === "string"
            ? `entry file does not exist: ${(manifest as TweakManifest).main}`
            : `no entry file found; expected one of ${ENTRY_CANDIDATES.join(", ")}`,
      });
    }
  }

  for (const issue of errors) {
    console.error(`${kleur.red("error")} ${issue.path}: ${issue.message}`);
  }
  for (const issue of warnings) {
    console.warn(`${kleur.yellow("warn")} ${issue.path}: ${issue.message}`);
  }

  if (errors.length > 0) {
    throw new Error(`tweak validation failed with ${errors.length} error(s)`);
  }

  console.log(kleur.green(`✓ ${basename(tweakDir)} is a valid Codex++ tweak`));
}

function resolveManifestPath(target: string): string {
  const resolved = resolve(target);
  if (!existsSync(resolved)) throw new Error(`target does not exist: ${resolved}`);
  if (statSync(resolved).isDirectory()) return join(resolved, "manifest.json");
  return resolved;
}

function readManifest(manifestPath: string): unknown {
  if (!existsSync(manifestPath)) throw new Error(`manifest not found: ${manifestPath}`);
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (e) {
    throw new Error(`manifest is not valid JSON: ${(e as Error).message}`);
  }
}

function resolveEntry(tweakDir: string, manifest: TweakManifest): string | null {
  if (manifest.main) {
    const explicit = resolve(tweakDir, manifest.main);
    return existsSync(explicit) ? explicit : null;
  }

  for (const candidate of ENTRY_CANDIDATES) {
    const entry = join(tweakDir, candidate);
    if (existsSync(entry)) return entry;
  }

  return null;
}
