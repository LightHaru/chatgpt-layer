#!/usr/bin/env node
import sade from "sade";
import kleur from "kleur";
import { install } from "./commands/install.js";
import { uninstall } from "./commands/uninstall.js";
import { repair } from "./commands/repair.js";
import { updateCodex } from "./commands/update-codex.js";
import { selfUpdate } from "./commands/self-update.js";
import { status } from "./commands/status.js";
import { debug } from "./commands/debug.js";
import { browserUi } from "./commands/browser-ui.js";
import { doctor } from "./commands/doctor.js";
import { safeMode } from "./commands/safe-mode.js";
import { CODEX_PLUSPLUS_VERSION } from "./version.js";
import { buildCliFailureIssueUrl, showPatchFailedAlert } from "./alerts.js";
import { capKnownLogFiles } from "./logging.js";

interface InstallCliOpts {
  app?: string;
  fuse?: boolean;
  resign?: boolean;
  local?: boolean;
  localSigning?: boolean;
  "local-signing"?: boolean;
  watcher?: boolean;
  verbose?: boolean;
}

interface RepairCliOpts {
  app?: string;
  quiet?: boolean;
  force?: boolean;
  local?: boolean;
  localSigning?: boolean;
  "local-signing"?: boolean;
  watcher?: boolean;
}

function wrap<T extends (...args: never[]) => unknown | Promise<unknown>>(fn: T): T {
  return ((...args: Parameters<T>) => {
    Promise.resolve()
      .then(() => fn(...args))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        const command = process.argv[2];
        console.error("\n" + kleur.red().bold("✗ codex-plusplus failed"));
        console.error(msg);
        console.error("");
        console.error(
          kleur.yellow("If the message above does not explain how to fix it, please report this on GitHub:"),
        );
        console.error(buildCliFailureIssueUrl(command, msg));
        maybeShowPatchFailedAlert(msg);
        process.exit(1);
      });
  }) as unknown as T;
}

function runInstall(opts: InstallCliOpts): Promise<void> {
  return install({
    ...opts,
    localSigning: resolveLocalSigning(opts),
  });
}

function runRepair(opts: RepairCliOpts): Promise<void> {
  return repair({
    ...opts,
    localSigning: resolveLocalSigning(opts),
  });
}

function resolveLocalSigning(opts: {
  local?: boolean;
  localSigning?: boolean;
  "local-signing"?: boolean;
}): boolean | undefined {
  if (opts.local === false || opts.localSigning === false || opts["local-signing"] === false) {
    return false;
  }
  return opts.localSigning ?? opts["local-signing"] ?? opts.local;
}

async function runCreateTweak(target: string, opts: never): Promise<void> {
  const { createTweak } = await import("./commands/create-tweak.js");
  return createTweak(target, opts);
}

async function runValidateTweak(target?: string): Promise<void> {
  const { validateTweak } = await import("./commands/validate-tweak.js");
  return validateTweak(target);
}

async function runDevTweak(target: string | undefined, opts: never): Promise<void> {
  const { devTweak } = await import("./commands/dev-tweak.js");
  return devTweak(target, opts);
}

function maybeShowPatchFailedAlert(message: string): void {
  const command = process.argv[2];
  if (command !== "repair") return;
  showPatchFailedAlert(message);
}

const prog = sade("codex-plusplus")
  .version(CODEX_PLUSPLUS_VERSION)
  .describe("Tweak system for the Codex desktop app");

capKnownLogFiles();

prog
  .command("install")
  .describe("Patch Codex.app to load the tweak runtime")
  .option("--app", "Path to Codex.app / install dir (auto-detected if omitted)")
  .option("--fuse", "Flip Electron's embedded asar integrity fuse", true)
  .option("--resign", "Code sign Codex.app on macOS", true)
  .option("--local", "Use a stable local signing identity on macOS")
  .option("--local-signing", "Alias for --local")
  .option("--watcher", "Install the auto-repair watcher", true)
  .option("--verbose", "Show low-level patching details")
  .action(wrap(runInstall));

prog
  .command("uninstall")
  .describe("Restore Codex.app from backup and remove the watcher")
  .option("--app", "Path to Codex.app / install dir")
  .option("--purge", "Delete tweaks, config, logs, backups, and Codex++ user data")
  .action(wrap(uninstall));

