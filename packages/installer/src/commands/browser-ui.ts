import kleur from "kleur";
import { execFileSync } from "node:child_process";
import { platform } from "node:os";
import { locateCodex } from "../platform.js";
import { isCodexRunning, quitCodex } from "../alerts.js";

interface BrowserUiOpts {
  app?: string;
  port?: string | number;
  open?: boolean;
  keepWindow?: boolean;
  "keep-window"?: boolean;
}

const DEFAULT_PORT = 8765;
const DEFAULT_BUNDLE_ID = "com.openai.codex";

export async function browserUi(opts: BrowserUiOpts = {}): Promise<void> {
  if (platform() !== "darwin") {
    throw new Error("codexplusplus browser is currently macOS-only.");
  }

  const codex = locateCodex(opts.app);
  const port = parsePort(opts.port, DEFAULT_PORT);
  const url = `http://127.0.0.1:${port}/`;
  const hideMainWindow = opts.keepWindow !== true && opts["keep-window"] !== true;
  const shouldOpen = opts.open !== false;

  console.log(`${kleur.dim("[1]")} Codex: ${kleur.cyan(codex.appRoot)}`);
  if (isCodexRunning(codex.appRoot)) {
    console.log(`${kleur.dim("[2]")} Restarting Codex with browser UI enabled`);
    quitCodex(codex.appRoot);
  } else {
    console.log(`${kleur.dim("[2]")} Launching Codex with browser UI enabled`);
  }

  launchCodexBrowserHost(codex.bundleId ?? DEFAULT_BUNDLE_ID, port, hideMainWindow);
  await waitForBrowserUi(url);
  console.log(`${kleur.dim("[3]")} Browser UI: ${kleur.cyan(url)}`);

  if (shouldOpen) {
    execFileSync("open", [url], { stdio: "ignore" });
  }
}

function launchCodexBrowserHost(bundleId: string, port: number, hideMainWindow: boolean): void {
  const args = [
    "--env",
    "CODEXPP_BROWSER_UI=1",
    "--env",
    `CODEXPP_BROWSER_UI_PORT=${port}`,
  ];
  if (hideMainWindow) {
    args.push("--env", "CODEXPP_BROWSER_UI_HIDE_MAIN=1");
  }
  args.push("-b", bundleId);
  execFileSync("open", args, { stdio: "ignore" });
}

async function waitForBrowserUi(url: string): Promise<void> {
  const healthUrl = new URL("/codexpp/browser-ui/health", url).toString();
  const started = Date.now();
  let lastError: unknown = null;
  while (Date.now() - started < 20_000) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 750);
      try {
        const response = await fetch(healthUrl, { signal: controller.signal });
        if (response.ok) return;
        lastError = new Error(`HTTP ${response.status}`);
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for Codex++ browser UI at ${healthUrl}: ${String(lastError)}`);
}

function parsePort(value: string | number | undefined, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}
