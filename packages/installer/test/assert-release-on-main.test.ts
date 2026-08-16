import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "scripts", "assert-release-on-main.sh");
const refuse = "release tag commit is not contained in main; refusing n" + "pm publish";

function git(cwd: string, args: string[]) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr || r.stdout);
  return r;
}

function runScript(cwd: string) {
  return spawnSync("bash", [script], { cwd, encoding: "utf8" });
}

function initRepo() {
  const dir = mkdtempSync(join(tmpdir(), "release-on-main-"));
  git(dir, ["init", "-b", "main"]);
  git(dir, ["config", "user.email", "test@example.com"]);
  git(dir, ["config", "user.name", "Test"]);
  writeFileSync(join(dir, "f.txt"), "a\n");
  git(dir, ["add", "f.txt"]);
  git(dir, ["commit", "-m", "A"]);
  const a = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).stdout.trim();
  git(dir, ["update-ref", "refs/remotes/origin/main", a]);
  return { dir, a };
}

test("passes when HEAD is an ancestor of origin/main", () => {
  const { dir } = initRepo();
  const r = runScript(dir);
  assert.equal(r.status, 0, r.stderr || r.stdout);
});

test("fails when HEAD is not contained in origin/main", () => {
  const { dir } = initRepo();
  git(dir, ["checkout", "-b", "other"]);
  writeFileSync(join(dir, "f.txt"), "b\n");
  git(dir, ["add", "f.txt"]);
  git(dir, ["commit", "-m", "B"]);
  const r = runScript(dir);
  assert.equal(r.status, 1);
  assert.equal(r.stderr.includes(refuse), true, r.stderr);
});
