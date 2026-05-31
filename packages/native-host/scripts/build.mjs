import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const src = resolve(root, "src", "codexpp_native_host.mm");
const outDir = resolve(root, "dist");
const out = resolve(outDir, "codexpp_native_host.node");

mkdirSync(outDir, { recursive: true });

if (process.platform !== "darwin") {
  console.log("[native-host] skipping macOS native host build on non-darwin platform");
  process.exit(0);
}

const includeDir = findNodeIncludeDir();
const sdkPath = run("xcrun", ["--show-sdk-path"]).trim();

run("xcrun", [
  "clang++",
  "-std=c++20",
  "-fobjc-arc",
  "-ObjC++",
  "-bundle",
  "-undefined",
  "dynamic_lookup",
  "-DNAPI_VERSION=10",
  "-mmacosx-version-min=13.0",
  "-isysroot",
  sdkPath,
  `-I${includeDir}`,
  "-framework",
  "AppKit",
  "-framework",
  "Foundation",
  "-framework",
  "Metal",
  "-framework",
  "MetalKit",
  "-framework",
  "QuartzCore",
  src,
  "-o",
  out,
], { stdio: "inherit" });

run("codesign", ["--force", "--sign", "-", out], { stdio: "inherit" });
console.log(`[native-host] built ${out}`);

function findNodeIncludeDir() {
  const candidates = [
    process.env.npm_config_nodedir ? join(process.env.npm_config_nodedir, "include", "node") : null,
    join(dirname(process.execPath), "..", "include", "node"),
    "/opt/homebrew/include/node",
    "/usr/local/include/node",
    "/usr/include/node",
  ].filter(Boolean);
  for (const dir of candidates) {
    if (existsSync(join(dir, "node_api.h"))) return dir;
  }
  throw new Error(`Could not find node_api.h. Tried: ${candidates.join(", ")}`);
}

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: opts.stdio ?? ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : "";
    const stdout = result.stdout ? `\n${result.stdout}` : "";
    throw new Error(`${command} ${args.join(" ")} failed${stdout}${stderr}`);
  }
  return result.stdout ?? "";
}
