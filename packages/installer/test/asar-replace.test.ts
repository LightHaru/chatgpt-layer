import assert from "node:assert/strict";
import asar from "@electron/asar";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  asarBufferHasReadablePackageJson,
  asarHasReadablePackageJson,
  cleanupTempTree,
  patchAsar,
  readFileInAsar,
  replaceAsarAtomically,
  uncacheAsar,
  waitForPackedAsarSettled,
  waitForReadablePackedAsar,
  type AsarReplaceFs,
} from "../src/asar";

async function packFixture(dir: string, pkg: Record<string, unknown>, extra: Record<string, string> = {}): Promise<string> {
  const src = join(dir, "src");
  const archive = join(dir, "app.asar");
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(join(src, "main.js"), "console.log(1);\n");
  for (const [name, body] of Object.entries(extra)) {
    writeFileSync(join(src, name), body);
  }
  await asar.createPackageWithOptions(src, archive, { globOptions: { dot: true } });
  asar.uncache(archive);
  await waitForReadablePackedAsar(archive, "fixture");
  return archive;
}

const NESTED_PKG = `${JSON.stringify({ name: "foo", version: "1.0.0" }, null, 2)}\n`;

async function packNestedAsar(
  dir: string,
  options: { rootPkg?: string | Buffer | null },
): Promise<string> {
  const src = join(dir, "src");
  const archive = join(dir, "app.asar");
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "main.js"), "console.log(1);\n");
  if (options.rootPkg !== null && options.rootPkg !== undefined) {
    writeFileSync(join(src, "package.json"), options.rootPkg);
  }
  const nestedDir = join(src, "node_modules", "foo");
  mkdirSync(nestedDir, { recursive: true });
  writeFileSync(join(nestedDir, "package.json"), NESTED_PKG);
  await asar.createPackageWithOptions(src, archive, { globOptions: { dot: true } });
  asar.uncache(archive);
  await waitForPackedAsarSettled(archive, "nested-fixture");
  return archive;
}

function recordingFs(calls: string[]): AsarReplaceFs {
  const rec = (op: string, path: string) => { calls.push(`${op}:${path}`); };
  return {
    unlinkSync: (path) => { rec("unlink", path); unlinkSync(path); },
    renameSync: (from, to) => { rec("rename", `${from}->${to}`); renameSync(from, to); },
    writeFileSync: (path, data) => { rec("writeFile", path); writeFileSync(path, data); },
    readFileSync: (path) => { rec("readFile", path); return readFileSync(path); },
    chmodSync: (path, mode) => { rec("chmod", path); chmodSync(path, mode); },
    openSync: (path, flags) => { rec("open", path); return openSync(path, flags); },
    fsyncSync: (fd) => { rec("fsync", String(fd)); fsyncSync(fd); },
    closeSync: (fd) => { rec("close", String(fd)); closeSync(fd); },
  };
}

test("asarHasReadablePackageJson accepts a packed asar with valid JSON", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-readable-"));
  try {
    const archive = await packFixture(root, { name: "ok", main: "main.js" });
    assert.equal(asarHasReadablePackageJson(archive), true);
  } finally {
    await cleanupTempTree(root);
  }
});

test("package.json validation uses raw asar bytes, not extractFile", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-bytes-"));
  try {
    const archive = await packFixture(root, { name: "ok", main: "main.js" });
    const bytes = readFileSync(archive);
    assert.equal(asarBufferHasReadablePackageJson(bytes), true);
    assert.equal(asarBufferHasReadablePackageJson(Buffer.alloc(0)), false);
    assert.equal(asarBufferHasReadablePackageJson(Buffer.alloc(64)), false);
    assert.equal(asarHasReadablePackageJson(archive), true);
  } finally {
    await cleanupTempTree(root);
  }
});

