import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const reps = process.env.ASAR_REPLACE_STRESS_REPS || "50";
const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "packages/installer/test/asar-replace-stress.test.ts"],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ASAR_REPLACE_STRESS_REPS: reps },
  },
);
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
