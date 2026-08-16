import * as childProcess from "node:child_process";
import { createRequire } from "node:module";
import { CodexDesktopSpawnProbe } from "../../../src/codex-desktop-seam/spawn-probe";

const require = createRequire(__filename);
const before = childProcess.spawn;
const probe = new CodexDesktopSpawnProbe({
  spawnModule: childProcess,
  env: { CODEXPP_APP_SERVER_PROBE: "1" },
  trustedRoots: () => [],
});
let threw = false;
try {
  probe.install();
} catch {
  threw = true;
}
const fresh = require("node:child_process") as { spawn: typeof childProcess.spawn };
const status = probe.getStatus();
try {
  probe.uninstall();
} catch {
  // ignore
}
process.stdout.write(
  JSON.stringify({
    threw,
    hookInstalled: status.hookInstalled,
    hookInstallError: status.hookInstallError,
    freshUnchanged: fresh.spawn === before,
  }),
);
