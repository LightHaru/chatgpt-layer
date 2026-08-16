import { createRequire } from "node:module";
import { CodexDesktopSpawnProbe, getSharedChildProcessModule } from "../../../src/codex-desktop-seam";

const shared = getSharedChildProcessModule();
if (!shared) {
  process.stdout.write(JSON.stringify({ ok: false, reason: "no-module" }));
  process.exit(0);
}

const require = createRequire(__filename);
const before = shared.spawn;
const probe = new CodexDesktopSpawnProbe({
  spawnModule: shared,
  env: { CODEXPP_APP_SERVER_PROBE: "1" },
  trustedRoots: () => [],
});

let threw = false;
try {
  probe.install();
} catch {
  threw = true;
}

const fresh = require("node:child_process") as typeof shared;
const status = probe.getStatus();
const result = {
  threw,
  hookInstalled: status.hookInstalled,
  hookInstallError: status.hookInstallError,
  sameModule: fresh === shared,
  freshSeesWrapper: fresh.spawn === shared.spawn && shared.spawn !== before,
};

let restored = false;
try {
  restored = probe.uninstall();
} catch {
  restored = false;
}
const after = require("node:child_process") as typeof shared;
Object.assign(result, {
  restored,
  originalRestored: after.spawn === before,
});
process.stdout.write(JSON.stringify(result));
