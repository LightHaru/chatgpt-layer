import assert from "node:assert/strict";
import asar from "@electron/asar";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cleanupTempTree, collectUnpackOptions, patchAsar, readFileInAsar } from "../src/asar";

test("asar temp cleanup removes extracted work trees", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-cleanup-"));
  mkdirSync(join(root, "src", "nested"), { recursive: true });
  writeFileSync(join(root, "src", "nested", "file.txt"), "ok");

  await cleanupTempTree(root);

  assert.equal(existsSync(root), false);
});

test("collectUnpackOptions compacts fully unpacked directories", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-unpack-"));
  const src = join(root, "src");
  const archive = join(root, "app.asar");
  mkdirSync(join(src, "native"), { recursive: true });
  mkdirSync(join(src, "packed"), { recursive: true });
  writeFileSync(join(src, "native", "binding.node"), "native");
  writeFileSync(join(src, "native", "helper.js"), "helper");
  writeFileSync(join(src, "packed", "index.js"), "packed");
  writeFileSync(join(src, "loose.node"), "loose");

  try {
    await asar.createPackageWithOptions(src, archive, {
      globOptions: { dot: true },
      unpack: "**/loose.node",
      unpackDir: "native",
    });

    const opts = collectUnpackOptions(archive);
    assert.equal(opts.unpack, "**/loose.node");
    assert.equal(opts.unpackDir, "native");
  } finally {
    await cleanupTempTree(root);
  }
});

test("patchAsar invalidates the asar filesystem cache so extractFile sees new files", async () => {
  const root = mkdtempSync(join(tmpdir(), "codexpp-asar-uncache-"));
  const src = join(root, "src");
  const archive = join(root, "app.asar");
  mkdirSync(src, { recursive: true });
  writeFileSync(join(src, "package.json"), JSON.stringify({ main: "main.js" }));
  writeFileSync(join(src, "main.js"), "console.log(1);\n");
  try {
    await asar.createPackageWithOptions(src, archive, { globOptions: { dot: true } });
    const before = JSON.parse(readFileInAsar(archive, "package.json").toString("utf8")) as { main?: string };
    assert.equal(before.main, "main.js");
    await patchAsar(archive, (dir) => {
      writeFileSync(join(dir, "package.json"), JSON.stringify({ main: "loader.cjs", extra: true }, null, 2));
      writeFileSync(join(dir, "loader.cjs"), "module.exports = {};\n");
    });
    const after = JSON.parse(readFileInAsar(archive, "package.json").toString("utf8")) as { main?: string; extra?: boolean };
    assert.equal(after.main, "loader.cjs");
    assert.equal(after.extra, true);
    assert.equal(readFileInAsar(archive, "loader.cjs").toString("utf8"), "module.exports = {};\n");
  } finally {
    await cleanupTempTree(root);
  }
});
