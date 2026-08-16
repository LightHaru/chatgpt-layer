import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const installerDir = join(root, "packages", "installer");

function fail(msg) {
  console.error(`[inspect-npm-pack] ${msg}`);
  process.exit(1);
}

function listTgz(dir) {
  try {
    return readdirSync(dir)
      .filter((name) => /^chatgpt-layer-.*\.tgz$/.test(name))
      .map((name) => join(dir, name))
      .sort();
  } catch {
    return [];
  }
}

const arg = process.argv[2];
const tgzs = arg ? [arg] : listTgz(process.cwd()).concat(listTgz(installerDir));
const unique = [...new Set(tgzs)];
if (unique.length !== 1) {
  fail(`expected exactly one chatgpt-layer-*.tgz, found ${JSON.stringify(unique)}`);
}
const tgz = unique[0];

const listed = spawnSync("tar", ["-tzf", tgz], { encoding: "utf8" });
if (listed.status !== 0) {
  fail(`tar -tzf failed: ${listed.stderr || listed.stdout}`);
}
const entries = new Set(
  listed.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean),
);

const required = [
  "package/package.json",
  "package/README.md",
  "package/LICENSE",
  "package/dist/cli.js",
  "package/assets/loader.cjs",
];
const missing = required.filter((path) => !entries.has(path));
if (missing.length > 0) {
  fail(`packed tarball missing:\n- ${missing.join("\n- ")}`);
}

const hasDist = [...entries].some((e) => e === "package/dist/" || e.startsWith("package/dist/"));
const hasAssets = [...entries].some((e) => e === "package/assets/" || e.startsWith("package/assets/"));
if (!hasDist) fail("packed tarball has no package/dist");
if (!hasAssets) fail("packed tarball has no package/assets");

const extracted = spawnSync("tar", ["-xOf", tgz, "package/package.json"], { encoding: "utf8" });
if (extracted.status !== 0) {
  fail(`could not read packed package.json: ${extracted.stderr}`);
}
let packed;
try {
  packed = JSON.parse(extracted.stdout);
} catch (err) {
  fail(`packed package.json is not JSON: ${err instanceof Error ? err.message : err}`);
}

if (packed.name !== "chatgpt-layer") {
  fail(`packed name must be chatgpt-layer, got ${JSON.stringify(packed.name)}`);
}

function collectDeps(pkg) {
  const bundled = pkg.bundleDependencies || pkg.bundledDependencies;
  const bundledMap = Array.isArray(bundled)
    ? Object.fromEntries(bundled.map((name) => [name, "bundled"]))
    : bundled && typeof bundled === "object"
      ? bundled
      : {};
  return {
    ...(pkg.dependencies || {}),
    ...(pkg.optionalDependencies || {}),
    ...(pkg.peerDependencies || {}),
    ...bundledMap,
  };
}

const bad = [];
for (const [name, spec] of Object.entries(collectDeps(packed))) {
  const s = String(spec);
  if (
    name.startsWith("@codex-plusplus/") ||
    s === "*" ||
    s.startsWith("workspace:") ||
    s.startsWith("file:")
  ) {
    bad.push(`${name}@${spec}`);
  }
}
if (bad.length > 0) {
  fail(`packed package.json has workspace-only deps:\n- ${bad.join("\n- ")}`);
}

console.log(`[inspect-npm-pack] ok: ${tgz}`);
console.log(`[inspect-npm-pack] ${packed.name}@${packed.version}`);

