import { createRequire } from "node:module";
import { CodexDesktopSpawnProbe } from "../../../src/codex-desktop-seam/spawn-probe";

const require = createRequire(__filename);
const shared = require("node:child_process") as { spawn: (...args: never[]) => unknown };
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
const result: Record<string, unknown> = {
  threw,
  hookInstalled: status.hookInstalled,
  hookInstallError: status.hookInstallError,
  sameModule: fresh === shared,
  freshSeesWrapper: fresh.spawn === shared.spawn && shared.spawn !== before,
};
try {
  result.restored = probe.uninstall();
} catch {
  result.restored = false;
}
result.originalRestored = require("node:child_process").spawn === before;
process.stdout.write(JSON.stringify(result));