prog
  .command("repair")
  .describe("Re-apply the patch (use after a Sparkle auto-update)")
  .option("--app", "Path to Codex.app / install dir")
  .option("--quiet", "Suppress non-error output")
  .option("--force", "Re-apply even if the patch appears intact")
  .option("--local", "Use a stable local signing identity on macOS")
  .option("--local-signing", "Alias for --local")
  .option("--watcher", "Run from the auto-repair watcher")
  .action(wrap(runRepair));

prog
  .command("update-codex")
  .describe("Restore signed Codex.app so the official updater can run, then reapply Codex++ after restart")
  .option("--app", "Path to Codex.app / install dir")
  .action(wrap(updateCodex));

prog
  .command("update")
  .describe("Update Codex++ from the latest GitHub release, rebuild, then repair the app patch")
  .option("--repo", "GitHub repo to download (default: b-nnett/codex-plusplus)")
  .option("--ref", "Git ref to download (default: latest GitHub release)")
  .option("--repair", "Run repair after updating", true)
  .option("--quiet", "Suppress non-error output")
  .option("--watcher", "Run in watcher mode and respect automatic refresh settings")
  .option("--force", "Download and rebuild even if the selected release is already installed")
  .action(wrap(selfUpdate));

prog
  .command("self-update")
  .describe("Alias for update")
  .option("--repo", "GitHub repo to download (default: b-nnett/codex-plusplus)")
  .option("--ref", "Git ref to download (default: latest GitHub release)")
  .option("--repair", "Run repair after updating", true)
  .option("--quiet", "Suppress non-error output")
  .option("--watcher", "Run in watcher mode and respect automatic refresh settings")
  .option("--force", "Download and rebuild even if the selected release is already installed")
  .action(wrap(selfUpdate));

prog
  .command("status")
  .describe("Show patch status, paths, version")
  .action(status);

prog
  .command("debug")
  .describe("Show Codex install, runtime, data paths, and open state")
  .option("--app", "Path to Codex.app / install dir")
  .action(wrap(debug));

prog
  .command("browser")
  .describe("Open the Codex React UI in a browser tab backed by a hidden Codex host")
  .option("--app", "Path to Codex.app / install dir")
  .option("--port", "Local browser UI port", 8765)
  .option("--open", "Open the browser tab after launch", true)
  .option("--keep-window", "Leave the Codex desktop window visible")
  .action(wrap(browserUi));

prog
  .command("doctor")
  .describe("Diagnose common issues (signature, fuses, asar integrity, perms)")
  .action(doctor);

prog
  .command("create-tweak <target>")
  .describe("Scaffold a new local tweak")
  .option("--id", "Manifest id, e.g. com.you.my-tweak")
  .option("--name", "Human-readable tweak name")
  .option("--repo", "GitHub repo in owner/repo form")
  .option("--scope", "renderer, main, or both")
  .option("--force", "Write into an existing empty directory")
  .action(wrap(runCreateTweak));

prog
  .command("validate-tweak [target]")
  .describe("Validate a tweak manifest and entry point")
  .action(wrap(runValidateTweak));

prog
  .command("dev [target]")
  .describe("Link a tweak into the Codex++ tweaks directory for local development")
  .option("--name", "Override linked directory name; defaults to manifest id")
  .option("--replace", "Replace an existing symlink at the target tweak id")
  .option("--no-watch", "Link once and exit instead of watching for changes")
  .action(wrap(runDevTweak));

prog
  .command("safe-mode")
  .describe("Temporarily disable all tweaks without deleting them. Leave safe mode with: codexplusplus safe-mode --off")
  .option("--on", "Enable safe mode (default)")
  .option("--off", "Disable safe mode and return to normal tweak loading")
  .option("--status", "Print current safe mode status")
  .action(wrap(safeMode));

const argv = process.argv.length <= 2 ? [...process.argv, "--help"] : process.argv;

prog.parse(argv, {
  unknown: (flag) => {
    console.error(kleur.red(`Unknown flag: ${flag}`));
    process.exit(1);
  },
});
