import assert from "node:assert/strict";
import asar from "@electron/asar";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { cleanupTempTree, collectUnpackOptions } from "../src/asar";

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
