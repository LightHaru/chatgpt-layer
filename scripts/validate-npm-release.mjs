import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`[validate-npm-release] ${msg}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(`cannot read ${path}: ${err instanceof Error ? err.message : err}`);
  }
}

const installerPath = join(root, "packages", "installer", "package.json");
const installer = readJson(installerPath);

if (installer.name !== "chatgpt-layer") {
  fail(
    `published package name must be "chatgpt-layer", got ${JSON.stringify(installer.name)}`,
  );
}

const version = installer.version;
if (typeof version !== "string" || version.trim() === "") {
  fail(`packages/installer version is missing`);
}

if (installer.private === true) {
  fail(`packages/installer must not be private (it is the published package)`);
}

if (installer.publishConfig?.access !== "public") {
  fail(
    `packages/installer publishConfig.access must be "public", got ${JSON.stringify(installer.publishConfig)}`,
  );
}

const tag = String(process.env.RELEASE_TAG || process.env.GITHUB_REF_NAME || "").trim();
const expectedTag = `v${version}`;
if (!tag) {
  fail(`RELEASE_TAG or GITHUB_REF_NAME is required (expected ${expectedTag})`);
}
if (tag !== expectedTag) {
  fail(`release tag must be ${expectedTag}, got ${JSON.stringify(tag)}`);
}

const rootPkg = readJson(join(root, "package.json"));
if (rootPkg.private !== true) {
  fail(
    `root package.json must set private: true (must not be published), got ${JSON.stringify(rootPkg.private)}`,
  );
}

const mismatches = [];
function check(label, pkg) {
  if (pkg.version !== version) {
    mismatches.push(`${label} (${pkg.name ?? "unnamed"}) version ${JSON.stringify(pkg.version)} != ${version}`);
  }
}

check("package.json", rootPkg);

const packagesDir = join(root, "packages");
for (const name of readdirSync(packagesDir).sort()) {
  const dir = join(packagesDir, name);
  try {
    if (!statSync(dir).isDirectory()) continue;
  } catch {
    continue;
  }
  const pkgPath = join(dir, "package.json");
  try {
    statSync(pkgPath);
  } catch {
    continue;
  }
  check(`packages/${name}`, readJson(pkgPath));
}

if (mismatches.length > 0) {
  fail(`workspace version mismatch:\n- ${mismatches.join("\n- ")}`);
}

const url = `https://registry.npmjs.org/chatgpt-layer/${encodeURIComponent(version)}`;
let res;
try {
  res = await fetch(url, {
    headers: { "user-agent": "chatgpt-layer-validate-npm-release" },
  });
} catch (err) {
  fail(`registry lookup failed for ${url}: ${err instanceof Error ? err.message : err}`);
}

if (res.status === 200) {
  fail(`chatgpt-layer@${version} already exists on npm`);
}
if (res.status !== 404) {
  fail(`unexpected registry status ${res.status} for ${url}`);
}

console.log(
  `[validate-npm-release] ok: ${installer.name}@${version} tag ${tag} is not on npm; root stays private`,
);