test("asarHasReadablePackageJson rejects empty, zeroed, and invalid archives", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-unreadable-"));
  try {
    const empty = join(root, "empty.asar");
    writeFileSync(empty, "");
    assert.equal(asarHasReadablePackageJson(empty), false);

    const zeroed = join(root, "zeroed.asar");
    writeFileSync(zeroed, Buffer.alloc(64));
    assert.equal(asarHasReadablePackageJson(zeroed), false);

    const garbage = join(root, "garbage.asar");
    writeFileSync(garbage, "this is not an asar");
    assert.equal(asarHasReadablePackageJson(garbage), false);

    const src = join(root, "bad-json");
    mkdirSync(src, { recursive: true });
    writeFileSync(join(src, "package.json"), "{not-json");
    writeFileSync(join(src, "main.js"), "x");
    const badJson = join(root, "bad-json.asar");
    await asar.createPackageWithOptions(src, badJson, { globOptions: { dot: true } });
    asar.uncache(badJson);
    await waitForPackedAsarSettled(badJson, "bad-json");
    assert.equal(asarHasReadablePackageJson(badJson), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("root package.json plus nested package.json is readable", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-root-nested-ok-"));
  try {
    const archive = await packNestedAsar(root, {
      rootPkg: `${JSON.stringify({ name: "ok", main: "main.js" }, null, 2)}\n`,
    });
    const bytes = readFileSync(archive);
    assert.equal(asarHasReadablePackageJson(archive), true);
    assert.equal(asarBufferHasReadablePackageJson(bytes), true);
  } finally {
    await cleanupTempTree(root);
  }
});

test("nested node_modules package.json does not satisfy a missing root package.json", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-nested-only-"));
  try {
    const archive = await packNestedAsar(root, { rootPkg: null });
    const bytes = readFileSync(archive);
    assert.equal(asarHasReadablePackageJson(archive), false);
    assert.equal(asarBufferHasReadablePackageJson(bytes), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("nested package.json does not satisfy an invalid root package.json", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-root-badjson-"));
  try {
    const archive = await packNestedAsar(root, { rootPkg: "{not-json" });
    const bytes = readFileSync(archive);
    assert.equal(asarHasReadablePackageJson(archive), false);
    assert.equal(asarBufferHasReadablePackageJson(bytes), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("nested package.json does not satisfy a zeroed or NUL root package.json", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-root-nul-"));
  try {
    const emptyRoot = await packNestedAsar(join(root, "empty"), { rootPkg: "" });
    assert.equal(asarHasReadablePackageJson(emptyRoot), false);
    assert.equal(asarBufferHasReadablePackageJson(readFileSync(emptyRoot)), false);

    const nulRoot = await packNestedAsar(join(root, "nul"), { rootPkg: Buffer.alloc(16) });
    assert.equal(asarHasReadablePackageJson(nulRoot), false);
    assert.equal(asarBufferHasReadablePackageJson(readFileSync(nulRoot)), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("patchAsar validates staging is readable before replacement succeeds", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-stage-"));
  try {
    const archive = await packFixture(root, { name: "ok", main: "main.js" });
    await patchAsar(archive, (dir) => {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "ok", main: "loader.cjs" }));
      writeFileSync(join(dir, "loader.cjs"), "module.exports = {};\n");
    });
    assert.equal(asarHasReadablePackageJson(archive), true);
    const pkg = JSON.parse(readFileInAsar(archive, "package.json").toString("utf8")) as { main?: string };
    assert.equal(pkg.main, "loader.cjs");
    assert.equal(existsSync(`${archive}.codexpp-new`), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("Windows replace overwrites dest without unlinking the live asar first", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-win-"));
  try {
    const dest = await packFixture(join(root, "dest"), { name: "old", main: "main.js" });
    const staging = await packFixture(join(root, "stage"), { name: "new", main: "loader.cjs" }, {
      "loader.cjs": "module.exports = {};\n",
    });
    const calls: string[] = [];
    await replaceAsarAtomically(staging, dest, { platform: "win32", fs: recordingFs(calls) });

    const destOps = calls.filter((c) => c.endsWith(`:${dest}`) || c.includes(`->${dest}`));
    const firstDestWrite = destOps.findIndex((c) => c.startsWith("writeFile:"));
    assert.ok(firstDestWrite >= 0, `expected writeFile of dest, got ${destOps.join(", ")}`);
    assert.equal(
      destOps.slice(0, firstDestWrite).some((c) => c.startsWith("unlink:")),
      false,
      `unlink of live dest before overwrite: ${destOps.join(", ")}`,
    );
    assert.equal(calls.some((c) => c === `unlink:${dest}`), false);
    assert.equal(calls.some((c) => c.startsWith("rename:") && c.endsWith(`->${dest}`)), false);
    assert.equal(asarHasReadablePackageJson(dest), true);
    const pkg = JSON.parse(readFileInAsar(dest, "package.json").toString("utf8")) as { name?: string; main?: string };
    assert.equal(pkg.name, "new");
    assert.equal(pkg.main, "loader.cjs");
    assert.equal(existsSync(staging), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("Unix replace uses rename and does not overwrite dest via writeFile", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-unix-"));
  try {
    const dest = await packFixture(join(root, "dest"), { name: "old", main: "main.js" });
    const staging = await packFixture(join(root, "stage"), { name: "new", main: "loader.cjs" });
    const calls: string[] = [];
    await replaceAsarAtomically(staging, dest, { platform: "linux", fs: recordingFs(calls) });
    assert.equal(calls.some((c) => c === `rename:${staging}->${dest}`), true);
    assert.equal(calls.some((c) => c === `writeFile:${dest}`), false);
    assert.equal(calls.some((c) => c === `unlink:${dest}`), false);
    assert.equal(asarHasReadablePackageJson(dest), true);
    const pkg = JSON.parse(readFileInAsar(dest, "package.json").toString("utf8")) as { name?: string };
    assert.equal(pkg.name, "new");
  } finally {
    await cleanupTempTree(root);
  }
});

test("unreadable zeroed Windows replacement fails closed and keeps staging", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-zero-"));
  try {
    const dest = await packFixture(join(root, "dest"), { name: "old", main: "main.js" });
    const staging = await packFixture(join(root, "stage"), { name: "new", main: "loader.cjs" });
    const calls: string[] = [];
    const fs = recordingFs(calls);
    fs.writeFileSync = (path, data) => {
      calls.push(`writeFile:${path}`);
      writeFileSync(path, path === dest ? Buffer.alloc(64) : data);
    };
    await assert.rejects(
      () => replaceAsarAtomically(staging, dest, { platform: "win32", fs }),
      /replaced asar is unreadable/,
    );
    assert.equal(existsSync(staging), true);
    assert.equal(asarHasReadablePackageJson(staging), true);
    assert.equal(asarHasReadablePackageJson(dest), false);
    assert.equal(calls.some((c) => c === `unlink:${dest}`), false);
  } finally {
    await cleanupTempTree(root);
  }
});

test("replacement success requires a readable package.json", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-req-"));
  try {
    const dest = await packFixture(join(root, "dest"), { name: "old", main: "main.js" });
    const stagingSrc = join(root, "stage-src");
    mkdirSync(stagingSrc, { recursive: true });
    writeFileSync(join(stagingSrc, "package.json"), "");
    writeFileSync(join(stagingSrc, "main.js"), "x");
    const staging = join(root, "stage.asar");
    await asar.createPackageWithOptions(stagingSrc, staging, { globOptions: { dot: true } });
    asar.uncache(staging);
    await waitForPackedAsarSettled(staging, "empty-root-staging");
    await assert.rejects(
      () => replaceAsarAtomically(staging, dest, { platform: "win32" }),
      /replaced asar is unreadable/,
    );
    assert.equal(existsSync(staging), true);
  } finally {
    await cleanupTempTree(root);
  }
});

test("Windows overwrite invalidates the asar cache so extractFile sees new files", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-cache-"));
  try {
    const archive = await packFixture(root, { main: "main.js" });
    const before = JSON.parse(readFileInAsar(archive, "package.json").toString("utf8")) as { main?: string };
    assert.equal(before.main, "main.js");
    await patchAsar(archive, (dir) => {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ main: "loader.cjs", extra: true }));
      writeFileSync(join(dir, "loader.cjs"), "module.exports = {};\n");
    }, { platform: "win32" });
    uncacheAsar(archive);
    const after = JSON.parse(readFileInAsar(archive, "package.json").toString("utf8")) as { main?: string; extra?: boolean };
    assert.equal(after.main, "loader.cjs");
    assert.equal(after.extra, true);
    assert.equal(readFileInAsar(archive, "loader.cjs").toString("utf8"), "module.exports = {};\n");
  } finally {
    await cleanupTempTree(root);
  }
});
