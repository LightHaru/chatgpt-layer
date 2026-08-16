import { spawnSync } from "node:child_process";

const REQUIRED = "11.5.1";
const requireMode = process.argv.includes("--require");

function parse(v) {
  const parts = String(v)
    .trim()
    .split(".")
    .map((p) => parseInt(p, 10));
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`cannot parse npm version ${JSON.stringify(v)}`);
  }
  return parts;
}

function gte(have, need) {
  const a = parse(have);
  const b = parse(need);
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true;
    if (a[i] < b[i]) return false;
  }
  return true;
}

const r = spawnSync("npm", ["--version"], { encoding: "utf8" });
if (r.error) {
  console.error(`[ensure-npm-cli] ${r.error.message}`);
  process.exit(1);
}
if (r.status !== 0) {
  console.error(`[ensure-npm-cli] npm --version exited ${r.status}`);
  process.stderr.write(r.stderr || "");
  process.exit(1);
}

const have = r.stdout.trim();
const ok = gte(have, REQUIRED);
if (ok) {
  console.log(`[ensure-npm-cli] npm ${have} >= ${REQUIRED}`);
  process.exit(0);
}

console.error(`[ensure-npm-cli] npm ${have} is below ${REQUIRED} (required for Trusted Publishing)`);
process.exit(requireMode ? 1 : 2);

